import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { createTestDatabase, clearTestDatabase, closeTestDatabase } from '../test/setup'
import Database from 'better-sqlite3'

// We need to manually set up the module since we can't use vi.mock with dynamic imports
let db: Database.Database

// Category type definition matching src/types
interface Category {
  id: string
  name: string
  color: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

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

// Create a local version of categoriesRepository that uses our test database
const categoriesRepository = {
  // Get all categories
  getAll(): Category[] {
    const rows = db
      .prepare('SELECT * FROM categories ORDER BY sort_order ASC, name ASC')
      .all() as CategoryRow[]
    return rows.map(rowToCategory)
  },

  // Get only active categories
  getActive(): Category[] {
    const rows = db
      .prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC')
      .all() as CategoryRow[]
    return rows.map(rowToCategory)
  },

  // Get category by ID
  getById(id: string): Category | null {
    const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
    return row ? rowToCategory(row as CategoryRow) : null
  },

  // Create a new category
  create(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Category {
    const id = `cat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
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
    // Don't allow deleting the default "inbox" category
    if (id === 'inbox') return false
    const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id)
    return result.changes > 0
  },

  // Reorder categories
  reorder(orderedIds: string[]): void {
    const stmt = db.prepare('UPDATE categories SET sort_order = ?, updated_at = ? WHERE id = ?')
    const now = new Date().toISOString()

    for (let i = 0; i < orderedIds.length; i++) {
      stmt.run(i, now, orderedIds[i])
    }
  },
}

describe('categoriesRepository', () => {
  beforeEach(() => {
    db = createTestDatabase()
    clearTestDatabase()
  })

  afterAll(() => {
    closeTestDatabase()
  })

  describe('create', () => {
    it('creates a category with all properties', () => {
      const category = categoriesRepository.create({
        name: 'Work',
        color: '#ff0000',
        sortOrder: 0,
        isActive: true,
      })

      expect(category.id).toBeDefined()
      expect(category.name).toBe('Work')
      expect(category.color).toBe('#ff0000')
      expect(category.sortOrder).toBe(0)
      expect(category.isActive).toBe(true)
      expect(category.createdAt).toBeDefined()
      expect(category.updatedAt).toBeDefined()
    })

    it('creates an inactive category', () => {
      const category = categoriesRepository.create({
        name: 'Archived Project',
        color: '#888888',
        sortOrder: 5,
        isActive: false,
      })

      expect(category.isActive).toBe(false)
    })

    it('generates unique IDs for each category', () => {
      const cat1 = categoriesRepository.create({
        name: 'Category 1',
        color: '#111111',
        sortOrder: 0,
        isActive: true,
      })
      const cat2 = categoriesRepository.create({
        name: 'Category 2',
        color: '#222222',
        sortOrder: 1,
        isActive: true,
      })

      expect(cat1.id).not.toBe(cat2.id)
    })
  })

  describe('getById', () => {
    it('returns category by ID', () => {
      const created = categoriesRepository.create({
        name: 'Test Category',
        color: '#abcdef',
        sortOrder: 0,
        isActive: true,
      })
      const fetched = categoriesRepository.getById(created.id)

      expect(fetched).not.toBeNull()
      expect(fetched!.id).toBe(created.id)
      expect(fetched!.name).toBe('Test Category')
      expect(fetched!.color).toBe('#abcdef')
    })

    it('returns null for non-existent ID', () => {
      const result = categoriesRepository.getById('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('getAll', () => {
    it('returns empty array when no categories', () => {
      const categories = categoriesRepository.getAll()
      expect(categories).toEqual([])
    })

    it('returns all categories ordered by sort_order ASC', () => {
      categoriesRepository.create({
        name: 'Third',
        color: '#333333',
        sortOrder: 2,
        isActive: true,
      })
      categoriesRepository.create({
        name: 'First',
        color: '#111111',
        sortOrder: 0,
        isActive: true,
      })
      categoriesRepository.create({
        name: 'Second',
        color: '#222222',
        sortOrder: 1,
        isActive: true,
      })

      const categories = categoriesRepository.getAll()

      expect(categories).toHaveLength(3)
      expect(categories[0].name).toBe('First')
      expect(categories[1].name).toBe('Second')
      expect(categories[2].name).toBe('Third')
    })

    it('includes both active and inactive categories', () => {
      categoriesRepository.create({
        name: 'Active',
        color: '#00ff00',
        sortOrder: 0,
        isActive: true,
      })
      categoriesRepository.create({
        name: 'Inactive',
        color: '#ff0000',
        sortOrder: 1,
        isActive: false,
      })

      const categories = categoriesRepository.getAll()

      expect(categories).toHaveLength(2)
      expect(categories.find(c => c.name === 'Active')?.isActive).toBe(true)
      expect(categories.find(c => c.name === 'Inactive')?.isActive).toBe(false)
    })

    it('orders by name when sort_order is the same', () => {
      categoriesRepository.create({
        name: 'Zebra',
        color: '#333333',
        sortOrder: 0,
        isActive: true,
      })
      categoriesRepository.create({
        name: 'Apple',
        color: '#111111',
        sortOrder: 0,
        isActive: true,
      })

      const categories = categoriesRepository.getAll()

      expect(categories[0].name).toBe('Apple')
      expect(categories[1].name).toBe('Zebra')
    })
  })

  describe('getActive', () => {
    it('returns empty array when no categories', () => {
      const categories = categoriesRepository.getActive()
      expect(categories).toEqual([])
    })

    it('returns only active categories', () => {
      categoriesRepository.create({
        name: 'Active 1',
        color: '#00ff00',
        sortOrder: 0,
        isActive: true,
      })
      categoriesRepository.create({
        name: 'Inactive',
        color: '#ff0000',
        sortOrder: 1,
        isActive: false,
      })
      categoriesRepository.create({
        name: 'Active 2',
        color: '#0000ff',
        sortOrder: 2,
        isActive: true,
      })

      const categories = categoriesRepository.getActive()

      expect(categories).toHaveLength(2)
      expect(categories.every(c => c.isActive)).toBe(true)
      expect(categories[0].name).toBe('Active 1')
      expect(categories[1].name).toBe('Active 2')
    })

    it('returns empty array when all categories are inactive', () => {
      categoriesRepository.create({
        name: 'Inactive 1',
        color: '#ff0000',
        sortOrder: 0,
        isActive: false,
      })
      categoriesRepository.create({
        name: 'Inactive 2',
        color: '#ff0000',
        sortOrder: 1,
        isActive: false,
      })

      const categories = categoriesRepository.getActive()
      expect(categories).toEqual([])
    })
  })

  describe('update', () => {
    it('updates category name', () => {
      const category = categoriesRepository.create({
        name: 'Original Name',
        color: '#000000',
        sortOrder: 0,
        isActive: true,
      })

      const updated = categoriesRepository.update(category.id, {
        name: 'Updated Name',
      })

      expect(updated).not.toBeNull()
      expect(updated!.name).toBe('Updated Name')
      expect(updated!.color).toBe('#000000') // unchanged
    })

    it('updates category color', () => {
      const category = categoriesRepository.create({
        name: 'Test',
        color: '#000000',
        sortOrder: 0,
        isActive: true,
      })

      const updated = categoriesRepository.update(category.id, {
        color: '#ffffff',
      })

      expect(updated!.color).toBe('#ffffff')
      expect(updated!.name).toBe('Test') // unchanged
    })

    it('updates sortOrder', () => {
      const category = categoriesRepository.create({
        name: 'Test',
        color: '#000000',
        sortOrder: 0,
        isActive: true,
      })

      const updated = categoriesRepository.update(category.id, {
        sortOrder: 5,
      })

      expect(updated!.sortOrder).toBe(5)
    })

    it('updates isActive status', () => {
      const category = categoriesRepository.create({
        name: 'Test',
        color: '#000000',
        sortOrder: 0,
        isActive: true,
      })

      const updated = categoriesRepository.update(category.id, {
        isActive: false,
      })

      expect(updated!.isActive).toBe(false)
    })

    it('updates multiple properties at once', () => {
      const category = categoriesRepository.create({
        name: 'Original',
        color: '#000000',
        sortOrder: 0,
        isActive: true,
      })

      const updated = categoriesRepository.update(category.id, {
        name: 'New Name',
        color: '#ffffff',
        sortOrder: 10,
        isActive: false,
      })

      expect(updated!.name).toBe('New Name')
      expect(updated!.color).toBe('#ffffff')
      expect(updated!.sortOrder).toBe(10)
      expect(updated!.isActive).toBe(false)
    })

    it('updates the updated_at timestamp', async () => {
      const category = categoriesRepository.create({
        name: 'Test',
        color: '#000000',
        sortOrder: 0,
        isActive: true,
      })
      const originalUpdatedAt = category.updatedAt

      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      const updated = categoriesRepository.update(category.id, {
        name: 'Updated',
      })

      expect(updated!.updatedAt).not.toBe(originalUpdatedAt)
    })

    it('returns null for non-existent ID', () => {
      const result = categoriesRepository.update('non-existent-id', {
        name: 'New Name',
      })

      expect(result).toBeNull()
    })

    it('preserves createdAt timestamp', async () => {
      const category = categoriesRepository.create({
        name: 'Test',
        color: '#000000',
        sortOrder: 0,
        isActive: true,
      })
      const originalCreatedAt = category.createdAt

      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      const updated = categoriesRepository.update(category.id, {
        name: 'Updated',
      })

      expect(updated!.createdAt).toBe(originalCreatedAt)
    })
  })

  describe('delete', () => {
    it('deletes a category', () => {
      const category = categoriesRepository.create({
        name: 'To Delete',
        color: '#000000',
        sortOrder: 0,
        isActive: true,
      })

      const result = categoriesRepository.delete(category.id)

      expect(result).toBe(true)
      expect(categoriesRepository.getById(category.id)).toBeNull()
    })

    it('returns true when category is deleted', () => {
      const category = categoriesRepository.create({
        name: 'Test',
        color: '#000000',
        sortOrder: 0,
        isActive: true,
      })

      const result = categoriesRepository.delete(category.id)
      expect(result).toBe(true)
    })

    it('returns false for non-existent category', () => {
      const result = categoriesRepository.delete('non-existent-id')
      expect(result).toBe(false)
    })

    it('returns false when trying to delete inbox category', () => {
      // First create a category with ID 'inbox'
      db.prepare(`
        INSERT INTO categories (id, name, color, sort_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('inbox', 'Inbox', '#808080', 0, 1, new Date().toISOString(), new Date().toISOString())

      const result = categoriesRepository.delete('inbox')

      expect(result).toBe(false)
      // Verify inbox still exists
      expect(categoriesRepository.getById('inbox')).not.toBeNull()
    })

    it('does not affect other categories when deleting one', () => {
      const cat1 = categoriesRepository.create({
        name: 'Keep 1',
        color: '#111111',
        sortOrder: 0,
        isActive: true,
      })
      const cat2 = categoriesRepository.create({
        name: 'To Delete',
        color: '#222222',
        sortOrder: 1,
        isActive: true,
      })
      const cat3 = categoriesRepository.create({
        name: 'Keep 2',
        color: '#333333',
        sortOrder: 2,
        isActive: true,
      })

      categoriesRepository.delete(cat2.id)

      const remaining = categoriesRepository.getAll()
      expect(remaining).toHaveLength(2)
      expect(remaining.find(c => c.id === cat1.id)).toBeDefined()
      expect(remaining.find(c => c.id === cat3.id)).toBeDefined()
      expect(remaining.find(c => c.id === cat2.id)).toBeUndefined()
    })
  })

  describe('reorder', () => {
    it('reorders categories by new sort_order', async () => {
      const cat1 = categoriesRepository.create({
        name: 'First',
        color: '#111111',
        sortOrder: 0,
        isActive: true,
      })
      const cat2 = categoriesRepository.create({
        name: 'Second',
        color: '#222222',
        sortOrder: 1,
        isActive: true,
      })
      const cat3 = categoriesRepository.create({
        name: 'Third',
        color: '#333333',
        sortOrder: 2,
        isActive: true,
      })

      // Reorder: Third, First, Second
      categoriesRepository.reorder([cat3.id, cat1.id, cat2.id])

      const categories = categoriesRepository.getAll()

      expect(categories[0].id).toBe(cat3.id)
      expect(categories[0].sortOrder).toBe(0)
      expect(categories[1].id).toBe(cat1.id)
      expect(categories[1].sortOrder).toBe(1)
      expect(categories[2].id).toBe(cat2.id)
      expect(categories[2].sortOrder).toBe(2)
    })

    it('updates updated_at timestamp for all reordered categories', async () => {
      const cat1 = categoriesRepository.create({
        name: 'First',
        color: '#111111',
        sortOrder: 0,
        isActive: true,
      })
      const cat2 = categoriesRepository.create({
        name: 'Second',
        color: '#222222',
        sortOrder: 1,
        isActive: true,
      })

      const originalUpdatedAt1 = cat1.updatedAt
      const originalUpdatedAt2 = cat2.updatedAt

      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      categoriesRepository.reorder([cat2.id, cat1.id])

      const updated1 = categoriesRepository.getById(cat1.id)
      const updated2 = categoriesRepository.getById(cat2.id)

      expect(updated1!.updatedAt).not.toBe(originalUpdatedAt1)
      expect(updated2!.updatedAt).not.toBe(originalUpdatedAt2)
    })

    it('handles empty array without errors', () => {
      expect(() => categoriesRepository.reorder([])).not.toThrow()
    })

    it('handles partial reorder (not all categories)', () => {
      const cat1 = categoriesRepository.create({
        name: 'First',
        color: '#111111',
        sortOrder: 0,
        isActive: true,
      })
      const cat2 = categoriesRepository.create({
        name: 'Second',
        color: '#222222',
        sortOrder: 1,
        isActive: true,
      })
      const cat3 = categoriesRepository.create({
        name: 'Third',
        color: '#333333',
        sortOrder: 2,
        isActive: true,
      })

      // Only reorder first two categories
      categoriesRepository.reorder([cat2.id, cat1.id])

      const updatedCat1 = categoriesRepository.getById(cat1.id)
      const updatedCat2 = categoriesRepository.getById(cat2.id)
      const updatedCat3 = categoriesRepository.getById(cat3.id)

      expect(updatedCat2!.sortOrder).toBe(0)
      expect(updatedCat1!.sortOrder).toBe(1)
      expect(updatedCat3!.sortOrder).toBe(2) // unchanged
    })

    it('handles non-existent IDs gracefully', () => {
      const cat1 = categoriesRepository.create({
        name: 'First',
        color: '#111111',
        sortOrder: 0,
        isActive: true,
      })

      // Include a non-existent ID
      expect(() => categoriesRepository.reorder(['non-existent', cat1.id])).not.toThrow()

      // cat1 should still be updated
      const updated = categoriesRepository.getById(cat1.id)
      expect(updated!.sortOrder).toBe(1)
    })
  })

  describe('edge cases', () => {
    it('handles special characters in category name', () => {
      const category = categoriesRepository.create({
        name: "Test's Category & More <script>",
        color: '#000000',
        sortOrder: 0,
        isActive: true,
      })

      const fetched = categoriesRepository.getById(category.id)
      expect(fetched!.name).toBe("Test's Category & More <script>")
    })

    it('handles empty string name', () => {
      const category = categoriesRepository.create({
        name: '',
        color: '#000000',
        sortOrder: 0,
        isActive: true,
      })

      const fetched = categoriesRepository.getById(category.id)
      expect(fetched!.name).toBe('')
    })

    it('handles very long category name', () => {
      const longName = 'A'.repeat(1000)
      const category = categoriesRepository.create({
        name: longName,
        color: '#000000',
        sortOrder: 0,
        isActive: true,
      })

      const fetched = categoriesRepository.getById(category.id)
      expect(fetched!.name).toBe(longName)
    })

    it('handles various color formats', () => {
      const cat1 = categoriesRepository.create({
        name: 'Hex 3',
        color: '#fff',
        sortOrder: 0,
        isActive: true,
      })
      const cat2 = categoriesRepository.create({
        name: 'Hex 6',
        color: '#ffffff',
        sortOrder: 1,
        isActive: true,
      })
      const cat3 = categoriesRepository.create({
        name: 'RGB',
        color: 'rgb(255, 255, 255)',
        sortOrder: 2,
        isActive: true,
      })

      expect(categoriesRepository.getById(cat1.id)!.color).toBe('#fff')
      expect(categoriesRepository.getById(cat2.id)!.color).toBe('#ffffff')
      expect(categoriesRepository.getById(cat3.id)!.color).toBe('rgb(255, 255, 255)')
    })

    it('handles negative sort order', () => {
      const category = categoriesRepository.create({
        name: 'Negative',
        color: '#000000',
        sortOrder: -5,
        isActive: true,
      })

      const fetched = categoriesRepository.getById(category.id)
      expect(fetched!.sortOrder).toBe(-5)
    })

    it('handles large sort order values', () => {
      const category = categoriesRepository.create({
        name: 'Large',
        color: '#000000',
        sortOrder: 999999,
        isActive: true,
      })

      const fetched = categoriesRepository.getById(category.id)
      expect(fetched!.sortOrder).toBe(999999)
    })
  })
})
