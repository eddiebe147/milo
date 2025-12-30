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
    categoryId: row.category_id as string | null,
    status: row.status as Task['status'],
    priority: row.priority as number,
    rationale: row.rationale as string | undefined,
    scheduledDate: row.scheduled_date as string,
    startDate: (row.start_date as string) || (row.scheduled_date as string),
    endDate: (row.end_date as string) || (row.scheduled_date as string),
    estimatedDays: (row.estimated_days as number) || 1,
    daysWorked: (row.days_worked as number) || 0,
    lastWorkedDate: row.last_worked_date as string | undefined,
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
    const startDate = task.startDate || task.scheduledDate
    const endDate = task.endDate || task.scheduledDate

    db.prepare(`
      INSERT INTO tasks (id, title, description, goal_id, category_id, status, priority, rationale, scheduled_date, start_date, end_date, estimated_days, days_worked, last_worked_date, completed_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      task.title,
      task.description ?? null,
      task.goalId,
      task.categoryId ?? null,
      task.status,
      task.priority,
      task.rationale ?? null,
      task.scheduledDate,
      startDate,
      endDate,
      task.estimatedDays ?? 1,
      task.daysWorked ?? 0,
      task.lastWorkedDate ?? null,
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
        category_id = ?,
        status = ?,
        priority = ?,
        rationale = ?,
        scheduled_date = ?,
        start_date = ?,
        end_date = ?,
        estimated_days = ?,
        days_worked = ?,
        last_worked_date = ?,
        completed_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      updates.title ?? existing.title,
      updates.description ?? existing.description ?? null,
      updates.goalId ?? existing.goalId,
      updates.categoryId ?? existing.categoryId ?? null,
      updates.status ?? existing.status,
      updates.priority ?? existing.priority,
      updates.rationale ?? existing.rationale ?? null,
      updates.scheduledDate ?? existing.scheduledDate,
      updates.startDate ?? existing.startDate,
      updates.endDate ?? existing.endDate,
      updates.estimatedDays ?? existing.estimatedDays,
      updates.daysWorked ?? existing.daysWorked,
      updates.lastWorkedDate ?? existing.lastWorkedDate ?? null,
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

  // ============================================
  // NEW METHODS FOR SIGNAL QUEUE & CONTINUITY
  // ============================================

  // Get ALL incomplete tasks (master list)
  getAllIncomplete(): Task[] {
    const db = getDatabase()
    const rows = db
      .prepare(`
        SELECT * FROM tasks
        WHERE status IN ('pending', 'in_progress')
        ORDER BY priority ASC, start_date ASC, created_at DESC
      `)
      .all() as TaskRow[]
    return rows.map(rowToTask)
  },

  // Get tasks by category
  getByCategory(categoryId: string): Task[] {
    const db = getDatabase()
    const rows = db
      .prepare(`
        SELECT * FROM tasks
        WHERE category_id = ? AND status IN ('pending', 'in_progress')
        ORDER BY priority ASC, start_date ASC
      `)
      .all(categoryId) as TaskRow[]
    return rows.map(rowToTask)
  },

  // Get tasks spanning today (for multi-day continuity)
  getSpanningToday(): Task[] {
    const today = new Date().toISOString().split('T')[0]
    const db = getDatabase()
    const rows = db
      .prepare(`
        SELECT * FROM tasks
        WHERE start_date <= ? AND (end_date >= ? OR end_date IS NULL)
        AND status IN ('pending', 'in_progress')
        ORDER BY priority ASC
      `)
      .all(today, today) as TaskRow[]
    return rows.map(rowToTask)
  },

  // Get tasks user worked on yesterday (for morning context)
  getWorkedYesterday(): Task[] {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const db = getDatabase()
    const rows = db
      .prepare(`
        SELECT * FROM tasks
        WHERE last_worked_date = ? AND status IN ('pending', 'in_progress')
        ORDER BY priority ASC
      `)
      .all(yesterday) as TaskRow[]
    return rows.map(rowToTask)
  },

  // Record work on a task (for multi-day tracking)
  recordWork(id: string): Task | null {
    const today = new Date().toISOString().split('T')[0]
    const task = this.getById(id)
    if (!task) return null

    // Only increment daysWorked if this is a new day
    const currentDaysWorked = task.daysWorked ?? 0
    const wasWorkedToday = task.lastWorkedDate === today
    return this.update(id, {
      daysWorked: wasWorkedToday ? currentDaysWorked : currentDaysWorked + 1,
      lastWorkedDate: today,
    })
  },

  // Get signal queue (top priority tasks for today)
  // Uses priority scoring: in_progress first, then by priority, then by continuity
  getSignalQueue(limit: number = 5): Task[] {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const db = getDatabase()

    const rows = db
      .prepare(`
        SELECT * FROM tasks
        WHERE status IN ('pending', 'in_progress')
        AND (
          scheduled_date = ?
          OR scheduled_date <= ?
          OR (start_date <= ? AND (end_date >= ? OR end_date IS NULL))
        )
        ORDER BY
          CASE WHEN status = 'in_progress' THEN 0 ELSE 1 END,
          priority ASC,
          CASE WHEN last_worked_date = ? THEN 0 ELSE 1 END,
          start_date ASC
        LIMIT ?
      `)
      .all(today, today, today, today, yesterday, limit) as TaskRow[]

    return rows.map(rowToTask)
  },

  // Get all tasks for backlog (everything not in signal queue)
  getBacklog(signalQueueIds: string[]): Task[] {
    const db = getDatabase()
    const placeholders = signalQueueIds.length > 0 ? signalQueueIds.map(() => '?').join(',') : "''"
    const query = `
      SELECT * FROM tasks
      WHERE status IN ('pending', 'in_progress')
      ${signalQueueIds.length > 0 ? `AND id NOT IN (${placeholders})` : ''}
      ORDER BY priority ASC, start_date ASC, created_at DESC
    `
    const rows = db.prepare(query).all(...signalQueueIds) as TaskRow[]
    return rows.map(rowToTask)
  },

  // Reorder signal queue by updating priorities
  // Takes an array of task IDs in the desired order and updates their priorities
  reorderSignalQueue(taskIds: string[]): void {
    const db = getDatabase()

    // Update each task's priority based on its position in the array
    // Lower index = higher priority (lower priority number)
    const updateStmt = db.prepare('UPDATE tasks SET priority = ?, updated_at = ? WHERE id = ?')
    const now = new Date().toISOString()

    db.transaction(() => {
      taskIds.forEach((taskId, index) => {
        // Priority starts at 1 (highest) and increments
        const priority = index + 1
        updateStmt.run(priority, now, taskId)
      })
    })()
  },
}
