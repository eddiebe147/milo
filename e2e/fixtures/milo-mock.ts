/**
 * Mock window.milo API for Playwright E2E tests
 *
 * This mock provides in-memory implementations of all window.milo methods
 * so that E2E tests can run in a standard browser without Electron IPC.
 */

import type { Page } from '@playwright/test'

// In-memory data stores
interface MockData {
  tasks: Map<string, MockTask>
  categories: Map<string, MockCategory>
  goals: Map<string, MockGoal>
  settings: MockSettings
  onboardingComplete: boolean
}

interface MockTask {
  id: string
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'deferred'
  priority: number
  categoryId: string | null
  startDate: string | null
  endDate: string | null
  estimatedDays: number | null
  daysWorked: number
  lastWorkedDate: string | null
  createdAt: string
  updatedAt: string
}

interface MockCategory {
  id: string
  name: string
  color: string | null
  sortOrder: number
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

interface MockGoal {
  id: string
  title: string
  description: string | null
  timeframe: 'yearly' | 'quarterly' | 'monthly' | 'weekly'
  status: 'active' | 'completed' | 'archived'
  parentId: string | null
  targetDate: string | null
  createdAt: string
  updatedAt: string
}

interface MockSettings {
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
}

function generateId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function now(): string {
  return new Date().toISOString()
}

/**
 * Injects the mock window.milo API into the page
 */
export async function injectMiloMock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Set localStorage to skip onboarding
    localStorage.setItem('milo-onboarding-complete', 'true')
    localStorage.setItem('milo_last_visit_date', new Date().toISOString().split('T')[0])
    localStorage.setItem('milo_morning_context_date', new Date().toISOString().split('T')[0])

    // Initialize in-memory stores
    const data: MockData = {
      tasks: new Map(),
      categories: new Map(),
      goals: new Map(),
      settings: {
        apiKey: 'mock-api-key-for-testing',
        refillMode: 'endless',
        workStartTime: '09:00',
        workEndTime: '17:00',
        workDays: [1, 2, 3, 4, 5],
        monitoringEnabled: false,
        pollingIntervalMs: 5000,
        driftAlertEnabled: false,
        driftAlertDelayMinutes: 5,
        morningBriefingTime: '08:00',
        eveningReviewTime: '18:00',
        alwaysOnTop: false,
        startMinimized: false,
        showInDock: true,
        analyticsEnabled: false,
      },
      onboardingComplete: true, // Skip onboarding by default
    }

    function generateId(): string {
      return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    function now(): string {
      return new Date().toISOString()
    }

    // Create the mock window.milo object
    ;(window as any).milo = {
      // Window controls (no-ops for testing)
      window: {
        minimize: async () => {},
        close: async () => {},
        toggleAlwaysOnTop: async () => data.settings.alwaysOnTop,
      },

      // Tray control (no-op)
      tray: {
        setState: async () => {},
      },

      // Events (return cleanup functions that do nothing)
      events: {
        onShowMorningBriefing: () => () => {},
        onShowEveningReview: () => () => {},
        onShowSettings: () => () => {},
        onToggleMonitoring: () => () => {},
        onActivityStateChanged: () => () => {},
        onNudgeTriggered: () => () => {},
        onTasksChanged: () => () => {},
      },

      // Goals CRUD
      goals: {
        getAll: async () => Array.from(data.goals.values()),
        getById: async (id: string) => data.goals.get(id),
        getHierarchy: async () => {
          const goals = Array.from(data.goals.values())
          return {
            yearly: goals.filter((g) => g.timeframe === 'yearly'),
            quarterly: goals.filter((g) => g.timeframe === 'quarterly'),
            monthly: goals.filter((g) => g.timeframe === 'monthly'),
            weekly: goals.filter((g) => g.timeframe === 'weekly'),
          }
        },
        create: async (goal: Omit<MockGoal, 'id' | 'createdAt' | 'updatedAt'>) => {
          const newGoal: MockGoal = {
            ...goal,
            id: generateId(),
            createdAt: now(),
            updatedAt: now(),
          }
          data.goals.set(newGoal.id, newGoal)
          return newGoal
        },
        update: async (id: string, updates: Partial<MockGoal>) => {
          const goal = data.goals.get(id)
          if (!goal) return null
          const updated = { ...goal, ...updates, updatedAt: now() }
          data.goals.set(id, updated)
          return updated
        },
        delete: async (id: string) => {
          return data.goals.delete(id)
        },
      },

      // Tasks CRUD + workflow
      tasks: {
        getAll: async () => Array.from(data.tasks.values()),
        getToday: async () =>
          Array.from(data.tasks.values()).filter((t) => t.status !== 'completed'),
        getById: async (id: string) => data.tasks.get(id),
        getActive: async () =>
          Array.from(data.tasks.values()).find((t) => t.status === 'in_progress') || null,
        create: async (task: Omit<MockTask, 'id' | 'createdAt' | 'updatedAt'>) => {
          const newTask: MockTask = {
            ...task,
            id: generateId(),
            daysWorked: task.daysWorked || 0,
            lastWorkedDate: task.lastWorkedDate || null,
            createdAt: now(),
            updatedAt: now(),
          }
          data.tasks.set(newTask.id, newTask)
          return newTask
        },
        update: async (id: string, updates: Partial<MockTask>) => {
          const task = data.tasks.get(id)
          if (!task) return null
          const updated = { ...task, ...updates, updatedAt: now() }
          data.tasks.set(id, updated)
          return updated
        },
        delete: async (id: string) => {
          return data.tasks.delete(id)
        },
        start: async (id: string) => {
          const task = data.tasks.get(id)
          if (!task) return null
          // Stop any other in-progress tasks
          for (const [, t] of data.tasks) {
            if (t.status === 'in_progress' && t.id !== id) {
              t.status = 'pending'
            }
          }
          const updated = { ...task, status: 'in_progress' as const, updatedAt: now() }
          data.tasks.set(id, updated)
          return updated
        },
        complete: async (id: string) => {
          const task = data.tasks.get(id)
          if (!task) return null
          const updated = { ...task, status: 'completed' as const, updatedAt: now() }
          data.tasks.set(id, updated)
          return updated
        },
        defer: async (id: string) => {
          const task = data.tasks.get(id)
          if (!task) return null
          const updated = { ...task, status: 'deferred' as const, updatedAt: now() }
          data.tasks.set(id, updated)
          return updated
        },
        getAllIncomplete: async () =>
          Array.from(data.tasks.values()).filter(
            (t) => t.status !== 'completed' && t.status !== 'deferred'
          ),
        getByCategory: async (categoryId: string) =>
          Array.from(data.tasks.values()).filter((t) => t.categoryId === categoryId),
        getSignalQueue: async (limit = 5) => {
          const tasks = Array.from(data.tasks.values())
            .filter((t) => t.status !== 'completed' && t.status !== 'deferred')
            .sort((a, b) => {
              // In-progress first, then by priority
              if (a.status === 'in_progress' && b.status !== 'in_progress') return -1
              if (b.status === 'in_progress' && a.status !== 'in_progress') return 1
              return a.priority - b.priority
            })
          return tasks.slice(0, limit)
        },
        getBacklog: async (signalQueueIds: string[]) =>
          Array.from(data.tasks.values()).filter(
            (t) =>
              !signalQueueIds.includes(t.id) &&
              t.status !== 'completed' &&
              t.status !== 'deferred'
          ),
        getWorkedYesterday: async () => [],
        recordWork: async (id: string) => {
          const task = data.tasks.get(id)
          if (!task) return null
          const updated = {
            ...task,
            daysWorked: task.daysWorked + 1,
            lastWorkedDate: now(),
            updatedAt: now(),
          }
          data.tasks.set(id, updated)
          return updated
        },
        reorderSignalQueue: async () => {},
      },

      // Categories CRUD
      categories: {
        getAll: async () => Array.from(data.categories.values()),
        getActive: async () =>
          Array.from(data.categories.values()).filter((c) => !c.isArchived),
        getById: async (id: string) => data.categories.get(id) || null,
        create: async (category: Omit<MockCategory, 'id' | 'createdAt' | 'updatedAt'>) => {
          const newCategory: MockCategory = {
            ...category,
            id: generateId(),
            createdAt: now(),
            updatedAt: now(),
          }
          data.categories.set(newCategory.id, newCategory)
          return newCategory
        },
        update: async (id: string, updates: Partial<MockCategory>) => {
          const category = data.categories.get(id)
          if (!category) return null
          const updated = { ...category, ...updates, updatedAt: now() }
          data.categories.set(id, updated)
          return updated
        },
        delete: async (id: string) => {
          return data.categories.delete(id)
        },
        reorder: async () => {},
      },

      // Activity (return empty/default data)
      activity: {
        getToday: async () => [],
        getSummary: async () => ({ green: 0, amber: 0, red: 0, total: 0 }),
        getAppBreakdown: async () => [],
      },

      // Classifications
      classifications: {
        getAll: async () => [],
        upsert: async () => null,
      },

      // Scores
      scores: {
        getToday: async () => null,
        getRecent: async () => [],
        getCurrentStreak: async () => 0,
        calculate: async () => ({
          date: now().split('T')[0],
          score: 0,
          signalMinutes: 0,
          noiseMinutes: 0,
          adjacentMinutes: 0,
          tasksCompleted: 0,
          tasksTotal: 0,
          streak: 0,
        }),
        getBreakdown: async () => ({
          score: 0,
          breakdown: { signalRatio: 0, taskCompletionRatio: 0, streakBonus: 0, finalScore: 0 },
          summary: {
            signalMinutes: 0,
            noiseMinutes: 0,
            adjacentMinutes: 0,
            totalMinutes: 0,
            tasksCompleted: 0,
            tasksTotal: 0,
            streak: 0,
          },
        }),
      },

      // Monitoring (no-ops)
      monitoring: {
        start: async () => {},
        stop: async () => {},
        pause: async () => {},
        resume: async () => {},
        toggle: async () => false,
        status: async () => ({
          isPaused: false,
          currentApp: null,
          currentState: 'adjacent',
          stateMinutes: 0,
        }),
      },

      // AI (mock responses)
      ai: {
        initialize: async () => true,
        isInitialized: async () => true,
        morningBriefing: async () => ({ summary: 'Mock morning briefing' }),
        eveningReview: async () => ({ summary: 'Mock evening review' }),
        parseTasks: async () => ({ tasks: [] }),
        generateNudge: async () => 'Mock nudge message',
        processPlan: async () => ({ goals: [], tasks: [] }),
        chat: async () => 'Mock chat response',
      },

      // Plan
      plan: {
        apply: async () => ({
          success: true,
          goalsCreated: 0,
          tasksCreated: 0,
          goalIds: [],
          taskIds: [],
        }),
      },

      // Nudge
      nudge: {
        getConfig: async () => ({
          firstNudgeThresholdMs: 300000,
          nudgeCooldownMs: 600000,
          showSystemNotifications: false,
          aiNudgesEnabled: false,
        }),
        setConfig: async () => {},
        getDriftStatus: async () => ({
          isInDriftState: false,
          currentDriftMinutes: 0,
          totalDriftMinutesToday: 0,
          nudgeCount: 0,
          currentApp: '',
        }),
      },

      // Task execution
      taskExecution: {
        classifyTask: async () => ({ type: 'manual', reason: 'Mock' }),
        executeTask: async () => ({ success: true }),
        executeWithTarget: async () => ({ success: true }),
        generatePrompt: async () => ({ prompt: 'Mock prompt', projectPath: null }),
        getAvailableProjects: async () => [],
        hasClaudeCli: async () => false,
      },

      // Settings
      settings: {
        get: async () => data.settings,
        getApiKey: async () => data.settings.apiKey,
        saveApiKey: async (key: string | null) => {
          data.settings.apiKey = key
          return true
        },
        getRefillMode: async () => data.settings.refillMode,
        saveRefillMode: async (mode: 'endless' | 'daily_reset') => {
          data.settings.refillMode = mode
          return true
        },
        update: async (updates: Record<string, unknown>) => {
          Object.assign(data.settings, updates)
          return true
        },
        getThemeColors: async () => ({
          themePrimaryColor: '#3B82F6',
          themeAccentColor: '#10B981',
          themeDangerColor: '#EF4444',
          themeUserMessageColor: '#3B82F6',
          themeAiMessageColor: '#6B7280',
        }),
        setThemeColor: async () => true,
        setThemeColors: async () => true,
      },

      // Analytics
      analytics: {
        isEnabled: async () => false,
        isAvailable: async () => false,
        enable: async () => true,
        disable: async () => true,
      },

      // Chat
      chat: {
        getAllConversations: async () => [],
        getConversation: async () => null,
        createConversation: async (title = 'New Conversation') => ({
          id: generateId(),
          title,
          createdAt: now(),
          updatedAt: now(),
        }),
        updateConversationTitle: async () => true,
        deleteConversation: async () => true,
        autoTitleConversation: async () => null,
        getMessages: async () => [],
        addMessage: async (conversationId: string, role: 'user' | 'assistant', content: string) => ({
          id: generateId(),
          conversationId,
          role,
          content,
          createdAt: now(),
        }),
        deleteMessage: async () => true,
      },
    }

    console.log('[E2E] Mock window.milo API injected')
  })
}

/**
 * Creates a test project (category) via the mock API
 */
export async function createTestProject(page: Page, name: string): Promise<string> {
  const result = await page.evaluate(async (projectName) => {
    const category = await (window as any).milo.categories.create({
      name: projectName,
      color: '#3B82F6',
      sortOrder: 0,
      isArchived: false,
    })
    return category?.id || null
  }, name)

  if (!result) throw new Error(`Failed to create test project: ${name}`)
  return result
}

/**
 * Creates a test task via the mock API
 */
export async function createTestTask(
  page: Page,
  title: string,
  categoryId?: string
): Promise<string> {
  const result = await page.evaluate(
    async ({ taskTitle, catId }) => {
      const task = await (window as any).milo.tasks.create({
        title: taskTitle,
        description: null,
        status: 'pending',
        priority: 3,
        categoryId: catId || null,
        startDate: null,
        endDate: null,
        estimatedDays: null,
        daysWorked: 0,
        lastWorkedDate: null,
      })
      return task?.id || null
    },
    { taskTitle: title, catId: categoryId }
  )

  if (!result) throw new Error(`Failed to create test task: ${title}`)
  return result
}
