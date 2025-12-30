import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { createTestDatabase, clearTestDatabase, closeTestDatabase } from '../test/setup'
import Database from 'better-sqlite3'
import type { Goal } from '../../src/types'

// We need to manually set up the module since we can't use vi.mock with dynamic imports
let db: Database.Database

// Type for raw database rows
type GoalRow = Record<string, unknown>

// Convert DB row to Goal type
function rowToGoal(row: GoalRow): Goal {
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

// Create a local version of goalsRepository that uses our test database
const goalsRepository = {
  getAll(): Goal[] {
    const rows = db.prepare('SELECT * FROM goals ORDER BY created_at DESC').all() as GoalRow[]
    return rows.map(rowToGoal)
  },

  getByTimeframe(timeframe: Goal['timeframe']): Goal[] {
    const rows = db
      .prepare('SELECT * FROM goals WHERE timeframe = ? AND status = ? ORDER BY created_at DESC')
      .all(timeframe, 'active') as GoalRow[]
    return rows.map(rowToGoal)
  },

  getById(id: string): Goal | null {
    const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(id)
    return row ? rowToGoal(row as GoalRow) : null
  },

  getChildren(parentId: string): Goal[] {
    const rows = db
      .prepare('SELECT * FROM goals WHERE parent_id = ? ORDER BY created_at DESC')
      .all(parentId) as GoalRow[]
    return rows.map(rowToGoal)
  },

  getHierarchy(): Record<Goal['timeframe'], Goal[]> {
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

  create(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Goal {
    const id = `goal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
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

  update(id: string, updates: Partial<Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>>): Goal | null {
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

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM goals WHERE id = ?').run(id)
    return result.changes > 0
  },

  archive(id: string): Goal | null {
    return this.update(id, { status: 'archived' })
  },

  complete(id: string): Goal | null {
    return this.update(id, { status: 'completed' })
  },
}

describe('goalsRepository', () => {
  beforeEach(() => {
    db = createTestDatabase()
    clearTestDatabase()
  })

  afterAll(() => {
    closeTestDatabase()
  })

  describe('create', () => {
    it('creates a goal with all required fields', () => {
      const goal = goalsRepository.create({
        title: 'Learn TypeScript',
        timeframe: 'quarterly',
        status: 'active',
        parentId: null,
      })

      expect(goal.id).toBeDefined()
      expect(goal.title).toBe('Learn TypeScript')
      expect(goal.timeframe).toBe('quarterly')
      expect(goal.status).toBe('active')
      expect(goal.parentId).toBeNull()
      expect(goal.createdAt).toBeDefined()
      expect(goal.updatedAt).toBeDefined()
    })

    it('creates a goal with optional fields', () => {
      const goal = goalsRepository.create({
        title: 'Complete project',
        description: 'Finish the main project by end of quarter',
        timeframe: 'monthly',
        status: 'active',
        parentId: null,
        targetDate: '2024-06-30',
      })

      expect(goal.description).toBe('Finish the main project by end of quarter')
      expect(goal.targetDate).toBe('2024-06-30')
    })

    it('creates a goal with a parent', () => {
      const parentGoal = goalsRepository.create({
        title: 'Yearly Goal',
        timeframe: 'yearly',
        status: 'active',
        parentId: null,
      })

      const childGoal = goalsRepository.create({
        title: 'Quarterly Goal',
        timeframe: 'quarterly',
        status: 'active',
        parentId: parentGoal.id,
      })

      expect(childGoal.parentId).toBe(parentGoal.id)
    })

    it('generates unique IDs for each goal', () => {
      const goal1 = goalsRepository.create({
        title: 'Goal 1',
        timeframe: 'weekly',
        status: 'active',
        parentId: null,
      })

      const goal2 = goalsRepository.create({
        title: 'Goal 2',
        timeframe: 'weekly',
        status: 'active',
        parentId: null,
      })

      expect(goal1.id).not.toBe(goal2.id)
    })
  })

  describe('getById', () => {
    it('returns goal by ID', () => {
      const created = goalsRepository.create({
        title: 'Test Goal',
        timeframe: 'monthly',
        status: 'active',
        parentId: null,
      })

      const fetched = goalsRepository.getById(created.id)

      expect(fetched).not.toBeNull()
      expect(fetched!.id).toBe(created.id)
      expect(fetched!.title).toBe('Test Goal')
    })

    it('returns null for non-existent ID', () => {
      const result = goalsRepository.getById('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('getAll', () => {
    it('returns empty array when no goals', () => {
      const goals = goalsRepository.getAll()
      expect(goals).toEqual([])
    })

    it('returns all goals ordered by created_at DESC', async () => {
      const goal1 = goalsRepository.create({
        title: 'First',
        timeframe: 'yearly',
        status: 'active',
        parentId: null,
      })
      await new Promise(resolve => setTimeout(resolve, 10))
      const goal2 = goalsRepository.create({
        title: 'Second',
        timeframe: 'quarterly',
        status: 'active',
        parentId: null,
      })
      await new Promise(resolve => setTimeout(resolve, 10))
      const goal3 = goalsRepository.create({
        title: 'Third',
        timeframe: 'monthly',
        status: 'active',
        parentId: null,
      })

      const goals = goalsRepository.getAll()

      expect(goals).toHaveLength(3)
      expect(goals[0].id).toBe(goal3.id) // Most recently created
      expect(goals[1].id).toBe(goal2.id)
      expect(goals[2].id).toBe(goal1.id)
    })

    it('returns goals of all statuses', () => {
      goalsRepository.create({
        title: 'Active Goal',
        timeframe: 'weekly',
        status: 'active',
        parentId: null,
      })

      goalsRepository.create({
        title: 'Completed Goal',
        timeframe: 'weekly',
        status: 'completed',
        parentId: null,
      })

      goalsRepository.create({
        title: 'Archived Goal',
        timeframe: 'weekly',
        status: 'archived',
        parentId: null,
      })

      const goals = goalsRepository.getAll()
      expect(goals).toHaveLength(3)
    })
  })

  describe('getByTimeframe', () => {
    beforeEach(() => {
      goalsRepository.create({
        title: 'Yearly Goal',
        timeframe: 'yearly',
        status: 'active',
        parentId: null,
      })

      goalsRepository.create({
        title: 'Quarterly Goal',
        timeframe: 'quarterly',
        status: 'active',
        parentId: null,
      })

      goalsRepository.create({
        title: 'Monthly Goal',
        timeframe: 'monthly',
        status: 'active',
        parentId: null,
      })

      goalsRepository.create({
        title: 'Weekly Goal',
        timeframe: 'weekly',
        status: 'active',
        parentId: null,
      })

      // Archived goal should not appear
      goalsRepository.create({
        title: 'Archived Yearly',
        timeframe: 'yearly',
        status: 'archived',
        parentId: null,
      })
    })

    it('returns only yearly goals with active status', () => {
      const goals = goalsRepository.getByTimeframe('yearly')

      expect(goals).toHaveLength(1)
      expect(goals[0].title).toBe('Yearly Goal')
      expect(goals[0].timeframe).toBe('yearly')
    })

    it('returns only quarterly goals with active status', () => {
      const goals = goalsRepository.getByTimeframe('quarterly')

      expect(goals).toHaveLength(1)
      expect(goals[0].title).toBe('Quarterly Goal')
    })

    it('returns only monthly goals with active status', () => {
      const goals = goalsRepository.getByTimeframe('monthly')

      expect(goals).toHaveLength(1)
      expect(goals[0].title).toBe('Monthly Goal')
    })

    it('returns only weekly goals with active status', () => {
      const goals = goalsRepository.getByTimeframe('weekly')

      expect(goals).toHaveLength(1)
      expect(goals[0].title).toBe('Weekly Goal')
    })

    it('excludes archived and completed goals', () => {
      // Add a completed goal
      goalsRepository.create({
        title: 'Completed Weekly',
        timeframe: 'weekly',
        status: 'completed',
        parentId: null,
      })

      const goals = goalsRepository.getByTimeframe('weekly')

      expect(goals).toHaveLength(1)
      expect(goals.every(g => g.status === 'active')).toBe(true)
    })
  })

  describe('getChildren', () => {
    it('returns empty array when no children', () => {
      const parent = goalsRepository.create({
        title: 'Parent Goal',
        timeframe: 'yearly',
        status: 'active',
        parentId: null,
      })

      const children = goalsRepository.getChildren(parent.id)
      expect(children).toEqual([])
    })

    it('returns all children of a goal', async () => {
      const parent = goalsRepository.create({
        title: 'Parent Goal',
        timeframe: 'yearly',
        status: 'active',
        parentId: null,
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const child1 = goalsRepository.create({
        title: 'Child 1',
        timeframe: 'quarterly',
        status: 'active',
        parentId: parent.id,
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const child2 = goalsRepository.create({
        title: 'Child 2',
        timeframe: 'quarterly',
        status: 'active',
        parentId: parent.id,
      })

      const children = goalsRepository.getChildren(parent.id)

      expect(children).toHaveLength(2)
      // Ordered by created_at DESC (newest first)
      expect(children[0].id).toBe(child2.id)
      expect(children[1].id).toBe(child1.id)
    })

    it('only returns direct children, not grandchildren', () => {
      const grandparent = goalsRepository.create({
        title: 'Grandparent',
        timeframe: 'yearly',
        status: 'active',
        parentId: null,
      })

      const parent = goalsRepository.create({
        title: 'Parent',
        timeframe: 'quarterly',
        status: 'active',
        parentId: grandparent.id,
      })

      goalsRepository.create({
        title: 'Grandchild',
        timeframe: 'monthly',
        status: 'active',
        parentId: parent.id,
      })

      const children = goalsRepository.getChildren(grandparent.id)

      expect(children).toHaveLength(1)
      expect(children[0].title).toBe('Parent')
    })
  })

  describe('getHierarchy', () => {
    it('returns empty hierarchy when no goals', () => {
      const hierarchy = goalsRepository.getHierarchy()

      expect(hierarchy.yearly).toEqual([])
      expect(hierarchy.quarterly).toEqual([])
      expect(hierarchy.monthly).toEqual([])
      expect(hierarchy.weekly).toEqual([])
    })

    it('returns goals organized by timeframe', () => {
      goalsRepository.create({
        title: 'Yearly 1',
        timeframe: 'yearly',
        status: 'active',
        parentId: null,
      })

      goalsRepository.create({
        title: 'Quarterly 1',
        timeframe: 'quarterly',
        status: 'active',
        parentId: null,
      })

      goalsRepository.create({
        title: 'Monthly 1',
        timeframe: 'monthly',
        status: 'active',
        parentId: null,
      })

      goalsRepository.create({
        title: 'Weekly 1',
        timeframe: 'weekly',
        status: 'active',
        parentId: null,
      })

      const hierarchy = goalsRepository.getHierarchy()

      expect(hierarchy.yearly).toHaveLength(1)
      expect(hierarchy.yearly[0].title).toBe('Yearly 1')

      expect(hierarchy.quarterly).toHaveLength(1)
      expect(hierarchy.quarterly[0].title).toBe('Quarterly 1')

      expect(hierarchy.monthly).toHaveLength(1)
      expect(hierarchy.monthly[0].title).toBe('Monthly 1')

      expect(hierarchy.weekly).toHaveLength(1)
      expect(hierarchy.weekly[0].title).toBe('Weekly 1')
    })

    it('only includes active goals', () => {
      goalsRepository.create({
        title: 'Active Goal',
        timeframe: 'yearly',
        status: 'active',
        parentId: null,
      })

      goalsRepository.create({
        title: 'Completed Goal',
        timeframe: 'yearly',
        status: 'completed',
        parentId: null,
      })

      goalsRepository.create({
        title: 'Archived Goal',
        timeframe: 'yearly',
        status: 'archived',
        parentId: null,
      })

      const hierarchy = goalsRepository.getHierarchy()

      expect(hierarchy.yearly).toHaveLength(1)
      expect(hierarchy.yearly[0].title).toBe('Active Goal')
    })
  })

  describe('update', () => {
    it('updates goal title', () => {
      const goal = goalsRepository.create({
        title: 'Original Title',
        timeframe: 'monthly',
        status: 'active',
        parentId: null,
      })

      const updated = goalsRepository.update(goal.id, { title: 'New Title' })

      expect(updated).not.toBeNull()
      expect(updated!.title).toBe('New Title')
    })

    it('updates goal description', () => {
      const goal = goalsRepository.create({
        title: 'Test Goal',
        timeframe: 'monthly',
        status: 'active',
        parentId: null,
      })

      const updated = goalsRepository.update(goal.id, { description: 'New description' })

      expect(updated!.description).toBe('New description')
    })

    it('updates goal timeframe', () => {
      const goal = goalsRepository.create({
        title: 'Test Goal',
        timeframe: 'monthly',
        status: 'active',
        parentId: null,
      })

      const updated = goalsRepository.update(goal.id, { timeframe: 'quarterly' })

      expect(updated!.timeframe).toBe('quarterly')
    })

    it('updates goal status', () => {
      const goal = goalsRepository.create({
        title: 'Test Goal',
        timeframe: 'monthly',
        status: 'active',
        parentId: null,
      })

      const updated = goalsRepository.update(goal.id, { status: 'completed' })

      expect(updated!.status).toBe('completed')
    })

    it('updates goal targetDate', () => {
      const goal = goalsRepository.create({
        title: 'Test Goal',
        timeframe: 'monthly',
        status: 'active',
        parentId: null,
      })

      const updated = goalsRepository.update(goal.id, { targetDate: '2024-12-31' })

      expect(updated!.targetDate).toBe('2024-12-31')
    })

    it('updates goal parentId', () => {
      const parent = goalsRepository.create({
        title: 'Parent Goal',
        timeframe: 'yearly',
        status: 'active',
        parentId: null,
      })

      const child = goalsRepository.create({
        title: 'Child Goal',
        timeframe: 'quarterly',
        status: 'active',
        parentId: null,
      })

      const updated = goalsRepository.update(child.id, { parentId: parent.id })

      expect(updated!.parentId).toBe(parent.id)
    })

    it('updates the updated_at timestamp', async () => {
      const goal = goalsRepository.create({
        title: 'Test Goal',
        timeframe: 'monthly',
        status: 'active',
        parentId: null,
      })

      const originalUpdatedAt = goal.updatedAt

      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      const updated = goalsRepository.update(goal.id, { title: 'Updated Title' })

      expect(updated!.updatedAt).not.toBe(originalUpdatedAt)
    })

    it('returns null for non-existent goal', () => {
      const result = goalsRepository.update('non-existent-id', { title: 'New Title' })
      expect(result).toBeNull()
    })

    it('preserves unchanged fields', () => {
      const goal = goalsRepository.create({
        title: 'Original Title',
        description: 'Original description',
        timeframe: 'monthly',
        status: 'active',
        parentId: null,
        targetDate: '2024-06-30',
      })

      const updated = goalsRepository.update(goal.id, { title: 'New Title' })

      expect(updated!.title).toBe('New Title')
      expect(updated!.description).toBe('Original description')
      expect(updated!.timeframe).toBe('monthly')
      expect(updated!.status).toBe('active')
      expect(updated!.targetDate).toBe('2024-06-30')
    })
  })

  describe('delete', () => {
    it('deletes a goal', () => {
      const goal = goalsRepository.create({
        title: 'To Delete',
        timeframe: 'monthly',
        status: 'active',
        parentId: null,
      })

      const result = goalsRepository.delete(goal.id)

      expect(result).toBe(true)
      expect(goalsRepository.getById(goal.id)).toBeNull()
    })

    it('returns false for non-existent goal', () => {
      const result = goalsRepository.delete('non-existent-id')
      expect(result).toBe(false)
    })

    it('sets child goal parentId to null when parent is deleted (cascades)', () => {
      const parent = goalsRepository.create({
        title: 'Parent',
        timeframe: 'yearly',
        status: 'active',
        parentId: null,
      })

      const child = goalsRepository.create({
        title: 'Child',
        timeframe: 'quarterly',
        status: 'active',
        parentId: parent.id,
      })

      goalsRepository.delete(parent.id)

      const updatedChild = goalsRepository.getById(child.id)
      expect(updatedChild).not.toBeNull()
      expect(updatedChild!.parentId).toBeNull()
    })
  })

  describe('archive', () => {
    it('archives a goal', () => {
      const goal = goalsRepository.create({
        title: 'To Archive',
        timeframe: 'monthly',
        status: 'active',
        parentId: null,
      })

      const archived = goalsRepository.archive(goal.id)

      expect(archived).not.toBeNull()
      expect(archived!.status).toBe('archived')
    })

    it('updates the updated_at timestamp', async () => {
      const goal = goalsRepository.create({
        title: 'Test Goal',
        timeframe: 'monthly',
        status: 'active',
        parentId: null,
      })

      const originalUpdatedAt = goal.updatedAt

      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      const archived = goalsRepository.archive(goal.id)

      expect(archived!.updatedAt).not.toBe(originalUpdatedAt)
    })

    it('returns null for non-existent goal', () => {
      const result = goalsRepository.archive('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('complete', () => {
    it('completes a goal', () => {
      const goal = goalsRepository.create({
        title: 'To Complete',
        timeframe: 'monthly',
        status: 'active',
        parentId: null,
      })

      const completed = goalsRepository.complete(goal.id)

      expect(completed).not.toBeNull()
      expect(completed!.status).toBe('completed')
    })

    it('updates the updated_at timestamp', async () => {
      const goal = goalsRepository.create({
        title: 'Test Goal',
        timeframe: 'monthly',
        status: 'active',
        parentId: null,
      })

      const originalUpdatedAt = goal.updatedAt

      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      const completed = goalsRepository.complete(goal.id)

      expect(completed!.updatedAt).not.toBe(originalUpdatedAt)
    })

    it('returns null for non-existent goal', () => {
      const result = goalsRepository.complete('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('goal hierarchy integration', () => {
    it('creates a full goal hierarchy (yearly -> quarterly -> monthly -> weekly)', () => {
      const yearly = goalsRepository.create({
        title: 'Become a better developer',
        timeframe: 'yearly',
        status: 'active',
        parentId: null,
      })

      const quarterly = goalsRepository.create({
        title: 'Master TypeScript',
        timeframe: 'quarterly',
        status: 'active',
        parentId: yearly.id,
      })

      const monthly = goalsRepository.create({
        title: 'Complete TypeScript course',
        timeframe: 'monthly',
        status: 'active',
        parentId: quarterly.id,
      })

      const weekly = goalsRepository.create({
        title: 'Finish chapter 5',
        timeframe: 'weekly',
        status: 'active',
        parentId: monthly.id,
      })

      // Verify hierarchy
      expect(goalsRepository.getChildren(yearly.id)).toHaveLength(1)
      expect(goalsRepository.getChildren(yearly.id)[0].id).toBe(quarterly.id)

      expect(goalsRepository.getChildren(quarterly.id)).toHaveLength(1)
      expect(goalsRepository.getChildren(quarterly.id)[0].id).toBe(monthly.id)

      expect(goalsRepository.getChildren(monthly.id)).toHaveLength(1)
      expect(goalsRepository.getChildren(monthly.id)[0].id).toBe(weekly.id)

      expect(goalsRepository.getChildren(weekly.id)).toHaveLength(0)

      // Verify getHierarchy returns all
      const hierarchy = goalsRepository.getHierarchy()
      expect(hierarchy.yearly).toHaveLength(1)
      expect(hierarchy.quarterly).toHaveLength(1)
      expect(hierarchy.monthly).toHaveLength(1)
      expect(hierarchy.weekly).toHaveLength(1)
    })

    it('tracks progress through completing child goals', () => {
      const yearly = goalsRepository.create({
        title: 'Yearly Goal',
        timeframe: 'yearly',
        status: 'active',
        parentId: null,
      })

      const weekly1 = goalsRepository.create({
        title: 'Weekly 1',
        timeframe: 'weekly',
        status: 'active',
        parentId: yearly.id,
      })

      const weekly2 = goalsRepository.create({
        title: 'Weekly 2',
        timeframe: 'weekly',
        status: 'active',
        parentId: yearly.id,
      })

      // Complete one weekly goal
      goalsRepository.complete(weekly1.id)

      // Verify states
      expect(goalsRepository.getById(weekly1.id)!.status).toBe('completed')
      expect(goalsRepository.getById(weekly2.id)!.status).toBe('active')
      expect(goalsRepository.getById(yearly.id)!.status).toBe('active')

      // Active children should only show weekly2
      const activeChildren = goalsRepository.getChildren(yearly.id).filter(g => g.status === 'active')
      expect(activeChildren).toHaveLength(1)
      expect(activeChildren[0].id).toBe(weekly2.id)
    })
  })
})
