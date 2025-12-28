import { create } from 'zustand'
import type { Goal } from '../types'

interface GoalsState {
  goals: Goal[]
  hierarchy: {
    yearly: Goal[]
    quarterly: Goal[]
    monthly: Goal[]
    weekly: Goal[]
  }
  selectedGoal: Goal | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchGoals: () => Promise<void>
  fetchHierarchy: () => Promise<void>
  createGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Goal | null>
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<Goal | null>
  deleteGoal: (id: string) => Promise<boolean>
  selectGoal: (goal: Goal | null) => void
}

export const useGoalsStore = create<GoalsState>((set) => ({
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

  fetchGoals: async () => {
    set({ isLoading: true, error: null })
    try {
      const goals = await window.milo.goals.getAll()
      set({ goals, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  fetchHierarchy: async () => {
    set({ isLoading: true, error: null })
    try {
      const hierarchy = await window.milo.goals.getHierarchy()
      set({ hierarchy, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  createGoal: async (goal) => {
    try {
      const newGoal = await window.milo.goals.create(goal)
      if (newGoal) {
        set((state) => ({
          goals: [newGoal, ...state.goals],
          hierarchy: {
            ...state.hierarchy,
            [newGoal.timeframe]: [newGoal, ...state.hierarchy[newGoal.timeframe]],
          },
        }))
      }
      return newGoal
    } catch (error) {
      set({ error: (error as Error).message })
      return null
    }
  },

  updateGoal: async (id, updates) => {
    try {
      const updatedGoal = await window.milo.goals.update(id, updates)
      if (updatedGoal) {
        set((state) => {
          const oldGoal = state.goals.find((g) => g.id === id)
          const newGoals = state.goals.map((g) => (g.id === id ? updatedGoal : g))

          // Update hierarchy if timeframe changed
          const newHierarchy = { ...state.hierarchy }
          if (oldGoal && oldGoal.timeframe !== updatedGoal.timeframe) {
            newHierarchy[oldGoal.timeframe] = newHierarchy[oldGoal.timeframe].filter(
              (g) => g.id !== id
            )
            newHierarchy[updatedGoal.timeframe] = [
              updatedGoal,
              ...newHierarchy[updatedGoal.timeframe],
            ]
          } else {
            newHierarchy[updatedGoal.timeframe] = newHierarchy[updatedGoal.timeframe].map((g) =>
              g.id === id ? updatedGoal : g
            )
          }

          return {
            goals: newGoals,
            hierarchy: newHierarchy,
            selectedGoal: state.selectedGoal?.id === id ? updatedGoal : state.selectedGoal,
          }
        })
      }
      return updatedGoal
    } catch (error) {
      set({ error: (error as Error).message })
      return null
    }
  },

  deleteGoal: async (id) => {
    try {
      const success = await window.milo.goals.delete(id)
      if (success) {
        set((state) => {
          const goal = state.goals.find((g) => g.id === id)
          return {
            goals: state.goals.filter((g) => g.id !== id),
            hierarchy: goal
              ? {
                  ...state.hierarchy,
                  [goal.timeframe]: state.hierarchy[goal.timeframe].filter((g) => g.id !== id),
                }
              : state.hierarchy,
            selectedGoal: state.selectedGoal?.id === id ? null : state.selectedGoal,
          }
        })
      }
      return success
    } catch (error) {
      set({ error: (error as Error).message })
      return false
    }
  },

  selectGoal: (goal) => {
    set({ selectedGoal: goal })
  },
}))
