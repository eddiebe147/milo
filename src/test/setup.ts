import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'

// Shared mutable ref for the milo mock — vi.mock is hoisted, so we use
// vi.hoisted() to create the ref before mock evaluation.
const { mockRef } = vi.hoisted(() => {
  return { mockRef: { current: null as any } }
})

// Mock @/lib/api module so tests can both read `milo` and reassign it.
vi.mock('@/lib/api', () => ({
  get milo() { return mockRef.current },
  set milo(v: any) { mockRef.current = v },
  get default() { return mockRef.current },
}))

// Mock milo API for tests
const mockMiloAPI = {
  tasks: {
    getAll: vi.fn().mockResolvedValue([]),
    getToday: vi.fn().mockResolvedValue([]),
    getActive: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 'test-id' }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(true),
    start: vi.fn().mockResolvedValue({}),
    complete: vi.fn().mockResolvedValue({}),
    defer: vi.fn().mockResolvedValue({}),
    getSignalQueue: vi.fn().mockResolvedValue([]),
    getByCategory: vi.fn().mockResolvedValue([]),
    getBacklog: vi.fn().mockResolvedValue([]),
    recordWork: vi.fn().mockResolvedValue({}),
  },
  goals: {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    getHierarchy: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 'test-id' }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(true),
  },
  activity: {
    getStatus: vi.fn().mockResolvedValue({
      isRunning: false,
      isPaused: false,
      currentState: 'amber',
      currentAppName: '',
      currentWindowTitle: '',
    }),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    togglePause: vi.fn().mockResolvedValue(false),
    getToday: vi.fn().mockResolvedValue([]),
    getSummary: vi.fn().mockResolvedValue({ green: 0, amber: 0, red: 0, total: 0 }),
    getAppBreakdown: vi.fn().mockResolvedValue([]),
  },
  monitoring: {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    toggle: vi.fn().mockResolvedValue(true),
    status: vi.fn().mockResolvedValue({
      isRunning: false,
      isPaused: false,
      currentState: 'amber',
      currentAppName: '',
      currentWindowTitle: '',
    }),
  },
  scores: {
    getToday: vi.fn().mockResolvedValue(null),
    getRecent: vi.fn().mockResolvedValue([]),
    getStreak: vi.fn().mockResolvedValue(0),
    getCurrentStreak: vi.fn().mockResolvedValue(0),
    calculate: vi.fn().mockResolvedValue(null),
    getBreakdown: vi.fn().mockResolvedValue({
      score: 0,
      breakdown: {
        signalRatio: 0,
        taskCompletionRatio: 0,
        streakBonus: 0,
        finalScore: 0,
      },
      summary: {
        signalMinutes: 0,
        noiseMinutes: 0,
        adjacentMinutes: 0,
        totalMinutes: 0,
        tasksCompleted: 0,
        tasksTotal: 0,
        streak: 0,
      },
    }),
  },
  ai: {
    isInitialized: vi.fn().mockResolvedValue(false),
    initialize: vi.fn().mockResolvedValue(undefined),
    chat: vi.fn().mockResolvedValue({ response: '' }),
    morningBriefing: vi.fn().mockResolvedValue(null),
    eveningReview: vi.fn().mockResolvedValue(null),
    parseTasks: vi.fn().mockResolvedValue({ tasks: [] }),
    generateNudge: vi.fn().mockResolvedValue(''),
  },
  settings: {
    get: vi.fn().mockResolvedValue({}),
    getApiKey: vi.fn().mockResolvedValue(null),
    saveApiKey: vi.fn().mockResolvedValue(undefined),
    getRefillMode: vi.fn().mockResolvedValue('manual'),
    saveRefillMode: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue({}),
  },
  categories: {
    getAll: vi.fn().mockResolvedValue([]),
    getActive: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 'test-id' }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(true),
    reorder: vi.fn().mockResolvedValue(undefined),
  },
  chat: {
    getAllConversations: vi.fn().mockResolvedValue([]),
    getConversation: vi.fn().mockResolvedValue(null),
    createConversation: vi.fn().mockResolvedValue({ id: 'conv-1' }),
    updateConversationTitle: vi.fn().mockResolvedValue(undefined),
    deleteConversation: vi.fn().mockResolvedValue(undefined),
    getMessages: vi.fn().mockResolvedValue([]),
    addMessage: vi.fn().mockResolvedValue({ id: 'msg-1' }),
    deleteMessage: vi.fn().mockResolvedValue(undefined),
    autoTitleConversation: vi.fn().mockResolvedValue(undefined),
  },
  nudge: {
    getConfig: vi.fn().mockResolvedValue({
      firstNudgeThresholdMs: 300000,
      nudgeCooldownMs: 600000,
      showSystemNotifications: true,
      aiNudgesEnabled: true,
    }),
    setConfig: vi.fn().mockResolvedValue(undefined),
    getDriftStatus: vi.fn().mockResolvedValue({
      isDrifting: false,
      driftDurationMs: 0,
      currentApp: null,
    }),
  },
  events: {
    onActivityStateChanged: vi.fn().mockReturnValue(() => {}),
    onNudgeTriggered: vi.fn().mockReturnValue(() => {}),
    onShowMorningBriefing: vi.fn().mockReturnValue(() => {}),
    onShowEveningReview: vi.fn().mockReturnValue(() => {}),
    onShowSettings: vi.fn().mockReturnValue(() => {}),
  },
}

// Initialize the mock ref so tests that access milo.* without reassigning work
mockRef.current = mockMiloAPI

// Also set up window.milo for components that access it directly
Object.defineProperty(window, 'milo', {
  value: mockMiloAPI,
  writable: true,
})

// Reset all mock function calls between tests (keeps the structure, clears history)
beforeEach(() => {
  vi.clearAllMocks()
})

// Export for use in tests
export { mockMiloAPI }
