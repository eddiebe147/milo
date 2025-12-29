import { create } from 'zustand'
import type { Category } from '../types'

// Project is semantically a Category (same DB table)
// We alias it for clearer UI terminology
export type Project = Category

interface ProjectsState {
  projects: Project[]
  activeFilter: string | null // null = show all
  isLoading: boolean
  error: string | null

  // Actions
  fetchProjects: () => Promise<void>
  setActiveFilter: (projectId: string | null) => void
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Project | null>
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project | null>
  deleteProject: (id: string) => Promise<boolean>
  reorderProjects: (orderedIds: string[]) => Promise<void>
  getProject: (id: string) => Project | undefined
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  activeFilter: null,
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      // Uses same IPC as categories (backend unchanged)
      const projects = await window.milo.categories.getActive()
      set({ projects, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  setActiveFilter: (projectId) => {
    set({ activeFilter: projectId })
  },

  createProject: async (project) => {
    try {
      const newProject = await window.milo.categories.create(project)
      if (newProject) {
        set((state) => ({ projects: [...state.projects, newProject] }))
      }
      return newProject
    } catch (error) {
      set({ error: (error as Error).message })
      return null
    }
  },

  updateProject: async (id, updates) => {
    try {
      const updatedProject = await window.milo.categories.update(id, updates)
      if (updatedProject) {
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? updatedProject : p)),
        }))
      }
      return updatedProject
    } catch (error) {
      set({ error: (error as Error).message })
      return null
    }
  },

  deleteProject: async (id) => {
    try {
      const success = await window.milo.categories.delete(id)
      if (success) {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          // Clear filter if we just deleted the active filter project
          activeFilter: state.activeFilter === id ? null : state.activeFilter,
        }))
      }
      return success
    } catch (error) {
      set({ error: (error as Error).message })
      return false
    }
  },

  reorderProjects: async (orderedIds) => {
    try {
      await window.milo.categories.reorder(orderedIds)
      // Re-fetch to get updated sort orders
      const projects = await window.milo.categories.getActive()
      set({ projects })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  getProject: (id) => {
    return get().projects.find(p => p.id === id)
  },
}))

// Keep backward compatibility alias
export const useCategoriesStore = useProjectsStore
