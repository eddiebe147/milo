import { getDatabase } from '../services/database'
import { nanoid } from 'nanoid'
import type { Task } from '../../src/types'

// Convert DB row to Task type
function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    goalId: row.goal_id as string | null,
    status: row.status as Task['status'],
    priority: row.priority as number,
    rationale: row.rationale as string | undefined,
    scheduledDate: row.scheduled_date as string,
    completedAt: row.completed_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// Type for raw database rows
type TaskRow = Record<string, unknown>

export const tasksRepository = {
  // Get all tasks
  getAll(): Task[] {
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM tasks ORDER BY priority ASC, created_at DESC').all() as TaskRow[]
    return rows.map(rowToTask)
  },

  // Get tasks for a specific date
  getByDate(date: string): Task[] {
    const db = getDatabase()
    const rows = db
      .prepare('SELECT * FROM tasks WHERE scheduled_date = ? ORDER BY priority ASC, created_at DESC')
      .all(date) as TaskRow[]
    return rows.map(rowToTask)
  },

  // Get today's tasks
  getToday(): Task[] {
    const today = new Date().toISOString().split('T')[0]
    return this.getByDate(today)
  },

  // Get task by ID
  getById(id: string): Task | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
    return row ? rowToTask(row as Record<string, unknown>) : null
  },

  // Get tasks by goal
  getByGoal(goalId: string): Task[] {
    const db = getDatabase()
    const rows = db
      .prepare('SELECT * FROM tasks WHERE goal_id = ? ORDER BY scheduled_date DESC, priority ASC')
      .all(goalId) as TaskRow[]
    return rows.map(rowToTask)
  },

  // Get active task (in_progress status)
  getActive(): Task | null {
    const db = getDatabase()
    const row = db.prepare("SELECT * FROM tasks WHERE status = 'in_progress' LIMIT 1").get()
    return row ? rowToTask(row as Record<string, unknown>) : null
  },

  // Get pending tasks for today
  getPendingToday(): Task[] {
    const today = new Date().toISOString().split('T')[0]
    const db = getDatabase()
    const rows = db
      .prepare(`
        SELECT * FROM tasks
        WHERE scheduled_date = ? AND status IN ('pending', 'in_progress')
        ORDER BY priority ASC, created_at DESC
      `)
      .all(today) as TaskRow[]
    return rows.map(rowToTask)
  },

  // Create a new task
  create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
    const db = getDatabase()
    const id = nanoid()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO tasks (id, title, description, goal_id, status, priority, rationale, scheduled_date, completed_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      task.title,
      task.description ?? null,
      task.goalId,
      task.status,
      task.priority,
      task.rationale ?? null,
      task.scheduledDate,
      task.completedAt ?? null,
      now,
      now
    )

    return this.getById(id)!
  },

  // Update a task
  update(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>): Task | null {
    const db = getDatabase()
    const existing = this.getById(id)
    if (!existing) return null

    const now = new Date().toISOString()

    db.prepare(`
      UPDATE tasks SET
        title = ?,
        description = ?,
        goal_id = ?,
        status = ?,
        priority = ?,
        rationale = ?,
        scheduled_date = ?,
        completed_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      updates.title ?? existing.title,
      updates.description ?? existing.description ?? null,
      updates.goalId ?? existing.goalId,
      updates.status ?? existing.status,
      updates.priority ?? existing.priority,
      updates.rationale ?? existing.rationale ?? null,
      updates.scheduledDate ?? existing.scheduledDate,
      updates.completedAt ?? existing.completedAt ?? null,
      now,
      id
    )

    return this.getById(id)
  },

  // Delete a task
  delete(id: string): boolean {
    const db = getDatabase()
    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
    return result.changes > 0
  },

  // Start a task (set as in_progress, clear other in_progress tasks)
  start(id: string): Task | null {
    const db = getDatabase()
    const now = new Date().toISOString()

    // First, set any currently in_progress tasks back to pending
    db.prepare(`
      UPDATE tasks SET status = 'pending', updated_at = ? WHERE status = 'in_progress'
    `).run(now)

    // Then set this task as in_progress
    return this.update(id, { status: 'in_progress' })
  },

  // Complete a task
  complete(id: string): Task | null {
    const now = new Date().toISOString()
    return this.update(id, { status: 'completed', completedAt: now })
  },

  // Defer a task to tomorrow
  defer(id: string): Task | null {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    return this.update(id, { status: 'deferred', scheduledDate: tomorrowStr })
  },

  // Get completion stats for a date range
  getCompletionStats(startDate: string, endDate: string): { completed: number; total: number } {
    const db = getDatabase()
    const result = db
      .prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM tasks
        WHERE scheduled_date BETWEEN ? AND ?
      `)
      .get(startDate, endDate) as { total: number; completed: number }

    return { completed: result.completed, total: result.total }
  },
}
