import { milo } from "@/lib/api"
// Global type declaration for the milo API exposed via contextBridge
import type { Goal, Task, Category, ActivityLog, DailyScore, AppClassification, ActivityState, CurrentActivityState } from './index'

// Re-export AI input/output types
export type {
  MorningBriefingInput,
  MorningBriefingOutput,
  EveningReviewInput,
  EveningReviewOutput,
  TaskParserOutput,
  ProcessedPlan,
  AIProviderType
} from '../../electron/ai/providers'

export type { NudgeEvent } from '../../electron/services/NudgeManager'
export type { TaskActionPlan, ExecutionResult, ExecutionTarget, TaskActionType } from '../../electron/services/TaskExecutor'

// Nudge configuration type
export interface NudgeConfig {
  firstNudgeThresholdMs: number
  nudgeCooldownMs: number
  showSystemNotifications: boolean
  aiNudgesEnabled: boolean
}

// Drift status type
export interface DriftStatus {
  isInDriftState: boolean
  currentDriftMinutes: number
  totalDriftMinutesToday: number
  nudgeCount: number
  currentApp: string
}

// Theme colors type
export interface ThemeColors {
  themePrimaryColor: string
  themeAccentColor: string
  themeDangerColor: string
  themeUserMessageColor: string
  themeAiMessageColor: string
}

// Chat types
export interface ChatConversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface ChatMessageDB {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface PlanApplyResult {
  success: boolean
  goalsCreated: number
  tasksCreated: number
  goalIds: string[]
  taskIds: string[]
}

export interface MiloAPI {
  window: {
    minimize: () => Promise<void>
    close: () => Promise<void>
    toggleAlwaysOnTop: () => Promise<boolean>
  }
  tray: {
    setState: (state: ActivityState) => Promise<void>
  }
  events: {
    onShowMorningBriefing: (callback: () => void) => () => void
    onShowEveningReview: (callback: () => void) => () => void
    onShowSettings: (callback: () => void) => () => void
    onToggleMonitoring: (callback: (paused: boolean) => void) => () => void
    onActivityStateChanged: (callback: (payload: { appName: string; windowTitle: string; state: ActivityState; stateChanged: boolean }) => void) => () => void
    onNudgeTriggered: (callback: (nudge: any) => void) => () => void
    onTasksChanged: (callback: () => void) => () => void
  }
  goals: {
    getAll: () => Promise<Goal[]>
    getById: (id: string) => Promise<Goal | undefined>
    getHierarchy: () => Promise<{ yearly: Goal[]; quarterly: Goal[]; monthly: Goal[]; weekly: Goal[] }>
    create: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Goal | null>
    update: (id: string, updates: Partial<Goal>) => Promise<Goal | null>
    delete: (id: string) => Promise<boolean>
  }
  tasks: {
    getAll: () => Promise<Task[]>
    getToday: () => Promise<Task[]>
    getById: (id: string) => Promise<Task | undefined>
    getActive: () => Promise<Task | null>
    create: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task | null>
    update: (id: string, updates: Partial<Task>) => Promise<Task | null>
    delete: (id: string) => Promise<boolean>
    start: (id: string) => Promise<Task | null>
    complete: (id: string) => Promise<Task | null>
    defer: (id: string) => Promise<Task | null>
    getAllIncomplete: () => Promise<Task[]>
    getByCategory: (categoryId: string) => Promise<Task[]>
    getSignalQueue: (limit?: number) => Promise<Task[]>
    getBacklog: (signalQueueIds: string[]) => Promise<Task[]>
    getWorkedYesterday: () => Promise<Task[]>
    recordWork: (id: string) => Promise<Task | null>
    reorderSignalQueue: (taskIds: string[]) => Promise<void>
  }
  categories: {
    getAll: () => Promise<Category[]>
    getActive: () => Promise<Category[]>
    getById: (id: string) => Promise<Category | null>
    create: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Category | null>
    update: (id: string, updates: Partial<Category>) => Promise<Category | null>
    delete: (id: string) => Promise<boolean>
    reorder: (orderedIds: string[]) => Promise<void>
  }
  activity: {
    getToday: () => Promise<ActivityLog[]>
    getSummary: (date: string) => Promise<{ green: number; amber: number; red: number; total: number }>
    getAppBreakdown: (date: string) => Promise<{ appName: string; minutes: number; state: ActivityState }[]>
  }
  classifications: {
    getAll: () => Promise<AppClassification[]>
    upsert: (classification: Omit<AppClassification, 'id' | 'createdAt'>) => Promise<AppClassification | null>
  }
  scores: {
    getToday: () => Promise<DailyScore | null>
    getRecent: (days: number) => Promise<DailyScore[]>
    getCurrentStreak: () => Promise<number>
    calculate: () => Promise<DailyScore>
    getBreakdown: (date: string) => Promise<{
      score: number
      breakdown: { signalRatio: number; taskCompletionRatio: number; streakBonus: number; finalScore: number }
      summary: { signalMinutes: number; noiseMinutes: number; adjacentMinutes: number; totalMinutes: number; tasksCompleted: number; tasksTotal: number; streak: number }
    }>
  }
  monitoring: {
    start: () => Promise<void>
    stop: () => Promise<void>
    pause: () => Promise<void>
    resume: () => Promise<void>
    toggle: () => Promise<boolean>
    status: () => Promise<CurrentActivityState>
  }
  ai: {
    initialize: (apiKey: string, provider?: any, model?: string) => Promise<boolean>
    isInitialized: () => Promise<boolean>
    getProviderType: () => Promise<any>
    getModel: () => Promise<string | null>
    getProviderModels: (providerType: any) => Promise<Array<{ id: string; name: string }>>
    getDefaultModel: (providerType: any) => Promise<string>
    morningBriefing: (input: any) => Promise<any>
    eveningReview: (input: any) => Promise<any>
    parseTasks: (text: string) => Promise<any>
    generateNudge: (driftMinutes: number, currentApp: string) => Promise<string>
    processPlan: (rawPlan: string, context?: string) => Promise<any>
    chat: (message: string, conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>) => Promise<string>
  }
  plan: {
    apply: (processedPlan: any) => Promise<PlanApplyResult>
  }
  nudge: {
    getConfig: () => Promise<NudgeConfig>
    setConfig: (config: Partial<NudgeConfig>) => Promise<void>
    getDriftStatus: () => Promise<DriftStatus>
  }
  taskExecution: {
    classifyTask: (taskId: string) => Promise<any>
    executeTask: (taskId: string) => Promise<any>
    executeWithTarget: (target: any, prompt: string, projectPath: string | null) => Promise<any>
    generatePrompt: (taskId: string) => Promise<{ prompt: string; projectPath: string | null }>
    getAvailableProjects: () => Promise<string[]>
    hasClaudeCli: () => Promise<boolean>
  }
  settings: {
    get: () => Promise<{
      apiKey: string | null
      apiProvider: any
      apiModel: string | null
      refillMode: 'endless' | 'daily_reset'
      workStartTime: string
      workEndTime: string
      workDays: number[]
      monitoringEnabled: boolean
      pollingIntervalMs: number
      driftAlertEnabled: boolean
      driftAlertDelayMinutes: number
      morningBriefingTime: string
      eveningReviewTime: string
      alwaysOnTop: boolean
      startMinimized: boolean
      showInDock: boolean
      analyticsEnabled: boolean
    }>
    getApiKey: () => Promise<string | null>
    saveApiKey: (apiKey: string | null) => Promise<boolean>
    getAiSettings: () => Promise<{ apiKey: string | null; apiProvider: any; apiModel: string | null }>
    saveAiSettings: (settings: { apiKey?: string | null; apiProvider?: any; apiModel?: string | null }) => Promise<boolean>
    getRefillMode: () => Promise<'endless' | 'daily_reset'>
    saveRefillMode: (mode: 'endless' | 'daily_reset') => Promise<boolean>
    update: (updates: Record<string, unknown>) => Promise<boolean>
    getThemeColors: () => Promise<ThemeColors>
    setThemeColor: (key: keyof ThemeColors, value: string) => Promise<boolean>
    setThemeColors: (colors: Partial<ThemeColors>) => Promise<boolean>
  }
  analytics: {
    isEnabled: () => Promise<boolean>
    isAvailable: () => Promise<boolean>
    enable: () => Promise<boolean>
    disable: () => Promise<boolean>
  }
  chat: {
    getAllConversations: () => Promise<ChatConversation[]>
    getConversation: (id: string) => Promise<ChatConversation | null>
    createConversation: (title?: string) => Promise<ChatConversation>
    updateConversationTitle: (id: string, title: string) => Promise<boolean>
    deleteConversation: (id: string) => Promise<boolean>
    autoTitleConversation: (id: string) => Promise<ChatConversation | null>
    getMessages: (conversationId: string) => Promise<ChatMessageDB[]>
    addMessage: (conversationId: string, role: 'user' | 'assistant', content: string) => Promise<ChatMessageDB>
    deleteMessage: (id: string) => Promise<boolean>
  }
}

declare global {
  interface Window {
    milo: MiloAPI
  }
}

export { }
