// Core data types for MILO

// Goal hierarchy
export interface Goal {
  id: string
  title: string
  description?: string
  parentId: string | null // null = top-level goal
  timeframe: 'yearly' | 'quarterly' | 'monthly' | 'weekly'
  status: 'active' | 'completed' | 'archived'
  targetDate?: string // ISO date
  createdAt: string
  updatedAt: string
}

// Tasks (daily signal work)
export interface Task {
  id: string
  title: string
  description?: string
  goalId: string | null // linked goal
  categoryId?: string | null // linked category/project (optional, defaults to null)
  status: 'pending' | 'in_progress' | 'completed' | 'deferred'
  priority: number // 1-5, AI suggested
  rationale?: string // AI explanation of why this matters
  scheduledDate: string // ISO date (legacy, use startDate/endDate)
  startDate?: string // ISO date - when task begins (defaults to scheduledDate)
  endDate?: string // ISO date - when task should be done (defaults to scheduledDate)
  estimatedDays?: number // how many days task is expected to take (defaults to 1)
  daysWorked?: number // how many days user has worked on this (defaults to 0)
  lastWorkedDate?: string // ISO date - last day user worked on this
  completedAt?: string
  createdAt: string
  updatedAt: string
}

// Categories/Projects (simple flat list)
export interface Category {
  id: string
  name: string
  color: string // hex color for UI
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Activity tracking
export interface ActivityLog {
  id: string
  timestamp: string
  appName: string
  windowTitle: string
  bundleId?: string // macOS bundle identifier
  url?: string // if browser
  durationSeconds: number
  state: ActivityState
  taskId?: string // if associated with active task
}

export type ActivityState = 'green' | 'amber' | 'red'

// App classification for state detection
export interface AppClassification {
  id: string
  appName: string
  bundleId?: string
  defaultState: ActivityState
  keywords?: string[] // window title keywords that affect state
  isCustom: boolean // user-defined vs system default
  createdAt: string
}

// Daily score
export interface DailyScore {
  id: string
  date: string // ISO date
  signalMinutes: number // green time
  noiseMinutes: number // red time
  adjacentMinutes: number // amber time
  totalTrackedMinutes: number
  tasksCompleted: number
  tasksTotal: number
  score: number // 0-100
  streakDay: number
  insights?: string // AI-generated insight
  createdAt: string
}

// Morning briefing / Evening review dialogues
export interface DialogueSession {
  id: string
  type: 'morning_briefing' | 'evening_review'
  date: string
  messages: DialogueMessage[]
  summary?: string
  completedAt?: string
  createdAt: string
}

export interface DialogueMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// User settings
export interface UserSettings {
  // Work hours
  workStartTime: string // "09:00"
  workEndTime: string // "17:00"
  workDays: number[] // 0-6, Sunday = 0

  // Monitoring
  monitoringEnabled: boolean
  pollingIntervalMs: number

  // Notifications
  driftAlertEnabled: boolean
  driftAlertDelayMinutes: number
  morningBriefingTime: string // "09:00"
  eveningReviewTime: string // "18:00"

  // AI
  claudeApiKey?: string // stored securely via keytar

  // Appearance
  alwaysOnTop: boolean
  startMinimized: boolean
  showInDock: boolean
}

// State for real-time activity monitoring (matches ActivityMonitor.getStatus())
export interface CurrentActivityState {
  isRunning: boolean
  isPaused: boolean
  currentState: ActivityState
  currentAppName: string
  currentWindowTitle: string
}

// IPC channel payloads
export interface StateChangedPayload {
  state: ActivityState
  appName: string
  windowTitle: string
  stateChanged: boolean
}

// Score calculation helpers
export interface ScoreBreakdown {
  signalRatio: number // green / total
  taskCompletionRatio: number
  streakBonus: number
  finalScore: number
}
