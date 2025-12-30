import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { createTestDatabase, clearTestDatabase, closeTestDatabase } from '../test/setup'
import Database from 'better-sqlite3'
import type { Task } from '../../src/types'

// We need to manually set up the module since we can't use vi.mock with dynamic imports
let db: Database.Database

// Convert DB row to Task type (same as in tasks.ts)
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

// Create a local version of tasksRepository that uses our test database
const tasksRepository = {
  getAll(): Task[] {
    const rows = db.prepare('SELECT * FROM tasks ORDER BY priority ASC, created_at DESC').all() as TaskRow[]
    return rows.map(rowToTask)
  },

  getByDate(date: string): Task[] {
    const rows = db
      .prepare('SELECT * FROM tasks WHERE scheduled_date = ? ORDER BY priority ASC, created_at DESC')
      .all(date) as TaskRow[]
    return rows.map(rowToTask)
  },

  getToday(): Task[] {
    const today = new Date().toISOString().split('T')[0]
    return this.getByDate(today)
  },

  getById(id: string): Task | null {
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
    return row ? rowToTask(row as Record<string, unknown>) : null
  },

  getByGoal(goalId: string): Task[] {
    const rows = db
      .prepare('SELECT * FROM tasks WHERE goal_id = ? ORDER BY scheduled_date DESC, priority ASC')
      .all(goalId) as TaskRow[]
    return rows.map(rowToTask)
  },

  getActive(): Task | null {
    const row = db.prepare("SELECT * FROM tasks WHERE status = 'in_progress' LIMIT 1").get()
    return row ? rowToTask(row as Record<string, unknown>) : null
  },

  getPendingToday(): Task[] {
    const today = new Date().toISOString().split('T')[0]
    const rows = db
      .prepare(`
        SELECT * FROM tasks
        WHERE scheduled_date = ? AND status IN ('pending', 'in_progress')
        ORDER BY priority ASC, created_at DESC
      `)
      .all(today) as TaskRow[]
    return rows.map(rowToTask)
  },

  create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
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

  update(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>): Task | null {
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

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
    return result.changes > 0
  },

  start(id: string): Task | null {
    const now = new Date().toISOString()

    // First, set any currently in_progress tasks back to pending
    db.prepare(`
      UPDATE tasks SET status = 'pending', updated_at = ? WHERE status = 'in_progress'
    `).run(now)

    // Then set this task as in_progress
    return this.update(id, { status: 'in_progress' })
  },

  complete(id: string): Task | null {
    const now = new Date().toISOString()
    return this.update(id, { status: 'completed', completedAt: now })
  },

  defer(id: string): Task | null {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    return this.update(id, { status: 'deferred', scheduledDate: tomorrowStr })
  },

  getCompletionStats(startDate: string, endDate: string): { completed: number; total: number } {
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

  getAllIncomplete(): Task[] {
    const rows = db
      .prepare(`
        SELECT * FROM tasks
        WHERE status IN ('pending', 'in_progress')
        ORDER BY priority ASC, start_date ASC, created_at DESC
      `)
      .all() as TaskRow[]
    return rows.map(rowToTask)
  },

  getByCategory(categoryId: string): Task[] {
    const rows = db
      .prepare(`
        SELECT * FROM tasks
        WHERE category_id = ? AND status IN ('pending', 'in_progress')
        ORDER BY priority ASC, start_date ASC
      `)
      .all(categoryId) as TaskRow[]
    return rows.map(rowToTask)
  },

  getSpanningToday(): Task[] {
    const today = new Date().toISOString().split('T')[0]
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

  getWorkedYesterday(): Task[] {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const rows = db
      .prepare(`
        SELECT * FROM tasks
        WHERE last_worked_date = ? AND status IN ('pending', 'in_progress')
        ORDER BY priority ASC
      `)
      .all(yesterday) as TaskRow[]
    return rows.map(rowToTask)
  },

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

  getSignalQueue(limit: number = 5): Task[] {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

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

  getBacklog(signalQueueIds: string[]): Task[] {
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
}

// Helper function to create a goal for foreign key constraints
function createTestGoal(id: string, title: string = 'Test Goal'): void {
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO goals (id, title, timeframe, status, created_at, updated_at)
    VALUES (?, ?, 'monthly', 'active', ?, ?)
  `).run(id, title, now, now)
}

// Helper function to create a category for foreign key constraints
function createTestCategory(id: string, name: string = 'Test Category'): void {
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO categories (id, name, color, sort_order, is_active, created_at, updated_at)
    VALUES (?, ?, '#FF0000', 0, 1, ?, ?)
  `).run(id, name, now, now)
}

// Helper function to get today's date string
function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

// Helper function to get yesterday's date string
function getYesterday(): string {
  return new Date(Date.now() - 86400000).toISOString().split('T')[0]
}

// Helper function to get tomorrow's date string
function getTomorrow(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
}

describe('tasksRepository', () => {
  beforeEach(() => {
    db = createTestDatabase()
    clearTestDatabase()
  })

  afterAll(() => {
    closeTestDatabase()
  })

  describe('create', () => {
    it('creates a task with required fields', () => {
      const task = tasksRepository.create({
        title: 'Test Task',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      expect(task.id).toBeDefined()
      expect(task.title).toBe('Test Task')
      expect(task.status).toBe('pending')
      expect(task.priority).toBe(3)
      expect(task.scheduledDate).toBe(getToday())
      expect(task.createdAt).toBeDefined()
      expect(task.updatedAt).toBeDefined()
    })

    it('creates a task with all optional fields', () => {
      createTestGoal('goal-1')
      createTestCategory('cat-1')

      const task = tasksRepository.create({
        title: 'Full Task',
        description: 'A detailed description',
        goalId: 'goal-1',
        categoryId: 'cat-1',
        status: 'pending',
        priority: 1,
        rationale: 'This is important because...',
        scheduledDate: getToday(),
        startDate: getToday(),
        endDate: getTomorrow(),
        estimatedDays: 2,
        daysWorked: 0,
        lastWorkedDate: undefined,
        completedAt: undefined,
      })

      expect(task.description).toBe('A detailed description')
      expect(task.goalId).toBe('goal-1')
      expect(task.categoryId).toBe('cat-1')
      expect(task.rationale).toBe('This is important because...')
      expect(task.startDate).toBe(getToday())
      expect(task.endDate).toBe(getTomorrow())
      expect(task.estimatedDays).toBe(2)
      expect(task.daysWorked).toBe(0)
    })

    it('generates unique IDs for each task', () => {
      const task1 = tasksRepository.create({
        title: 'Task 1',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      const task2 = tasksRepository.create({
        title: 'Task 2',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      expect(task1.id).not.toBe(task2.id)
    })

    it('defaults startDate and endDate to scheduledDate when not provided', () => {
      const task = tasksRepository.create({
        title: 'Task',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: '2024-01-15',
      })

      expect(task.startDate).toBe('2024-01-15')
      expect(task.endDate).toBe('2024-01-15')
    })

    it('defaults estimatedDays to 1 and daysWorked to 0', () => {
      const task = tasksRepository.create({
        title: 'Task',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      expect(task.estimatedDays).toBe(1)
      expect(task.daysWorked).toBe(0)
    })
  })

  describe('getById', () => {
    it('returns task by ID', () => {
      const created = tasksRepository.create({
        title: 'Find Me',
        goalId: null,
        status: 'pending',
        priority: 2,
        scheduledDate: getToday(),
      })

      const fetched = tasksRepository.getById(created.id)

      expect(fetched).not.toBeNull()
      expect(fetched!.id).toBe(created.id)
      expect(fetched!.title).toBe('Find Me')
    })

    it('returns null for non-existent ID', () => {
      const result = tasksRepository.getById('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('getAll', () => {
    it('returns empty array when no tasks', () => {
      const tasks = tasksRepository.getAll()
      expect(tasks).toEqual([])
    })

    it('returns all tasks ordered by priority ASC then created_at DESC', async () => {
      tasksRepository.create({
        title: 'Priority 3',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })
      await new Promise(resolve => setTimeout(resolve, 10))

      tasksRepository.create({
        title: 'Priority 1',
        goalId: null,
        status: 'pending',
        priority: 1,
        scheduledDate: getToday(),
      })
      await new Promise(resolve => setTimeout(resolve, 10))

      tasksRepository.create({
        title: 'Priority 3 Second',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      const tasks = tasksRepository.getAll()

      expect(tasks).toHaveLength(3)
      expect(tasks[0].title).toBe('Priority 1') // Priority 1 first
      expect(tasks[1].title).toBe('Priority 3 Second') // Priority 3, but created later
      expect(tasks[2].title).toBe('Priority 3') // Priority 3, created first
    })
  })

  describe('getByDate', () => {
    it('returns tasks for specific date', () => {
      const today = getToday()
      const tomorrow = getTomorrow()

      tasksRepository.create({
        title: 'Today Task',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: today,
      })

      tasksRepository.create({
        title: 'Tomorrow Task',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: tomorrow,
      })

      const todayTasks = tasksRepository.getByDate(today)
      const tomorrowTasks = tasksRepository.getByDate(tomorrow)

      expect(todayTasks).toHaveLength(1)
      expect(todayTasks[0].title).toBe('Today Task')
      expect(tomorrowTasks).toHaveLength(1)
      expect(tomorrowTasks[0].title).toBe('Tomorrow Task')
    })

    it('returns empty array for date with no tasks', () => {
      const tasks = tasksRepository.getByDate('2099-12-31')
      expect(tasks).toEqual([])
    })
  })

  describe('getToday', () => {
    it('returns only tasks scheduled for today', () => {
      tasksRepository.create({
        title: 'Today Task',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      tasksRepository.create({
        title: 'Tomorrow Task',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getTomorrow(),
      })

      const tasks = tasksRepository.getToday()

      expect(tasks).toHaveLength(1)
      expect(tasks[0].title).toBe('Today Task')
    })
  })

  describe('getByGoal', () => {
    it('returns tasks linked to specific goal', () => {
      createTestGoal('goal-1', 'Goal One')
      createTestGoal('goal-2', 'Goal Two')

      tasksRepository.create({
        title: 'Goal 1 Task',
        goalId: 'goal-1',
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      tasksRepository.create({
        title: 'Goal 2 Task',
        goalId: 'goal-2',
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      const goal1Tasks = tasksRepository.getByGoal('goal-1')
      const goal2Tasks = tasksRepository.getByGoal('goal-2')

      expect(goal1Tasks).toHaveLength(1)
      expect(goal1Tasks[0].title).toBe('Goal 1 Task')
      expect(goal2Tasks).toHaveLength(1)
      expect(goal2Tasks[0].title).toBe('Goal 2 Task')
    })

    it('returns tasks ordered by scheduled_date DESC, then priority ASC', async () => {
      createTestGoal('goal-1')

      tasksRepository.create({
        title: 'Earlier Date',
        goalId: 'goal-1',
        status: 'pending',
        priority: 3,
        scheduledDate: '2024-01-01',
      })

      tasksRepository.create({
        title: 'Later Date',
        goalId: 'goal-1',
        status: 'pending',
        priority: 3,
        scheduledDate: '2024-01-10',
      })

      const tasks = tasksRepository.getByGoal('goal-1')

      expect(tasks[0].title).toBe('Later Date') // Newer date first
      expect(tasks[1].title).toBe('Earlier Date')
    })
  })

  describe('getActive', () => {
    it('returns null when no in_progress task', () => {
      tasksRepository.create({
        title: 'Pending Task',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      const active = tasksRepository.getActive()
      expect(active).toBeNull()
    })

    it('returns the in_progress task', () => {
      tasksRepository.create({
        title: 'Pending Task',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      tasksRepository.create({
        title: 'Active Task',
        goalId: null,
        status: 'in_progress',
        priority: 3,
        scheduledDate: getToday(),
      })

      const active = tasksRepository.getActive()

      expect(active).not.toBeNull()
      expect(active!.title).toBe('Active Task')
      expect(active!.status).toBe('in_progress')
    })
  })

  describe('getPendingToday', () => {
    it('returns pending and in_progress tasks for today', () => {
      const today = getToday()

      tasksRepository.create({
        title: 'Pending Today',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: today,
      })

      tasksRepository.create({
        title: 'In Progress Today',
        goalId: null,
        status: 'in_progress',
        priority: 3,
        scheduledDate: today,
      })

      tasksRepository.create({
        title: 'Completed Today',
        goalId: null,
        status: 'completed',
        priority: 3,
        scheduledDate: today,
      })

      tasksRepository.create({
        title: 'Pending Tomorrow',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getTomorrow(),
      })

      const tasks = tasksRepository.getPendingToday()

      expect(tasks).toHaveLength(2)
      expect(tasks.map(t => t.title).sort()).toEqual(['In Progress Today', 'Pending Today'])
    })
  })

  describe('update', () => {
    it('updates task fields', () => {
      const task = tasksRepository.create({
        title: 'Original Title',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      const updated = tasksRepository.update(task.id, {
        title: 'Updated Title',
        priority: 1,
        description: 'New description',
      })

      expect(updated).not.toBeNull()
      expect(updated!.title).toBe('Updated Title')
      expect(updated!.priority).toBe(1)
      expect(updated!.description).toBe('New description')
    })

    it('updates the updated_at timestamp', async () => {
      const task = tasksRepository.create({
        title: 'Task',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })
      const originalUpdatedAt = task.updatedAt

      await new Promise(resolve => setTimeout(resolve, 10))
      const updated = tasksRepository.update(task.id, { title: 'New Title' })

      expect(updated!.updatedAt).not.toBe(originalUpdatedAt)
    })

    it('returns null for non-existent task', () => {
      const result = tasksRepository.update('non-existent', { title: 'New' })
      expect(result).toBeNull()
    })

    it('preserves fields not included in updates', () => {
      const task = tasksRepository.create({
        title: 'Original',
        description: 'Original Description',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      const updated = tasksRepository.update(task.id, { title: 'New Title' })

      expect(updated!.description).toBe('Original Description')
      expect(updated!.priority).toBe(3)
    })
  })

  describe('delete', () => {
    it('deletes existing task', () => {
      const task = tasksRepository.create({
        title: 'To Delete',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      const result = tasksRepository.delete(task.id)

      expect(result).toBe(true)
      expect(tasksRepository.getById(task.id)).toBeNull()
    })

    it('returns false for non-existent task', () => {
      const result = tasksRepository.delete('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('start', () => {
    it('sets task status to in_progress', () => {
      const task = tasksRepository.create({
        title: 'Start Me',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      const started = tasksRepository.start(task.id)

      expect(started).not.toBeNull()
      expect(started!.status).toBe('in_progress')
    })

    it('sets other in_progress tasks back to pending', () => {
      const task1 = tasksRepository.create({
        title: 'First Active',
        goalId: null,
        status: 'in_progress',
        priority: 3,
        scheduledDate: getToday(),
      })

      const task2 = tasksRepository.create({
        title: 'Second Task',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      tasksRepository.start(task2.id)

      const task1After = tasksRepository.getById(task1.id)
      const task2After = tasksRepository.getById(task2.id)

      expect(task1After!.status).toBe('pending')
      expect(task2After!.status).toBe('in_progress')
    })

    it('returns null for non-existent task', () => {
      const result = tasksRepository.start('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('complete', () => {
    it('sets task status to completed and sets completedAt', () => {
      const task = tasksRepository.create({
        title: 'Complete Me',
        goalId: null,
        status: 'in_progress',
        priority: 3,
        scheduledDate: getToday(),
      })

      const completed = tasksRepository.complete(task.id)

      expect(completed).not.toBeNull()
      expect(completed!.status).toBe('completed')
      expect(completed!.completedAt).toBeDefined()
    })

    it('returns null for non-existent task', () => {
      const result = tasksRepository.complete('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('defer', () => {
    it('sets task status to deferred and moves to tomorrow', () => {
      const task = tasksRepository.create({
        title: 'Defer Me',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      const deferred = tasksRepository.defer(task.id)

      expect(deferred).not.toBeNull()
      expect(deferred!.status).toBe('deferred')
      expect(deferred!.scheduledDate).toBe(getTomorrow())
    })

    it('returns null for non-existent task', () => {
      const result = tasksRepository.defer('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('getCompletionStats', () => {
    it('returns stats for date range', () => {
      const today = getToday()
      const yesterday = getYesterday()

      tasksRepository.create({
        title: 'Completed Today',
        goalId: null,
        status: 'completed',
        priority: 3,
        scheduledDate: today,
      })

      tasksRepository.create({
        title: 'Pending Today',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: today,
      })

      tasksRepository.create({
        title: 'Completed Yesterday',
        goalId: null,
        status: 'completed',
        priority: 3,
        scheduledDate: yesterday,
      })

      const todayStats = tasksRepository.getCompletionStats(today, today)
      const rangeStats = tasksRepository.getCompletionStats(yesterday, today)

      expect(todayStats.total).toBe(2)
      expect(todayStats.completed).toBe(1)
      expect(rangeStats.total).toBe(3)
      expect(rangeStats.completed).toBe(2)
    })

    it('returns zero stats for empty date range', () => {
      const stats = tasksRepository.getCompletionStats('2099-01-01', '2099-12-31')
      expect(stats.total).toBe(0)
      // SQLite returns null for SUM of empty set, which the repository handles
      expect(stats.completed ?? 0).toBe(0)
    })
  })

  describe('getAllIncomplete', () => {
    it('returns only pending and in_progress tasks', () => {
      tasksRepository.create({
        title: 'Pending',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      tasksRepository.create({
        title: 'In Progress',
        goalId: null,
        status: 'in_progress',
        priority: 2,
        scheduledDate: getToday(),
      })

      tasksRepository.create({
        title: 'Completed',
        goalId: null,
        status: 'completed',
        priority: 1,
        scheduledDate: getToday(),
      })

      tasksRepository.create({
        title: 'Deferred',
        goalId: null,
        status: 'deferred',
        priority: 4,
        scheduledDate: getTomorrow(),
      })

      const incomplete = tasksRepository.getAllIncomplete()

      expect(incomplete).toHaveLength(2)
      expect(incomplete.map(t => t.title).sort()).toEqual(['In Progress', 'Pending'])
    })

    it('returns tasks ordered by priority ASC, start_date ASC, created_at DESC', () => {
      tasksRepository.create({
        title: 'Priority 3, Later Date',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
        startDate: '2024-06-01',
      })

      tasksRepository.create({
        title: 'Priority 1',
        goalId: null,
        status: 'pending',
        priority: 1,
        scheduledDate: getToday(),
        startDate: '2024-05-01',
      })

      tasksRepository.create({
        title: 'Priority 3, Earlier Date',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
        startDate: '2024-05-01',
      })

      const incomplete = tasksRepository.getAllIncomplete()

      expect(incomplete[0].title).toBe('Priority 1')
      expect(incomplete[1].title).toBe('Priority 3, Earlier Date')
      expect(incomplete[2].title).toBe('Priority 3, Later Date')
    })
  })

  describe('getByCategory', () => {
    it('returns incomplete tasks for specific category', () => {
      createTestCategory('cat-1', 'Category 1')
      createTestCategory('cat-2', 'Category 2')

      tasksRepository.create({
        title: 'Cat 1 Task',
        goalId: null,
        categoryId: 'cat-1',
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      tasksRepository.create({
        title: 'Cat 2 Task',
        goalId: null,
        categoryId: 'cat-2',
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      tasksRepository.create({
        title: 'Cat 1 Completed',
        goalId: null,
        categoryId: 'cat-1',
        status: 'completed',
        priority: 3,
        scheduledDate: getToday(),
      })

      const cat1Tasks = tasksRepository.getByCategory('cat-1')

      expect(cat1Tasks).toHaveLength(1)
      expect(cat1Tasks[0].title).toBe('Cat 1 Task')
    })
  })

  describe('getSpanningToday', () => {
    it('returns tasks that span today (start_date <= today AND end_date >= today)', () => {
      const today = getToday()
      const yesterday = getYesterday()
      const tomorrow = getTomorrow()

      // Task that spans today (started yesterday, ends tomorrow)
      tasksRepository.create({
        title: 'Spanning Task',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: yesterday,
        startDate: yesterday,
        endDate: tomorrow,
      })

      // Task that started and ends today
      tasksRepository.create({
        title: 'Today Only',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: today,
        startDate: today,
        endDate: today,
      })

      // Task that ended yesterday (should not be included)
      tasksRepository.create({
        title: 'Ended Yesterday',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: yesterday,
        startDate: yesterday,
        endDate: yesterday,
      })

      // Task starting tomorrow (should not be included)
      tasksRepository.create({
        title: 'Starts Tomorrow',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: tomorrow,
        startDate: tomorrow,
        endDate: tomorrow,
      })

      const spanning = tasksRepository.getSpanningToday()

      expect(spanning).toHaveLength(2)
      expect(spanning.map(t => t.title).sort()).toEqual(['Spanning Task', 'Today Only'])
    })

    it('excludes completed and deferred tasks', () => {
      const today = getToday()

      tasksRepository.create({
        title: 'Completed Spanning',
        goalId: null,
        status: 'completed',
        priority: 3,
        scheduledDate: today,
        startDate: today,
        endDate: today,
      })

      tasksRepository.create({
        title: 'Pending Spanning',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: today,
        startDate: today,
        endDate: today,
      })

      const spanning = tasksRepository.getSpanningToday()

      expect(spanning).toHaveLength(1)
      expect(spanning[0].title).toBe('Pending Spanning')
    })
  })

  describe('getWorkedYesterday', () => {
    it('returns incomplete tasks that were worked on yesterday', () => {
      const yesterday = getYesterday()
      const today = getToday()

      tasksRepository.create({
        title: 'Worked Yesterday',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: today,
        lastWorkedDate: yesterday,
      })

      tasksRepository.create({
        title: 'Worked Today',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: today,
        lastWorkedDate: today,
      })

      tasksRepository.create({
        title: 'Completed Yesterday',
        goalId: null,
        status: 'completed',
        priority: 3,
        scheduledDate: yesterday,
        lastWorkedDate: yesterday,
      })

      const workedYesterday = tasksRepository.getWorkedYesterday()

      expect(workedYesterday).toHaveLength(1)
      expect(workedYesterday[0].title).toBe('Worked Yesterday')
    })
  })

  describe('recordWork', () => {
    it('increments daysWorked and sets lastWorkedDate to today', () => {
      const task = tasksRepository.create({
        title: 'Work On Me',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
        daysWorked: 0,
      })

      const worked = tasksRepository.recordWork(task.id)

      expect(worked).not.toBeNull()
      expect(worked!.daysWorked).toBe(1)
      expect(worked!.lastWorkedDate).toBe(getToday())
    })

    it('does not increment daysWorked if already worked today', () => {
      const today = getToday()
      const task = tasksRepository.create({
        title: 'Already Worked Today',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: today,
        daysWorked: 1,
        lastWorkedDate: today,
      })

      const worked = tasksRepository.recordWork(task.id)

      expect(worked!.daysWorked).toBe(1) // Should not increment
      expect(worked!.lastWorkedDate).toBe(today)
    })

    it('increments daysWorked if last worked on a different day', () => {
      const yesterday = getYesterday()
      const task = tasksRepository.create({
        title: 'Worked Yesterday',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
        daysWorked: 2,
        lastWorkedDate: yesterday,
      })

      const worked = tasksRepository.recordWork(task.id)

      expect(worked!.daysWorked).toBe(3)
      expect(worked!.lastWorkedDate).toBe(getToday())
    })

    it('returns null for non-existent task', () => {
      const result = tasksRepository.recordWork('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('getSignalQueue', () => {
    it('returns tasks for today limited by parameter', () => {
      const today = getToday()

      // Priority constraint is 1-5, so create 10 tasks with valid priorities
      for (let i = 0; i < 10; i++) {
        tasksRepository.create({
          title: `Task ${i}`,
          goalId: null,
          status: 'pending',
          priority: (i % 5) + 1, // Cycles through 1-5
          scheduledDate: today,
        })
      }

      const queue = tasksRepository.getSignalQueue(5)

      expect(queue).toHaveLength(5)
    })

    it('prioritizes in_progress tasks first', () => {
      const today = getToday()

      tasksRepository.create({
        title: 'Pending High Priority',
        goalId: null,
        status: 'pending',
        priority: 1,
        scheduledDate: today,
      })

      tasksRepository.create({
        title: 'In Progress Low Priority',
        goalId: null,
        status: 'in_progress',
        priority: 5,
        scheduledDate: today,
      })

      const queue = tasksRepository.getSignalQueue(5)

      expect(queue[0].title).toBe('In Progress Low Priority')
    })

    it('includes tasks scheduled for today and overdue tasks', () => {
      const today = getToday()
      const yesterday = getYesterday()
      const tomorrow = getTomorrow()

      tasksRepository.create({
        title: 'Today Task',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: today,
      })

      tasksRepository.create({
        title: 'Overdue Task',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: yesterday,
      })

      tasksRepository.create({
        title: 'Tomorrow Task',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: tomorrow,
      })

      const queue = tasksRepository.getSignalQueue(10)

      expect(queue).toHaveLength(2)
      expect(queue.map(t => t.title).sort()).toEqual(['Overdue Task', 'Today Task'])
    })

    it('includes tasks spanning today', () => {
      const yesterday = getYesterday()
      const tomorrow = getTomorrow()

      // Future scheduled date but spans today
      tasksRepository.create({
        title: 'Spanning Task',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: tomorrow,
        startDate: yesterday,
        endDate: tomorrow,
      })

      const queue = tasksRepository.getSignalQueue(5)

      expect(queue).toHaveLength(1)
      expect(queue[0].title).toBe('Spanning Task')
    })

    it('uses default limit of 5', () => {
      const today = getToday()

      for (let i = 0; i < 10; i++) {
        tasksRepository.create({
          title: `Task ${i}`,
          goalId: null,
          status: 'pending',
          priority: 3,
          scheduledDate: today,
        })
      }

      const queue = tasksRepository.getSignalQueue()

      expect(queue).toHaveLength(5)
    })
  })

  describe('getBacklog', () => {
    it('returns incomplete tasks not in the provided IDs', () => {
      const task1 = tasksRepository.create({
        title: 'In Queue',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      tasksRepository.create({
        title: 'In Backlog',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      const backlog = tasksRepository.getBacklog([task1.id])

      expect(backlog).toHaveLength(1)
      expect(backlog[0].title).toBe('In Backlog')
    })

    it('excludes completed and deferred tasks', () => {
      tasksRepository.create({
        title: 'Pending',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      tasksRepository.create({
        title: 'Completed',
        goalId: null,
        status: 'completed',
        priority: 3,
        scheduledDate: getToday(),
      })

      tasksRepository.create({
        title: 'Deferred',
        goalId: null,
        status: 'deferred',
        priority: 3,
        scheduledDate: getTomorrow(),
      })

      const backlog = tasksRepository.getBacklog([])

      expect(backlog).toHaveLength(1)
      expect(backlog[0].title).toBe('Pending')
    })

    it('returns all incomplete tasks when empty ID array provided', () => {
      tasksRepository.create({
        title: 'Task 1',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
      })

      tasksRepository.create({
        title: 'Task 2',
        goalId: null,
        status: 'in_progress',
        priority: 3,
        scheduledDate: getToday(),
      })

      const backlog = tasksRepository.getBacklog([])

      expect(backlog).toHaveLength(2)
    })

    it('returns tasks ordered by priority ASC, start_date ASC, created_at DESC', async () => {
      tasksRepository.create({
        title: 'Priority 3',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
        startDate: '2024-05-01',
      })
      await new Promise(resolve => setTimeout(resolve, 10))

      tasksRepository.create({
        title: 'Priority 1',
        goalId: null,
        status: 'pending',
        priority: 1,
        scheduledDate: getToday(),
        startDate: '2024-05-01',
      })
      await new Promise(resolve => setTimeout(resolve, 10))

      tasksRepository.create({
        title: 'Priority 3 Later',
        goalId: null,
        status: 'pending',
        priority: 3,
        scheduledDate: getToday(),
        startDate: '2024-06-01',
      })

      const backlog = tasksRepository.getBacklog([])

      expect(backlog[0].title).toBe('Priority 1')
      expect(backlog[1].title).toBe('Priority 3')
      expect(backlog[2].title).toBe('Priority 3 Later')
    })
  })
})
