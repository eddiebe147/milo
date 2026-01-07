import { db } from './db'
import { nanoid } from 'nanoid'
import type { Goal } from '../../../types'

export const goalsWebRepository = {
    async getAll(): Promise<Goal[]> {
        return db.goals.toArray()
    },

    async getById(id: string): Promise<Goal | undefined> {
        return db.goals.get(id)
    },

    async getHierarchy(): Promise<{ yearly: Goal[]; quarterly: Goal[]; monthly: Goal[]; weekly: Goal[] }> {
        const all = await db.goals.toArray()
        return {
            yearly: all.filter(g => g.timeframe === 'yearly'),
            quarterly: all.filter(g => g.timeframe === 'quarterly'),
            monthly: all.filter(g => g.timeframe === 'monthly'),
            weekly: all.filter(g => g.timeframe === 'weekly')
        }
    },

    async create(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> {
        const id = nanoid()
        const now = new Date().toISOString()
        const newGoal: Goal = {
            ...goal,
            id,
            createdAt: now,
            updatedAt: now
        }
        await db.goals.add(newGoal)
        return newGoal
    },

    async update(id: string, updates: Partial<Goal>): Promise<Goal | null> {
        const now = new Date().toISOString()
        const count = await db.goals.update(id, { ...updates, updatedAt: now })
        if (count === 0) return null
        return (await db.goals.get(id)) || null
    },

    async delete(id: string): Promise<boolean> {
        await db.goals.delete(id)
        return true
    }
}
