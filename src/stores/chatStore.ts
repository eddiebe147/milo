import { create } from 'zustand'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatState {
  // UI state
  isOpen: boolean

  // Conversation
  messages: ChatMessage[]
  isGenerating: boolean
  error: string | null

  // Actions
  togglePanel: () => void
  openPanel: () => void
  closePanel: () => void

  sendMessage: (message: string) => Promise<void>
  clearConversation: () => void
}

// Helper to generate unique message IDs
const generateMessageId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  isOpen: false,
  messages: [],
  isGenerating: false,
  error: null,

  // UI Actions
  togglePanel: () => {
    set((state) => ({ isOpen: !state.isOpen }))
  },

  openPanel: () => {
    set({ isOpen: true })
  },

  closePanel: () => {
    set({ isOpen: false })
  },

  // Send a message and get AI response
  sendMessage: async (message: string) => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage) return

    // Add user message
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: trimmedMessage,
      timestamp: new Date(),
    }

    set((state) => ({
      messages: [...state.messages, userMessage],
      isGenerating: true,
      error: null,
    }))

    try {
      // Get conversation history (last 10 messages) for context
      const { messages } = get()
      const conversationHistory = messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // Call the AI chat API
      const response = await window.milo?.ai.chat(trimmedMessage, conversationHistory)

      if (response) {
        // Add assistant response
        const assistantMessage: ChatMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        }

        set((state) => ({
          messages: [...state.messages, assistantMessage],
          isGenerating: false,
        }))
      } else {
        set({
          isGenerating: false,
          error: 'No response received from AI',
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
      set({
        isGenerating: false,
        error: errorMessage,
      })
    }
  },

  // Clear all messages and reset conversation
  clearConversation: () => {
    set({
      messages: [],
      error: null,
    })
  },
}))
