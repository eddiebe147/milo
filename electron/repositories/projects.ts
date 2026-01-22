import { getDatabase } from '../services/database'
import { nanoid } from 'nanoid'
import type { Project } from '../../src/types'

// Convert DB row to Project type
function rowToProject(row: Record<string, unknown>): Project {
    return {
        id: row.id as string,
        name: row.name as string,
        description: row.description as string | undefined,
        path: row.path as string | undefined,
        color: row.color as string,
        icon: row.icon as string | undefined,
        status: row.status as Project['status'],
        sortOrder: row.sort_order as number,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    }
}

type ProjectRow = Record<string, unknown>

export const projectsRepository = {
    // Get all projects
    getAll(): Project[] {
        const db = getDatabase()
        const rows = db
            .prepare('SELECT * FROM projects ORDER BY sort_order ASC, name ASC')
            .all() as ProjectRow[]
        return rows.map(rowToProject)
    },

    // Get only active projects
    getActive(): Project[] {
        const db = getDatabase()
        const rows = db
            .prepare('SELECT * FROM projects WHERE status = ? ORDER BY sort_order ASC, name ASC')
            .all('active') as ProjectRow[]
        return rows.map(rowToProject)
    },

    // Get projects by status
    getByStatus(status: Project['status']): Project[] {
        const db = getDatabase()
        const rows = db
            .prepare('SELECT * FROM projects WHERE status = ? ORDER BY sort_order ASC, name ASC')
            .all(status) as ProjectRow[]
        return rows.map(rowToProject)
    },

    // Get project by ID
    getById(id: string): Project | null {
        const db = getDatabase()
        const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id)
        return row ? rowToProject(row as ProjectRow) : null
    },

    // Get project by path
    getByPath(path: string): Project | null {
        const db = getDatabase()
        const row = db.prepare('SELECT * FROM projects WHERE path = ?').get(path)
        return row ? rowToProject(row as ProjectRow) : null
    },

    // Create a new project
    create(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
        const db = getDatabase()
        const id = nanoid()
        const now = new Date().toISOString()

        // Get the max sort order and add 1
        const maxOrder = db.prepare('SELECT MAX(sort_order) as max_order FROM projects').get() as { max_order: number | null }
        const sortOrder = project.sortOrder ?? (maxOrder.max_order !== null ? maxOrder.max_order + 1 : 0)

        db.prepare(`
      INSERT INTO projects (id, name, description, path, color, icon, status, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            id,
            project.name,
            project.description ?? null,
            project.path ?? null,
            project.color,
            project.icon ?? null,
            project.status,
            sortOrder,
            now,
            now
        )

        return this.getById(id)!
    },

    // Update a project
    update(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>): Project | null {
        const db = getDatabase()
        const existing = this.getById(id)
        if (!existing) return null

        const now = new Date().toISOString()

        db.prepare(`
      UPDATE projects SET
        name = ?,
        description = ?,
        path = ?,
        color = ?,
        icon = ?,
        status = ?,
        sort_order = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
            updates.name ?? existing.name,
            updates.description ?? existing.description ?? null,
            updates.path ?? existing.path ?? null,
            updates.color ?? existing.color,
            updates.icon ?? existing.icon ?? null,
            updates.status ?? existing.status,
            updates.sortOrder ?? existing.sortOrder,
            now,
            id
        )

        return this.getById(id)
    },

    // Delete a project (tasks will have project_id set to NULL)
    delete(id: string): boolean {
        const db = getDatabase()
        // Don't allow deleting the default "general" project
        if (id === 'general') return false
        const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id)
        return result.changes > 0
    },

    // Archive a project
    archive(id: string): Project | null {
        return this.update(id, { status: 'archived' })
    },

    // Pause a project
    pause(id: string): Project | null {
        return this.update(id, { status: 'paused' })
    },

    // Activate a project
    activate(id: string): Project | null {
        return this.update(id, { status: 'active' })
    },

    // Complete a project
    complete(id: string): Project | null {
        return this.update(id, { status: 'completed' })
    },

    // Reorder projects
    reorder(orderedIds: string[]): void {
        const db = getDatabase()
        const stmt = db.prepare('UPDATE projects SET sort_order = ?, updated_at = ? WHERE id = ?')
        const now = new Date().toISOString()

        for (let i = 0; i < orderedIds.length; i++) {
            stmt.run(i, now, orderedIds[i])
        }
    },

    // Search projects by name
    search(query: string): Project[] {
        const db = getDatabase()
        const rows = db
            .prepare('SELECT * FROM projects WHERE name LIKE ? ORDER BY sort_order ASC, name ASC')
            .all(`%${query}%`) as ProjectRow[]
        return rows.map(rowToProject)
    },
}
