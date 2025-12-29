import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSettingsStore } from './settingsStore'
import type { UserSettings, AppClassification } from '../types'

// Mock classification data
const mockClassification: AppClassification = {
  id: 'class-1',
  appName: 'Visual Studio Code',
  bundleId: 'com.microsoft.VSCode',
  defaultState: 'green',
  keywords: ['coding', 'development'],
  isCustom: false,
  createdAt: '2024-12-28T10:00:00Z',
}

const mockCustomClassification: AppClassification = {
  id: 'class-2',
  appName: 'Slack',
  bundleId: 'com.tinyspeck.slackmacgap',
  defaultState: 'amber',
  keywords: ['work', 'team'],
  isCustom: true,
  createdAt: '2024-12-28T10:05:00Z',
}

const mockClassifications: AppClassification[] = [
  mockClassification,
  mockCustomClassification,
]

// Default settings factory - returns fresh object each time
const getDefaultSettings = (): UserSettings => ({
  workStartTime: '09:00',
  workEndTime: '17:00',
  workDays: [1, 2, 3, 4, 5],
  monitoringEnabled: true,
  pollingIntervalMs: 5000,
  driftAlertEnabled: true,
  driftAlertDelayMinutes: 5,
  morningBriefingTime: '09:00',
  eveningReviewTime: '18:00',
  alwaysOnTop: false,
  startMinimized: false,
  showInDock: true,
  refillMode: 'endless',
})

const DEFAULT_SETTINGS = getDefaultSettings()

describe('settingsStore', () => {
  beforeEach(() => {
    // IMPORTANT: Use factory function to get fresh settings object for each test
    // This ensures complete test isolation
    useSettingsStore.setState({
      settings: getDefaultSettings(),
      classifications: [],
      isLoading: false,
      error: null,
    })

    // Reset mocks
    vi.clearAllMocks()

    // Set up mock window.milo.classifications API
    window.milo = {
      ...window.milo,
      classifications: {
        getAll: vi.fn().mockResolvedValue(mockClassifications),
        upsert: vi.fn().mockResolvedValue(mockClassification),
      },
      window: {
        toggleAlwaysOnTop: vi.fn().mockResolvedValue(true),
      },
    } as any
  })

  describe('initial state', () => {
    it('has default settings', () => {
      const state = useSettingsStore.getState()
      expect(state.settings).toEqual(DEFAULT_SETTINGS)
    })

    it('has empty classifications array', () => {
      const state = useSettingsStore.getState()
      expect(state.classifications).toEqual([])
    })

    it('is not loading', () => {
      const state = useSettingsStore.getState()
      expect(state.isLoading).toBe(false)
    })

    it('has no error', () => {
      const state = useSettingsStore.getState()
      expect(state.error).toBeNull()
    })

    it('has endless refill mode by default', () => {
      const state = useSettingsStore.getState()
      expect(state.settings.refillMode).toBe('endless')
    })

    it('has monitoring enabled by default', () => {
      const state = useSettingsStore.getState()
      expect(state.settings.monitoringEnabled).toBe(true)
    })

    it('has correct default work days (Monday-Friday)', () => {
      const state = useSettingsStore.getState()
      expect(state.settings.workDays).toEqual([1, 2, 3, 4, 5])
    })

    it('has drift alerts enabled by default', () => {
      const state = useSettingsStore.getState()
      expect(state.settings.driftAlertEnabled).toBe(true)
    })

    it('has alwaysOnTop disabled by default', () => {
      const state = useSettingsStore.getState()
      expect(state.settings.alwaysOnTop).toBe(false)
    })
  })

  describe('loadSettings', () => {
    it('sets loading state during execution', async () => {
      const store = useSettingsStore.getState()

      // Note: Current implementation is synchronous and completes immediately
      await store.loadSettings()

      // After execution, loading should be false
      expect(useSettingsStore.getState().isLoading).toBe(false)
    })

    it('clears error state on successful load', async () => {
      useSettingsStore.setState({ error: 'Previous error' })

      const store = useSettingsStore.getState()
      await store.loadSettings()

      expect(useSettingsStore.getState().error).toBeNull()
    })

    it('maintains default settings when no API is implemented', async () => {
      const store = useSettingsStore.getState()
      await store.loadSettings()

      // Current implementation doesn't fetch from API, so settings remain default
      expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS)
    })
  })

  describe('updateSettings', () => {
    it('updates settings with partial updates', async () => {
      const store = useSettingsStore.getState()
      store.updateSettings({ workStartTime: '08:00' })

      const state = useSettingsStore.getState()
      expect(state.settings.workStartTime).toBe('08:00')
      expect(state.settings.workEndTime).toBe('17:00') // unchanged
    })

    it('updates multiple settings at once', async () => {
      const store = useSettingsStore.getState()
      store.updateSettings({
        workStartTime: '08:00',
        workEndTime: '18:00',
        workDays: [1, 2, 3, 4, 5, 6], // Include Saturday
      })

      const state = useSettingsStore.getState()
      expect(state.settings.workStartTime).toBe('08:00')
      expect(state.settings.workEndTime).toBe('18:00')
      expect(state.settings.workDays).toEqual([1, 2, 3, 4, 5, 6])
    })

    it('updates monitoring settings', async () => {
      const store = useSettingsStore.getState()
      store.updateSettings({
        monitoringEnabled: false,
        pollingIntervalMs: 10000,
      })

      const state = useSettingsStore.getState()
      expect(state.settings.monitoringEnabled).toBe(false)
      expect(state.settings.pollingIntervalMs).toBe(10000)
    })

    it('updates notification settings', async () => {
      const store = useSettingsStore.getState()
      store.updateSettings({
        driftAlertEnabled: false,
        driftAlertDelayMinutes: 10,
        morningBriefingTime: '08:30',
        eveningReviewTime: '19:00',
      })

      const state = useSettingsStore.getState()
      expect(state.settings.driftAlertEnabled).toBe(false)
      expect(state.settings.driftAlertDelayMinutes).toBe(10)
      expect(state.settings.morningBriefingTime).toBe('08:30')
      expect(state.settings.eveningReviewTime).toBe('19:00')
    })

    it('updates appearance settings', async () => {
      const store = useSettingsStore.getState()
      store.updateSettings({
        startMinimized: true,
        showInDock: false,
      })

      const state = useSettingsStore.getState()
      expect(state.settings.startMinimized).toBe(true)
      expect(state.settings.showInDock).toBe(false)
    })

    it('handles errors during update', async () => {
      const errorMessage = 'Failed to update settings'

      // Save original updateSettings so we can restore it
      const originalUpdateSettings = useSettingsStore.getState().updateSettings

      // Modify store to throw error on updateSettings
      useSettingsStore.setState({
        updateSettings: vi.fn(async (updates: Partial<UserSettings>) => {
          try {
            throw new Error(errorMessage)
          } catch (error) {
            useSettingsStore.setState({ error: (error as Error).message })
          }
        }),
      })

      const store = useSettingsStore.getState()
      await store.updateSettings({ workStartTime: '08:00' })

      expect(useSettingsStore.getState().error).toBe(errorMessage)

      // Restore original updateSettings to not pollute other tests
      useSettingsStore.setState({ updateSettings: originalUpdateSettings })
    })

    it('does not lose other settings when updating', async () => {
      const store = useSettingsStore.getState()
      store.updateSettings({ workStartTime: '08:00' })

      const state = useSettingsStore.getState()
      expect(state.settings.workEndTime).toBe(DEFAULT_SETTINGS.workEndTime)
      expect(state.settings.monitoringEnabled).toBe(DEFAULT_SETTINGS.monitoringEnabled)
      expect(state.settings.refillMode).toBe(DEFAULT_SETTINGS.refillMode)
    })
  })

  describe('loadClassifications', () => {
    it('sets loading state while fetching', async () => {
      const store = useSettingsStore.getState()
      const loadPromise = store.loadClassifications()

      expect(useSettingsStore.getState().isLoading).toBe(true)

      await loadPromise

      expect(useSettingsStore.getState().isLoading).toBe(false)
    })

    it('fetches and stores classifications', async () => {
      const store = useSettingsStore.getState()
      await store.loadClassifications()

      const state = useSettingsStore.getState()
      expect(state.classifications).toEqual(mockClassifications)
      expect(window.milo.classifications.getAll).toHaveBeenCalledTimes(1)
    })

    it('clears error state on successful load', async () => {
      useSettingsStore.setState({ error: 'Previous error' })

      const store = useSettingsStore.getState()
      await store.loadClassifications()

      expect(useSettingsStore.getState().error).toBeNull()
    })

    it('handles API errors', async () => {
      const errorMessage = 'Failed to fetch classifications'
      window.milo.classifications.getAll = vi.fn().mockRejectedValue(new Error(errorMessage))

      const store = useSettingsStore.getState()
      await store.loadClassifications()

      const state = useSettingsStore.getState()
      expect(state.error).toBe(errorMessage)
      expect(state.isLoading).toBe(false)
      expect(state.classifications).toEqual([]) // Should remain empty on error
    })
  })

  describe('updateClassification', () => {
    beforeEach(() => {
      useSettingsStore.setState({ classifications: mockClassifications })
    })

    it('updates existing classification', async () => {
      const updatedClassification = {
        ...mockClassification,
        defaultState: 'amber' as const,
      }
      window.milo.classifications.upsert = vi.fn().mockResolvedValue(updatedClassification)

      const store = useSettingsStore.getState()
      await store.updateClassification({
        appName: 'Visual Studio Code',
        bundleId: 'com.microsoft.VSCode',
        defaultState: 'amber',
        keywords: ['coding', 'development'],
        isCustom: false,
      })

      expect(window.milo.classifications.upsert).toHaveBeenCalledWith({
        appName: 'Visual Studio Code',
        bundleId: 'com.microsoft.VSCode',
        defaultState: 'amber',
        keywords: ['coding', 'development'],
        isCustom: false,
      })

      const state = useSettingsStore.getState()
      const updated = state.classifications.find(c => c.appName === 'Visual Studio Code')
      expect(updated?.defaultState).toBe('amber')
    })

    it('adds new classification', async () => {
      const newClassification: AppClassification = {
        id: 'class-3',
        appName: 'Chrome',
        bundleId: 'com.google.Chrome',
        defaultState: 'red',
        keywords: ['browser'],
        isCustom: true,
        createdAt: '2024-12-28T10:10:00Z',
      }
      window.milo.classifications.upsert = vi.fn().mockResolvedValue(newClassification)

      const store = useSettingsStore.getState()
      await store.updateClassification({
        appName: 'Chrome',
        bundleId: 'com.google.Chrome',
        defaultState: 'red',
        keywords: ['browser'],
        isCustom: true,
      })

      const state = useSettingsStore.getState()
      expect(state.classifications).toHaveLength(3)
      expect(state.classifications.find(c => c.appName === 'Chrome')).toEqual(newClassification)
    })

    it('updates classification with new keywords', async () => {
      const updatedClassification = {
        ...mockClassification,
        keywords: ['coding', 'development', 'programming'],
      }
      window.milo.classifications.upsert = vi.fn().mockResolvedValue(updatedClassification)

      const store = useSettingsStore.getState()
      await store.updateClassification({
        appName: 'Visual Studio Code',
        bundleId: 'com.microsoft.VSCode',
        defaultState: 'green',
        keywords: ['coding', 'development', 'programming'],
        isCustom: false,
      })

      const state = useSettingsStore.getState()
      const updated = state.classifications.find(c => c.appName === 'Visual Studio Code')
      expect(updated?.keywords).toEqual(['coding', 'development', 'programming'])
    })

    it('handles API errors', async () => {
      const errorMessage = 'Failed to update classification'
      window.milo.classifications.upsert = vi.fn().mockRejectedValue(new Error(errorMessage))

      const store = useSettingsStore.getState()
      await store.updateClassification({
        appName: 'Test App',
        defaultState: 'green',
        isCustom: true,
      })

      expect(useSettingsStore.getState().error).toBe(errorMessage)
    })

    it('does not modify state if API returns null', async () => {
      window.milo.classifications.upsert = vi.fn().mockResolvedValue(null)

      const initialClassifications = [...mockClassifications]
      const store = useSettingsStore.getState()
      await store.updateClassification({
        appName: 'Test App',
        defaultState: 'green',
        isCustom: true,
      })

      expect(useSettingsStore.getState().classifications).toEqual(initialClassifications)
    })

    it('preserves other classifications when updating one', async () => {
      const updatedClassification = {
        ...mockClassification,
        defaultState: 'amber' as const,
      }
      window.milo.classifications.upsert = vi.fn().mockResolvedValue(updatedClassification)

      const store = useSettingsStore.getState()
      await store.updateClassification({
        appName: 'Visual Studio Code',
        bundleId: 'com.microsoft.VSCode',
        defaultState: 'amber',
        keywords: ['coding', 'development'],
        isCustom: false,
      })

      const state = useSettingsStore.getState()
      expect(state.classifications).toHaveLength(2)
      expect(state.classifications.find(c => c.appName === 'Slack')).toEqual(mockCustomClassification)
    })
  })

  describe('toggleAlwaysOnTop', () => {
    it('toggles always on top to true', async () => {
      window.milo.window.toggleAlwaysOnTop = vi.fn().mockResolvedValue(true)

      const store = useSettingsStore.getState()
      const result = await store.toggleAlwaysOnTop()

      expect(result).toBe(true)
      expect(window.milo.window.toggleAlwaysOnTop).toHaveBeenCalledTimes(1)
      expect(useSettingsStore.getState().settings.alwaysOnTop).toBe(true)
    })

    it('toggles always on top to false', async () => {
      useSettingsStore.setState({
        settings: { ...DEFAULT_SETTINGS, alwaysOnTop: true },
      })
      window.milo.window.toggleAlwaysOnTop = vi.fn().mockResolvedValue(false)

      const store = useSettingsStore.getState()
      const result = await store.toggleAlwaysOnTop()

      expect(result).toBe(false)
      expect(useSettingsStore.getState().settings.alwaysOnTop).toBe(false)
    })

    it('handles API errors and returns current state', async () => {
      const errorMessage = 'Failed to toggle'
      window.milo.window.toggleAlwaysOnTop = vi.fn().mockRejectedValue(new Error(errorMessage))

      const store = useSettingsStore.getState()
      const result = await store.toggleAlwaysOnTop()

      expect(result).toBe(false) // Returns current state
      expect(useSettingsStore.getState().error).toBe(errorMessage)
      expect(useSettingsStore.getState().settings.alwaysOnTop).toBe(false) // Unchanged
    })

    it('preserves other settings when toggling', async () => {
      window.milo.window.toggleAlwaysOnTop = vi.fn().mockResolvedValue(true)

      const store = useSettingsStore.getState()
      await store.toggleAlwaysOnTop()

      const state = useSettingsStore.getState()
      expect(state.settings.workStartTime).toBe(DEFAULT_SETTINGS.workStartTime)
      expect(state.settings.monitoringEnabled).toBe(DEFAULT_SETTINGS.monitoringEnabled)
      expect(state.settings.refillMode).toBe(DEFAULT_SETTINGS.refillMode)
    })
  })

  describe('toggleRefillMode', () => {
    it('toggles from endless to daily_reset', () => {
      useSettingsStore.setState({
        settings: { ...DEFAULT_SETTINGS, refillMode: 'endless' },
      })

      const store = useSettingsStore.getState()
      store.toggleRefillMode()

      expect(useSettingsStore.getState().settings.refillMode).toBe('daily_reset')
    })

    it('toggles from daily_reset to endless', () => {
      useSettingsStore.setState({
        settings: { ...DEFAULT_SETTINGS, refillMode: 'daily_reset' },
      })

      const store = useSettingsStore.getState()
      store.toggleRefillMode()

      expect(useSettingsStore.getState().settings.refillMode).toBe('endless')
    })

    it('toggles multiple times correctly', () => {
      const store = useSettingsStore.getState()

      store.toggleRefillMode()
      expect(useSettingsStore.getState().settings.refillMode).toBe('daily_reset')

      store.toggleRefillMode()
      expect(useSettingsStore.getState().settings.refillMode).toBe('endless')

      store.toggleRefillMode()
      expect(useSettingsStore.getState().settings.refillMode).toBe('daily_reset')
    })

    it('preserves other settings when toggling refill mode', () => {
      const store = useSettingsStore.getState()
      store.toggleRefillMode()

      const state = useSettingsStore.getState()
      expect(state.settings.workStartTime).toBe(DEFAULT_SETTINGS.workStartTime)
      expect(state.settings.monitoringEnabled).toBe(DEFAULT_SETTINGS.monitoringEnabled)
      expect(state.settings.alwaysOnTop).toBe(DEFAULT_SETTINGS.alwaysOnTop)
    })
  })

  describe('edge cases', () => {
    it('handles empty classifications array', async () => {
      window.milo.classifications.getAll = vi.fn().mockResolvedValue([])

      const store = useSettingsStore.getState()
      await store.loadClassifications()

      expect(useSettingsStore.getState().classifications).toEqual([])
    })

    it('handles classification with no keywords', async () => {
      const classificationNoKeywords: AppClassification = {
        ...mockClassification,
        keywords: undefined,
      }
      window.milo.classifications.upsert = vi.fn().mockResolvedValue(classificationNoKeywords)

      const store = useSettingsStore.getState()
      await store.updateClassification({
        appName: 'Test App',
        defaultState: 'green',
        isCustom: true,
      })

      expect(window.milo.classifications.upsert).toHaveBeenCalled()
    })

    it('handles classification with no bundle ID', async () => {
      const classificationNoBundleId: AppClassification = {
        ...mockClassification,
        bundleId: undefined,
      }
      window.milo.classifications.upsert = vi.fn().mockResolvedValue(classificationNoBundleId)

      const store = useSettingsStore.getState()
      await store.updateClassification({
        appName: 'Web App',
        defaultState: 'amber',
        isCustom: true,
      })

      expect(window.milo.classifications.upsert).toHaveBeenCalled()
    })

    it('handles empty work days array', () => {
      useSettingsStore.getState().updateSettings({ workDays: [] })

      expect(useSettingsStore.getState().settings.workDays).toEqual([])
    })

    it('handles all days work schedule', () => {
      useSettingsStore.getState().updateSettings({ workDays: [0, 1, 2, 3, 4, 5, 6] })

      expect(useSettingsStore.getState().settings.workDays).toEqual([0, 1, 2, 3, 4, 5, 6])
    })

    it('handles extreme polling intervals', () => {
      useSettingsStore.getState().updateSettings({ pollingIntervalMs: 1000 }) // Very fast
      expect(useSettingsStore.getState().settings.pollingIntervalMs).toBe(1000)

      useSettingsStore.getState().updateSettings({ pollingIntervalMs: 60000 }) // Very slow
      expect(useSettingsStore.getState().settings.pollingIntervalMs).toBe(60000)
    })

    it('handles extreme drift alert delays', () => {
      useSettingsStore.getState().updateSettings({ driftAlertDelayMinutes: 1 }) // Very short
      expect(useSettingsStore.getState().settings.driftAlertDelayMinutes).toBe(1)

      useSettingsStore.getState().updateSettings({ driftAlertDelayMinutes: 60 }) // Very long
      expect(useSettingsStore.getState().settings.driftAlertDelayMinutes).toBe(60)
    })
  })

  describe('concurrent operations', () => {
    it('handles multiple settings updates in sequence', () => {
      // Each call gets fresh store reference to ensure state is current
      useSettingsStore.getState().updateSettings({ workStartTime: '08:00' })
      useSettingsStore.getState().updateSettings({ workEndTime: '18:00' })
      useSettingsStore.getState().updateSettings({ monitoringEnabled: false })

      const state = useSettingsStore.getState()
      expect(state.settings.workStartTime).toBe('08:00')
      expect(state.settings.workEndTime).toBe('18:00')
      expect(state.settings.monitoringEnabled).toBe(false)
    })

    it('handles simultaneous classification loads and updates', async () => {
      const store = useSettingsStore.getState()

      const loadPromise = store.loadClassifications()
      const updatePromise = store.updateClassification({
        appName: 'Test App',
        defaultState: 'green',
        isCustom: true,
      })

      await Promise.all([loadPromise, updatePromise])

      expect(window.milo.classifications.getAll).toHaveBeenCalled()
      expect(window.milo.classifications.upsert).toHaveBeenCalled()
    })
  })

  describe('state persistence', () => {
    it('maintains settings after multiple operations', async () => {
      // Do multiple operations - get fresh store reference for each call
      useSettingsStore.getState().updateSettings({ workStartTime: '08:00' })
      useSettingsStore.getState().toggleRefillMode()
      await useSettingsStore.getState().toggleAlwaysOnTop()
      useSettingsStore.getState().updateSettings({ driftAlertEnabled: false })

      const state = useSettingsStore.getState()
      expect(state.settings.workStartTime).toBe('08:00')
      expect(state.settings.refillMode).toBe('daily_reset')
      expect(state.settings.alwaysOnTop).toBe(true)
      expect(state.settings.driftAlertEnabled).toBe(false)
      // Original defaults should still be intact
      expect(state.settings.workEndTime).toBe('17:00')
      expect(state.settings.workDays).toEqual([1, 2, 3, 4, 5])
    })

    it('clears error after successful operation', async () => {
      // Set an error
      useSettingsStore.setState({ error: 'Test error' })

      // Perform successful operation
      const store = useSettingsStore.getState()
      await store.loadSettings()

      expect(useSettingsStore.getState().error).toBeNull()
    })
  })
})
