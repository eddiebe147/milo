import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.milo API for tests
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
  },
  goals: {
    getAll: vi.fn().mockResolvedValue([]),
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
    getSummary: vi.fn().mockResolvedValue({ green: 0, amber: 0, red: 0 }),
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
    morningBriefing: vi.fn().mockResolvedValue(null),
    eveningReview: vi.fn().mockResolvedValue(null),
    parseTasks: vi.fn().mockResolvedValue({ tasks: [] }),
    generateNudge: vi.fn().mockResolvedValue(''),
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

// Set up window.milo mock
Object.defineProperty(window, 'milo', {
  value: mockMiloAPI,
  writable: true,
})

// Export for use in tests
export { mockMiloAPI }
