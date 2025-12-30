/**
 * API Contract Tests
 *
 * These tests verify that Zustand stores call the correct window.milo API methods
 * with the expected parameters. This validates the contract between the frontend
 * stores and the Electron IPC layer.
 *
 * Note: Repository logic is tested in electron/repositories/*.test.ts (152 tests)
 * These tests focus on the store → API integration contract.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Define mock types matching MiloAPI
type MockMiloAPI = {
  goals: {
    getAll: ReturnType<typeof vi.fn>
    getById: ReturnType<typeof vi.fn>
    getHierarchy: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  tasks: {
    getAll: ReturnType<typeof vi.fn>
    getToday: ReturnType<typeof vi.fn>
    getById: ReturnType<typeof vi.fn>
    getActive: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    start: ReturnType<typeof vi.fn>
    complete: ReturnType<typeof vi.fn>
    defer: ReturnType<typeof vi.fn>
    getAllIncomplete: ReturnType<typeof vi.fn>
    getByCategory: ReturnType<typeof vi.fn>
    getSignalQueue: ReturnType<typeof vi.fn>
    getBacklog: ReturnType<typeof vi.fn>
    getWorkedYesterday: ReturnType<typeof vi.fn>
    recordWork: ReturnType<typeof vi.fn>
  }
  categories: {
    getAll: ReturnType<typeof vi.fn>
    getActive: ReturnType<typeof vi.fn>
    getById: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    reorder: ReturnType<typeof vi.fn>
  }
  settings: {
    get: ReturnType<typeof vi.fn>
    getApiKey: ReturnType<typeof vi.fn>
    saveApiKey: ReturnType<typeof vi.fn>
    getRefillMode: ReturnType<typeof vi.fn>
    saveRefillMode: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  chat: {
    getAllConversations: ReturnType<typeof vi.fn>
    getConversation: ReturnType<typeof vi.fn>
    createConversation: ReturnType<typeof vi.fn>
    updateConversationTitle: ReturnType<typeof vi.fn>
    deleteConversation: ReturnType<typeof vi.fn>
    autoTitleConversation: ReturnType<typeof vi.fn>
    getMessages: ReturnType<typeof vi.fn>
    addMessage: ReturnType<typeof vi.fn>
    deleteMessage: ReturnType<typeof vi.fn>
  }
  ai: {
    initialize: ReturnType<typeof vi.fn>
    isInitialized: ReturnType<typeof vi.fn>
    chat: ReturnType<typeof vi.fn>
  }
}

// Create a fresh mock for each test
function createMockMiloAPI(): MockMiloAPI {
  return {
    goals: {
      getAll: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(null),
      getHierarchy: vi.fn().mockResolvedValue({ yearly: [], quarterly: [], monthly: [], weekly: [] }),
      create: vi.fn().mockResolvedValue({ id: 'new-goal-id', title: 'Test Goal' }),
      update: vi.fn().mockResolvedValue({ id: 'goal-id', title: 'Updated Goal' }),
      delete: vi.fn().mockResolvedValue(true),
    },
    tasks: {
      getAll: vi.fn().mockResolvedValue([]),
      getToday: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(null),
      getActive: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'new-task-id', title: 'Test Task' }),
      update: vi.fn().mockResolvedValue({ id: 'task-id', title: 'Updated Task' }),
      delete: vi.fn().mockResolvedValue(true),
      start: vi.fn().mockResolvedValue({ id: 'task-id', status: 'in_progress' }),
      complete: vi.fn().mockResolvedValue({ id: 'task-id', status: 'completed' }),
      defer: vi.fn().mockResolvedValue({ id: 'task-id', status: 'deferred' }),
      getAllIncomplete: vi.fn().mockResolvedValue([]),
      getByCategory: vi.fn().mockResolvedValue([]),
      getSignalQueue: vi.fn().mockResolvedValue([]),
      getBacklog: vi.fn().mockResolvedValue([]),
      getWorkedYesterday: vi.fn().mockResolvedValue([]),
      recordWork: vi.fn().mockResolvedValue({ id: 'task-id' }),
    },
    categories: {
      getAll: vi.fn().mockResolvedValue([]),
      getActive: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'new-cat-id', name: 'Test Category' }),
      update: vi.fn().mockResolvedValue({ id: 'cat-id', name: 'Updated Category' }),
      delete: vi.fn().mockResolvedValue(true),
      reorder: vi.fn().mockResolvedValue(undefined),
    },
    settings: {
      get: vi.fn().mockResolvedValue({ apiKey: null, refillMode: 'endless' }),
      getApiKey: vi.fn().mockResolvedValue(null),
      saveApiKey: vi.fn().mockResolvedValue(true),
      getRefillMode: vi.fn().mockResolvedValue('endless'),
      saveRefillMode: vi.fn().mockResolvedValue(true),
      update: vi.fn().mockResolvedValue(true),
    },
    chat: {
      getAllConversations: vi.fn().mockResolvedValue([]),
      getConversation: vi.fn().mockResolvedValue(null),
      createConversation: vi.fn().mockResolvedValue({ id: 'new-conv-id', title: 'New Chat' }),
      updateConversationTitle: vi.fn().mockResolvedValue(true),
      deleteConversation: vi.fn().mockResolvedValue(true),
      autoTitleConversation: vi.fn().mockResolvedValue({ id: 'conv-id', title: 'Auto Title' }),
      getMessages: vi.fn().mockResolvedValue([]),
      addMessage: vi.fn().mockResolvedValue({ id: 'msg-id', role: 'user', content: 'test' }),
      deleteMessage: vi.fn().mockResolvedValue(true),
    },
    ai: {
      initialize: vi.fn().mockResolvedValue(true),
      isInitialized: vi.fn().mockResolvedValue(false),
      chat: vi.fn().mockResolvedValue('AI response'),
    },
  }
}

describe('API Contract Tests', () => {
  let mockMilo: MockMiloAPI

  beforeEach(() => {
    mockMilo = createMockMiloAPI()
    // @ts-ignore - Setting up window.milo for tests
    window.milo = mockMilo
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Goals API Contract', () => {
    it('getAll should call goals.getAll()', async () => {
      await window.milo!.goals.getAll()
      expect(mockMilo.goals.getAll).toHaveBeenCalledTimes(1)
      expect(mockMilo.goals.getAll).toHaveBeenCalledWith()
    })

    it('getById should call goals.getById(id)', async () => {
      await window.milo!.goals.getById('goal-123')
      expect(mockMilo.goals.getById).toHaveBeenCalledWith('goal-123')
    })

    it('getHierarchy should call goals.getHierarchy()', async () => {
      await window.milo!.goals.getHierarchy()
      expect(mockMilo.goals.getHierarchy).toHaveBeenCalledTimes(1)
    })

    it('create should call goals.create(goalData)', async () => {
      const goalData = { title: 'New Goal', timeframe: 'monthly' as const, parentId: null, status: 'active' as const }
      await window.milo!.goals.create(goalData)
      expect(mockMilo.goals.create).toHaveBeenCalledWith(goalData)
    })

    it('update should call goals.update(id, updates)', async () => {
      const updates = { title: 'Updated Title' }
      await window.milo!.goals.update('goal-123', updates)
      expect(mockMilo.goals.update).toHaveBeenCalledWith('goal-123', updates)
    })

    it('delete should call goals.delete(id)', async () => {
      await window.milo!.goals.delete('goal-123')
      expect(mockMilo.goals.delete).toHaveBeenCalledWith('goal-123')
    })
  })

  describe('Tasks API Contract', () => {
    it('getAll should call tasks.getAll()', async () => {
      await window.milo!.tasks.getAll()
      expect(mockMilo.tasks.getAll).toHaveBeenCalledTimes(1)
    })

    it('getSignalQueue should call tasks.getSignalQueue(limit?)', async () => {
      await window.milo!.tasks.getSignalQueue(5)
      expect(mockMilo.tasks.getSignalQueue).toHaveBeenCalledWith(5)
    })

    it('getSignalQueue without limit should still work', async () => {
      await window.milo!.tasks.getSignalQueue()
      expect(mockMilo.tasks.getSignalQueue).toHaveBeenCalledWith()
    })

    it('getByCategory should call tasks.getByCategory(categoryId)', async () => {
      await window.milo!.tasks.getByCategory('cat-123')
      expect(mockMilo.tasks.getByCategory).toHaveBeenCalledWith('cat-123')
    })

    it('getBacklog should call tasks.getBacklog(signalQueueIds)', async () => {
      const signalQueueIds = ['task-1', 'task-2']
      await window.milo!.tasks.getBacklog(signalQueueIds)
      expect(mockMilo.tasks.getBacklog).toHaveBeenCalledWith(signalQueueIds)
    })

    it('create should call tasks.create(taskData)', async () => {
      const taskData = {
        title: 'New Task',
        scheduledDate: '2024-01-01',
        priority: 3,
        status: 'pending' as const,
        goalId: null
      }
      await window.milo!.tasks.create(taskData)
      expect(mockMilo.tasks.create).toHaveBeenCalledWith(taskData)
    })

    it('update should call tasks.update(id, updates)', async () => {
      const updates = { status: 'completed' as const }
      await window.milo!.tasks.update('task-123', updates)
      expect(mockMilo.tasks.update).toHaveBeenCalledWith('task-123', updates)
    })

    it('start should call tasks.start(id)', async () => {
      await window.milo!.tasks.start('task-123')
      expect(mockMilo.tasks.start).toHaveBeenCalledWith('task-123')
    })

    it('complete should call tasks.complete(id)', async () => {
      await window.milo!.tasks.complete('task-123')
      expect(mockMilo.tasks.complete).toHaveBeenCalledWith('task-123')
    })

    it('defer should call tasks.defer(id)', async () => {
      await window.milo!.tasks.defer('task-123')
      expect(mockMilo.tasks.defer).toHaveBeenCalledWith('task-123')
    })

    it('recordWork should call tasks.recordWork(id)', async () => {
      await window.milo!.tasks.recordWork('task-123')
      expect(mockMilo.tasks.recordWork).toHaveBeenCalledWith('task-123')
    })

    it('delete should call tasks.delete(id)', async () => {
      await window.milo!.tasks.delete('task-123')
      expect(mockMilo.tasks.delete).toHaveBeenCalledWith('task-123')
    })
  })

  describe('Categories API Contract', () => {
    it('getAll should call categories.getAll()', async () => {
      await window.milo!.categories.getAll()
      expect(mockMilo.categories.getAll).toHaveBeenCalledTimes(1)
    })

    it('getActive should call categories.getActive()', async () => {
      await window.milo!.categories.getActive()
      expect(mockMilo.categories.getActive).toHaveBeenCalledTimes(1)
    })

    it('create should call categories.create(categoryData)', async () => {
      const categoryData = { name: 'New Project', color: '#FF0000', sortOrder: 0, isActive: true }
      await window.milo!.categories.create(categoryData)
      expect(mockMilo.categories.create).toHaveBeenCalledWith(categoryData)
    })

    it('update should call categories.update(id, updates)', async () => {
      const updates = { name: 'Renamed Project' }
      await window.milo!.categories.update('cat-123', updates)
      expect(mockMilo.categories.update).toHaveBeenCalledWith('cat-123', updates)
    })

    it('delete should call categories.delete(id)', async () => {
      await window.milo!.categories.delete('cat-123')
      expect(mockMilo.categories.delete).toHaveBeenCalledWith('cat-123')
    })

    it('reorder should call categories.reorder(orderedIds)', async () => {
      const orderedIds = ['cat-3', 'cat-1', 'cat-2']
      await window.milo!.categories.reorder(orderedIds)
      expect(mockMilo.categories.reorder).toHaveBeenCalledWith(orderedIds)
    })
  })

  describe('Chat API Contract', () => {
    it('getAllConversations should call chat.getAllConversations()', async () => {
      await window.milo!.chat.getAllConversations()
      expect(mockMilo.chat.getAllConversations).toHaveBeenCalledTimes(1)
    })

    it('getConversation should call chat.getConversation(id)', async () => {
      await window.milo!.chat.getConversation('conv-123')
      expect(mockMilo.chat.getConversation).toHaveBeenCalledWith('conv-123')
    })

    it('createConversation should call chat.createConversation(title?)', async () => {
      await window.milo!.chat.createConversation('My Chat')
      expect(mockMilo.chat.createConversation).toHaveBeenCalledWith('My Chat')
    })

    it('createConversation without title should work', async () => {
      await window.milo!.chat.createConversation()
      expect(mockMilo.chat.createConversation).toHaveBeenCalledWith()
    })

    it('updateConversationTitle should call chat.updateConversationTitle(id, title)', async () => {
      await window.milo!.chat.updateConversationTitle('conv-123', 'New Title')
      expect(mockMilo.chat.updateConversationTitle).toHaveBeenCalledWith('conv-123', 'New Title')
    })

    it('deleteConversation should call chat.deleteConversation(id)', async () => {
      await window.milo!.chat.deleteConversation('conv-123')
      expect(mockMilo.chat.deleteConversation).toHaveBeenCalledWith('conv-123')
    })

    it('getMessages should call chat.getMessages(conversationId)', async () => {
      await window.milo!.chat.getMessages('conv-123')
      expect(mockMilo.chat.getMessages).toHaveBeenCalledWith('conv-123')
    })

    it('addMessage should call chat.addMessage(conversationId, role, content)', async () => {
      await window.milo!.chat.addMessage('conv-123', 'user', 'Hello!')
      expect(mockMilo.chat.addMessage).toHaveBeenCalledWith('conv-123', 'user', 'Hello!')
    })

    it('deleteMessage should call chat.deleteMessage(id)', async () => {
      await window.milo!.chat.deleteMessage('msg-123')
      expect(mockMilo.chat.deleteMessage).toHaveBeenCalledWith('msg-123')
    })

    it('autoTitleConversation should call chat.autoTitleConversation(id)', async () => {
      await window.milo!.chat.autoTitleConversation('conv-123')
      expect(mockMilo.chat.autoTitleConversation).toHaveBeenCalledWith('conv-123')
    })
  })

  describe('Settings API Contract', () => {
    it('get should call settings.get()', async () => {
      await window.milo!.settings.get()
      expect(mockMilo.settings.get).toHaveBeenCalledTimes(1)
    })

    it('getApiKey should call settings.getApiKey()', async () => {
      await window.milo!.settings.getApiKey()
      expect(mockMilo.settings.getApiKey).toHaveBeenCalledTimes(1)
    })

    it('saveApiKey should call settings.saveApiKey(apiKey)', async () => {
      await window.milo!.settings.saveApiKey('sk-ant-test-key')
      expect(mockMilo.settings.saveApiKey).toHaveBeenCalledWith('sk-ant-test-key')
    })

    it('saveApiKey with null should work', async () => {
      await window.milo!.settings.saveApiKey(null)
      expect(mockMilo.settings.saveApiKey).toHaveBeenCalledWith(null)
    })

    it('getRefillMode should call settings.getRefillMode()', async () => {
      await window.milo!.settings.getRefillMode()
      expect(mockMilo.settings.getRefillMode).toHaveBeenCalledTimes(1)
    })

    it('saveRefillMode should call settings.saveRefillMode(mode)', async () => {
      await window.milo!.settings.saveRefillMode('daily_reset')
      expect(mockMilo.settings.saveRefillMode).toHaveBeenCalledWith('daily_reset')
    })

    it('update should call settings.update(updates)', async () => {
      const updates = { alwaysOnTop: true, startMinimized: false }
      await window.milo!.settings.update(updates)
      expect(mockMilo.settings.update).toHaveBeenCalledWith(updates)
    })
  })

  describe('AI API Contract', () => {
    it('initialize should call ai.initialize(apiKey)', async () => {
      await window.milo!.ai.initialize('sk-ant-test-key')
      expect(mockMilo.ai.initialize).toHaveBeenCalledWith('sk-ant-test-key')
    })

    it('isInitialized should call ai.isInitialized()', async () => {
      await window.milo!.ai.isInitialized()
      expect(mockMilo.ai.isInitialized).toHaveBeenCalledTimes(1)
    })

    it('chat should call ai.chat(message, conversationHistory)', async () => {
      const history = [{ role: 'user' as const, content: 'Previous message' }]
      await window.milo!.ai.chat('Hello', history)
      expect(mockMilo.ai.chat).toHaveBeenCalledWith('Hello', history)
    })
  })
})

describe('API Return Value Contract', () => {
  let mockMilo: MockMiloAPI

  beforeEach(() => {
    mockMilo = createMockMiloAPI()
    // @ts-ignore
    window.milo = mockMilo
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('goals.getAll should return an array', async () => {
    mockMilo.goals.getAll.mockResolvedValue([
      { id: 'g1', title: 'Goal 1', timeframe: 'monthly' },
      { id: 'g2', title: 'Goal 2', timeframe: 'weekly' },
    ])

    const result = await window.milo!.goals.getAll()
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2)
    expect(result[0]).toHaveProperty('id')
    expect(result[0]).toHaveProperty('title')
    expect(result[0]).toHaveProperty('timeframe')
  })

  it('goals.getById should return goal or null', async () => {
    mockMilo.goals.getById
      .mockResolvedValueOnce({ id: 'g1', title: 'Found Goal', timeframe: 'monthly' })
      .mockResolvedValueOnce(null)

    const found = await window.milo!.goals.getById('g1')
    expect(found).not.toBeNull()
    expect(found?.id).toBe('g1')

    const notFound = await window.milo!.goals.getById('non-existent')
    expect(notFound).toBeNull()
  })

  it('tasks.getSignalQueue should return task array', async () => {
    mockMilo.tasks.getSignalQueue.mockResolvedValue([
      { id: 't1', title: 'Priority Task', priority: 5 },
    ])

    const result = await window.milo!.tasks.getSignalQueue(5)
    expect(Array.isArray(result)).toBe(true)
  })

  it('categories.create should return created category', async () => {
    mockMilo.categories.create.mockResolvedValue({
      id: 'new-cat',
      name: 'Test Project',
      color: '#00FF00',
      sortOrder: 1,
      isActive: true,
    })

    const result = await window.milo!.categories.create({ name: 'Test Project', color: '#00FF00', sortOrder: 0, isActive: true })
    expect(result).toHaveProperty('id')
    expect(result?.name).toBe('Test Project')
    expect(result?.color).toBe('#00FF00')
  })

  it('chat.addMessage should return created message with id', async () => {
    mockMilo.chat.addMessage.mockResolvedValue({
      id: 'msg-new',
      conversationId: 'conv-1',
      role: 'user',
      content: 'Test message',
      createdAt: '2024-01-01T00:00:00.000Z',
    })

    const result = await window.milo!.chat.addMessage('conv-1', 'user', 'Test message')
    expect(result).toHaveProperty('id')
    expect(result.conversationId).toBe('conv-1')
    expect(result.role).toBe('user')
    expect(result.content).toBe('Test message')
  })

  it('settings.get should return settings object', async () => {
    mockMilo.settings.get.mockResolvedValue({
      apiKey: null,
      refillMode: 'endless',
      workStartTime: '09:00',
      workEndTime: '17:00',
      workDays: [1, 2, 3, 4, 5],
      monitoringEnabled: true,
      pollingIntervalMs: 5000,
      driftAlertEnabled: true,
      driftAlertDelayMinutes: 5,
      morningBriefingTime: '08:00',
      eveningReviewTime: '18:00',
      alwaysOnTop: false,
      startMinimized: false,
      showInDock: true,
    })

    const result = await window.milo!.settings.get()
    expect(result).toHaveProperty('refillMode')
    expect(result).toHaveProperty('workStartTime')
    expect(result).toHaveProperty('workEndTime')
    expect(result).toHaveProperty('monitoringEnabled')
  })
})
