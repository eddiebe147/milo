import { getDatabase } from '../services/database'
import { nanoid } from 'nanoid'
import type { Goal } from '../../src/types'

// Convert DB row to Goal type
function rowToGoal(row: Record<string, unknown>): Goal {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    parentId: row.parent_id as string | null,
    timeframe: row.timeframe as Goal['timeframe'],
    status: row.status as Goal['status'],
    targetDate: row.target_date as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// Type for raw database rows
type GoalRow = Record<string, unknown>

export const goalsRepository = {
  // Get all goals
  getAll(): Goal[] {
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM goals ORDER BY created_at DESC').all() as GoalRow[]
    return rows.map(rowToGoal)
  },

  // Get goals by timeframe
  getByTimeframe(timeframe: Goal['timeframe']): Goal[] {
    const db = getDatabase()
    const rows = db
      .prepare('SELECT * FROM goals WHERE timeframe = ? AND status = ? ORDER BY created_at DESC')
      .all(timeframe, 'active') as GoalRow[]
    return rows.map(rowToGoal)
  },

  // Get goal by ID
  getById(id: string): Goal | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(id)
    return row ? rowToGoal(row as Record<string, unknown>) : null
  },

  // Get child goals
  getChildren(parentId: string): Goal[] {
    const db = getDatabase()
    const rows = db
      .prepare('SELECT * FROM goals WHERE parent_id = ? ORDER BY created_at DESC')
      .all(parentId) as GoalRow[]
    return rows.map(rowToGoal)
  },

  // Get goal hierarchy (from yearly down to weekly)
  getHierarchy(): Record<Goal['timeframe'], Goal[]> {
    const db = getDatabase()
    const rows = db
      .prepare('SELECT * FROM goals WHERE status = ? ORDER BY timeframe, created_at DESC')
      .all('active') as GoalRow[]

    const goals = rows.map(rowToGoal)

    return {
      yearly: goals.filter(g => g.timeframe === 'yearly'),
      quarterly: goals.filter(g => g.timeframe === 'quarterly'),
      monthly: goals.filter(g => g.timeframe === 'monthly'),
      weekly: goals.filter(g => g.timeframe === 'weekly'),
    }
  },

  // Create a new goal
  create(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Goal {
    const db = getDatabase()
    const id = nanoid()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO goals (id, title, description, parent_id, timeframe, status, target_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      goal.title,
      goal.description ?? null,
      goal.parentId,
      goal.timeframe,
      goal.status,
      goal.targetDate ?? null,
      now,
      now
    )

    return this.getById(id)!
  },

  // Update a goal
  update(id: string, updates: Partial<Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>>): Goal | null {
    const db = getDatabase()
    const existing = this.getById(id)
    if (!existing) return null

    const now = new Date().toISOString()

    db.prepare(`
      UPDATE goals SET
        title = ?,
        description = ?,
        parent_id = ?,
        timeframe = ?,
        status = ?,
        target_date = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      updates.title ?? existing.title,
      updates.description ?? existing.description ?? null,
      updates.parentId ?? existing.parentId,
      updates.timeframe ?? existing.timeframe,
      updates.status ?? existing.status,
      updates.targetDate ?? existing.targetDate ?? null,
      now,
      id
    )

    return this.getById(id)
  },

  // Delete a goal (cascades to child goals setting their parent to null)
  delete(id: string): boolean {
    const db = getDatabase()
    const result = db.prepare('DELETE FROM goals WHERE id = ?').run(id)
    return result.changes > 0
  },

  // Archive a goal
  archive(id: string): Goal | null {
    return this.update(id, { status: 'archived' })
  },

  // Complete a goal
  complete(id: string): Goal | null {
    return this.update(id, { status: 'completed' })
  },
}
