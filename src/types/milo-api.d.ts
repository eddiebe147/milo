// Global type declaration for the milo API exposed via contextBridge
import type { Goal, Task, Category, ActivityLog, DailyScore, AppClassification, ActivityState, CurrentActivityState, ScoreBreakdown } from './index'

// AI input/output types (mirrors electron/ai/ClaudeClient.ts)
export interface MorningBriefingInput {
  goals: Goal[]
  tasks: Task[]
  carryoverTasks: Task[]
  calendarEvents?: { start: string; end: string; title: string }[]
  todayDate: string
}

export interface MorningBriefingOutput {
  signalTasks: Array<{
    taskId: string
    rationale: string
    priority: number
  }>
  briefing: string
  warnings: string[]
}

export interface EveningReviewInput {
  signalTasks: Task[]
  completedTasks: Task[]
  score: DailyScore
  activitySummary: {
    greenMinutes: number
    amberMinutes: number
    redMinutes: number
  }
  todayDate: string
}

export interface EveningReviewOutput {
  summary: {
    completed: number
    total: number
    focusMinutes: number
    driftMinutes: number
  }
  analysis: string
  wins: string[]
  improvements: string[]
  carryover: Array<{
    taskId: string
    reason: string
    recommendation: 'defer' | 'tomorrow' | 'break_down'
  }>
  tomorrowFocus: string
}

export interface ParsedTask {
  title: string
  description?: string
  dueDate?: string
  priority: 'high' | 'medium' | 'low'
  goalHint?: string
}

export interface TaskParserOutput {
  tasks: ParsedTask[]
  unparsed?: string
}

// Plan processor types (Haiku agent)
export interface ProcessedPlan {
  plan: {
    title: string
    summary: string
    source: string
  }
  goals: Array<{
    title: string
    description: string
    timeframe: 'yearly' | 'quarterly' | 'monthly' | 'weekly'
    suggestedDeadline: string | null
  }>
  tasks: Array<{
    title: string
    description?: string
    dueDate: string | null
    priority: 'high' | 'medium' | 'low'
    goalIndex: number | null
    dependsOn: number[]
  }>
  clarifications: Array<{
    item: string
    question: string
  }>
  unparsed?: string
}

export interface PlanApplyResult {
  success: boolean
  goalsCreated: number
  tasksCreated: number
  goalIds: string[]
  taskIds: string[]
}

// Nudge types (mirrors electron/services/NudgeManager.ts)
export interface NudgeConfig {
  firstNudgeThresholdMs: number
  nudgeCooldownMs: number
  showSystemNotifications: boolean
  aiNudgesEnabled: boolean
}

export interface DriftStatus {
  isInDriftState: boolean
  currentDriftMinutes: number
  totalDriftMinutesToday: number
  nudgeCount: number
  currentApp: string
}

export interface NudgeEvent {
  message: string
  driftMinutes: number
  currentApp: string
  timestamp: Date
  isAiGenerated: boolean
}

// Task execution types (mirrors electron/services/TaskExecutor.ts)
export type TaskActionType = 'claude_code' | 'claude_web' | 'research' | 'manual'
export type ExecutionTarget = 'claude_web' | 'claude_cli' | 'claude_desktop'

export interface TaskActionPlan {
  actionType: TaskActionType
  prompt: string
  projectPath?: string | null
  searchQueries?: string[]
  reasoning: string
}

export interface ExecutionResult {
  success: boolean
  actionType: TaskActionType | ExecutionTarget
  message: string
  error?: string
}

// Theme colors type (backend format)
export interface BackendThemeColors {
  themePrimaryColor: string
  themeAccentColor: string
  themeDangerColor: string
  themeUserMessageColor: string
  themeAiMessageColor: string
}

// Chat conversation types
export interface ChatConversationDB {
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
    onNudgeTriggered: (callback: (nudge: NudgeEvent) => void) => () => void
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
    // Signal Queue & Continuity methods
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
      breakdown: ScoreBreakdown
      summary: {
        signalMinutes: number
        noiseMinutes: number
        adjacentMinutes: number
        totalMinutes: number
        tasksCompleted: number
        tasksTotal: number
        streak: number
      }
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
    initialize: (apiKey: string) => Promise<boolean>
    isInitialized: () => Promise<boolean>
    morningBriefing: (input: MorningBriefingInput) => Promise<MorningBriefingOutput>
    eveningReview: (input: EveningReviewInput) => Promise<EveningReviewOutput>
    parseTasks: (text: string) => Promise<TaskParserOutput>
    generateNudge: (driftMinutes: number, currentApp: string) => Promise<string>
    processPlan: (rawPlan: string, context?: string) => Promise<ProcessedPlan>
    chat: (message: string, conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>) => Promise<string>
  }
  plan: {
    apply: (processedPlan: ProcessedPlan) => Promise<PlanApplyResult>
  }
  nudge: {
    getConfig: () => Promise<NudgeConfig>
    setConfig: (config: Partial<NudgeConfig>) => Promise<void>
    getDriftStatus: () => Promise<DriftStatus>
  }
  taskExecution: {
    classifyTask: (taskId: string) => Promise<TaskActionPlan>
    executeTask: (taskId: string) => Promise<ExecutionResult>
    executeWithTarget: (target: ExecutionTarget, prompt: string, projectPath: string | null) => Promise<ExecutionResult>
    generatePrompt: (taskId: string) => Promise<{ prompt: string; projectPath: string | null }>
    getAvailableProjects: () => Promise<string[]>
    hasClaudeCli: () => Promise<boolean>
  }
  settings: {
    get: () => Promise<{
      apiKey: string | null
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
    getRefillMode: () => Promise<'endless' | 'daily_reset'>
    saveRefillMode: (mode: 'endless' | 'daily_reset') => Promise<boolean>
    update: (updates: Record<string, unknown>) => Promise<boolean>
    getThemeColors: () => Promise<BackendThemeColors>
    setThemeColor: (key: keyof BackendThemeColors, value: string) => Promise<boolean>
    setThemeColors: (colors: Partial<BackendThemeColors>) => Promise<boolean>
  }
  analytics: {
    isEnabled: () => Promise<boolean>
    isAvailable: () => Promise<boolean>
    enable: () => Promise<boolean>
    disable: () => Promise<boolean>
  }
  chat: {
    getAllConversations: () => Promise<ChatConversationDB[]>
    getConversation: (id: string) => Promise<ChatConversationDB | null>
    createConversation: (title?: string) => Promise<ChatConversationDB>
    updateConversationTitle: (id: string, title: string) => Promise<boolean>
    deleteConversation: (id: string) => Promise<boolean>
    autoTitleConversation: (id: string) => Promise<ChatConversationDB | null>
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
