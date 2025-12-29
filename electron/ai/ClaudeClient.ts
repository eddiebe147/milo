import Anthropic from '@anthropic-ai/sdk'
import {
  MORNING_BRIEFING_PROMPT,
  EVENING_REVIEW_PROMPT,
  TASK_PARSER_PROMPT,
  DRIFT_NUDGE_PROMPT,
  PLAN_PROCESSOR_PROMPT,
  CHAT_PROMPT,
  TASK_ACTION_PROMPT,
} from './prompts/system'
import type { Goal, Task, DailyScore } from '../../src/types'

// Input types for Claude operations
export interface MorningBriefingInput {
  goals: Goal[]
  tasks: Task[]
  carryoverTasks: Task[]
  calendarEvents?: { start: string; end: string; title: string }[]
  todayDate: string
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

// Output types from Claude
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

// Chat input types
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
}

export interface ChatInput {
  message: string
  conversationHistory: ChatMessage[]
  context?: ChatContext
}

// Task action classification types
export type TaskActionType = 'claude_code' | 'claude_web' | 'research' | 'manual'

export interface TaskActionPlan {
  actionType: TaskActionType
  prompt: string
  projectPath?: string | null
  searchQueries?: string[]
  reasoning: string
}

class ClaudeClient {
  private client: Anthropic | null = null
  private apiKey: string | null = null

  // Initialize with API key
  initialize(apiKey: string): void {
    this.apiKey = apiKey
    this.client = new Anthropic({ apiKey })
    console.log('[ClaudeClient] Initialized')
  }

  // Check if client is ready
  isInitialized(): boolean {
    return this.client !== null && this.apiKey !== null
  }

  // Generate morning briefing
  async generateMorningBriefing(input: MorningBriefingInput): Promise<MorningBriefingOutput> {
    if (!this.client) {
      throw new Error('Claude client not initialized. Please set your API key.')
    }

    const userPrompt = this.formatMorningBriefingContext(input)

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: MORNING_BRIEFING_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return this.parseJsonResponse<MorningBriefingOutput>(text, {
      signalTasks: [],
      briefing: 'Unable to generate briefing.',
      warnings: [],
    })
  }

  // Generate evening review
  async generateEveningReview(input: EveningReviewInput): Promise<EveningReviewOutput> {
    if (!this.client) {
      throw new Error('Claude client not initialized. Please set your API key.')
    }

    const userPrompt = this.formatEveningReviewContext(input)

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: EVENING_REVIEW_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return this.parseJsonResponse<EveningReviewOutput>(text, {
      summary: { completed: 0, total: 0, focusMinutes: 0, driftMinutes: 0 },
      analysis: 'Unable to generate review.',
      wins: [],
      improvements: [],
      carryover: [],
      tomorrowFocus: '',
    })
  }

  // Parse tasks from text input
  async parseTasks(text: string, existingGoals?: Goal[]): Promise<TaskParserOutput> {
    if (!this.client) {
      throw new Error('Claude client not initialized. Please set your API key.')
    }

    let context = `Parse the following text into tasks:\n\n"${text}"`
    if (existingGoals && existingGoals.length > 0) {
      context += `\n\nExisting goals to match against:\n${existingGoals.map((g) => `- ${g.title}`).join('\n')}`
    }

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: TASK_PARSER_PROMPT,
      messages: [{ role: 'user', content: context }],
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
    return this.parseJsonResponse<TaskParserOutput>(responseText, {
      tasks: [],
      unparsed: text,
    })
  }

  // Process external plan using Haiku (fast, cheap model for bulk processing)
  async processPlan(rawPlan: string, context?: string): Promise<ProcessedPlan> {
    if (!this.client) {
      throw new Error('Claude client not initialized. Please set your API key.')
    }

    let userPrompt = `## Plan Input\n\n${rawPlan}`
    if (context) {
      userPrompt += `\n\n## Additional Context\n${context}`
    }

    const response = await this.client.messages.create({
      model: 'claude-3-5-haiku-20241022', // Use Haiku for fast, cheap processing
      max_tokens: 4096, // Allow longer output for complex plans
      system: PLAN_PROCESSOR_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return this.parseJsonResponse<ProcessedPlan>(text, {
      plan: {
        title: 'Untitled Plan',
        summary: 'Unable to process plan.',
        source: 'unknown',
      },
      goals: [],
      tasks: [],
      clarifications: [],
      unparsed: rawPlan,
    })
  }

  // Generate drift nudge
  async generateNudge(
    driftMinutes: number,
    currentApp: string,
    activeTask?: Task
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Claude client not initialized. Please set your API key.')
    }

    let context = `Drift duration: ${driftMinutes} minutes\nCurrent app: ${currentApp}`
    if (activeTask) {
      context += `\nActive signal task: ${activeTask.title}`
    }

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      system: DRIFT_NUDGE_PROMPT,
      messages: [{ role: 'user', content: context }],
    })

    return response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : 'Time to refocus?'
  }

  // Chat with MILO
  async chat(input: ChatInput): Promise<string> {
    if (!this.client) {
      throw new Error('Claude client not initialized. Please set your API key.')
    }

    // Build system message with context
    let systemPrompt = CHAT_PROMPT
    if (input.context) {
      systemPrompt += '\n\n' + this.formatChatContext(input.context)
    }

    // Build conversation messages
    const messages: Anthropic.Messages.MessageParam[] = [
      ...input.conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: input.message,
      },
    ]

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    return response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : 'Unable to process your request.'
  }

  // Classify a task and determine the best action to execute it
  async classifyTaskAction(
    task: Task,
    availableProjects: string[]
  ): Promise<TaskActionPlan> {
    if (!this.client) {
      throw new Error('Claude client not initialized. Please set your API key.')
    }

    // Build context for the classification
    let userPrompt = `## Task to Analyze

**Title:** ${task.title}
`

    if (task.description) {
      userPrompt += `**Description:** ${task.description}\n`
    }

    if (task.rationale) {
      userPrompt += `**Rationale:** ${task.rationale}\n`
    }

    userPrompt += `**Priority:** ${task.priority}\n`
    userPrompt += `**Status:** ${task.status}\n`

    if (availableProjects.length > 0) {
      userPrompt += `\n## Available Projects\n`
      userPrompt += availableProjects.map(p => `- ${p}`).join('\n')
    }

    userPrompt += `\n\nClassify this task and provide the action plan.`

    const response = await this.client.messages.create({
      model: 'claude-3-5-haiku-20241022', // Use Haiku for fast classification
      max_tokens: 512,
      system: TASK_ACTION_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    return this.parseJsonResponse<TaskActionPlan>(text, {
      actionType: 'manual',
      prompt: task.title,
      reasoning: 'Unable to classify task, defaulting to manual.',
    })
  }

  // Format context for morning briefing
  private formatMorningBriefingContext(input: MorningBriefingInput): string {
    const goalsByTimeframe = {
      yearly: input.goals.filter((g) => g.timeframe === 'yearly'),
      quarterly: input.goals.filter((g) => g.timeframe === 'quarterly'),
      monthly: input.goals.filter((g) => g.timeframe === 'monthly'),
      weekly: input.goals.filter((g) => g.timeframe === 'weekly'),
    }

    let prompt = `## Today: ${input.todayDate}\n\n`

    if (goalsByTimeframe.yearly.length > 0) {
      prompt += `## Long-term Beacons\n${goalsByTimeframe.yearly.map((g) => `- ${g.title}: ${g.description || 'No description'}`).join('\n')}\n\n`
    }

    if (goalsByTimeframe.quarterly.length > 0) {
      prompt += `## Active Milestones (Quarterly)\n${goalsByTimeframe.quarterly.map((g) => `- ${g.title}${g.targetDate ? ` (Target: ${g.targetDate})` : ''}`).join('\n')}\n\n`
    }

    if (goalsByTimeframe.weekly.length > 0) {
      prompt += `## This Week's Objectives\n${goalsByTimeframe.weekly.map((g) => `- ${g.title}`).join('\n')}\n\n`
    }

    prompt += `## Available Tasks\n${input.tasks.map((t) => `- [${t.id}] ${t.title}${t.scheduledDate ? ` (Due: ${t.scheduledDate})` : ''}${t.goalId ? ' (Linked to goal)' : ''}`).join('\n')}\n\n`

    if (input.carryoverTasks.length > 0) {
      prompt += `## Carryover from Previous Days\n${input.carryoverTasks.map((t) => `- [${t.id}] ${t.title} (deferred)`).join('\n')}\n\n`
    }

    if (input.calendarEvents && input.calendarEvents.length > 0) {
      prompt += `## Today's Calendar\n${input.calendarEvents.map((e) => `- ${e.start} - ${e.end}: ${e.title}`).join('\n')}\n\n`
    }

    prompt += `\nAnalyze this context and select today's 3-5 highest-signal tasks.`

    return prompt
  }

  // Format context for evening review
  private formatEveningReviewContext(input: EveningReviewInput): string {
    const completedIds = new Set(input.completedTasks.map((t) => t.id))
    const incompleteTasks = input.signalTasks.filter((t) => !completedIds.has(t.id))

    let prompt = `## Date: ${input.todayDate}\n\n`

    prompt += `## Today's Signal Tasks\n`
    input.signalTasks.forEach((t) => {
      const status = completedIds.has(t.id) ? '✓ COMPLETED' : '✗ INCOMPLETE'
      prompt += `- [${t.id}] ${t.title}: ${status}\n`
    })
    prompt += '\n'

    prompt += `## Activity Summary\n`
    prompt += `- Focus time (green): ${input.activitySummary.greenMinutes} minutes\n`
    prompt += `- Adjacent time (amber): ${input.activitySummary.amberMinutes} minutes\n`
    prompt += `- Drift time (red): ${input.activitySummary.redMinutes} minutes\n\n`

    prompt += `## Score\n`
    prompt += `- Total: ${input.score.score}/100\n`
    prompt += `- Streak: ${input.score.streakDay} days\n\n`

    if (incompleteTasks.length > 0) {
      prompt += `## Incomplete Tasks Needing Attention\n`
      incompleteTasks.forEach((t) => {
        prompt += `- [${t.id}] ${t.title}\n`
      })
    }

    prompt += `\nProvide the evening review analysis.`

    return prompt
  }

  // Format context for chat
  private formatChatContext(context: ChatContext): string {
    let contextStr = `## Current Context\n\n`

    if (context.goals && context.goals.length > 0) {
      const goalsByTimeframe = {
        yearly: context.goals.filter((g) => g.timeframe === 'yearly'),
        quarterly: context.goals.filter((g) => g.timeframe === 'quarterly'),
        monthly: context.goals.filter((g) => g.timeframe === 'monthly'),
        weekly: context.goals.filter((g) => g.timeframe === 'weekly'),
      }

      if (goalsByTimeframe.yearly.length > 0) {
        contextStr += `### Long-term Beacons\n${goalsByTimeframe.yearly.map((g) => `- ${g.title}`).join('\n')}\n\n`
      }
      if (goalsByTimeframe.quarterly.length > 0) {
        contextStr += `### Active Milestones\n${goalsByTimeframe.quarterly.map((g) => `- ${g.title}${g.targetDate ? ` (Target: ${g.targetDate})` : ''}`).join('\n')}\n\n`
      }
      if (goalsByTimeframe.weekly.length > 0) {
        contextStr += `### This Week's Objectives\n${goalsByTimeframe.weekly.map((g) => `- ${g.title}`).join('\n')}\n\n`
      }
    }

    if (context.todayTasks && context.todayTasks.length > 0) {
      contextStr += `### Today's Tasks\n`
      context.todayTasks.forEach((t) => {
        const status = t.status === 'completed' ? '✓' : t.status === 'in_progress' ? '→' : '○'
        contextStr += `${status} ${t.title}${t.priority >= 4 ? ' [SIGNAL]' : ''}\n`
      })
      contextStr += '\n'
    }

    if (context.activeTask) {
      contextStr += `### Currently Active\n→ ${context.activeTask.title}\n\n`
    }

    if (context.activitySummary) {
      const { greenMinutes, amberMinutes, redMinutes } = context.activitySummary
      const total = greenMinutes + amberMinutes + redMinutes
      contextStr += `### Today's Activity\n`
      contextStr += `- Focus time: ${greenMinutes} min (${total > 0 ? Math.round((greenMinutes / total) * 100) : 0}%)\n`
      contextStr += `- Adjacent time: ${amberMinutes} min\n`
      contextStr += `- Drift time: ${redMinutes} min\n\n`
    }

    if (context.dailyScore) {
      contextStr += `### Daily Score\n`
      contextStr += `- Score: ${context.dailyScore.score}/100\n`
      contextStr += `- Streak: ${context.dailyScore.streakDay} days\n\n`
    }

    return contextStr
  }

  // Parse JSON response with fallback
  private parseJsonResponse<T>(text: string, fallback: T): T {
    try {
      // Try to extract JSON from the response (it might have markdown code blocks)
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0]
        return JSON.parse(jsonStr) as T
      }

      // Try parsing the whole text as JSON
      return JSON.parse(text) as T
    } catch (error) {
      console.error('[ClaudeClient] Failed to parse JSON response:', error)
      console.error('[ClaudeClient] Raw response:', text)
      return fallback
    }
  }
}

// Singleton instance
export const claudeClient = new ClaudeClient()
