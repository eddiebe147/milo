import { create } from 'zustand'
import type { ActivityState, ActivityLog, CurrentActivityState, StateChangedPayload } from '../types'

interface ActivitySummary {
  green: number
  amber: number
  red: number
  total: number
}

interface AppBreakdown {
  appName: string
  minutes: number
  state: ActivityState
}

interface ActivityStoreState {
  // Real-time state
  currentState: ActivityState
  currentAppName: string
  currentWindowTitle: string
  isPaused: boolean
  isMonitoring: boolean

  // Today's data
  todayLogs: ActivityLog[]
  todaySummary: ActivitySummary
  appBreakdown: AppBreakdown[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchTodayData: () => Promise<void>
  handleStateChange: (payload: StateChangedPayload) => void
  startMonitoring: () => Promise<void>
  stopMonitoring: () => Promise<void>
  toggleMonitoring: () => Promise<boolean>
  getMonitoringStatus: () => Promise<CurrentActivityState>
}

export const useActivityStore = create<ActivityStoreState>((set) => ({
  // Initial state
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

  fetchTodayData: async () => {
    set({ isLoading: true, error: null })
    try {
      const today = new Date().toISOString().split('T')[0]
      const [logs, summary, breakdown] = await Promise.all([
        window.milo.activity.getToday(),
        window.milo.activity.getSummary(today),
        window.milo.activity.getAppBreakdown(today),
      ])
      set({
        todayLogs: logs,
        todaySummary: summary,
        appBreakdown: breakdown,
        isLoading: false,
      })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  handleStateChange: (payload: StateChangedPayload) => {
    set({
      currentState: payload.state,
      currentAppName: payload.appName,
      currentWindowTitle: payload.windowTitle,
    })
  },

  startMonitoring: async () => {
    try {
      await window.milo.monitoring.start()
      set({ isMonitoring: true, isPaused: false })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  stopMonitoring: async () => {
    try {
      await window.milo.monitoring.stop()
      set({ isMonitoring: false })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  toggleMonitoring: async () => {
    try {
      const isPaused = await window.milo.monitoring.toggle()
      set({ isPaused })
      return isPaused
    } catch (error) {
      set({ error: (error as Error).message })
      return false
    }
  },

  getMonitoringStatus: async () => {
    try {
      const status = await window.milo.monitoring.status()
      set({
        isMonitoring: status.isRunning,
        isPaused: status.isPaused,
        currentState: status.currentState,
        currentAppName: status.currentAppName,
        currentWindowTitle: status.currentWindowTitle,
      })
      return status
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },
}))
