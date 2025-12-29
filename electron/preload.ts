import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type { Goal, Task, Category, ActivityLog, DailyScore, AppClassification, ActivityState, CurrentActivityState } from '../src/types'
import type {
  MorningBriefingInput,
  MorningBriefingOutput,
  EveningReviewInput,
  EveningReviewOutput,
  TaskParserOutput,
  ProcessedPlan,
} from './ai/ClaudeClient'
import type { NudgeEvent } from './services/NudgeManager'
import type { TaskActionPlan, ExecutionResult, ExecutionTarget } from './services/TaskExecutor'

// Nudge configuration type (matches NudgeManager)
interface NudgeConfig {
  firstNudgeThresholdMs: number
  nudgeCooldownMs: number
  showSystemNotifications: boolean
  aiNudgesEnabled: boolean
}

// Drift status type (matches NudgeManager)
interface DriftStatus {
  isInDriftState: boolean
  currentDriftMinutes: number
  totalDriftMinutesToday: number
  nudgeCount: number
  currentApp: string
}

// Helper to create event listeners with cleanup
function createEventListener<T>(
  channel: string,
  callback: (data: T) => void
): () => void {
  const handler = (_event: IpcRendererEvent, data: T) => callback(data)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

// Type definitions for the exposed API
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
    // New methods for signal queue & continuity
    getAllIncomplete: () => Promise<Task[]>
    getByCategory: (categoryId: string) => Promise<Task[]>
    getSignalQueue: (limit?: number) => Promise<Task[]>
    getBacklog: (signalQueueIds: string[]) => Promise<Task[]>
    getWorkedYesterday: () => Promise<Task[]>
    recordWork: (id: string) => Promise<Task | null>
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
    apply: (processedPlan: ProcessedPlan) => Promise<{
      success: boolean
      goalsCreated: number
      tasksCreated: number
      goalIds: string[]
      taskIds: string[]
    }>
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
    }>
    getApiKey: () => Promise<string | null>
    saveApiKey: (apiKey: string | null) => Promise<boolean>
    getRefillMode: () => Promise<'endless' | 'daily_reset'>
    saveRefillMode: (mode: 'endless' | 'daily_reset') => Promise<boolean>
    update: (updates: Record<string, unknown>) => Promise<boolean>
    getThemeColors: () => Promise<ThemeColors>
    setThemeColor: (key: keyof ThemeColors, value: string) => Promise<boolean>
    setThemeColors: (colors: Partial<ThemeColors>) => Promise<boolean>
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

// Chat types (from repository)
interface ChatConversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

interface ChatMessageDB {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

// Theme colors type (from settings repository)
interface ThemeColors {
  themePrimaryColor: string
  themeAccentColor: string
  themeDangerColor: string
  themeUserMessageColor: string
  themeAiMessageColor: string
}

// Expose the API to the renderer
contextBridge.exposeInMainWorld('milo', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    close: () => ipcRenderer.invoke('window:close'),
    toggleAlwaysOnTop: () => ipcRenderer.invoke('window:toggle-always-on-top'),
  },

  // Tray control
  tray: {
    setState: (state: ActivityState) => ipcRenderer.invoke('tray:set-state', state),
  },

  // Events from main process
  events: {
    onShowMorningBriefing: (callback: () => void) =>
      createEventListener('show-morning-briefing', callback),
    onShowEveningReview: (callback: () => void) =>
      createEventListener('show-evening-review', callback),
    onShowSettings: (callback: () => void) =>
      createEventListener('show-settings', callback),
    onToggleMonitoring: (callback: (paused: boolean) => void) =>
      createEventListener('toggle-monitoring', callback),
    onActivityStateChanged: (callback: (payload: { appName: string; windowTitle: string; state: ActivityState; stateChanged: boolean }) => void) =>
      createEventListener('activity:state-changed', callback),
    onNudgeTriggered: (callback: (nudge: NudgeEvent) => void) =>
      createEventListener('nudge:triggered', callback),
  },

  // Goals CRUD
  goals: {
    getAll: () => ipcRenderer.invoke('goals:getAll'),
    getById: (id: string) => ipcRenderer.invoke('goals:getById', id),
    getHierarchy: () => ipcRenderer.invoke('goals:getHierarchy'),
    create: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) =>
      ipcRenderer.invoke('goals:create', goal),
    update: (id: string, updates: Partial<Goal>) =>
      ipcRenderer.invoke('goals:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('goals:delete', id),
  },

  // Tasks CRUD + workflow
  tasks: {
    getAll: () => ipcRenderer.invoke('tasks:getAll'),
    getToday: () => ipcRenderer.invoke('tasks:getToday'),
    getById: (id: string) => ipcRenderer.invoke('tasks:getById', id),
    getActive: () => ipcRenderer.invoke('tasks:getActive'),
    create: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) =>
      ipcRenderer.invoke('tasks:create', task),
    update: (id: string, updates: Partial<Task>) =>
      ipcRenderer.invoke('tasks:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('tasks:delete', id),
    start: (id: string) => ipcRenderer.invoke('tasks:start', id),
    complete: (id: string) => ipcRenderer.invoke('tasks:complete', id),
    defer: (id: string) => ipcRenderer.invoke('tasks:defer', id),
    // New methods for signal queue & continuity
    getAllIncomplete: () => ipcRenderer.invoke('tasks:getAllIncomplete'),
    getByCategory: (categoryId: string) => ipcRenderer.invoke('tasks:getByCategory', categoryId),
    getSignalQueue: (limit?: number) => ipcRenderer.invoke('tasks:getSignalQueue', limit),
    getBacklog: (signalQueueIds: string[]) => ipcRenderer.invoke('tasks:getBacklog', signalQueueIds),
    getWorkedYesterday: () => ipcRenderer.invoke('tasks:getWorkedYesterday'),
    recordWork: (id: string) => ipcRenderer.invoke('tasks:recordWork', id),
  },

  // Categories CRUD
  categories: {
    getAll: () => ipcRenderer.invoke('categories:getAll'),
    getActive: () => ipcRenderer.invoke('categories:getActive'),
    getById: (id: string) => ipcRenderer.invoke('categories:getById', id),
    create: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) =>
      ipcRenderer.invoke('categories:create', category),
    update: (id: string, updates: Partial<Category>) =>
      ipcRenderer.invoke('categories:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('categories:delete', id),
    reorder: (orderedIds: string[]) => ipcRenderer.invoke('categories:reorder', orderedIds),
  },

  // Activity & Classifications
  activity: {
    getToday: () => ipcRenderer.invoke('activity:getToday'),
    getSummary: (date: string) => ipcRenderer.invoke('activity:getSummary', date),
    getAppBreakdown: (date: string) => ipcRenderer.invoke('activity:getAppBreakdown', date),
  },

  classifications: {
    getAll: () => ipcRenderer.invoke('classifications:getAll'),
    upsert: (classification: Omit<AppClassification, 'id' | 'createdAt'>) =>
      ipcRenderer.invoke('classifications:upsert', classification),
  },

  // Scores
  scores: {
    getToday: () => ipcRenderer.invoke('scores:getToday'),
    getRecent: (days: number) => ipcRenderer.invoke('scores:getRecent', days),
    getCurrentStreak: () => ipcRenderer.invoke('scores:getCurrentStreak'),
    calculate: () => ipcRenderer.invoke('scores:calculate'),
    getBreakdown: (date: string) => ipcRenderer.invoke('scores:getBreakdown', date),
  },

  // Monitoring controls
  monitoring: {
    start: () => ipcRenderer.invoke('monitoring:start'),
    stop: () => ipcRenderer.invoke('monitoring:stop'),
    pause: () => ipcRenderer.invoke('monitoring:pause'),
    resume: () => ipcRenderer.invoke('monitoring:resume'),
    toggle: () => ipcRenderer.invoke('monitoring:toggle'),
    status: () => ipcRenderer.invoke('monitoring:status'),
  },

  // AI / Claude integration
  ai: {
    initialize: (apiKey: string) => ipcRenderer.invoke('ai:initialize', apiKey),
    isInitialized: () => ipcRenderer.invoke('ai:isInitialized'),
    morningBriefing: (input: MorningBriefingInput) =>
      ipcRenderer.invoke('ai:morningBriefing', input),
    eveningReview: (input: EveningReviewInput) =>
      ipcRenderer.invoke('ai:eveningReview', input),
    parseTasks: (text: string) => ipcRenderer.invoke('ai:parseTasks', text),
    generateNudge: (driftMinutes: number, currentApp: string) =>
      ipcRenderer.invoke('ai:generateNudge', driftMinutes, currentApp),
    processPlan: (rawPlan: string, context?: string) =>
      ipcRenderer.invoke('ai:processPlan', rawPlan, context),
    chat: (message: string, conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>) =>
      ipcRenderer.invoke('ai:chat', { message, conversationHistory }),
  },

  // Plan management
  plan: {
    apply: (processedPlan: ProcessedPlan) =>
      ipcRenderer.invoke('plan:apply', processedPlan),
  },

  // Nudge management
  nudge: {
    getConfig: () => ipcRenderer.invoke('nudge:getConfig'),
    setConfig: (config: Partial<NudgeConfig>) => ipcRenderer.invoke('nudge:setConfig', config),
    getDriftStatus: () => ipcRenderer.invoke('nudge:getDriftStatus'),
  },

  // Task execution (smart task automation)
  taskExecution: {
    classifyTask: (taskId: string) => ipcRenderer.invoke('taskExecution:classifyTask', taskId),
    executeTask: (taskId: string) => ipcRenderer.invoke('taskExecution:executeTask', taskId),
    executeWithTarget: (target: ExecutionTarget, prompt: string, projectPath: string | null) =>
      ipcRenderer.invoke('taskExecution:executeWithTarget', target, prompt, projectPath),
    generatePrompt: (taskId: string) => ipcRenderer.invoke('taskExecution:generatePrompt', taskId),
    getAvailableProjects: () => ipcRenderer.invoke('taskExecution:getAvailableProjects'),
    hasClaudeCli: () => ipcRenderer.invoke('taskExecution:hasClaudeCli'),
  },

  // Settings management
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    getApiKey: () => ipcRenderer.invoke('settings:getApiKey'),
    saveApiKey: (apiKey: string | null) => ipcRenderer.invoke('settings:saveApiKey', apiKey),
    getRefillMode: () => ipcRenderer.invoke('settings:getRefillMode'),
    saveRefillMode: (mode: 'endless' | 'daily_reset') => ipcRenderer.invoke('settings:saveRefillMode', mode),
    update: (updates: Record<string, unknown>) => ipcRenderer.invoke('settings:update', updates),
    getThemeColors: () => ipcRenderer.invoke('settings:getThemeColors'),
    setThemeColor: (key: keyof ThemeColors, value: string) => ipcRenderer.invoke('settings:setThemeColor', key, value),
    setThemeColors: (colors: Partial<ThemeColors>) => ipcRenderer.invoke('settings:setThemeColors', colors),
  },

  // Chat conversations & messages
  chat: {
    getAllConversations: () => ipcRenderer.invoke('chat:getAllConversations'),
    getConversation: (id: string) => ipcRenderer.invoke('chat:getConversation', id),
    createConversation: (title?: string) => ipcRenderer.invoke('chat:createConversation', title),
    updateConversationTitle: (id: string, title: string) => ipcRenderer.invoke('chat:updateConversationTitle', id, title),
    deleteConversation: (id: string) => ipcRenderer.invoke('chat:deleteConversation', id),
    autoTitleConversation: (id: string) => ipcRenderer.invoke('chat:autoTitleConversation', id),
    getMessages: (conversationId: string) => ipcRenderer.invoke('chat:getMessages', conversationId),
    addMessage: (conversationId: string, role: 'user' | 'assistant', content: string) => ipcRenderer.invoke('chat:addMessage', conversationId, role, content),
    deleteMessage: (id: string) => ipcRenderer.invoke('chat:deleteMessage', id),
  },
} satisfies MiloAPI)
