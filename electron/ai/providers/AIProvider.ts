/**
 * AIProvider - Abstract interface for AI providers
 *
 * Enables multi-provider support (Claude, OpenAI, etc.)
 * All providers implement this interface for consistent API.
 */

import type { Goal, Task, DailyScore, Category } from '../../../src/types'

// Supported provider types
export type AIProviderType = 'claude' | 'openai'

// Model options per provider
export const PROVIDER_MODELS: Record<AIProviderType, { id: string; name: string }[]> = {
  claude: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude Haiku 3.5' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  ],
}

// Default models per provider
export const DEFAULT_MODELS: Record<AIProviderType, string> = {
  claude: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
}

// API key validation patterns
export const API_KEY_PATTERNS: Record<AIProviderType, { pattern: RegExp; hint: string }> = {
  claude: {
    pattern: /^sk-ant-/,
    hint: 'Claude API keys start with "sk-ant-"',
  },
  openai: {
    pattern: /^sk-/,
    hint: 'OpenAI API keys start with "sk-"',
  },
}

// Input types for AI operations
export interface MorningBriefingInput {
  goals: Goal[]
  tasks: Task[]
  carryoverTasks: Task[]
  calendarEvents?: { start: string; end: string; title: string }[]
  todayDate: string
  /**
   * Ground-truth portfolio context from ~/Development/id8/TODO.md.
   * When present, AI providers MUST use this as the authoritative source for
   * portfolio goals and MUST NOT fabricate idle-day counts or progress claims.
   * Injected by main.ts before calling the provider.
   */
  portfolioContext?: string
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

// Output types from AI
export interface MorningBriefingOutput {
  signalTasks: Array<{
    taskId: string
    rationale: string
    priority: number
  }>
  briefing: string
  warnings: string[]
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

// Chat types
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatContext {
  goals?: Goal[]
  todayTasks?: Task[]
  activeTask?: Task
  dailyScore?: DailyScore
  activitySummary?: {
    greenMinutes: number
    amberMinutes: number
    redMinutes: number
  }
  categories?: Category[]
  activeProjectId?: string | null
  /**
   * Ground-truth portfolio context from ~/Development/id8/TODO.md.
   * When present, AI providers MUST use this as the authoritative source for
   * portfolio goals and MUST NOT fabricate idle-day counts, progress percentages,
   * or check-in claims. Injected by main.ts before every chat call.
   */
  portfolioContext?: string
}

export interface ChatInput {
  message: string
  conversationHistory: ChatMessage[]
  context?: ChatContext
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ChatResponse {
  message: string
  toolCalls?: ToolCall[]
}

// Task action classification
export type TaskActionType = 'claude_code' | 'claude_web' | 'research' | 'manual'

export interface TaskActionPlan {
  actionType: TaskActionType
  prompt: string
  projectPath?: string | null
  searchQueries?: string[]
  reasoning: string
}

/**
 * AIProvider interface - Contract for all AI providers
 */
export interface AIProvider {
  /** Provider type identifier */
  readonly type: AIProviderType

  /** Initialize the provider with API key */
  initialize(apiKey: string, model?: string): void

  /** Check if provider is ready */
  isInitialized(): boolean

  /** Get current model */
  getModel(): string

  /** Set model to use */
  setModel(model: string): void

  /** Generate morning briefing */
  generateMorningBriefing(input: MorningBriefingInput): Promise<MorningBriefingOutput>

  /** Generate evening review */
  generateEveningReview(input: EveningReviewInput): Promise<EveningReviewOutput>

  /** Parse tasks from text */
  parseTasks(text: string, existingGoals?: Goal[]): Promise<TaskParserOutput>

  /** Process external plan (uses fast/cheap model) */
  processPlan(rawPlan: string, context?: string): Promise<ProcessedPlan>

  /** Generate drift nudge */
  generateNudge(driftMinutes: number, currentApp: string, activeTask?: Task): Promise<string>

  /** Chat with context and tool support */
  chat(input: ChatInput): Promise<ChatResponse>

  /** Classify task action */
  classifyTaskAction(task: Task, availableProjects: string[]): Promise<TaskActionPlan>
}
