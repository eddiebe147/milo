import { create } from 'zustand'
import type { Task } from '../types'

interface TasksState {
  tasks: Task[]
  activeTask: Task | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchTasks: () => Promise<void>
  fetchTodaysTasks: () => Promise<void>
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task | null>
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task | null>
  deleteTask: (id: string) => Promise<boolean>
  startTask: (id: string) => Promise<Task | null>
  completeTask: (id: string) => Promise<Task | null>
  deferTask: (id: string) => Promise<Task | null>
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  activeTask: null,
  isLoading: false,
  error: null,

  fetchTasks: async () => {
    set({ isLoading: true, error: null })
    try {
      const tasks = await window.milo.tasks.getToday()
      const activeTask = await window.milo.tasks.getActive()
      set({ tasks, activeTask, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  fetchTodaysTasks: async () => {
    set({ isLoading: true, error: null })
    try {
      const tasks = await window.milo.tasks.getToday()
      const activeTask = await window.milo.tasks.getActive()
      set({ tasks, activeTask, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  createTask: async (task) => {
    try {
      const newTask = await window.milo.tasks.create(task)
      if (newTask) {
        set((state) => ({ tasks: [newTask, ...state.tasks] }))
      }
      return newTask
    } catch (error) {
      set({ error: (error as Error).message })
      return null
    }
  },

  updateTask: async (id, updates) => {
    try {
      const updatedTask = await window.milo.tasks.update(id, updates)
      if (updatedTask) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
          activeTask: state.activeTask?.id === id ? updatedTask : state.activeTask,
        }))
      }
      return updatedTask
    } catch (error) {
      set({ error: (error as Error).message })
      return null
    }
  },

  deleteTask: async (id) => {
    try {
      const success = await window.milo.tasks.delete(id)
      if (success) {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          activeTask: state.activeTask?.id === id ? null : state.activeTask,
        }))
      }
      return success
    } catch (error) {
      set({ error: (error as Error).message })
      return false
    }
  },

  startTask: async (id) => {
    try {
      const task = await window.milo.tasks.start(id)
      if (task) {
        // Refresh all tasks since starting one affects others
        await get().fetchTodaysTasks()
      }
      return task
    } catch (error) {
      set({ error: (error as Error).message })
      return null
    }
  },

  completeTask: async (id) => {
    try {
      const task = await window.milo.tasks.complete(id)
      if (task) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? task : t)),
          activeTask: state.activeTask?.id === id ? null : state.activeTask,
        }))
      }
      return task
    } catch (error) {
      set({ error: (error as Error).message })
      return null
    }
  },

  deferTask: async (id) => {
    try {
      const task = await window.milo.tasks.defer(id)
      if (task) {
        // Remove from today's list since it's deferred
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          activeTask: state.activeTask?.id === id ? null : state.activeTask,
        }))
      }
      return task
    } catch (error) {
      set({ error: (error as Error).message })
      return null
    }
  },
}))
