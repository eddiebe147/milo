import { db } from './db'
import { nanoid } from 'nanoid'
import type { Task } from '../../../types'

export const tasksWebRepository = {
    async getAll(): Promise<Task[]> {
        return db.tasks.orderBy('priority').toArray()
    },

    async getByDate(date: string): Promise<Task[]> {
        return db.tasks.where('scheduledDate').equals(date).sortBy('priority')
    },

    async getToday(): Promise<Task[]> {
        const today = new Date().toISOString().split('T')[0]
        return this.getByDate(today)
    },

    async getById(id: string): Promise<Task | undefined> {
        return db.tasks.get(id)
    },

    async getActive(): Promise<Task | null> {
        return (await db.tasks.where('status').equals('in_progress').first()) || null
    },

    async create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
        const id = nanoid()
        const now = new Date().toISOString()
        const newTask: Task = {
            ...task,
            id,
            createdAt: now,
            updatedAt: now,
            startDate: task.startDate || task.scheduledDate,
            endDate: task.endDate || task.scheduledDate,
            estimatedDays: task.estimatedDays || 1,
            daysWorked: task.daysWorked || 0
        }
        await db.tasks.add(newTask)
        return newTask
    },

    async update(id: string, updates: Partial<Task>): Promise<Task | null> {
        const now = new Date().toISOString()
        const count = await db.tasks.update(id, { ...updates, updatedAt: now })
        if (count === 0) return null
        return (await db.tasks.get(id)) || null
    },

    async delete(id: string): Promise<boolean> {
        await db.tasks.delete(id)
        return true
    },

    async start(id: string): Promise<Task | null> {
        const now = new Date().toISOString()
        // Reset other in_progress tasks
        await db.tasks.where('status').equals('in_progress').modify({ status: 'pending', updatedAt: now })
        return this.update(id, { status: 'in_progress' })
    },

    async complete(id: string): Promise<Task | null> {
        const now = new Date().toISOString()
        return this.update(id, { status: 'completed', completedAt: now })
    },

    async defer(id: string): Promise<Task | null> {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().split('T')[0]
        return this.update(id, { status: 'deferred', scheduledDate: tomorrowStr })
    },

    async getAllIncomplete(): Promise<Task[]> {
        return db.tasks
            .where('status')
            .anyOf(['pending', 'in_progress'])
            .sortBy('priority')
    },

    async getByCategory(categoryId: string): Promise<Task[]> {
        return db.tasks
            .where('categoryId')
            .equals(categoryId)
            .and(t => ['pending', 'in_progress'].includes(t.status))
            .sortBy('priority')
    },

    async getByProject(projectId: string): Promise<Task[]> {
        return db.tasks
            .where('projectId')
            .equals(projectId)
            .and(t => ['pending', 'in_progress'].includes(t.status))
            .sortBy('priority')
    },

    async getSignalQueue(limit: number = 5): Promise<Task[]> {
        const today = new Date().toISOString().split('T')[0]
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

        // Simplified signal queue logic for web
        const allIncomplete = await db.tasks
            .where('status')
            .anyOf(['pending', 'in_progress'])
            .toArray()

        const filtered = allIncomplete.filter(t =>
            t.scheduledDate === today ||
            t.scheduledDate <= today ||
            (t.startDate && t.startDate <= today && (!t.endDate || t.endDate >= today))
        )

        return filtered
            .sort((a, b) => {
                if (a.status === 'in_progress') return -1
                if (b.status === 'in_progress') return 1
                if (a.priority !== b.priority) return a.priority - b.priority
                if (a.lastWorkedDate === yesterday) return -1
                if (b.lastWorkedDate === yesterday) return 1
                return 0
            })
            .slice(0, limit)
    },

    async getBacklog(signalQueueIds: string[]): Promise<Task[]> {
        const allIncomplete = await this.getAllIncomplete()
        return allIncomplete.filter(t => !signalQueueIds.includes(t.id))
    },

    async getWorkedYesterday(): Promise<Task[]> {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        return db.tasks
            .where('lastWorkedDate')
            .equals(yesterday)
            .and(t => ['pending', 'in_progress'].includes(t.status))
            .sortBy('priority')
    },

    async recordWork(id: string): Promise<Task | null> {
        const today = new Date().toISOString().split('T')[0]
        const task = await this.getById(id)
        if (!task) return null

        const currentDaysWorked = task.daysWorked ?? 0
        const wasWorkedToday = task.lastWorkedDate === today
        return this.update(id, {
            daysWorked: wasWorkedToday ? currentDaysWorked : currentDaysWorked + 1,
            lastWorkedDate: today
        })
    },

    async reorderSignalQueue(taskIds: string[]): Promise<void> {
        const now = new Date().toISOString()
        await db.transaction('rw', db.tasks, async () => {
            for (let i = 0; i < taskIds.length; i++) {
                await db.tasks.update(taskIds[i], { priority: i + 1, updatedAt: now })
            }
        })
    }
}
