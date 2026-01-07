/**
 * OpenAIProvider - OpenAI GPT implementation of AIProvider
 *
 * MVP: Chat-only support (no tools initially).
 * Full tool support can be added in v2.
 */

import OpenAI from 'openai'
import {
  MORNING_BRIEFING_PROMPT,
  EVENING_REVIEW_PROMPT,
  TASK_PARSER_PROMPT,
  DRIFT_NUDGE_PROMPT,
  PLAN_PROCESSOR_PROMPT,
  CHAT_PROMPT,
  TASK_ACTION_PROMPT,
} from '../prompts/system'
import type { Goal, Task } from '../../../src/types'
import type {
  AIProvider,
  AIProviderType,
  MorningBriefingInput,
  MorningBriefingOutput,
  EveningReviewInput,
  EveningReviewOutput,
  TaskParserOutput,
  ProcessedPlan,
  ChatInput,
  ChatResponse,
  ChatContext,
  TaskActionPlan,
} from './AIProvider'
import { DEFAULT_MODELS } from './AIProvider'

export class OpenAIProvider implements AIProvider {
  readonly type: AIProviderType = 'openai'

  private client: OpenAI | null = null
  private apiKey: string | null = null
  private model: string = DEFAULT_MODELS.openai

  initialize(apiKey: string, model?: string): void {
    this.apiKey = apiKey
    this.client = new OpenAI({ apiKey })
    if (model) {
      this.model = model
    }
    console.log('[OpenAIProvider] Initialized with model:', this.model)
  }

  isInitialized(): boolean {
    return this.client !== null && this.apiKey !== null
  }

  getModel(): string {
    return this.model
  }

  setModel(model: string): void {
    this.model = model
    console.log('[OpenAIProvider] Model changed to:', model)
  }

  async generateMorningBriefing(input: MorningBriefingInput): Promise<MorningBriefingOutput> {
    if (!this.client) {
      throw new Error('OpenAI provider not initialized. Please set your API key.')
    }

    const userPrompt = this.formatMorningBriefingContext(input)

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: MORNING_BRIEFING_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    })

    const text = response.choices[0]?.message?.content || ''
    return this.parseJsonResponse<MorningBriefingOutput>(text, {
      signalTasks: [],
      briefing: 'Unable to generate briefing.',
      warnings: [],
    })
  }

  async generateEveningReview(input: EveningReviewInput): Promise<EveningReviewOutput> {
    if (!this.client) {
      throw new Error('OpenAI provider not initialized. Please set your API key.')
    }

    const userPrompt = this.formatEveningReviewContext(input)

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: EVENING_REVIEW_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    })

    const text = response.choices[0]?.message?.content || ''
    return this.parseJsonResponse<EveningReviewOutput>(text, {
      summary: { completed: 0, total: 0, focusMinutes: 0, driftMinutes: 0 },
      analysis: 'Unable to generate review.',
      wins: [],
      improvements: [],
      carryover: [],
      tomorrowFocus: '',
    })
  }

  async parseTasks(text: string, existingGoals?: Goal[]): Promise<TaskParserOutput> {
    if (!this.client) {
      throw new Error('OpenAI provider not initialized. Please set your API key.')
    }

    let context = `Parse the following text into tasks:\n\n"${text}"`
    if (existingGoals && existingGoals.length > 0) {
      context += `\n\nExisting goals to match against:\n${existingGoals.map((g) => `- ${g.title}`).join('\n')}`
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 512,
      messages: [
        { role: 'system', content: TASK_PARSER_PROMPT },
        { role: 'user', content: context },
      ],
    })

    const responseText = response.choices[0]?.message?.content || ''
    return this.parseJsonResponse<TaskParserOutput>(responseText, {
      tasks: [],
      unparsed: text,
    })
  }

  async processPlan(rawPlan: string, context?: string): Promise<ProcessedPlan> {
    if (!this.client) {
      throw new Error('OpenAI provider not initialized. Please set your API key.')
    }

    let userPrompt = `## Plan Input\n\n${rawPlan}`
    if (context) {
      userPrompt += `\n\n## Additional Context\n${context}`
    }

    // Use gpt-4o-mini for fast, cheap processing (similar to Haiku)
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 4096,
      messages: [
        { role: 'system', content: PLAN_PROCESSOR_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    })

    const text = response.choices[0]?.message?.content || ''
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

  async generateNudge(
    driftMinutes: number,
    currentApp: string,
    activeTask?: Task
  ): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI provider not initialized. Please set your API key.')
    }

    let context = `Drift duration: ${driftMinutes} minutes\nCurrent app: ${currentApp}`
    if (activeTask) {
      context += `\nActive signal task: ${activeTask.title}`
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 100,
      messages: [
        { role: 'system', content: DRIFT_NUDGE_PROMPT },
        { role: 'user', content: context },
      ],
    })

    return response.choices[0]?.message?.content?.trim() || 'Time to refocus?'
  }

  async chat(input: ChatInput): Promise<ChatResponse> {
    if (!this.client) {
      throw new Error('OpenAI provider not initialized. Please set your API key.')
    }

    // Build system message with context
    let systemPrompt = CHAT_PROMPT
    if (input.context) {
      systemPrompt += '\n\n' + this.formatChatContext(input.context)
    }

    // Note: MVP doesn't include tools for OpenAI
    // Add this message to let AI know it can't manage tasks directly
    systemPrompt += `\n\n## Note
You are using the OpenAI provider which doesn't yet support task management tools.
If the user asks you to manage tasks (complete, create, update), explain that
you can't directly modify tasks yet, but you can advise them on what to do.`

    // Build conversation messages
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...input.conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: input.message },
    ]

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 1024,
      messages,
    })

    const textContent = response.choices[0]?.message?.content?.trim() || 'Unable to process your request.'

    return {
      message: textContent,
      // No tool calls for OpenAI MVP
      toolCalls: undefined,
    }
  }

  async classifyTaskAction(
    task: Task,
    availableProjects: string[]
  ): Promise<TaskActionPlan> {
    if (!this.client) {
      throw new Error('OpenAI provider not initialized. Please set your API key.')
    }

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

    // Use gpt-4o-mini for fast classification
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 512,
      messages: [
        { role: 'system', content: TASK_ACTION_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    })

    const text = response.choices[0]?.message?.content || ''

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
        contextStr += `${status} [${t.id}] ${t.title}${t.priority >= 4 ? ' [SIGNAL]' : ''}\n`
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
      console.error('[OpenAIProvider] Failed to parse JSON response:', error)
      console.error('[OpenAIProvider] Raw response:', text)
      return fallback
    }
  }
}
