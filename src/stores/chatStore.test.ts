import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useChatStore } from './chatStore'
import type { ChatConversation, ChatMessage } from './chatStore'

// Mock conversation and message data
const mockConversation = {
  id: 'conv-1',
  title: 'Test Conversation',
  createdAt: '2024-12-28T10:00:00Z',
  updatedAt: '2024-12-28T10:00:00Z',
}

const mockDbMessage = {
  id: 'msg-1',
  conversationId: 'conv-1',
  role: 'user' as const,
  content: 'Hello MILO',
  createdAt: '2024-12-28T10:00:00Z',
}

const mockAssistantDbMessage = {
  id: 'msg-2',
  conversationId: 'conv-1',
  role: 'assistant' as const,
  content: 'Hello! How can I help you today?',
  createdAt: '2024-12-28T10:00:01Z',
}

describe('chatStore', () => {
  beforeEach(() => {
    // Reset store state
    useChatStore.setState({
      isOpen: false,
      isHistoryOpen: false,
      currentConversationId: null,
      conversations: [],
      messages: [],
      isGenerating: false,
      isLoading: false,
      error: null,
    })

    // Reset mocks
    vi.clearAllMocks()

    // Set up mock window.milo.chat API
    window.milo = {
      ...window.milo,
      chat: {
        getAllConversations: vi.fn().mockResolvedValue([mockConversation]),
        getConversation: vi.fn().mockResolvedValue(mockConversation),
        createConversation: vi.fn().mockResolvedValue(mockConversation),
        updateConversationTitle: vi.fn().mockResolvedValue(true),
        deleteConversation: vi.fn().mockResolvedValue(true),
        autoTitleConversation: vi.fn().mockResolvedValue({
          ...mockConversation,
          title: 'Hello MILO',
        }),
        getMessages: vi.fn().mockResolvedValue([mockDbMessage]),
        addMessage: vi.fn().mockResolvedValue(mockDbMessage),
        deleteMessage: vi.fn().mockResolvedValue(true),
      },
      ai: {
        ...window.milo?.ai,
        chat: vi.fn().mockResolvedValue('Hello! How can I help you today?'),
      },
    } as any
  })

  describe('initial state', () => {
    it('starts with panel closed', () => {
      const state = useChatStore.getState()
      expect(state.isOpen).toBe(false)
    })

    it('starts with history closed', () => {
      const state = useChatStore.getState()
      expect(state.isHistoryOpen).toBe(false)
    })

    it('starts with no current conversation', () => {
      const state = useChatStore.getState()
      expect(state.currentConversationId).toBeNull()
    })

    it('starts with empty messages', () => {
      const state = useChatStore.getState()
      expect(state.messages).toEqual([])
    })

    it('starts with no error', () => {
      const state = useChatStore.getState()
      expect(state.error).toBeNull()
    })

    it('starts not generating', () => {
      const state = useChatStore.getState()
      expect(state.isGenerating).toBe(false)
    })
  })

  describe('UI Actions', () => {
    describe('togglePanel', () => {
      it('opens panel when closed', () => {
        const store = useChatStore.getState()
        store.togglePanel()
        expect(useChatStore.getState().isOpen).toBe(true)
      })

      it('closes panel when open', () => {
        useChatStore.setState({ isOpen: true })
        const store = useChatStore.getState()
        store.togglePanel()
        expect(useChatStore.getState().isOpen).toBe(false)
      })
    })

    describe('openPanel', () => {
      it('opens the panel', () => {
        const store = useChatStore.getState()
        store.openPanel()
        expect(useChatStore.getState().isOpen).toBe(true)
      })
    })

    describe('closePanel', () => {
      it('closes the panel', () => {
        useChatStore.setState({ isOpen: true })
        const store = useChatStore.getState()
        store.closePanel()
        expect(useChatStore.getState().isOpen).toBe(false)
      })

      it('also closes history when closing panel', () => {
        useChatStore.setState({ isOpen: true, isHistoryOpen: true })
        const store = useChatStore.getState()
        store.closePanel()
        expect(useChatStore.getState().isHistoryOpen).toBe(false)
      })
    })

    describe('toggleHistory', () => {
      it('opens history when closed', async () => {
        const store = useChatStore.getState()
        store.toggleHistory()
        expect(useChatStore.getState().isHistoryOpen).toBe(true)
      })

      it('closes history when open', () => {
        useChatStore.setState({ isHistoryOpen: true })
        const store = useChatStore.getState()
        store.toggleHistory()
        expect(useChatStore.getState().isHistoryOpen).toBe(false)
      })

      it('loads conversations when opening history for first time', async () => {
        const store = useChatStore.getState()
        store.toggleHistory()

        // Wait for async loadConversations
        await new Promise(resolve => setTimeout(resolve, 0))

        expect(window.milo.chat.getAllConversations).toHaveBeenCalled()
      })

      it('does not reload conversations when already loaded', async () => {
        useChatStore.setState({ conversations: [mockConversation as any] })
        const store = useChatStore.getState()
        store.toggleHistory()

        expect(window.milo.chat.getAllConversations).not.toHaveBeenCalled()
      })
    })
  })

  describe('Conversation Actions', () => {
    describe('loadConversations', () => {
      it('fetches and stores conversations', async () => {
        const store = useChatStore.getState()
        await store.loadConversations()

        expect(window.milo.chat.getAllConversations).toHaveBeenCalled()
        expect(useChatStore.getState().conversations).toEqual([mockConversation])
      })

      it('handles API errors gracefully', async () => {
        window.milo.chat.getAllConversations = vi.fn().mockRejectedValue(new Error('API Error'))

        const store = useChatStore.getState()
        await store.loadConversations()

        // Should not throw, just log error
        expect(useChatStore.getState().conversations).toEqual([])
      })
    })

    describe('loadConversation', () => {
      it('sets loading state while fetching', async () => {
        const store = useChatStore.getState()
        const loadPromise = store.loadConversation('conv-1')

        expect(useChatStore.getState().isLoading).toBe(true)
        await loadPromise
        expect(useChatStore.getState().isLoading).toBe(false)
      })

      it('fetches and stores messages for conversation', async () => {
        const store = useChatStore.getState()
        await store.loadConversation('conv-1')

        expect(window.milo.chat.getMessages).toHaveBeenCalledWith('conv-1')
        expect(useChatStore.getState().currentConversationId).toBe('conv-1')
        expect(useChatStore.getState().messages).toHaveLength(1)
        expect(useChatStore.getState().messages[0].content).toBe('Hello MILO')
      })

      it('closes history panel after loading', async () => {
        useChatStore.setState({ isHistoryOpen: true })

        const store = useChatStore.getState()
        await store.loadConversation('conv-1')

        expect(useChatStore.getState().isHistoryOpen).toBe(false)
      })

      it('converts DB message format to local format', async () => {
        const store = useChatStore.getState()
        await store.loadConversation('conv-1')

        const message = useChatStore.getState().messages[0]
        expect(message.timestamp).toBeInstanceOf(Date)
        expect(message.role).toBe('user')
      })

      it('handles errors and sets error state', async () => {
        window.milo.chat.getMessages = vi.fn().mockRejectedValue(new Error('Fetch failed'))

        const store = useChatStore.getState()
        await store.loadConversation('conv-1')

        expect(useChatStore.getState().error).toBe('Failed to load conversation')
        expect(useChatStore.getState().isLoading).toBe(false)
      })
    })

    describe('startNewConversation', () => {
      it('clears current conversation ID', () => {
        useChatStore.setState({ currentConversationId: 'conv-1' })

        const store = useChatStore.getState()
        store.startNewConversation()

        expect(useChatStore.getState().currentConversationId).toBeNull()
      })

      it('clears messages', () => {
        useChatStore.setState({
          messages: [{ id: 'msg-1', role: 'user', content: 'test', timestamp: new Date() }]
        })

        const store = useChatStore.getState()
        store.startNewConversation()

        expect(useChatStore.getState().messages).toEqual([])
      })

      it('clears error', () => {
        useChatStore.setState({ error: 'Some error' })

        const store = useChatStore.getState()
        store.startNewConversation()

        expect(useChatStore.getState().error).toBeNull()
      })

      it('closes history panel', () => {
        useChatStore.setState({ isHistoryOpen: true })

        const store = useChatStore.getState()
        store.startNewConversation()

        expect(useChatStore.getState().isHistoryOpen).toBe(false)
      })
    })

    describe('deleteConversation', () => {
      beforeEach(() => {
        useChatStore.setState({
          conversations: [mockConversation as any, { ...mockConversation, id: 'conv-2' } as any],
          currentConversationId: 'conv-1',
          messages: [{ id: 'msg-1', role: 'user', content: 'test', timestamp: new Date() }],
        })
      })

      it('calls API to delete conversation', async () => {
        const store = useChatStore.getState()
        await store.deleteConversation('conv-1')

        expect(window.milo.chat.deleteConversation).toHaveBeenCalledWith('conv-1')
      })

      it('removes conversation from local list', async () => {
        const store = useChatStore.getState()
        await store.deleteConversation('conv-1')

        expect(useChatStore.getState().conversations).toHaveLength(1)
        expect(useChatStore.getState().conversations[0].id).toBe('conv-2')
      })

      it('clears current conversation if deleted', async () => {
        const store = useChatStore.getState()
        await store.deleteConversation('conv-1')

        expect(useChatStore.getState().currentConversationId).toBeNull()
        expect(useChatStore.getState().messages).toEqual([])
      })

      it('keeps current conversation if different one deleted', async () => {
        const store = useChatStore.getState()
        await store.deleteConversation('conv-2')

        expect(useChatStore.getState().currentConversationId).toBe('conv-1')
        expect(useChatStore.getState().messages).toHaveLength(1)
      })

      it('handles API errors gracefully', async () => {
        window.milo.chat.deleteConversation = vi.fn().mockRejectedValue(new Error('Delete failed'))

        const store = useChatStore.getState()
        await store.deleteConversation('conv-1')

        // Should not throw, conversations unchanged
        expect(useChatStore.getState().conversations).toHaveLength(2)
      })
    })
  })

  describe('sendMessage', () => {
    it('does nothing for empty message', async () => {
      const store = useChatStore.getState()
      await store.sendMessage('   ')

      expect(window.milo.chat.createConversation).not.toHaveBeenCalled()
    })

    it('creates new conversation if none exists', async () => {
      const store = useChatStore.getState()
      await store.sendMessage('Hello')

      expect(window.milo.chat.createConversation).toHaveBeenCalled()
      expect(useChatStore.getState().currentConversationId).toBe('conv-1')
    })

    it('uses existing conversation if available', async () => {
      useChatStore.setState({ currentConversationId: 'existing-conv' })

      const store = useChatStore.getState()
      await store.sendMessage('Hello')

      expect(window.milo.chat.createConversation).not.toHaveBeenCalled()
    })

    it('saves user message to database', async () => {
      const store = useChatStore.getState()
      await store.sendMessage('Hello MILO')

      expect(window.milo.chat.addMessage).toHaveBeenCalledWith(
        'conv-1',
        'user',
        'Hello MILO'
      )
    })

    it('adds user message to local state', async () => {
      const store = useChatStore.getState()
      await store.sendMessage('Hello MILO')

      const messages = useChatStore.getState().messages
      expect(messages.some(m => m.role === 'user' && m.content === 'Hello MILO')).toBe(true)
    })

    it('sets isGenerating while waiting for AI response', async () => {
      // Mock a slow AI response
      window.milo.ai.chat = vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve('Response'), 100))
      )

      const store = useChatStore.getState()
      const sendPromise = store.sendMessage('Hello')

      // Wait for user message to be added
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(useChatStore.getState().isGenerating).toBe(true)

      await sendPromise
      expect(useChatStore.getState().isGenerating).toBe(false)
    })

    it('calls AI chat API with message and history', async () => {
      const store = useChatStore.getState()
      await store.sendMessage('Hello MILO')

      expect(window.milo.ai.chat).toHaveBeenCalledWith(
        'Hello MILO',
        expect.any(Array)
      )
    })

    it('saves assistant response to database', async () => {
      window.milo.chat.addMessage = vi.fn()
        .mockResolvedValueOnce(mockDbMessage)  // User message
        .mockResolvedValueOnce(mockAssistantDbMessage)  // Assistant message

      const store = useChatStore.getState()
      await store.sendMessage('Hello')

      expect(window.milo.chat.addMessage).toHaveBeenLastCalledWith(
        'conv-1',
        'assistant',
        'Hello! How can I help you today?'
      )
    })

    it('auto-titles conversation after first exchange', async () => {
      window.milo.chat.addMessage = vi.fn()
        .mockResolvedValueOnce(mockDbMessage)
        .mockResolvedValueOnce(mockAssistantDbMessage)

      const store = useChatStore.getState()
      await store.sendMessage('Hello')

      expect(window.milo.chat.autoTitleConversation).toHaveBeenCalledWith('conv-1')
    })

    it('handles AI error and sets error state', async () => {
      window.milo.ai.chat = vi.fn().mockRejectedValue(new Error('AI unavailable'))

      const store = useChatStore.getState()
      await store.sendMessage('Hello')

      expect(useChatStore.getState().error).toBe('AI unavailable')
      expect(useChatStore.getState().isGenerating).toBe(false)
    })

    it('handles conversation creation failure', async () => {
      window.milo.chat.createConversation = vi.fn().mockRejectedValue(new Error('DB error'))

      const store = useChatStore.getState()
      await store.sendMessage('Hello')

      expect(useChatStore.getState().error).toBe('Failed to create conversation')
    })
  })

  describe('clearConversation', () => {
    it('clears all conversation state', () => {
      useChatStore.setState({
        currentConversationId: 'conv-1',
        messages: [{ id: 'msg-1', role: 'user', content: 'test', timestamp: new Date() }],
        error: 'Some error',
      })

      const store = useChatStore.getState()
      store.clearConversation()

      expect(useChatStore.getState().currentConversationId).toBeNull()
      expect(useChatStore.getState().messages).toEqual([])
      expect(useChatStore.getState().error).toBeNull()
    })
  })
})
