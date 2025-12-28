import { create } from 'zustand'
import type {
  MorningBriefingInput,
  MorningBriefingOutput,
  EveningReviewInput,
  EveningReviewOutput,
  TaskParserOutput,
} from '../types/milo-api'

// Dialogue message for UI display
export interface DialogueMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type?: 'briefing' | 'review' | 'nudge' | 'parsed_tasks'
  data?: MorningBriefingOutput | EveningReviewOutput | TaskParserOutput
}

// Dialogue session types
export type DialogueType = 'morning_briefing' | 'evening_review' | null

interface AIState {
  // Initialization state
  isInitialized: boolean
  isInitializing: boolean

  // Active dialogue
  activeDialogue: DialogueType
  dialogueMessages: DialogueMessage[]
  isGenerating: boolean

  // Last results (for quick access)
  lastBriefing: MorningBriefingOutput | null
  lastReview: EveningReviewOutput | null

  // Error handling
  error: string | null

  // Actions
  initialize: (apiKey: string) => Promise<boolean>
  checkInitialized: () => Promise<boolean>

  // Dialogue management
  startMorningBriefing: () => void
  startEveningReview: () => void
  closeDialogue: () => void
  clearMessages: () => void

  // AI operations
  generateMorningBriefing: (input: MorningBriefingInput) => Promise<MorningBriefingOutput | null>
  generateEveningReview: (input: EveningReviewInput) => Promise<EveningReviewOutput | null>
  parseTasks: (text: string) => Promise<TaskParserOutput | null>
  generateNudge: (driftMinutes: number, currentApp: string) => Promise<string | null>

  // Helper for adding messages
  addMessage: (role: 'user' | 'assistant', content: string, type?: DialogueMessage['type'], data?: DialogueMessage['data']) => void
}

export const useAIStore = create<AIState>((set, get) => ({
  // Initial state
  isInitialized: false,
  isInitializing: false,
  activeDialogue: null,
  dialogueMessages: [],
  isGenerating: false,
  lastBriefing: null,
  lastReview: null,
  error: null,

  // Initialize Claude client with API key
  initialize: async (apiKey: string) => {
    set({ isInitializing: true, error: null })
    try {
      const result = await window.milo?.ai.initialize(apiKey)
      set({ isInitialized: result, isInitializing: false })
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize AI'
      set({ isInitializing: false, error: message })
      return false
    }
  },

  // Check if AI is ready
  checkInitialized: async () => {
    try {
      const result = await window.milo?.ai.isInitialized()
      set({ isInitialized: result })
      return result
    } catch {
      set({ isInitialized: false })
      return false
    }
  },

  // Start morning briefing dialogue
  startMorningBriefing: () => {
    set({
      activeDialogue: 'morning_briefing',
      dialogueMessages: [],
      error: null,
    })
  },

  // Start evening review dialogue
  startEveningReview: () => {
    set({
      activeDialogue: 'evening_review',
      dialogueMessages: [],
      error: null,
    })
  },

  // Close active dialogue
  closeDialogue: () => {
    set({
      activeDialogue: null,
      isGenerating: false,
    })
  },

  // Clear all messages
  clearMessages: () => {
    set({ dialogueMessages: [] })
  },

  // Add a message to the dialogue
  addMessage: (role, content, type, data) => {
    const message: DialogueMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      type,
      data,
    }
    set((state) => ({
      dialogueMessages: [...state.dialogueMessages, message],
    }))
  },

  // Generate morning briefing
  generateMorningBriefing: async (input: MorningBriefingInput) => {
    const { addMessage } = get()
    set({ isGenerating: true, error: null })

    try {
      const result = await window.milo?.ai.morningBriefing(input)
      if (result) {
        addMessage('assistant', result.briefing, 'briefing', result)
        set({ lastBriefing: result, isGenerating: false })
        return result
      }
      set({ isGenerating: false })
      return null
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate briefing'
      set({ isGenerating: false, error: message })
      addMessage('assistant', `Error: ${message}`)
      return null
    }
  },

  // Generate evening review
  generateEveningReview: async (input: EveningReviewInput) => {
    const { addMessage } = get()
    set({ isGenerating: true, error: null })

    try {
      const result = await window.milo?.ai.eveningReview(input)
      if (result) {
        addMessage('assistant', result.analysis, 'review', result)
        set({ lastReview: result, isGenerating: false })
        return result
      }
      set({ isGenerating: false })
      return null
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate review'
      set({ isGenerating: false, error: message })
      addMessage('assistant', `Error: ${message}`)
      return null
    }
  },

  // Parse tasks from natural language
  parseTasks: async (text: string) => {
    const { addMessage } = get()
    set({ isGenerating: true, error: null })

    addMessage('user', text)

    try {
      const result = await window.milo?.ai.parseTasks(text)
      if (result) {
        const taskCount = result.tasks.length
        const summary = taskCount > 0
          ? `Parsed ${taskCount} task${taskCount > 1 ? 's' : ''}: ${result.tasks.map((t) => t.title).join(', ')}`
          : 'No tasks found in that text.'
        addMessage('assistant', summary, 'parsed_tasks', result)
        set({ isGenerating: false })
        return result
      }
      set({ isGenerating: false })
      return null
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse tasks'
      set({ isGenerating: false, error: message })
      addMessage('assistant', `Error: ${message}`)
      return null
    }
  },

  // Generate drift nudge
  generateNudge: async (driftMinutes: number, currentApp: string) => {
    set({ isGenerating: true, error: null })

    try {
      const result = await window.milo?.ai.generateNudge(driftMinutes, currentApp)
      set({ isGenerating: false })
      return result || null
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate nudge'
      set({ isGenerating: false, error: message })
      return null
    }
  },
}))
