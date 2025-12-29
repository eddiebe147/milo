import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useActivityStore } from './activityStore'
import type { ActivityLog, CurrentActivityState } from '../types'

// Mock activity data
const mockActivityLog: ActivityLog = {
  id: 'log-1',
  appName: 'VS Code',
  windowTitle: 'milo - Visual Studio Code',
  state: 'green',
  startTime: '2024-12-28T10:00:00Z',
  endTime: '2024-12-28T10:30:00Z',
  durationMinutes: 30,
}

const mockSummary = {
  green: 120,
  amber: 30,
  red: 15,
  total: 165,
}

const mockBreakdown = [
  { appName: 'VS Code', minutes: 120, state: 'green' as const },
  { appName: 'Slack', minutes: 30, state: 'amber' as const },
  { appName: 'Twitter', minutes: 15, state: 'red' as const },
]

const mockStatus: CurrentActivityState = {
  isRunning: true,
  isPaused: false,
  currentState: 'green',
  currentAppName: 'VS Code',
  currentWindowTitle: 'test.ts',
}

describe('activityStore', () => {
  beforeEach(() => {
    // Reset store state
    useActivityStore.setState({
      currentState: 'amber',
      currentAppName: '',
      currentWindowTitle: '',
      isPaused: false,
      isMonitoring: false,
      todayLogs: [],
      todaySummary: { green: 0, amber: 0, red: 0, total: 0 },
      appBreakdown: [],
      isLoading: false,
      error: null,
    })

    // Reset mocks
    vi.clearAllMocks()

    // Set up mock window.milo API
    window.milo = {
      ...window.milo,
      activity: {
        getToday: vi.fn().mockResolvedValue([mockActivityLog]),
        getSummary: vi.fn().mockResolvedValue(mockSummary),
        getAppBreakdown: vi.fn().mockResolvedValue(mockBreakdown),
      },
      monitoring: {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn().mockResolvedValue(undefined),
        resume: vi.fn().mockResolvedValue(undefined),
        toggle: vi.fn().mockResolvedValue(true),
        status: vi.fn().mockResolvedValue(mockStatus),
      },
    } as any
  })

  describe('initial state', () => {
    it('starts with amber currentState', () => {
      const state = useActivityStore.getState()
      expect(state.currentState).toBe('amber')
    })

    it('starts with empty app name', () => {
      const state = useActivityStore.getState()
      expect(state.currentAppName).toBe('')
    })

    it('starts not monitoring', () => {
      const state = useActivityStore.getState()
      expect(state.isMonitoring).toBe(false)
    })

    it('starts not paused', () => {
      const state = useActivityStore.getState()
      expect(state.isPaused).toBe(false)
    })

    it('starts with empty today logs', () => {
      const state = useActivityStore.getState()
      expect(state.todayLogs).toEqual([])
    })

    it('starts with zero summary', () => {
      const state = useActivityStore.getState()
      expect(state.todaySummary).toEqual({ green: 0, amber: 0, red: 0, total: 0 })
    })
  })

  describe('fetchTodayData', () => {
    it('sets loading state while fetching', async () => {
      const store = useActivityStore.getState()
      const fetchPromise = store.fetchTodayData()

      expect(useActivityStore.getState().isLoading).toBe(true)
      await fetchPromise
      expect(useActivityStore.getState().isLoading).toBe(false)
    })

    it('fetches and stores today logs', async () => {
      const store = useActivityStore.getState()
      await store.fetchTodayData()

      expect(window.milo.activity.getToday).toHaveBeenCalled()
      expect(useActivityStore.getState().todayLogs).toEqual([mockActivityLog])
    })

    it('fetches and stores today summary', async () => {
      const store = useActivityStore.getState()
      await store.fetchTodayData()

      expect(window.milo.activity.getSummary).toHaveBeenCalled()
      expect(useActivityStore.getState().todaySummary).toEqual(mockSummary)
    })

    it('fetches and stores app breakdown', async () => {
      const store = useActivityStore.getState()
      await store.fetchTodayData()

      expect(window.milo.activity.getAppBreakdown).toHaveBeenCalled()
      expect(useActivityStore.getState().appBreakdown).toEqual(mockBreakdown)
    })

    it('calls all APIs in parallel', async () => {
      const store = useActivityStore.getState()
      await store.fetchTodayData()

      expect(window.milo.activity.getToday).toHaveBeenCalledTimes(1)
      expect(window.milo.activity.getSummary).toHaveBeenCalledTimes(1)
      expect(window.milo.activity.getAppBreakdown).toHaveBeenCalledTimes(1)
    })

    it('handles errors', async () => {
      window.milo.activity.getToday = vi.fn().mockRejectedValue(new Error('API Error'))

      const store = useActivityStore.getState()
      await store.fetchTodayData()

      expect(useActivityStore.getState().error).toBe('API Error')
      expect(useActivityStore.getState().isLoading).toBe(false)
    })
  })

  describe('handleStateChange', () => {
    it('updates current state', () => {
      const store = useActivityStore.getState()
      store.handleStateChange({
        appName: 'Chrome',
        windowTitle: 'Google',
        state: 'red',
        stateChanged: true,
      })

      const state = useActivityStore.getState()
      expect(state.currentState).toBe('red')
      expect(state.currentAppName).toBe('Chrome')
      expect(state.currentWindowTitle).toBe('Google')
    })

    it('updates all fields from payload', () => {
      const store = useActivityStore.getState()
      store.handleStateChange({
        appName: 'VS Code',
        windowTitle: 'project.ts',
        state: 'green',
        stateChanged: false,
      })

      const state = useActivityStore.getState()
      expect(state.currentState).toBe('green')
      expect(state.currentAppName).toBe('VS Code')
      expect(state.currentWindowTitle).toBe('project.ts')
    })
  })

  describe('startMonitoring', () => {
    it('calls monitoring start API', async () => {
      const store = useActivityStore.getState()
      await store.startMonitoring()

      expect(window.milo.monitoring.start).toHaveBeenCalled()
    })

    it('sets isMonitoring to true', async () => {
      const store = useActivityStore.getState()
      await store.startMonitoring()

      expect(useActivityStore.getState().isMonitoring).toBe(true)
    })

    it('sets isPaused to false', async () => {
      useActivityStore.setState({ isPaused: true })

      const store = useActivityStore.getState()
      await store.startMonitoring()

      expect(useActivityStore.getState().isPaused).toBe(false)
    })

    it('handles errors', async () => {
      window.milo.monitoring.start = vi.fn().mockRejectedValue(new Error('Start failed'))

      const store = useActivityStore.getState()
      await store.startMonitoring()

      expect(useActivityStore.getState().error).toBe('Start failed')
    })
  })

  describe('stopMonitoring', () => {
    it('calls monitoring stop API', async () => {
      const store = useActivityStore.getState()
      await store.stopMonitoring()

      expect(window.milo.monitoring.stop).toHaveBeenCalled()
    })

    it('sets isMonitoring to false', async () => {
      useActivityStore.setState({ isMonitoring: true })

      const store = useActivityStore.getState()
      await store.stopMonitoring()

      expect(useActivityStore.getState().isMonitoring).toBe(false)
    })

    it('handles errors', async () => {
      window.milo.monitoring.stop = vi.fn().mockRejectedValue(new Error('Stop failed'))

      const store = useActivityStore.getState()
      await store.stopMonitoring()

      expect(useActivityStore.getState().error).toBe('Stop failed')
    })
  })

  describe('toggleMonitoring', () => {
    it('calls monitoring toggle API', async () => {
      const store = useActivityStore.getState()
      await store.toggleMonitoring()

      expect(window.milo.monitoring.toggle).toHaveBeenCalled()
    })

    it('returns the new pause state', async () => {
      window.milo.monitoring.toggle = vi.fn().mockResolvedValue(true)

      const store = useActivityStore.getState()
      const result = await store.toggleMonitoring()

      expect(result).toBe(true)
    })

    it('updates isPaused state', async () => {
      window.milo.monitoring.toggle = vi.fn().mockResolvedValue(true)

      const store = useActivityStore.getState()
      await store.toggleMonitoring()

      expect(useActivityStore.getState().isPaused).toBe(true)
    })

    it('handles errors and returns false', async () => {
      window.milo.monitoring.toggle = vi.fn().mockRejectedValue(new Error('Toggle failed'))

      const store = useActivityStore.getState()
      const result = await store.toggleMonitoring()

      expect(result).toBe(false)
      expect(useActivityStore.getState().error).toBe('Toggle failed')
    })
  })

  describe('getMonitoringStatus', () => {
    it('calls monitoring status API', async () => {
      const store = useActivityStore.getState()
      await store.getMonitoringStatus()

      expect(window.milo.monitoring.status).toHaveBeenCalled()
    })

    it('updates all monitoring state from status', async () => {
      const store = useActivityStore.getState()
      await store.getMonitoringStatus()

      const state = useActivityStore.getState()
      expect(state.isMonitoring).toBe(true)
      expect(state.isPaused).toBe(false)
      expect(state.currentState).toBe('green')
      expect(state.currentAppName).toBe('VS Code')
      expect(state.currentWindowTitle).toBe('test.ts')
    })

    it('returns the status', async () => {
      const store = useActivityStore.getState()
      const result = await store.getMonitoringStatus()

      expect(result).toEqual(mockStatus)
    })

    it('handles errors and throws', async () => {
      window.milo.monitoring.status = vi.fn().mockRejectedValue(new Error('Status failed'))

      const store = useActivityStore.getState()
      await expect(store.getMonitoringStatus()).rejects.toThrow('Status failed')
      expect(useActivityStore.getState().error).toBe('Status failed')
    })
  })
})
