import { create } from 'zustand'
import type { UserSettings, AppClassification } from '../types'

// Default settings
const DEFAULT_SETTINGS: UserSettings = {
  workStartTime: '09:00',
  workEndTime: '17:00',
  workDays: [1, 2, 3, 4, 5], // Monday to Friday

  monitoringEnabled: true,
  pollingIntervalMs: 5000,

  driftAlertEnabled: true,
  driftAlertDelayMinutes: 5,
  morningBriefingTime: '09:00',
  eveningReviewTime: '18:00',

  alwaysOnTop: false,
  startMinimized: false,
  showInDock: true,

  // Default to endless mode - auto-refill signal queue as tasks complete
  refillMode: 'endless',
}

interface SettingsState {
  settings: UserSettings
  classifications: AppClassification[]
  isLoading: boolean
  error: string | null

  // Actions
  loadSettings: () => Promise<void>
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>
  loadClassifications: () => Promise<void>
  updateClassification: (classification: Omit<AppClassification, 'id' | 'createdAt'>) => Promise<void>
  toggleAlwaysOnTop: () => Promise<boolean>
  toggleRefillMode: () => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  classifications: [],
  isLoading: false,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null })
    try {
      // Settings will come from the database via IPC
      // For now, use defaults
      set({ isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  updateSettings: async (updates: Partial<UserSettings>) => {
    try {
      set((state) => ({
        settings: { ...state.settings, ...updates },
      }))
      // TODO: Persist to database via IPC
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  loadClassifications: async () => {
    set({ isLoading: true, error: null })
    try {
      const classifications = await window.milo.classifications.getAll()
      set({ classifications, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  updateClassification: async (classification) => {
    try {
      const updated = await window.milo.classifications.upsert(classification)
      if (updated) {
        set((state) => {
          const existing = state.classifications.find(
            (c) => c.appName === classification.appName
          )
          if (existing) {
            return {
              classifications: state.classifications.map((c) =>
                c.appName === classification.appName ? updated : c
              ),
            }
          } else {
            return {
              classifications: [...state.classifications, updated],
            }
          }
        })
      }
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  toggleAlwaysOnTop: async () => {
    try {
      const isAlwaysOnTop = await window.milo.window.toggleAlwaysOnTop()
      set((state) => ({
        settings: { ...state.settings, alwaysOnTop: isAlwaysOnTop },
      }))
      return isAlwaysOnTop
    } catch (error) {
      set({ error: (error as Error).message })
      return get().settings.alwaysOnTop
    }
  },

  toggleRefillMode: () => {
    set((state) => ({
      settings: {
        ...state.settings,
        refillMode: state.settings.refillMode === 'endless' ? 'daily_reset' : 'endless',
      },
    }))
    // TODO: Persist to database via IPC when settings persistence is implemented
  },
}))
