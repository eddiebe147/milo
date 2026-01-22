import { db } from './db'
import { nanoid } from 'nanoid'
import type { Project } from '../../../types'

export const projectsWebRepository = {
    async getAll(): Promise<Project[]> {
        return db.projects.orderBy('sortOrder').toArray()
    },

    async getActive(): Promise<Project[]> {
        return db.projects.where('status').equals('active').sortBy('sortOrder')
    },

    async getByStatus(status: Project['status']): Promise<Project[]> {
        return db.projects.where('status').equals(status).sortBy('sortOrder')
    },

    async getById(id: string): Promise<Project | null> {
        return (await db.projects.get(id)) || null
    },

    async getByPath(path: string): Promise<Project | null> {
        return (await db.projects.where('path').equals(path).first()) || null
    },

    async create(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
        const id = nanoid()
        const now = new Date().toISOString()

        // Get the max sort order
        const all = await this.getAll()
        const maxOrder = all.length > 0 ? Math.max(...all.map(p => p.sortOrder)) : -1

        const newProject: Project = {
            ...project,
            id,
            sortOrder: project.sortOrder ?? maxOrder + 1,
            createdAt: now,
            updatedAt: now,
        }
        await db.projects.add(newProject)
        return newProject
    },

    async update(id: string, updates: Partial<Project>): Promise<Project | null> {
        const now = new Date().toISOString()
        const count = await db.projects.update(id, { ...updates, updatedAt: now })
        if (count === 0) return null
        return (await db.projects.get(id)) || null
    },

    async delete(id: string): Promise<boolean> {
        // Don't allow deleting the default "general" project
        if (id === 'general') return false
        await db.projects.delete(id)
        return true
    },

    async archive(id: string): Promise<Project | null> {
        return this.update(id, { status: 'archived' })
    },

    async pause(id: string): Promise<Project | null> {
        return this.update(id, { status: 'paused' })
    },

    async activate(id: string): Promise<Project | null> {
        return this.update(id, { status: 'active' })
    },

    async complete(id: string): Promise<Project | null> {
        return this.update(id, { status: 'completed' })
    },

    async reorder(orderedIds: string[]): Promise<void> {
        const now = new Date().toISOString()
        await db.transaction('rw', db.projects, async () => {
            for (let i = 0; i < orderedIds.length; i++) {
                await db.projects.update(orderedIds[i], { sortOrder: i, updatedAt: now })
            }
        })
    },

    async search(query: string): Promise<Project[]> {
        const all = await this.getAll()
        const lowerQuery = query.toLowerCase()
        return all.filter(p => p.name.toLowerCase().includes(lowerQuery))
    }
}
