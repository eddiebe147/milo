import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGoalsStore } from './goalsStore'
import type { Goal } from '../types'

// Mock goal data for tests
const mockYearlyGoal: Goal = {
  id: 'goal-1',
  title: 'Yearly Goal',
  description: 'A yearly goal',
  parentId: null,
  timeframe: 'yearly',
  status: 'active',
  targetDate: '2024-12-31',
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-01T10:00:00Z',
}

const mockQuarterlyGoal: Goal = {
  id: 'goal-2',
  title: 'Quarterly Goal',
  description: 'A quarterly goal',
  parentId: 'goal-1',
  timeframe: 'quarterly',
  status: 'active',
  targetDate: '2024-03-31',
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-01T10:00:00Z',
}

const mockMonthlyGoal: Goal = {
  id: 'goal-3',
  title: 'Monthly Goal',
  description: 'A monthly goal',
  parentId: 'goal-2',
  timeframe: 'monthly',
  status: 'active',
  targetDate: '2024-01-31',
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-01T10:00:00Z',
}

const mockWeeklyGoal: Goal = {
  id: 'goal-4',
  title: 'Weekly Goal',
  description: 'A weekly goal',
  parentId: 'goal-3',
  timeframe: 'weekly',
  status: 'active',
  targetDate: '2024-01-07',
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-01T10:00:00Z',
}

const mockGoals: Goal[] = [
  mockYearlyGoal,
  mockQuarterlyGoal,
  mockMonthlyGoal,
  mockWeeklyGoal,
]

const mockHierarchy = {
  yearly: [mockYearlyGoal],
  quarterly: [mockQuarterlyGoal],
  monthly: [mockMonthlyGoal],
  weekly: [mockWeeklyGoal],
}

describe('goalsStore', () => {
  beforeEach(() => {
    // Reset store state
    useGoalsStore.setState({
      goals: [],
      hierarchy: {
        yearly: [],
        quarterly: [],
        monthly: [],
        weekly: [],
      },
      selectedGoal: null,
      isLoading: false,
      error: null,
    })

    // Reset mocks
    vi.clearAllMocks()

    // Set up mock window.milo.goals API
    window.milo = {
      ...window.milo,
      goals: {
        getAll: vi.fn().mockResolvedValue(mockGoals),
        getById: vi.fn().mockResolvedValue(mockYearlyGoal),
        getHierarchy: vi.fn().mockResolvedValue(mockHierarchy),
        create: vi.fn().mockResolvedValue(mockYearlyGoal),
        update: vi.fn().mockResolvedValue(mockYearlyGoal),
        delete: vi.fn().mockResolvedValue(true),
      },
    } as any
  })

  describe('initial state', () => {
    it('has empty goals array', () => {
      const state = useGoalsStore.getState()
      expect(state.goals).toEqual([])
    })

    it('has empty hierarchy', () => {
      const state = useGoalsStore.getState()
      expect(state.hierarchy).toEqual({
        yearly: [],
        quarterly: [],
        monthly: [],
        weekly: [],
      })
    })

    it('has no selected goal', () => {
      const state = useGoalsStore.getState()
      expect(state.selectedGoal).toBeNull()
    })

    it('is not loading', () => {
      const state = useGoalsStore.getState()
      expect(state.isLoading).toBe(false)
    })

    it('has no error', () => {
      const state = useGoalsStore.getState()
      expect(state.error).toBeNull()
    })
  })

  describe('fetchGoals', () => {
    it('sets loading state while fetching', async () => {
      const store = useGoalsStore.getState()

      // Start fetch but don't await
      const fetchPromise = store.fetchGoals()

      // Should be loading
      expect(useGoalsStore.getState().isLoading).toBe(true)

      await fetchPromise

      // Should not be loading after completion
      expect(useGoalsStore.getState().isLoading).toBe(false)
    })

    it('fetches and stores goals', async () => {
      const store = useGoalsStore.getState()
      await store.fetchGoals()

      const state = useGoalsStore.getState()
      expect(state.goals).toEqual(mockGoals)
      expect(window.milo.goals.getAll).toHaveBeenCalledTimes(1)
    })

    it('clears error on successful fetch', async () => {
      useGoalsStore.setState({ error: 'Previous error' })

      const store = useGoalsStore.getState()
      await store.fetchGoals()

      expect(useGoalsStore.getState().error).toBeNull()
    })

    it('handles errors', async () => {
      const errorMessage = 'Failed to fetch goals'
      window.milo.goals.getAll = vi.fn().mockRejectedValue(new Error(errorMessage))

      const store = useGoalsStore.getState()
      await store.fetchGoals()

      const state = useGoalsStore.getState()
      expect(state.error).toBe(errorMessage)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('fetchHierarchy', () => {
    it('sets loading state while fetching', async () => {
      const store = useGoalsStore.getState()

      // Start fetch but don't await
      const fetchPromise = store.fetchHierarchy()

      // Should be loading
      expect(useGoalsStore.getState().isLoading).toBe(true)

      await fetchPromise

      // Should not be loading after completion
      expect(useGoalsStore.getState().isLoading).toBe(false)
    })

    it('fetches and stores hierarchy', async () => {
      const store = useGoalsStore.getState()
      await store.fetchHierarchy()

      const state = useGoalsStore.getState()
      expect(state.hierarchy).toEqual(mockHierarchy)
      expect(window.milo.goals.getHierarchy).toHaveBeenCalledTimes(1)
    })

    it('clears error on successful fetch', async () => {
      useGoalsStore.setState({ error: 'Previous error' })

      const store = useGoalsStore.getState()
      await store.fetchHierarchy()

      expect(useGoalsStore.getState().error).toBeNull()
    })

    it('handles errors', async () => {
      const errorMessage = 'Failed to fetch hierarchy'
      window.milo.goals.getHierarchy = vi.fn().mockRejectedValue(new Error(errorMessage))

      const store = useGoalsStore.getState()
      await store.fetchHierarchy()

      const state = useGoalsStore.getState()
      expect(state.error).toBe(errorMessage)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('createGoal', () => {
    it('creates and adds goal to state', async () => {
      const newGoalData = {
        title: 'New Goal',
        description: 'New goal description',
        parentId: null,
        timeframe: 'yearly' as const,
        status: 'active' as const,
        targetDate: '2024-12-31',
      }

      const store = useGoalsStore.getState()
      const result = await store.createGoal(newGoalData)

      expect(result).toEqual(mockYearlyGoal)
      expect(window.milo.goals.create).toHaveBeenCalledWith(newGoalData)
      expect(useGoalsStore.getState().goals).toContain(mockYearlyGoal)
    })

    it('adds new goal at the beginning of the goals list', async () => {
      // Pre-populate with existing goals
      useGoalsStore.setState({ goals: [mockQuarterlyGoal, mockMonthlyGoal] })

      const store = useGoalsStore.getState()
      await store.createGoal({
        title: 'New Goal',
        parentId: null,
        timeframe: 'yearly',
        status: 'active',
      })

      const state = useGoalsStore.getState()
      expect(state.goals[0]).toEqual(mockYearlyGoal)
      expect(state.goals.length).toBe(3)
    })

    it('adds new goal to the correct hierarchy timeframe', async () => {
      const store = useGoalsStore.getState()
      await store.createGoal({
        title: 'New Yearly Goal',
        parentId: null,
        timeframe: 'yearly',
        status: 'active',
      })

      const state = useGoalsStore.getState()
      expect(state.hierarchy.yearly).toContain(mockYearlyGoal)
      expect(state.hierarchy.yearly[0]).toEqual(mockYearlyGoal)
    })

    it('handles different timeframes correctly', async () => {
      const store = useGoalsStore.getState()

      // Test quarterly goal
      window.milo.goals.create = vi.fn().mockResolvedValue(mockQuarterlyGoal)
      await store.createGoal({
        title: 'Quarterly Goal',
        parentId: 'goal-1',
        timeframe: 'quarterly',
        status: 'active',
      })

      expect(useGoalsStore.getState().hierarchy.quarterly).toContain(mockQuarterlyGoal)
    })

    it('handles creation errors', async () => {
      window.milo.goals.create = vi.fn().mockRejectedValue(new Error('Creation failed'))

      const store = useGoalsStore.getState()
      const result = await store.createGoal({
        title: 'New Goal',
        parentId: null,
        timeframe: 'yearly',
        status: 'active',
      })

      expect(result).toBeNull()
      expect(useGoalsStore.getState().error).toBe('Creation failed')
    })

    it('does not update state when creation fails', async () => {
      window.milo.goals.create = vi.fn().mockRejectedValue(new Error('Creation failed'))

      const store = useGoalsStore.getState()
      await store.createGoal({
        title: 'New Goal',
        parentId: null,
        timeframe: 'yearly',
        status: 'active',
      })

      expect(useGoalsStore.getState().goals).toEqual([])
    })
  })

  describe('updateGoal', () => {
    beforeEach(() => {
      useGoalsStore.setState({
        goals: mockGoals,
        hierarchy: mockHierarchy,
      })
    })

    it('updates goal in state', async () => {
      const updatedGoal = { ...mockYearlyGoal, title: 'Updated Title' }
      window.milo.goals.update = vi.fn().mockResolvedValue(updatedGoal)

      const store = useGoalsStore.getState()
      const result = await store.updateGoal('goal-1', { title: 'Updated Title' })

      expect(result).toEqual(updatedGoal)
      const state = useGoalsStore.getState()
      const updated = state.goals.find(g => g.id === 'goal-1')
      expect(updated?.title).toBe('Updated Title')
    })

    it('updates goal in hierarchy', async () => {
      const updatedGoal = { ...mockYearlyGoal, title: 'Updated Title' }
      window.milo.goals.update = vi.fn().mockResolvedValue(updatedGoal)

      const store = useGoalsStore.getState()
      await store.updateGoal('goal-1', { title: 'Updated Title' })

      const state = useGoalsStore.getState()
      expect(state.hierarchy.yearly[0].title).toBe('Updated Title')
    })

    it('updates selectedGoal if it matches', async () => {
      const selectedGoal = mockYearlyGoal
      useGoalsStore.setState({ selectedGoal })

      const updatedGoal = { ...mockYearlyGoal, title: 'Updated Active' }
      window.milo.goals.update = vi.fn().mockResolvedValue(updatedGoal)

      const store = useGoalsStore.getState()
      await store.updateGoal('goal-1', { title: 'Updated Active' })

      expect(useGoalsStore.getState().selectedGoal?.title).toBe('Updated Active')
    })

    it('does not update selectedGoal if different goal is updated', async () => {
      const selectedGoal = mockMonthlyGoal
      useGoalsStore.setState({ selectedGoal })

      const updatedGoal = { ...mockYearlyGoal, title: 'Updated' }
      window.milo.goals.update = vi.fn().mockResolvedValue(updatedGoal)

      const store = useGoalsStore.getState()
      await store.updateGoal('goal-1', { title: 'Updated' })

      expect(useGoalsStore.getState().selectedGoal).toEqual(mockMonthlyGoal)
    })

    it('handles timeframe changes', async () => {
      const updatedGoal = { ...mockYearlyGoal, timeframe: 'quarterly' as const }
      window.milo.goals.update = vi.fn().mockResolvedValue(updatedGoal)

      const store = useGoalsStore.getState()
      await store.updateGoal('goal-1', { timeframe: 'quarterly' })

      const state = useGoalsStore.getState()

      // Should be removed from yearly
      expect(state.hierarchy.yearly.find(g => g.id === 'goal-1')).toBeUndefined()

      // Should be added to quarterly
      expect(state.hierarchy.quarterly.find(g => g.id === 'goal-1')).toEqual(updatedGoal)
    })

    it('adds goal to beginning when moving to new timeframe', async () => {
      const updatedGoal = { ...mockYearlyGoal, timeframe: 'quarterly' as const }
      window.milo.goals.update = vi.fn().mockResolvedValue(updatedGoal)

      const store = useGoalsStore.getState()
      await store.updateGoal('goal-1', { timeframe: 'quarterly' })

      const state = useGoalsStore.getState()
      expect(state.hierarchy.quarterly[0]).toEqual(updatedGoal)
    })

    it('handles update within same timeframe', async () => {
      const updatedGoal = { ...mockQuarterlyGoal, title: 'Updated Quarterly' }
      window.milo.goals.update = vi.fn().mockResolvedValue(updatedGoal)

      const store = useGoalsStore.getState()
      await store.updateGoal('goal-2', { title: 'Updated Quarterly' })

      const state = useGoalsStore.getState()
      expect(state.hierarchy.quarterly.find(g => g.id === 'goal-2')?.title).toBe('Updated Quarterly')
    })

    it('handles update errors', async () => {
      window.milo.goals.update = vi.fn().mockRejectedValue(new Error('Update failed'))

      const store = useGoalsStore.getState()
      const result = await store.updateGoal('goal-1', { title: 'Updated Title' })

      expect(result).toBeNull()
      expect(useGoalsStore.getState().error).toBe('Update failed')
    })

    it('does not update state when update fails', async () => {
      window.milo.goals.update = vi.fn().mockRejectedValue(new Error('Update failed'))

      const originalTitle = mockYearlyGoal.title
      const store = useGoalsStore.getState()
      await store.updateGoal('goal-1', { title: 'Updated Title' })

      const state = useGoalsStore.getState()
      expect(state.goals.find(g => g.id === 'goal-1')?.title).toBe(originalTitle)
    })
  })

  describe('deleteGoal', () => {
    beforeEach(() => {
      useGoalsStore.setState({
        goals: mockGoals,
        hierarchy: mockHierarchy,
      })
    })

    it('removes goal from state', async () => {
      const store = useGoalsStore.getState()
      const result = await store.deleteGoal('goal-1')

      expect(result).toBe(true)
      expect(window.milo.goals.delete).toHaveBeenCalledWith('goal-1')

      const state = useGoalsStore.getState()
      expect(state.goals.find(g => g.id === 'goal-1')).toBeUndefined()
      expect(state.goals.length).toBe(3)
    })

    it('removes goal from hierarchy', async () => {
      const store = useGoalsStore.getState()
      await store.deleteGoal('goal-1')

      const state = useGoalsStore.getState()
      expect(state.hierarchy.yearly.find(g => g.id === 'goal-1')).toBeUndefined()
    })

    it('removes goal from correct timeframe in hierarchy', async () => {
      const store = useGoalsStore.getState()
      await store.deleteGoal('goal-2')

      const state = useGoalsStore.getState()
      expect(state.hierarchy.quarterly.find(g => g.id === 'goal-2')).toBeUndefined()
      expect(state.hierarchy.yearly.length).toBe(1) // Yearly goals untouched
    })

    it('clears selectedGoal if deleted goal was selected', async () => {
      useGoalsStore.setState({ selectedGoal: mockYearlyGoal })

      const store = useGoalsStore.getState()
      await store.deleteGoal('goal-1')

      expect(useGoalsStore.getState().selectedGoal).toBeNull()
    })

    it('preserves selectedGoal if different goal is deleted', async () => {
      useGoalsStore.setState({ selectedGoal: mockYearlyGoal })

      const store = useGoalsStore.getState()
      await store.deleteGoal('goal-2')

      expect(useGoalsStore.getState().selectedGoal).toEqual(mockYearlyGoal)
    })

    it('handles deletion errors', async () => {
      window.milo.goals.delete = vi.fn().mockRejectedValue(new Error('Delete failed'))

      const store = useGoalsStore.getState()
      const result = await store.deleteGoal('goal-1')

      expect(result).toBe(false)
      expect(useGoalsStore.getState().error).toBe('Delete failed')
    })

    it('does not update state when deletion fails', async () => {
      window.milo.goals.delete = vi.fn().mockRejectedValue(new Error('Delete failed'))

      const originalLength = mockGoals.length
      const store = useGoalsStore.getState()
      await store.deleteGoal('goal-1')

      expect(useGoalsStore.getState().goals.length).toBe(originalLength)
    })

    it('handles API returning false', async () => {
      window.milo.goals.delete = vi.fn().mockResolvedValue(false)

      const store = useGoalsStore.getState()
      const result = await store.deleteGoal('goal-1')

      expect(result).toBe(false)
      // State should not be updated when API returns false
      expect(useGoalsStore.getState().goals.find(g => g.id === 'goal-1')).toBeDefined()
    })
  })

  describe('selectGoal', () => {
    it('sets selected goal', () => {
      const store = useGoalsStore.getState()
      store.selectGoal(mockYearlyGoal)

      expect(useGoalsStore.getState().selectedGoal).toEqual(mockYearlyGoal)
    })

    it('clears selected goal when passed null', () => {
      useGoalsStore.setState({ selectedGoal: mockYearlyGoal })

      const store = useGoalsStore.getState()
      store.selectGoal(null)

      expect(useGoalsStore.getState().selectedGoal).toBeNull()
    })

    it('can change selected goal', () => {
      useGoalsStore.setState({ selectedGoal: mockYearlyGoal })

      const store = useGoalsStore.getState()
      store.selectGoal(mockQuarterlyGoal)

      expect(useGoalsStore.getState().selectedGoal).toEqual(mockQuarterlyGoal)
    })
  })

  describe('edge cases', () => {
    it('handles empty goals array from API', async () => {
      window.milo.goals.getAll = vi.fn().mockResolvedValue([])

      const store = useGoalsStore.getState()
      await store.fetchGoals()

      expect(useGoalsStore.getState().goals).toEqual([])
    })

    it('handles empty hierarchy from API', async () => {
      const emptyHierarchy = {
        yearly: [],
        quarterly: [],
        monthly: [],
        weekly: [],
      }
      window.milo.goals.getHierarchy = vi.fn().mockResolvedValue(emptyHierarchy)

      const store = useGoalsStore.getState()
      await store.fetchHierarchy()

      expect(useGoalsStore.getState().hierarchy).toEqual(emptyHierarchy)
    })

    it('handles updating non-existent goal', async () => {
      useGoalsStore.setState({ goals: [mockYearlyGoal] })

      const updatedGoal = { ...mockMonthlyGoal, title: 'Updated' }
      window.milo.goals.update = vi.fn().mockResolvedValue(updatedGoal)

      const store = useGoalsStore.getState()
      await store.updateGoal('non-existent-id', { title: 'Updated' })

      // Should still update if API succeeds, but goal won't be in original list
      const state = useGoalsStore.getState()
      expect(state.goals.find(g => g.id === 'non-existent-id')).toBeUndefined()
    })

    it('handles deleting non-existent goal', async () => {
      useGoalsStore.setState({ goals: [mockYearlyGoal] })

      const store = useGoalsStore.getState()
      await store.deleteGoal('non-existent-id')

      // Should call API but not affect state
      expect(window.milo.goals.delete).toHaveBeenCalledWith('non-existent-id')
      expect(useGoalsStore.getState().goals.length).toBe(1)
    })

    it('preserves other goals when creating new goal fails', async () => {
      useGoalsStore.setState({ goals: mockGoals })
      window.milo.goals.create = vi.fn().mockRejectedValue(new Error('Creation failed'))

      const originalLength = mockGoals.length
      const store = useGoalsStore.getState()
      await store.createGoal({
        title: 'New Goal',
        parentId: null,
        timeframe: 'yearly',
        status: 'active',
      })

      expect(useGoalsStore.getState().goals.length).toBe(originalLength)
    })

    it('handles API returning null for create', async () => {
      window.milo.goals.create = vi.fn().mockResolvedValue(null)

      const store = useGoalsStore.getState()
      const result = await store.createGoal({
        title: 'New Goal',
        parentId: null,
        timeframe: 'yearly',
        status: 'active',
      })

      expect(result).toBeNull()
      expect(useGoalsStore.getState().goals).toEqual([])
    })

    it('handles API returning null for update', async () => {
      useGoalsStore.setState({ goals: [mockYearlyGoal] })
      window.milo.goals.update = vi.fn().mockResolvedValue(null)

      const store = useGoalsStore.getState()
      const result = await store.updateGoal('goal-1', { title: 'Updated' })

      expect(result).toBeNull()
      // State should not be updated when API returns null
      expect(useGoalsStore.getState().goals[0].title).toBe(mockYearlyGoal.title)
    })

    it('handles concurrent operations', async () => {
      const store = useGoalsStore.getState()

      // Start multiple operations simultaneously
      const fetchPromise = store.fetchGoals()
      const hierarchyPromise = store.fetchHierarchy()

      await Promise.all([fetchPromise, hierarchyPromise])

      const state = useGoalsStore.getState()
      expect(state.goals).toEqual(mockGoals)
      expect(state.hierarchy).toEqual(mockHierarchy)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('error recovery', () => {
    it('allows operations after error', async () => {
      // Cause an error
      window.milo.goals.getAll = vi.fn().mockRejectedValue(new Error('First error'))
      const store = useGoalsStore.getState()
      await store.fetchGoals()

      expect(useGoalsStore.getState().error).toBe('First error')

      // Fix the API and try again
      window.milo.goals.getAll = vi.fn().mockResolvedValue(mockGoals)
      await store.fetchGoals()

      expect(useGoalsStore.getState().error).toBeNull()
      expect(useGoalsStore.getState().goals).toEqual(mockGoals)
    })

    it('clears previous errors on new fetch', async () => {
      useGoalsStore.setState({ error: 'Old error' })

      const store = useGoalsStore.getState()
      await store.fetchGoals()

      expect(useGoalsStore.getState().error).toBeNull()
    })

    it('sets error on API rejection', async () => {
      const errorMessage = 'Network error'
      window.milo.goals.getAll = vi.fn().mockRejectedValue(new Error(errorMessage))

      const store = useGoalsStore.getState()
      await store.fetchGoals()

      expect(useGoalsStore.getState().error).toBe(errorMessage)
    })
  })
})
