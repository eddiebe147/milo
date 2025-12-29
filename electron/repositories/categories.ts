import { getDatabase } from '../services/database'
import { nanoid } from 'nanoid'
import type { Category } from '../../src/types'

// Convert DB row to Category type
function rowToCategory(row: Record<string, unknown>): Category {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
    sortOrder: row.sort_order as number,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

type CategoryRow = Record<string, unknown>

export const categoriesRepository = {
  // Get all categories
  getAll(): Category[] {
    const db = getDatabase()
    const rows = db
      .prepare('SELECT * FROM categories ORDER BY sort_order ASC, name ASC')
      .all() as CategoryRow[]
    return rows.map(rowToCategory)
  },

  // Get only active categories
  getActive(): Category[] {
    const db = getDatabase()
    const rows = db
      .prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC')
      .all() as CategoryRow[]
    return rows.map(rowToCategory)
  },

  // Get category by ID
  getById(id: string): Category | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
    return row ? rowToCategory(row as CategoryRow) : null
  },

  // Create a new category
  create(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Category {
    const db = getDatabase()
    const id = nanoid()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO categories (id, name, color, sort_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      category.name,
      category.color,
      category.sortOrder,
      category.isActive ? 1 : 0,
      now,
      now
    )

    return this.getById(id)!
  },

  // Update a category
  update(id: string, updates: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>): Category | null {
    const db = getDatabase()
    const existing = this.getById(id)
    if (!existing) return null

    const now = new Date().toISOString()

    db.prepare(`
      UPDATE categories SET
        name = ?,
        color = ?,
        sort_order = ?,
        is_active = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      updates.name ?? existing.name,
      updates.color ?? existing.color,
      updates.sortOrder ?? existing.sortOrder,
      (updates.isActive ?? existing.isActive) ? 1 : 0,
      now,
      id
    )

    return this.getById(id)
  },

  // Delete a category (tasks will have category_id set to NULL)
  delete(id: string): boolean {
    const db = getDatabase()
    // Don't allow deleting the default "inbox" category
    if (id === 'inbox') return false
    const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id)
    return result.changes > 0
  },

  // Reorder categories
  reorder(orderedIds: string[]): void {
    const db = getDatabase()
    const stmt = db.prepare('UPDATE categories SET sort_order = ?, updated_at = ? WHERE id = ?')
    const now = new Date().toISOString()

    for (let i = 0; i < orderedIds.length; i++) {
      stmt.run(i, now, orderedIds[i])
    }
  },
}
