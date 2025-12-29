import { getDatabase } from '../services/database'

export interface StoredSettings {
  apiKey: string | null
  refillMode: 'endless' | 'daily_reset'
  workStartTime: string
  workEndTime: string
  workDays: number[]
  monitoringEnabled: boolean
  pollingIntervalMs: number
  driftAlertEnabled: boolean
  driftAlertDelayMinutes: number
  morningBriefingTime: string
  eveningReviewTime: string
  alwaysOnTop: boolean
  startMinimized: boolean
  showInDock: boolean
}

// Convert DB row to StoredSettings type
function rowToSettings(row: Record<string, unknown>): StoredSettings {
  return {
    apiKey: row.api_key as string | null,
    refillMode: (row.refill_mode as string) === 'daily_reset' ? 'daily_reset' : 'endless',
    workStartTime: row.work_start_time as string,
    workEndTime: row.work_end_time as string,
    workDays: JSON.parse(row.work_days as string),
    monitoringEnabled: Boolean(row.monitoring_enabled),
    pollingIntervalMs: row.polling_interval_ms as number,
    driftAlertEnabled: Boolean(row.drift_alert_enabled),
    driftAlertDelayMinutes: row.drift_alert_delay_minutes as number,
    morningBriefingTime: row.morning_briefing_time as string,
    eveningReviewTime: row.evening_review_time as string,
    alwaysOnTop: Boolean(row.always_on_top),
    startMinimized: Boolean(row.start_minimized),
    showInDock: Boolean(row.show_in_dock),
  }
}

export const settingsRepository = {
  // Get all settings
  get(): StoredSettings {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM user_settings WHERE id = 1').get() as Record<string, unknown>
    return rowToSettings(row)
  },

  // Get just the API key
  getApiKey(): string | null {
    const db = getDatabase()
    const row = db.prepare('SELECT api_key FROM user_settings WHERE id = 1').get() as Record<string, unknown>
    return row?.api_key as string | null
  },

  // Save API key
  saveApiKey(apiKey: string | null): void {
    const db = getDatabase()
    db.prepare('UPDATE user_settings SET api_key = ? WHERE id = 1').run(apiKey)
  },

  // Get refill mode
  getRefillMode(): 'endless' | 'daily_reset' {
    const db = getDatabase()
    const row = db.prepare('SELECT refill_mode FROM user_settings WHERE id = 1').get() as Record<string, unknown>
    return (row?.refill_mode as string) === 'daily_reset' ? 'daily_reset' : 'endless'
  },

  // Save refill mode
  saveRefillMode(mode: 'endless' | 'daily_reset'): void {
    const db = getDatabase()
    db.prepare('UPDATE user_settings SET refill_mode = ? WHERE id = 1').run(mode)
  },

  // Update multiple settings at once
  update(updates: Partial<StoredSettings>): void {
    const db = getDatabase()
    const setClauses: string[] = []
    const values: unknown[] = []

    if (updates.apiKey !== undefined) {
      setClauses.push('api_key = ?')
      values.push(updates.apiKey)
    }
    if (updates.refillMode !== undefined) {
      setClauses.push('refill_mode = ?')
      values.push(updates.refillMode)
    }
    if (updates.workStartTime !== undefined) {
      setClauses.push('work_start_time = ?')
      values.push(updates.workStartTime)
    }
    if (updates.workEndTime !== undefined) {
      setClauses.push('work_end_time = ?')
      values.push(updates.workEndTime)
    }
    if (updates.workDays !== undefined) {
      setClauses.push('work_days = ?')
      values.push(JSON.stringify(updates.workDays))
    }
    if (updates.monitoringEnabled !== undefined) {
      setClauses.push('monitoring_enabled = ?')
      values.push(updates.monitoringEnabled ? 1 : 0)
    }
    if (updates.pollingIntervalMs !== undefined) {
      setClauses.push('polling_interval_ms = ?')
      values.push(updates.pollingIntervalMs)
    }
    if (updates.driftAlertEnabled !== undefined) {
      setClauses.push('drift_alert_enabled = ?')
      values.push(updates.driftAlertEnabled ? 1 : 0)
    }
    if (updates.driftAlertDelayMinutes !== undefined) {
      setClauses.push('drift_alert_delay_minutes = ?')
      values.push(updates.driftAlertDelayMinutes)
    }
    if (updates.alwaysOnTop !== undefined) {
      setClauses.push('always_on_top = ?')
      values.push(updates.alwaysOnTop ? 1 : 0)
    }
    if (updates.startMinimized !== undefined) {
      setClauses.push('start_minimized = ?')
      values.push(updates.startMinimized ? 1 : 0)
    }
    if (updates.showInDock !== undefined) {
      setClauses.push('show_in_dock = ?')
      values.push(updates.showInDock ? 1 : 0)
    }

    if (setClauses.length > 0) {
      db.prepare(`UPDATE user_settings SET ${setClauses.join(', ')} WHERE id = 1`).run(...values)
    }
  },
}
