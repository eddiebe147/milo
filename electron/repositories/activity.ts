import { getDatabase } from '../services/database'
import { nanoid } from 'nanoid'
import type { ActivityLog, AppClassification, ActivityState } from '../../src/types'

// Convert DB row to ActivityLog type
function rowToActivityLog(row: Record<string, unknown>): ActivityLog {
  return {
    id: row.id as string,
    timestamp: row.timestamp as string,
    appName: row.app_name as string,
    windowTitle: row.window_title as string,
    bundleId: row.bundle_id as string | undefined,
    url: row.url as string | undefined,
    durationSeconds: row.duration_seconds as number,
    state: row.state as ActivityState,
    taskId: row.task_id as string | undefined,
  }
}

// Convert DB row to AppClassification type
function rowToClassification(row: Record<string, unknown>): AppClassification {
  return {
    id: row.id as string,
    appName: row.app_name as string,
    bundleId: row.bundle_id as string | undefined,
    defaultState: row.default_state as ActivityState,
    keywords: row.keywords ? JSON.parse(row.keywords as string) : undefined,
    isCustom: Boolean(row.is_custom),
    createdAt: row.created_at as string,
  }
}

// Type aliases for database rows
type ActivityRow = Record<string, unknown>
type ClassificationRow = Record<string, unknown>

export const activityRepository = {
  // Log a new activity entry
  log(activity: Omit<ActivityLog, 'id'>): ActivityLog {
    const db = getDatabase()
    const id = nanoid()

    db.prepare(`
      INSERT INTO activity_logs (id, timestamp, app_name, window_title, bundle_id, url, duration_seconds, state, task_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      activity.timestamp,
      activity.appName,
      activity.windowTitle,
      activity.bundleId ?? null,
      activity.url ?? null,
      activity.durationSeconds,
      activity.state,
      activity.taskId ?? null
    )

    return { id, ...activity }
  },

  // Update duration of an existing log entry
  updateDuration(id: string, durationSeconds: number): void {
    const db = getDatabase()
    db.prepare('UPDATE activity_logs SET duration_seconds = ? WHERE id = ?').run(durationSeconds, id)
  },

  // Get activity logs for a specific date
  getByDate(date: string): ActivityLog[] {
    const db = getDatabase()
    const startOfDay = `${date}T00:00:00`
    const endOfDay = `${date}T23:59:59`

    const rows = db
      .prepare(`
        SELECT * FROM activity_logs
        WHERE timestamp BETWEEN ? AND ?
        ORDER BY timestamp ASC
      `)
      .all(startOfDay, endOfDay) as ActivityRow[]

    return rows.map(rowToActivityLog)
  },

  // Get today's activity logs
  getToday(): ActivityLog[] {
    const today = new Date().toISOString().split('T')[0]
    return this.getByDate(today)
  },

  // Get activity summary for a date (minutes by state)
  getSummary(date: string): { green: number; amber: number; red: number; total: number } {
    const db = getDatabase()
    const startOfDay = `${date}T00:00:00`
    const endOfDay = `${date}T23:59:59`

    const result = db
      .prepare(`
        SELECT
          SUM(CASE WHEN state = 'green' THEN duration_seconds ELSE 0 END) as green_seconds,
          SUM(CASE WHEN state = 'amber' THEN duration_seconds ELSE 0 END) as amber_seconds,
          SUM(CASE WHEN state = 'red' THEN duration_seconds ELSE 0 END) as red_seconds,
          SUM(duration_seconds) as total_seconds
        FROM activity_logs
        WHERE timestamp BETWEEN ? AND ?
      `)
      .get(startOfDay, endOfDay) as {
      green_seconds: number | null
      amber_seconds: number | null
      red_seconds: number | null
      total_seconds: number | null
    }

    return {
      green: Math.floor((result.green_seconds ?? 0) / 60),
      amber: Math.floor((result.amber_seconds ?? 0) / 60),
      red: Math.floor((result.red_seconds ?? 0) / 60),
      total: Math.floor((result.total_seconds ?? 0) / 60),
    }
  },

  // Get most recent activity log
  getLatest(): ActivityLog | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 1').get()
    return row ? rowToActivityLog(row as Record<string, unknown>) : null
  },

  // Get app usage breakdown for a date
  getAppBreakdown(date: string): Array<{ appName: string; minutes: number; state: ActivityState }> {
    const db = getDatabase()
    const startOfDay = `${date}T00:00:00`
    const endOfDay = `${date}T23:59:59`

    const rows = db
      .prepare(`
        SELECT
          app_name,
          state,
          SUM(duration_seconds) as total_seconds
        FROM activity_logs
        WHERE timestamp BETWEEN ? AND ?
        GROUP BY app_name, state
        ORDER BY total_seconds DESC
      `)
      .all(startOfDay, endOfDay) as Array<{
      app_name: string
      state: ActivityState
      total_seconds: number
    }>

    return rows.map(row => ({
      appName: row.app_name,
      state: row.state,
      minutes: Math.floor(row.total_seconds / 60),
    }))
  },

  // Clean up old activity logs (keep last N days)
  cleanup(keepDays: number = 90): number {
    const db = getDatabase()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - keepDays)
    const cutoff = cutoffDate.toISOString()

    const result = db.prepare('DELETE FROM activity_logs WHERE timestamp < ?').run(cutoff)
    return result.changes
  },
}

export const classificationsRepository = {
  // Get all classifications
  getAll(): AppClassification[] {
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM app_classifications ORDER BY app_name ASC').all() as ClassificationRow[]
    return rows.map(rowToClassification)
  },

  // Get classification by app name
  getByAppName(appName: string): AppClassification | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM app_classifications WHERE app_name = ?').get(appName)
    return row ? rowToClassification(row as Record<string, unknown>) : null
  },

  // Get classification by bundle ID
  getByBundleId(bundleId: string): AppClassification | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM app_classifications WHERE bundle_id = ?').get(bundleId)
    return row ? rowToClassification(row as Record<string, unknown>) : null
  },

  // Create or update a classification
  upsert(classification: Omit<AppClassification, 'id' | 'createdAt'>): AppClassification {
    const db = getDatabase()
    const id = nanoid()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO app_classifications (id, app_name, bundle_id, default_state, keywords, is_custom, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(app_name, bundle_id) DO UPDATE SET
        default_state = excluded.default_state,
        keywords = excluded.keywords,
        is_custom = excluded.is_custom
    `).run(
      id,
      classification.appName,
      classification.bundleId ?? null,
      classification.defaultState,
      classification.keywords ? JSON.stringify(classification.keywords) : null,
      classification.isCustom ? 1 : 0,
      now
    )

    return this.getByAppName(classification.appName)!
  },

  // Delete a classification (only custom ones)
  delete(id: string): boolean {
    const db = getDatabase()
    const result = db.prepare('DELETE FROM app_classifications WHERE id = ? AND is_custom = 1').run(id)
    return result.changes > 0
  },

  // Get custom classifications only
  getCustom(): AppClassification[] {
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM app_classifications WHERE is_custom = 1 ORDER BY app_name ASC').all() as ClassificationRow[]
    return rows.map(rowToClassification)
  },
}
