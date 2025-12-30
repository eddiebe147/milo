import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useNudgeStore } from './nudgeStore'
import type { NudgeEvent, NudgeConfig, DriftStatus } from '@/types/milo-api'

// Mock nudge data
const mockNudge: NudgeEvent = {
  message: 'You seem to be drifting...',
  driftMinutes: 15,
  currentApp: 'Twitter',
  timestamp: new Date('2024-12-28T10:00:00Z'),
  isAiGenerated: true,
}

const mockConfig: NudgeConfig = {
  firstNudgeThresholdMs: 300000, // 5 minutes
  nudgeCooldownMs: 600000, // 10 minutes
  showSystemNotifications: true,
  aiNudgesEnabled: true,
}

const mockDriftStatus: DriftStatus = {
  isInDriftState: true,
  currentDriftMinutes: 15,
  totalDriftMinutesToday: 45,
  nudgeCount: 3,
  currentApp: 'Twitter',
}

describe('nudgeStore', () => {
  beforeEach(() => {
    // Reset store state
    useNudgeStore.setState({
      activeNudges: [],
      driftStatus: null,
      config: null,
      isLoadingConfig: false,
      snoozedApps: new Map(),
    })

    // Reset mocks
    vi.clearAllMocks()

    // Set up mock window.milo API
    window.milo = {
      ...window.milo,
      nudge: {
        getConfig: vi.fn().mockResolvedValue(mockConfig),
        setConfig: vi.fn().mockResolvedValue(undefined),
        getDriftStatus: vi.fn().mockResolvedValue(mockDriftStatus),
      },
      events: {
        ...window.milo?.events,
        onNudgeTriggered: vi.fn().mockReturnValue(() => {}),
      },
    } as any
  })

  describe('initial state', () => {
    it('starts with empty activeNudges', () => {
      const state = useNudgeStore.getState()
      expect(state.activeNudges).toEqual([])
    })

    it('starts with null driftStatus', () => {
      const state = useNudgeStore.getState()
      expect(state.driftStatus).toBeNull()
    })

    it('starts with null config', () => {
      const state = useNudgeStore.getState()
      expect(state.config).toBeNull()
    })

    it('starts with empty snoozedApps', () => {
      const state = useNudgeStore.getState()
      expect(state.snoozedApps.size).toBe(0)
    })

    it('starts not loading config', () => {
      const state = useNudgeStore.getState()
      expect(state.isLoadingConfig).toBe(false)
    })
  })

  describe('addNudge', () => {
    it('adds nudge to activeNudges', () => {
      const store = useNudgeStore.getState()
      store.addNudge(mockNudge)

      expect(useNudgeStore.getState().activeNudges).toHaveLength(1)
      expect(useNudgeStore.getState().activeNudges[0]).toEqual(mockNudge)
    })

    it('adds multiple nudges', () => {
      const store = useNudgeStore.getState()
      store.addNudge(mockNudge)
      store.addNudge({ ...mockNudge, currentApp: 'Instagram' })

      expect(useNudgeStore.getState().activeNudges).toHaveLength(2)
    })

    it('does not add nudge if app is snoozed', () => {
      // Snooze the app first
      useNudgeStore.getState().snoozeApp('Twitter', 30)

      const store = useNudgeStore.getState()
      store.addNudge(mockNudge)

      expect(useNudgeStore.getState().activeNudges).toHaveLength(0)
    })

    it('adds nudge for non-snoozed app', () => {
      // Snooze a different app
      useNudgeStore.getState().snoozeApp('Instagram', 30)

      const store = useNudgeStore.getState()
      store.addNudge(mockNudge) // Twitter is not snoozed

      expect(useNudgeStore.getState().activeNudges).toHaveLength(1)
    })
  })

  describe('dismissNudge', () => {
    beforeEach(() => {
      useNudgeStore.setState({
        activeNudges: [
          mockNudge,
          { ...mockNudge, currentApp: 'Instagram' },
          { ...mockNudge, currentApp: 'TikTok' },
        ],
      })
    })

    it('removes nudge at specified index', () => {
      const store = useNudgeStore.getState()
      store.dismissNudge(1) // Remove Instagram nudge

      const nudges = useNudgeStore.getState().activeNudges
      expect(nudges).toHaveLength(2)
      expect(nudges[0].currentApp).toBe('Twitter')
      expect(nudges[1].currentApp).toBe('TikTok')
    })

    it('removes first nudge when index is 0', () => {
      const store = useNudgeStore.getState()
      store.dismissNudge(0)

      const nudges = useNudgeStore.getState().activeNudges
      expect(nudges).toHaveLength(2)
      expect(nudges[0].currentApp).toBe('Instagram')
    })

    it('removes last nudge', () => {
      const store = useNudgeStore.getState()
      store.dismissNudge(2)

      const nudges = useNudgeStore.getState().activeNudges
      expect(nudges).toHaveLength(2)
      expect(nudges[1].currentApp).toBe('Instagram')
    })
  })

  describe('clearAllNudges', () => {
    it('clears all active nudges', () => {
      useNudgeStore.setState({
        activeNudges: [mockNudge, { ...mockNudge, currentApp: 'Instagram' }],
      })

      const store = useNudgeStore.getState()
      store.clearAllNudges()

      expect(useNudgeStore.getState().activeNudges).toEqual([])
    })
  })

  describe('snoozeApp', () => {
    it('adds app to snoozedApps map', () => {
      const store = useNudgeStore.getState()
      store.snoozeApp('Twitter', 30)

      expect(useNudgeStore.getState().snoozedApps.has('twitter')).toBe(true)
    })

    it('stores snooze expiry time', () => {
      vi.useFakeTimers()
      const now = new Date('2024-12-28T10:00:00Z')
      vi.setSystemTime(now)

      const store = useNudgeStore.getState()
      store.snoozeApp('Twitter', 30)

      const snoozeUntil = useNudgeStore.getState().snoozedApps.get('twitter')
      expect(snoozeUntil).toEqual(new Date('2024-12-28T10:30:00Z'))

      vi.useRealTimers()
    })

    it('stores app name in lowercase', () => {
      const store = useNudgeStore.getState()
      store.snoozeApp('TWITTER', 30)

      expect(useNudgeStore.getState().snoozedApps.has('twitter')).toBe(true)
      expect(useNudgeStore.getState().snoozedApps.has('TWITTER')).toBe(false)
    })
  })

  describe('isAppSnoozed', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns false for non-snoozed app', () => {
      const store = useNudgeStore.getState()
      expect(store.isAppSnoozed('Twitter')).toBe(false)
    })

    it('returns true for currently snoozed app', () => {
      vi.setSystemTime(new Date('2024-12-28T10:00:00Z'))

      const store = useNudgeStore.getState()
      store.snoozeApp('Twitter', 30)

      expect(store.isAppSnoozed('Twitter')).toBe(true)
    })

    it('returns false after snooze expires', () => {
      vi.setSystemTime(new Date('2024-12-28T10:00:00Z'))

      const store = useNudgeStore.getState()
      store.snoozeApp('Twitter', 30)

      // Advance time past snooze expiry
      vi.setSystemTime(new Date('2024-12-28T10:35:00Z'))

      expect(store.isAppSnoozed('Twitter')).toBe(false)
    })

    it('is case insensitive', () => {
      vi.setSystemTime(new Date('2024-12-28T10:00:00Z'))

      const store = useNudgeStore.getState()
      store.snoozeApp('twitter', 30)

      expect(store.isAppSnoozed('TWITTER')).toBe(true)
      expect(store.isAppSnoozed('Twitter')).toBe(true)
      expect(store.isAppSnoozed('twitter')).toBe(true)
    })
  })

  describe('fetchConfig', () => {
    it('sets isLoadingConfig while fetching', async () => {
      const store = useNudgeStore.getState()
      const fetchPromise = store.fetchConfig()

      expect(useNudgeStore.getState().isLoadingConfig).toBe(true)
      await fetchPromise
      expect(useNudgeStore.getState().isLoadingConfig).toBe(false)
    })

    it('fetches and stores config', async () => {
      const store = useNudgeStore.getState()
      await store.fetchConfig()

      expect(window.milo?.nudge.getConfig).toHaveBeenCalled()
      expect(useNudgeStore.getState().config).toEqual(mockConfig)
    })

    it('handles errors gracefully', async () => {
      window.milo.nudge.getConfig = vi.fn().mockRejectedValue(new Error('Config error'))

      const store = useNudgeStore.getState()
      await store.fetchConfig()

      expect(useNudgeStore.getState().isLoadingConfig).toBe(false)
      expect(useNudgeStore.getState().config).toBeNull()
    })
  })

  describe('updateConfig', () => {
    it('calls setConfig API with updates', async () => {
      const updates = { aiNudgesEnabled: false }

      const store = useNudgeStore.getState()
      await store.updateConfig(updates)

      expect(window.milo?.nudge.setConfig).toHaveBeenCalledWith(updates)
    })

    it('refreshes config after update', async () => {
      const store = useNudgeStore.getState()
      await store.updateConfig({ aiNudgesEnabled: false })

      expect(window.milo?.nudge.getConfig).toHaveBeenCalled()
    })

    it('handles errors gracefully', async () => {
      window.milo.nudge.setConfig = vi.fn().mockRejectedValue(new Error('Update error'))

      const store = useNudgeStore.getState()
      await store.updateConfig({ aiNudgesEnabled: false })

      // Should not throw
      expect(window.milo?.nudge.getConfig).not.toHaveBeenCalled()
    })
  })

  describe('fetchDriftStatus', () => {
    it('fetches and stores drift status', async () => {
      const store = useNudgeStore.getState()
      await store.fetchDriftStatus()

      expect(window.milo?.nudge.getDriftStatus).toHaveBeenCalled()
      expect(useNudgeStore.getState().driftStatus).toEqual(mockDriftStatus)
    })

    it('handles errors gracefully', async () => {
      window.milo.nudge.getDriftStatus = vi.fn().mockRejectedValue(new Error('Drift error'))

      const store = useNudgeStore.getState()
      await store.fetchDriftStatus()

      // Should not throw, status unchanged
      expect(useNudgeStore.getState().driftStatus).toBeNull()
    })

    it('handles null response', async () => {
      window.milo.nudge.getDriftStatus = vi.fn().mockResolvedValue(null)

      const store = useNudgeStore.getState()
      await store.fetchDriftStatus()

      expect(useNudgeStore.getState().driftStatus).toBeNull()
    })
  })

  describe('setupEventListener', () => {
    it('calls onNudgeTriggered to set up listener', () => {
      const store = useNudgeStore.getState()
      store.setupEventListener()

      expect(window.milo?.events.onNudgeTriggered).toHaveBeenCalled()
    })

    it('returns cleanup function', () => {
      const mockCleanup = vi.fn()
      window.milo.events.onNudgeTriggered = vi.fn().mockReturnValue(mockCleanup)

      const store = useNudgeStore.getState()
      const cleanup = store.setupEventListener()

      expect(typeof cleanup).toBe('function')
    })

    it('returns no-op when events not available', () => {
      window.milo.events.onNudgeTriggered = undefined as any

      const store = useNudgeStore.getState()
      const cleanup = store.setupEventListener()

      expect(typeof cleanup).toBe('function')
      // Should not throw when called
      cleanup()
    })

    it('adds nudge when event is triggered', () => {
      let eventCallback: ((nudge: NudgeEvent) => void) | null = null
      window.milo.events.onNudgeTriggered = vi.fn().mockImplementation((cb) => {
        eventCallback = cb
        return () => {}
      })

      const store = useNudgeStore.getState()
      store.setupEventListener()

      // Simulate event trigger
      if (eventCallback) {
        eventCallback(mockNudge)
      }

      expect(useNudgeStore.getState().activeNudges).toHaveLength(1)
    })
  })
})
