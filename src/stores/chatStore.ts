import { create } from 'zustand'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ChatConversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

interface ChatState {
  // UI state
  isOpen: boolean
  isHistoryOpen: boolean

  // Conversation management
  currentConversationId: string | null
  conversations: ChatConversation[]
  messages: ChatMessage[]
  isGenerating: boolean
  isLoading: boolean
  error: string | null

  // Actions
  togglePanel: () => void
  openPanel: () => void
  closePanel: () => void
  toggleHistory: () => void

  // Conversation actions
  loadConversations: () => Promise<void>
  loadConversation: (id: string) => Promise<void>
  startNewConversation: () => void
  deleteConversation: (id: string) => Promise<void>

  sendMessage: (message: string) => Promise<void>
  clearConversation: () => void
}

// Convert DB message to local format
const dbMessageToLocal = (dbMsg: {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}): ChatMessage => ({
  id: dbMsg.id,
  role: dbMsg.role,
  content: dbMsg.content,
  timestamp: new Date(dbMsg.createdAt),
})

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  isOpen: false,
  isHistoryOpen: false,
  currentConversationId: null,
  conversations: [],
  messages: [],
  isGenerating: false,
  isLoading: false,
  error: null,

  // UI Actions
  togglePanel: () => {
    set((state) => ({ isOpen: !state.isOpen }))
  },

  openPanel: () => {
    set({ isOpen: true })
  },

  closePanel: () => {
    set({ isOpen: false, isHistoryOpen: false })
  },

  toggleHistory: () => {
    const { isHistoryOpen, conversations } = get()
    if (!isHistoryOpen && conversations.length === 0) {
      // Load conversations when opening history for first time
      get().loadConversations()
    }
    set((state) => ({ isHistoryOpen: !state.isHistoryOpen }))
  },

  // Load all conversations
  loadConversations: async () => {
    try {
      const conversations = await window.milo?.chat.getAllConversations()
      if (conversations) {
        set({ conversations })
      }
    } catch (error) {
      console.error('[ChatStore] Failed to load conversations:', error)
    }
  },

  // Load a specific conversation
  loadConversation: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const messages = await window.milo?.chat.getMessages(id)
      if (messages) {
        set({
          currentConversationId: id,
          messages: messages.map(dbMessageToLocal),
          isLoading: false,
          isHistoryOpen: false,
        })
      }
    } catch (error) {
      console.error('[ChatStore] Failed to load conversation:', error)
      set({
        isLoading: false,
        error: 'Failed to load conversation',
      })
    }
  },

  // Start a fresh conversation
  startNewConversation: () => {
    set({
      currentConversationId: null,
      messages: [],
      error: null,
      isHistoryOpen: false,
    })
  },

  // Delete a conversation
  deleteConversation: async (id: string) => {
    try {
      await window.milo?.chat.deleteConversation(id)
      const { currentConversationId, conversations } = get()

      // Remove from local list
      set({
        conversations: conversations.filter((c) => c.id !== id),
      })

      // If we deleted the current conversation, clear it
      if (currentConversationId === id) {
        set({
          currentConversationId: null,
          messages: [],
        })
      }
    } catch (error) {
      console.error('[ChatStore] Failed to delete conversation:', error)
    }
  },

  // Send a message and get AI response
  sendMessage: async (message: string) => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage) return

    let { currentConversationId } = get()

    // Create a new conversation if needed
    if (!currentConversationId) {
      try {
        const conversation = await window.milo?.chat.createConversation()
        if (conversation) {
          currentConversationId = conversation.id
          set({ currentConversationId })
        }
      } catch (error) {
        console.error('[ChatStore] Failed to create conversation:', error)
        set({ error: 'Failed to create conversation' })
        return
      }
    }

    if (!currentConversationId) {
      set({ error: 'No conversation available' })
      return
    }

    // Save user message to DB and add to local state
    try {
      const userDbMsg = await window.milo?.chat.addMessage(
        currentConversationId,
        'user',
        trimmedMessage
      )

      if (userDbMsg) {
        const userMessage = dbMessageToLocal(userDbMsg)
        set((state) => ({
          messages: [...state.messages, userMessage],
          isGenerating: true,
          error: null,
        }))
      }
    } catch (error) {
      console.error('[ChatStore] Failed to save user message:', error)
    }

    try {
      // Get conversation history for context
      const { messages } = get()
      const conversationHistory = messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // Call the AI chat API
      const response = await window.milo?.ai.chat(trimmedMessage, conversationHistory)

      if (response) {
        // Save assistant message to DB
        const assistantDbMsg = await window.milo?.chat.addMessage(
          currentConversationId,
          'assistant',
          response
        )

        if (assistantDbMsg) {
          const assistantMessage = dbMessageToLocal(assistantDbMsg)
          set((state) => ({
            messages: [...state.messages, assistantMessage],
            isGenerating: false,
          }))
        }

        // Auto-title after first exchange (2 messages)
        const { messages: updatedMessages } = get()
        if (updatedMessages.length === 2) {
          try {
            const updatedConversation = await window.milo?.chat.autoTitleConversation(
              currentConversationId
            )
            if (updatedConversation) {
              // Update local conversation list
              set((state) => ({
                conversations: state.conversations.map((c) =>
                  c.id === currentConversationId ? updatedConversation : c
                ),
              }))
            }
          } catch (error) {
            console.error('[ChatStore] Failed to auto-title:', error)
          }
        }
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

  // Clear current conversation (for new chat)
  clearConversation: () => {
    set({
      currentConversationId: null,
      messages: [],
      error: null,
    })
  },
}))
