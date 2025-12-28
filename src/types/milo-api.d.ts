// Global type declaration for the milo API exposed via contextBridge
import type { Goal, Task, ActivityLog, DailyScore, AppClassification, ActivityState, CurrentActivityState, ScoreBreakdown } from './index'

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
  }
  nudge: {
    getConfig: () => Promise<NudgeConfig>
    setConfig: (config: Partial<NudgeConfig>) => Promise<void>
    getDriftStatus: () => Promise<DriftStatus>
  }
}

declare global {
  interface Window {
    milo: MiloAPI
  }
}

export {}
