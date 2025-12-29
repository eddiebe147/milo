import { create } from 'zustand'
import type { Task } from '../types'

interface TasksState {
  // Core state
  tasks: Task[] // Today's tasks (legacy, kept for compatibility)
  allTasks: Task[] // Master list of ALL incomplete tasks
  activeTask: Task | null
  isLoading: boolean
  error: string | null

  // Signal Queue state
  signalQueue: Task[] // Top priority tasks (3-5)
  signalQueueSize: number // User-adjustable: 3, 4, or 5
  backlog: Task[] // Everything not in signal queue

  // Continuity state
  continuityTasks: Task[] // Tasks worked on yesterday (for morning context)
  hasSeenMorningContext: boolean // Dismiss morning context for today

  // Actions - Core
  fetchTasks: () => Promise<void>
  fetchTodaysTasks: () => Promise<void>
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task | null>
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task | null>
  deleteTask: (id: string) => Promise<boolean>
  startTask: (id: string) => Promise<Task | null>
  completeTask: (id: string) => Promise<Task | null>
  deferTask: (id: string) => Promise<Task | null>

  // Actions - Signal Queue
  fetchAllTasks: () => Promise<void>
  fetchSignalQueue: () => Promise<void>
  refreshSignalQueue: () => Promise<void> // Auto-refill after completion
  setSignalQueueSize: (size: number) => void

  // Actions - Continuity
  fetchContinuityTasks: () => Promise<void>
  dismissMorningContext: () => void
  recordWorkOnTask: (id: string) => Promise<Task | null>

  // Actions - Category filtering (works with categoriesStore)
  fetchTasksByCategory: (categoryId: string) => Promise<Task[]>
}

// Helper to check if we need to reset morning context (new day)
function shouldResetMorningContext(): boolean {
  const lastSeen = localStorage.getItem('milo_morning_context_date')
  const today = new Date().toISOString().split('T')[0]
  return lastSeen !== today
}

export const useTasksStore = create<TasksState>((set, get) => ({
  // Core state
  tasks: [],
  allTasks: [],
  activeTask: null,
  isLoading: false,
  error: null,

  // Signal Queue state
  signalQueue: [],
  signalQueueSize: 5, // Default to 5, user can adjust 3-5
  backlog: [],

  // Continuity state
  continuityTasks: [],
  hasSeenMorningContext: !shouldResetMorningContext(),

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
        set((state) => ({
          tasks: [newTask, ...state.tasks],
          allTasks: [newTask, ...state.allTasks],
        }))
        // Refresh signal queue since new task may change priorities
        await get().refreshSignalQueue()
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
          allTasks: state.allTasks.map((t) => (t.id === id ? updatedTask : t)),
          signalQueue: state.signalQueue.map((t) => (t.id === id ? updatedTask : t)),
          backlog: state.backlog.map((t) => (t.id === id ? updatedTask : t)),
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
          allTasks: state.allTasks.filter((t) => t.id !== id),
          signalQueue: state.signalQueue.filter((t) => t.id !== id),
          backlog: state.backlog.filter((t) => t.id !== id),
          activeTask: state.activeTask?.id === id ? null : state.activeTask,
        }))
        // Refill signal queue if needed
        await get().refreshSignalQueue()
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
        // Record work on this task for continuity tracking
        await window.milo.tasks.recordWork(id)
        // Refresh everything since starting affects active state
        await get().fetchSignalQueue()
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
          // Remove from allTasks since it's now complete
          allTasks: state.allTasks.filter((t) => t.id !== id),
          signalQueue: state.signalQueue.filter((t) => t.id !== id),
          backlog: state.backlog.filter((t) => t.id !== id),
          activeTask: state.activeTask?.id === id ? null : state.activeTask,
        }))
        // Auto-refill signal queue
        await get().refreshSignalQueue()
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
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          // Update in allTasks (it's still there, just different date)
          allTasks: state.allTasks.map((t) => (t.id === id ? task : t)),
          signalQueue: state.signalQueue.filter((t) => t.id !== id),
          backlog: state.backlog.filter((t) => t.id !== id),
          activeTask: state.activeTask?.id === id ? null : state.activeTask,
        }))
        // Refill signal queue
        await get().refreshSignalQueue()
      }
      return task
    } catch (error) {
      set({ error: (error as Error).message })
      return null
    }
  },

  // ============================
  // Signal Queue Actions
  // ============================

  fetchAllTasks: async () => {
    set({ isLoading: true, error: null })
    try {
      const allTasks = await window.milo.tasks.getAllIncomplete()
      const activeTask = await window.milo.tasks.getActive()
      set({ allTasks, activeTask, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  fetchSignalQueue: async () => {
    set({ isLoading: true, error: null })
    try {
      const { signalQueueSize } = get()
      const signalQueue = await window.milo.tasks.getSignalQueue(signalQueueSize)
      const signalQueueIds = signalQueue.map((t) => t.id)
      const backlog = await window.milo.tasks.getBacklog(signalQueueIds)
      const activeTask = await window.milo.tasks.getActive()

      set({ signalQueue, backlog, activeTask, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  refreshSignalQueue: async () => {
    // Lightweight refresh - just update queue without setting loading state
    try {
      const { signalQueueSize } = get()
      const signalQueue = await window.milo.tasks.getSignalQueue(signalQueueSize)
      const signalQueueIds = signalQueue.map((t) => t.id)
      const backlog = await window.milo.tasks.getBacklog(signalQueueIds)

      set({ signalQueue, backlog })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  setSignalQueueSize: (size: number) => {
    // Clamp to valid range (3-5)
    const validSize = Math.max(3, Math.min(5, size))
    set({ signalQueueSize: validSize })
    // Refresh queue with new size
    get().refreshSignalQueue()
  },

  // ============================
  // Continuity Actions
  // ============================

  fetchContinuityTasks: async () => {
    try {
      const continuityTasks = await window.milo.tasks.getWorkedYesterday()
      set({ continuityTasks })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  dismissMorningContext: () => {
    const today = new Date().toISOString().split('T')[0]
    localStorage.setItem('milo_morning_context_date', today)
    set({ hasSeenMorningContext: true })
  },

  recordWorkOnTask: async (id: string) => {
    try {
      const task = await window.milo.tasks.recordWork(id)
      if (task) {
        set((state) => ({
          allTasks: state.allTasks.map((t) => (t.id === id ? task : t)),
          signalQueue: state.signalQueue.map((t) => (t.id === id ? task : t)),
          backlog: state.backlog.map((t) => (t.id === id ? task : t)),
        }))
      }
      return task
    } catch (error) {
      set({ error: (error as Error).message })
      return null
    }
  },

  // ============================
  // Category Filtering
  // ============================

  fetchTasksByCategory: async (categoryId: string) => {
    try {
      return await window.milo.tasks.getByCategory(categoryId)
    } catch (error) {
      set({ error: (error as Error).message })
      return []
    }
  },
}))
