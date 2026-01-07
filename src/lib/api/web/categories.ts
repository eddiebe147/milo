import { db } from './db'
import { nanoid } from 'nanoid'
import type { Category } from '../../../types'

export const categoriesWebRepository = {
    async getAll(): Promise<Category[]> {
        return db.categories.toArray()
    },

    async getActive(): Promise<Category[]> {
        return db.categories.where('status').equals('active').toArray()
    },

    async getById(id: string): Promise<Category | null> {
        return (await db.categories.get(id)) || null
    },

    async create(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
        const id = nanoid()
        const now = new Date().toISOString()
        const newCategory: Category = {
            ...category,
            id,
            createdAt: now,
            updatedAt: now
        }
        await db.categories.add(newCategory)
        return newCategory
    },

    async update(id: string, updates: Partial<Category>): Promise<Category | null> {
        const now = new Date().toISOString()
        const count = await db.categories.update(id, { ...updates, updatedAt: now })
        if (count === 0) return null
        return (await db.categories.get(id)) || null
    },

    async delete(id: string): Promise<boolean> {
        await db.categories.delete(id)
        return true
    },

    async reorder(orderedIds: string[]): Promise<void> {
        // Basic reorder logic for web
        console.log('Reordering categories not fully implemented on web', orderedIds)
    }
}
