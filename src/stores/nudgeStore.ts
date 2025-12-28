import { create } from 'zustand'
import type { NudgeEvent, NudgeConfig, DriftStatus } from '@/types/milo-api'

interface NudgeState {
  // Active nudges to display
  activeNudges: NudgeEvent[]

  // Drift status
  driftStatus: DriftStatus | null

  // Configuration
  config: NudgeConfig | null

  // Loading states
  isLoadingConfig: boolean

  // Actions
  addNudge: (nudge: NudgeEvent) => void
  dismissNudge: (index: number) => void
  clearAllNudges: () => void

  // Snooze tracking (by app name)
  snoozedApps: Map<string, Date>
  snoozeApp: (appName: string, minutes: number) => void
  isAppSnoozed: (appName: string) => boolean

  // Config management
  fetchConfig: () => Promise<void>
  updateConfig: (config: Partial<NudgeConfig>) => Promise<void>

  // Status management
  fetchDriftStatus: () => Promise<void>

  // Initialize event listener
  setupEventListener: () => () => void
}

export const useNudgeStore = create<NudgeState>((set, get) => ({
  activeNudges: [],
  driftStatus: null,
  config: null,
  isLoadingConfig: false,
  snoozedApps: new Map(),

  // Add a new nudge
  addNudge: (nudge: NudgeEvent) => {
    const { isAppSnoozed } = get()

    // Don't show nudge if app is snoozed
    if (isAppSnoozed(nudge.currentApp)) {
      console.log('[NudgeStore] Nudge ignored - app is snoozed:', nudge.currentApp)
      return
    }

    set((state) => ({
      activeNudges: [...state.activeNudges, nudge],
    }))
  },

  // Dismiss a specific nudge
  dismissNudge: (index: number) => {
    set((state) => ({
      activeNudges: state.activeNudges.filter((_, i) => i !== index),
    }))
  },

  // Clear all nudges
  clearAllNudges: () => {
    set({ activeNudges: [] })
  },

  // Snooze nudges for a specific app
  snoozeApp: (appName: string, minutes: number) => {
    const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000)
    set((state) => {
      const newSnoozedApps = new Map(state.snoozedApps)
      newSnoozedApps.set(appName.toLowerCase(), snoozeUntil)
      return { snoozedApps: newSnoozedApps }
    })
  },

  // Check if an app is currently snoozed
  isAppSnoozed: (appName: string) => {
    const { snoozedApps } = get()
    const snoozeUntil = snoozedApps.get(appName.toLowerCase())
    if (!snoozeUntil) return false
    return new Date() < snoozeUntil
  },

  // Fetch configuration from main process
  fetchConfig: async () => {
    set({ isLoadingConfig: true })
    try {
      const config = await window.milo?.nudge.getConfig()
      set({ config, isLoadingConfig: false })
    } catch (error) {
      console.error('[NudgeStore] Failed to fetch config:', error)
      set({ isLoadingConfig: false })
    }
  },

  // Update configuration
  updateConfig: async (updates: Partial<NudgeConfig>) => {
    try {
      await window.milo?.nudge.setConfig(updates)
      // Refresh config after update
      await get().fetchConfig()
    } catch (error) {
      console.error('[NudgeStore] Failed to update config:', error)
    }
  },

  // Fetch current drift status
  fetchDriftStatus: async () => {
    try {
      const status = await window.milo?.nudge.getDriftStatus()
      set({ driftStatus: status || null })
    } catch (error) {
      console.error('[NudgeStore] Failed to fetch drift status:', error)
    }
  },

  // Set up event listener for nudges from main process
  setupEventListener: () => {
    if (!window.milo?.events.onNudgeTriggered) {
      console.warn('[NudgeStore] Nudge event listener not available')
      return () => {}
    }

    const cleanup = window.milo.events.onNudgeTriggered((nudge: NudgeEvent) => {
      console.log('[NudgeStore] Received nudge:', nudge)
      get().addNudge(nudge)
    })

    return cleanup
  },
}))
