import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTasksStore } from './tasksStore'
import type { Task } from '../types'

// Sample task data for tests
const mockTask: Task = {
  id: 'task-1',
  title: 'Test Task',
  description: 'Test description',
  goalId: null,
  status: 'pending',
  priority: 3,
  scheduledDate: '2024-12-28',
  createdAt: '2024-12-28T10:00:00Z',
  updatedAt: '2024-12-28T10:00:00Z',
}

const mockTasks: Task[] = [
  mockTask,
  {
    ...mockTask,
    id: 'task-2',
    title: 'Second Task',
  },
]

describe('tasksStore', () => {
  beforeEach(() => {
    // Reset store state
    useTasksStore.setState({
      tasks: [],
      activeTask: null,
      isLoading: false,
      error: null,
    })

    // Reset mocks
    vi.clearAllMocks()

    // Set up mock implementations
    window.milo.tasks.getToday = vi.fn().mockResolvedValue(mockTasks)
    window.milo.tasks.getActive = vi.fn().mockResolvedValue(null)
    window.milo.tasks.create = vi.fn().mockResolvedValue(mockTask)
    window.milo.tasks.update = vi.fn().mockResolvedValue(mockTask)
    window.milo.tasks.delete = vi.fn().mockResolvedValue(true)
    window.milo.tasks.start = vi.fn().mockResolvedValue({ ...mockTask, status: 'in_progress' })
    window.milo.tasks.complete = vi.fn().mockResolvedValue({ ...mockTask, status: 'completed' })
    window.milo.tasks.defer = vi.fn().mockResolvedValue({ ...mockTask, status: 'deferred' })
  })

  describe('initial state', () => {
    it('has empty tasks array', () => {
      const state = useTasksStore.getState()
      expect(state.tasks).toEqual([])
    })

    it('has null activeTask', () => {
      const state = useTasksStore.getState()
      expect(state.activeTask).toBeNull()
    })

    it('is not loading', () => {
      const state = useTasksStore.getState()
      expect(state.isLoading).toBe(false)
    })

    it('has no error', () => {
      const state = useTasksStore.getState()
      expect(state.error).toBeNull()
    })
  })

  describe('fetchTodaysTasks', () => {
    it('sets loading state while fetching', async () => {
      const store = useTasksStore.getState()

      // Start fetch but don't await
      const fetchPromise = store.fetchTodaysTasks()

      // Should be loading
      expect(useTasksStore.getState().isLoading).toBe(true)

      await fetchPromise

      // Should not be loading after completion
      expect(useTasksStore.getState().isLoading).toBe(false)
    })

    it('fetches and stores tasks', async () => {
      const store = useTasksStore.getState()
      await store.fetchTodaysTasks()

      const state = useTasksStore.getState()
      expect(state.tasks).toEqual(mockTasks)
      expect(window.milo.tasks.getToday).toHaveBeenCalledTimes(1)
    })

    it('handles errors', async () => {
      const errorMessage = 'Failed to fetch tasks'
      window.milo.tasks.getToday = vi.fn().mockRejectedValue(new Error(errorMessage))

      const store = useTasksStore.getState()
      await store.fetchTodaysTasks()

      const state = useTasksStore.getState()
      expect(state.error).toBe(errorMessage)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('createTask', () => {
    it('creates and adds task to state', async () => {
      const newTaskData = {
        title: 'New Task',
        status: 'pending' as const,
        priority: 3,
        scheduledDate: '2024-12-28',
        goalId: null,
      }

      const store = useTasksStore.getState()
      const result = await store.createTask(newTaskData)

      expect(result).toEqual(mockTask)
      expect(window.milo.tasks.create).toHaveBeenCalledWith(newTaskData)
      expect(useTasksStore.getState().tasks).toContain(mockTask)
    })

    it('adds new task at the beginning of the list', async () => {
      // Pre-populate with existing tasks
      useTasksStore.setState({ tasks: mockTasks })

      const store = useTasksStore.getState()
      await store.createTask({
        title: 'New Task',
        status: 'pending',
        priority: 3,
        scheduledDate: '2024-12-28',
        goalId: null,
      })

      const state = useTasksStore.getState()
      expect(state.tasks[0]).toEqual(mockTask)
    })

    it('handles creation errors', async () => {
      window.milo.tasks.create = vi.fn().mockRejectedValue(new Error('Creation failed'))

      const store = useTasksStore.getState()
      const result = await store.createTask({
        title: 'New Task',
        status: 'pending',
        priority: 3,
        scheduledDate: '2024-12-28',
        goalId: null,
      })

      expect(result).toBeNull()
      expect(useTasksStore.getState().error).toBe('Creation failed')
    })
  })

  describe('updateTask', () => {
    beforeEach(() => {
      useTasksStore.setState({ tasks: mockTasks })
    })

    it('updates task in state', async () => {
      const updatedTask = { ...mockTask, title: 'Updated Title' }
      window.milo.tasks.update = vi.fn().mockResolvedValue(updatedTask)

      const store = useTasksStore.getState()
      const result = await store.updateTask('task-1', { title: 'Updated Title' })

      expect(result).toEqual(updatedTask)
      expect(useTasksStore.getState().tasks[0].title).toBe('Updated Title')
    })

    it('updates activeTask if it matches', async () => {
      const activeTask = mockTask
      useTasksStore.setState({ activeTask })

      const updatedTask = { ...mockTask, title: 'Updated Active' }
      window.milo.tasks.update = vi.fn().mockResolvedValue(updatedTask)

      const store = useTasksStore.getState()
      await store.updateTask('task-1', { title: 'Updated Active' })

      expect(useTasksStore.getState().activeTask?.title).toBe('Updated Active')
    })
  })

  describe('deleteTask', () => {
    beforeEach(() => {
      useTasksStore.setState({ tasks: mockTasks })
    })

    it('removes task from state', async () => {
      const store = useTasksStore.getState()
      const result = await store.deleteTask('task-1')

      expect(result).toBe(true)
      expect(useTasksStore.getState().tasks).toHaveLength(1)
      expect(useTasksStore.getState().tasks[0].id).toBe('task-2')
    })

    it('clears activeTask if deleted task was active', async () => {
      useTasksStore.setState({ activeTask: mockTask })

      const store = useTasksStore.getState()
      await store.deleteTask('task-1')

      expect(useTasksStore.getState().activeTask).toBeNull()
    })

    it('preserves activeTask if different task is deleted', async () => {
      useTasksStore.setState({ activeTask: mockTask })

      const store = useTasksStore.getState()
      await store.deleteTask('task-2')

      expect(useTasksStore.getState().activeTask).toEqual(mockTask)
    })
  })

  describe('completeTask', () => {
    beforeEach(() => {
      useTasksStore.setState({ tasks: mockTasks, activeTask: mockTask })
    })

    it('marks task as completed', async () => {
      const completedTask = { ...mockTask, status: 'completed' as const }
      window.milo.tasks.complete = vi.fn().mockResolvedValue(completedTask)

      const store = useTasksStore.getState()
      const result = await store.completeTask('task-1')

      expect(result?.status).toBe('completed')
      expect(useTasksStore.getState().tasks[0].status).toBe('completed')
    })

    it('clears activeTask when completed', async () => {
      const completedTask = { ...mockTask, status: 'completed' as const }
      window.milo.tasks.complete = vi.fn().mockResolvedValue(completedTask)

      const store = useTasksStore.getState()
      await store.completeTask('task-1')

      expect(useTasksStore.getState().activeTask).toBeNull()
    })
  })

  describe('deferTask', () => {
    beforeEach(() => {
      useTasksStore.setState({ tasks: mockTasks })
    })

    it('removes deferred task from today list', async () => {
      const deferredTask = { ...mockTask, status: 'deferred' as const }
      window.milo.tasks.defer = vi.fn().mockResolvedValue(deferredTask)

      const store = useTasksStore.getState()
      const result = await store.deferTask('task-1')

      expect(result?.status).toBe('deferred')
      expect(useTasksStore.getState().tasks).toHaveLength(1)
      expect(useTasksStore.getState().tasks[0].id).toBe('task-2')
    })
  })
})
