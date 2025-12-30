import { create } from 'zustand'
import type { UserSettings, AppClassification, ThemeColors } from '../types'

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

// Default theme colors
const DEFAULT_THEME_COLORS: ThemeColors = {
  primaryColor: '#00ff41',
  accentColor: '#ffb000',
  dangerColor: '#ff3333',
  userMessageColor: '#00ff41',
  aiMessageColor: '#ffb000',
}

interface SettingsState {
  settings: UserSettings
  classifications: AppClassification[]
  themeColors: ThemeColors
  isLoading: boolean
  error: string | null

  // Actions
  loadSettings: () => Promise<void>
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>
  loadClassifications: () => Promise<void>
  updateClassification: (classification: Omit<AppClassification, 'id' | 'createdAt'>) => Promise<void>
  toggleAlwaysOnTop: () => Promise<boolean>
  toggleRefillMode: () => void
  loadThemeColors: () => Promise<void>
  setThemeColor: (key: keyof ThemeColors, value: string) => Promise<void>
  setThemeColors: (colors: Partial<ThemeColors>) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  classifications: [],
  themeColors: DEFAULT_THEME_COLORS,
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

  loadThemeColors: async () => {
    try {
      const backendColors = await window.milo?.settings.getThemeColors()
      if (backendColors) {
        // Convert backend format (themePrimaryColor) to frontend format (primaryColor)
        const colors: ThemeColors = {
          primaryColor: backendColors.themePrimaryColor,
          accentColor: backendColors.themeAccentColor,
          dangerColor: backendColors.themeDangerColor,
          userMessageColor: backendColors.themeUserMessageColor,
          aiMessageColor: backendColors.themeAiMessageColor,
        }
        set({ themeColors: colors })
      }
    } catch (error) {
      console.error('Failed to load theme colors:', error)
      set({ themeColors: DEFAULT_THEME_COLORS })
    }
  },

  setThemeColor: async (key: keyof ThemeColors, value: string) => {
    // Update local state immediately for live preview
    set((state) => ({
      themeColors: { ...state.themeColors, [key]: value }
    }))

    // Map frontend key to backend key
    const keyMap: Record<keyof ThemeColors, string> = {
      primaryColor: 'themePrimaryColor',
      accentColor: 'themeAccentColor',
      dangerColor: 'themeDangerColor',
      userMessageColor: 'themeUserMessageColor',
      aiMessageColor: 'themeAiMessageColor',
    }

    try {
      await window.milo?.settings.setThemeColor(
        keyMap[key] as 'themePrimaryColor' | 'themeAccentColor' | 'themeDangerColor' | 'themeUserMessageColor' | 'themeAiMessageColor',
        value
      )
    } catch (error) {
      console.error('Failed to save theme color:', error)
    }
  },

  setThemeColors: async (colors: Partial<ThemeColors>) => {
    // Update local state immediately for live preview
    set((state) => ({
      themeColors: { ...state.themeColors, ...colors }
    }))

    // Convert frontend format to backend format
    const backendColors: Record<string, string> = {}
    if (colors.primaryColor) backendColors.themePrimaryColor = colors.primaryColor
    if (colors.accentColor) backendColors.themeAccentColor = colors.accentColor
    if (colors.dangerColor) backendColors.themeDangerColor = colors.dangerColor
    if (colors.userMessageColor) backendColors.themeUserMessageColor = colors.userMessageColor
    if (colors.aiMessageColor) backendColors.themeAiMessageColor = colors.aiMessageColor

    try {
      await window.milo?.settings.setThemeColors(backendColors)
    } catch (error) {
      console.error('Failed to save theme colors:', error)
    }
  },
}))
