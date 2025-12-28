import { create } from 'zustand'
import type { ProcessedPlan, PlanApplyResult } from '../types/milo-api'

// Plan import workflow states
export type PlanImportStep = 'input' | 'processing' | 'review' | 'applying' | 'complete'

interface PlanStoreState {
  // Workflow state
  currentStep: PlanImportStep
  isProcessing: boolean
  isApplying: boolean
  error: string | null

  // Plan data
  rawInput: string
  additionalContext: string
  processedPlan: ProcessedPlan | null
  applyResult: PlanApplyResult | null

  // Edit state (for review step)
  editedGoals: ProcessedPlan['goals']
  editedTasks: ProcessedPlan['tasks']

  // Actions
  setRawInput: (input: string) => void
  setAdditionalContext: (context: string) => void
  processPlan: () => Promise<ProcessedPlan | null>
  applyPlan: () => Promise<PlanApplyResult | null>
  reset: () => void

  // Edit actions for review step
  updateGoal: (index: number, updates: Partial<ProcessedPlan['goals'][0]>) => void
  removeGoal: (index: number) => void
  updateTask: (index: number, updates: Partial<ProcessedPlan['tasks'][0]>) => void
  removeTask: (index: number) => void
  toggleTaskGoalLink: (taskIndex: number, goalIndex: number | null) => void
}

const initialState = {
  currentStep: 'input' as PlanImportStep,
  isProcessing: false,
  isApplying: false,
  error: null,
  rawInput: '',
  additionalContext: '',
  processedPlan: null,
  applyResult: null,
  editedGoals: [] as ProcessedPlan['goals'],
  editedTasks: [] as ProcessedPlan['tasks'],
}

export const usePlanStore = create<PlanStoreState>((set, get) => ({
  ...initialState,

  setRawInput: (input: string) => {
    set({ rawInput: input, error: null })
  },

  setAdditionalContext: (context: string) => {
    set({ additionalContext: context })
  },

  processPlan: async () => {
    const { rawInput, additionalContext } = get()

    if (!rawInput.trim()) {
      set({ error: 'Please enter a plan to process' })
      return null
    }

    set({ isProcessing: true, error: null, currentStep: 'processing' })

    try {
      const result = await window.milo?.ai.processPlan(rawInput, additionalContext || undefined)

      if (result) {
        set({
          processedPlan: result,
          editedGoals: [...result.goals],
          editedTasks: [...result.tasks],
          isProcessing: false,
          currentStep: 'review',
        })
        return result
      }

      set({
        isProcessing: false,
        error: 'Failed to process plan',
        currentStep: 'input',
      })
      return null
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process plan'
      set({
        isProcessing: false,
        error: message,
        currentStep: 'input',
      })
      return null
    }
  },

  applyPlan: async () => {
    const { processedPlan, editedGoals, editedTasks } = get()

    if (!processedPlan) {
      set({ error: 'No plan to apply' })
      return null
    }

    // Create the plan with edited values
    const planToApply: ProcessedPlan = {
      ...processedPlan,
      goals: editedGoals,
      tasks: editedTasks,
    }

    set({ isApplying: true, error: null, currentStep: 'applying' })

    try {
      const result = await window.milo?.plan.apply(planToApply)

      if (result?.success) {
        set({
          applyResult: result,
          isApplying: false,
          currentStep: 'complete',
        })
        return result
      }

      set({
        isApplying: false,
        error: 'Failed to apply plan',
        currentStep: 'review',
      })
      return null
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to apply plan'
      set({
        isApplying: false,
        error: message,
        currentStep: 'review',
      })
      return null
    }
  },

  reset: () => {
    set(initialState)
  },

  // Edit actions for review step
  updateGoal: (index: number, updates: Partial<ProcessedPlan['goals'][0]>) => {
    const { editedGoals } = get()
    const newGoals = [...editedGoals]
    newGoals[index] = { ...newGoals[index], ...updates }
    set({ editedGoals: newGoals })
  },

  removeGoal: (index: number) => {
    const { editedGoals, editedTasks } = get()
    const newGoals = editedGoals.filter((_, i) => i !== index)

    // Update task goal links (adjust indices)
    const newTasks = editedTasks.map((task) => {
      if (task.goalIndex === null) return task
      if (task.goalIndex === index) return { ...task, goalIndex: null }
      if (task.goalIndex > index) return { ...task, goalIndex: task.goalIndex - 1 }
      return task
    })

    set({ editedGoals: newGoals, editedTasks: newTasks })
  },

  updateTask: (index: number, updates: Partial<ProcessedPlan['tasks'][0]>) => {
    const { editedTasks } = get()
    const newTasks = [...editedTasks]
    newTasks[index] = { ...newTasks[index], ...updates }
    set({ editedTasks: newTasks })
  },

  removeTask: (index: number) => {
    const { editedTasks } = get()
    const newTasks = editedTasks.filter((_, i) => i !== index)

    // Update dependsOn references
    const updatedTasks = newTasks.map((task) => ({
      ...task,
      dependsOn: task.dependsOn
        .filter((depIdx) => depIdx !== index)
        .map((depIdx) => (depIdx > index ? depIdx - 1 : depIdx)),
    }))

    set({ editedTasks: updatedTasks })
  },

  toggleTaskGoalLink: (taskIndex: number, goalIndex: number | null) => {
    const { editedTasks } = get()
    const newTasks = [...editedTasks]
    newTasks[taskIndex] = { ...newTasks[taskIndex], goalIndex }
    set({ editedTasks: newTasks })
  },
}))
