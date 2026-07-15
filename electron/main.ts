import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, session, systemPreferences } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  initDatabase,
  closeDatabase,
  activityMonitor,
  detectState,
  scoringEngine,
  nudgeManager,
  checkForUpdates,
  getCurrentVersion,
  briefScheduler,
  calendarService,
} from './services'
import * as analytics from './services/analytics'
import {
  goalsRepository,
  tasksRepository,
  categoriesRepository,
  projectsRepository,
  activityRepository,
  scoresRepository,
  classificationsRepository,
  settingsRepository,
  chatRepository,
} from './repositories'
import {
  getActiveProvider,
  initializeProvider,
  PROVIDER_MODELS,
  DEFAULT_MODELS,
  type AIProviderType,
  type MorningBriefingInput,
  type EveningReviewInput,
} from './ai/providers'
import type { Goal, Task, Project } from '../src/types'
import { taskExecutor, type ExecutionTarget } from './services/TaskExecutor'
import type { ThemeColors } from './repositories/settings'
import {
  formatPortfolioForBriefing,
  readPortfolio,
  scanPortfolio,
  proposePortfolioGoal,
} from './services/PortfolioReader'

// Window references
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 720,
    minWidth: 400,
    minHeight: 600,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000', // Fully transparent
    hasShadow: true,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 12, y: 12 },
    roundedCorners: true, // macOS 11+
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    // Open DevTools for debugging
    mainWindow?.webContents.openDevTools({ mode: 'detach' })
  })

  mainWindow.on('close', (event) => {
    // Hide instead of close on macOS
    if (process.platform === 'darwin') {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  // Load the app
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  // Create a placeholder tray icon (green by default)
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABpSURBVDiNY2AYBUMHMDIw/P/PwMDwHwj/Q9FQDQxAwMjA8J+RgeE/E1jw////DAwMDP8ZGP7/Z2T4/x/iAiYGhv//mRgY/kN0MTIy/GdkZPgPMw1mGCPQECaYK0ZdMAqGBmBkYPg/CgAAd3UXU5T9z1wAAAAASUVORK5CYII='
  )

  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show MILO',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      },
    },
    {
      label: 'Morning Briefing',
      click: () => {
        mainWindow?.webContents.send('show-morning-briefing')
        mainWindow?.show()
      },
    },
    {
      label: 'Evening Review',
      click: () => {
        mainWindow?.webContents.send('show-evening-review')
        mainWindow?.show()
      },
    },
    { type: 'separator' },
    {
      label: 'Pause Monitoring',
      type: 'checkbox',
      checked: false,
      click: (menuItem) => {
        mainWindow?.webContents.send('toggle-monitoring', !menuItem.checked)
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        mainWindow?.webContents.send('show-settings')
        mainWindow?.show()
      },
    },
    { type: 'separator' },
    {
      label: 'Quit MILO',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setToolTip('MILO - Signal-to-Noise Life Planner')
  tray.setContextMenu(contextMenu)

  // Click to show/hide window
  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })
}

// IPC Handlers
function setupIPC(): void {
  // Window controls
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.handle('window:close', () => {
    mainWindow?.hide()
  })

  ipcMain.handle('window:toggle-always-on-top', () => {
    const isAlwaysOnTop = mainWindow?.isAlwaysOnTop()
    mainWindow?.setAlwaysOnTop(!isAlwaysOnTop)
    return !isAlwaysOnTop
  })

  // State indicator for tray
  ipcMain.handle('tray:set-state', (_, state: 'green' | 'amber' | 'red') => {
    // Update tray icon based on state
    console.log(`Tray state: ${state}`)
  })

  // Goals CRUD
  ipcMain.handle('goals:getAll', () => goalsRepository.getAll())
  ipcMain.handle('goals:getById', (_, id: string) => goalsRepository.getById(id))
  ipcMain.handle('goals:getHierarchy', () => goalsRepository.getHierarchy())
  ipcMain.handle('goals:create', (_, goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const created = goalsRepository.create(goal)
    if (created) {
      analytics.trackEvent('goal_created')
    }
    return created
  })
  ipcMain.handle('goals:update', (_, id: string, updates: Partial<Goal>) =>
    goalsRepository.update(id, updates)
  )
  ipcMain.handle('goals:delete', (_, id: string) => goalsRepository.delete(id))

  // Tasks CRUD
  ipcMain.handle('tasks:getAll', () => tasksRepository.getAll())
  ipcMain.handle('tasks:getToday', () => tasksRepository.getToday())
  ipcMain.handle('tasks:getById', (_, id: string) => tasksRepository.getById(id))
  ipcMain.handle('tasks:getActive', () => tasksRepository.getActive())
  ipcMain.handle('tasks:create', async (_, task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const created = await tasksRepository.create(task)
    if (created) {
      analytics.trackEvent('task_created')
    }
    return created
  })
  ipcMain.handle('tasks:update', (_, id: string, updates: Partial<Task>) =>
    tasksRepository.update(id, updates)
  )
  ipcMain.handle('tasks:delete', (_, id: string) => tasksRepository.delete(id))
  ipcMain.handle('tasks:start', (_, id: string) => tasksRepository.start(id))
  ipcMain.handle('tasks:complete', async (_, id: string) => {
    const completed = await tasksRepository.complete(id)
    if (completed) {
      analytics.trackEvent('task_completed')
    }
    return completed
  })
  ipcMain.handle('tasks:defer', (_, id: string) => tasksRepository.defer(id))

  // New task methods for signal queue & continuity
  ipcMain.handle('tasks:getAllIncomplete', () => tasksRepository.getAllIncomplete())
  ipcMain.handle('tasks:getByCategory', (_, categoryId: string) => tasksRepository.getByCategory(categoryId))
  ipcMain.handle('tasks:getByProject', (_, projectId: string) => tasksRepository.getByProject(projectId))
  ipcMain.handle('tasks:getSignalQueue', (_, limit?: number) => tasksRepository.getSignalQueue(limit))
  ipcMain.handle('tasks:getBacklog', (_, signalQueueIds: string[]) => tasksRepository.getBacklog(signalQueueIds))
  ipcMain.handle('tasks:getWorkedYesterday', () => tasksRepository.getWorkedYesterday())
  ipcMain.handle('tasks:recordWork', (_, id: string) => tasksRepository.recordWork(id))
  ipcMain.handle('tasks:reorderSignalQueue', (_, taskIds: string[]) => tasksRepository.reorderSignalQueue(taskIds))


  // Categories CRUD
  ipcMain.handle('categories:getAll', () => categoriesRepository.getAll())
  ipcMain.handle('categories:getActive', () => categoriesRepository.getActive())
  ipcMain.handle('categories:getById', (_, id: string) => categoriesRepository.getById(id))
  ipcMain.handle('categories:create', (_, category) => categoriesRepository.create(category))
  ipcMain.handle('categories:update', (_, id: string, updates) => categoriesRepository.update(id, updates))
  ipcMain.handle('categories:delete', (_, id: string) => categoriesRepository.delete(id))
  ipcMain.handle('categories:reorder', (_, orderedIds: string[]) => categoriesRepository.reorder(orderedIds))

  // Projects CRUD
  ipcMain.handle('projects:getAll', () => projectsRepository.getAll())
  ipcMain.handle('projects:getActive', () => projectsRepository.getActive())
  ipcMain.handle('projects:getByStatus', (_, status: Project['status']) => projectsRepository.getByStatus(status))
  ipcMain.handle('projects:getById', (_, id: string) => projectsRepository.getById(id))
  ipcMain.handle('projects:getByPath', (_, path: string) => projectsRepository.getByPath(path))
  ipcMain.handle('projects:create', (_, project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    const created = projectsRepository.create(project)
    if (created) {
      analytics.trackEvent('project_created')
    }
    return created
  })
  ipcMain.handle('projects:update', (_, id: string, updates: Partial<Project>) =>
    projectsRepository.update(id, updates)
  )
  ipcMain.handle('projects:delete', (_, id: string) => projectsRepository.delete(id))
  ipcMain.handle('projects:archive', (_, id: string) => projectsRepository.archive(id))
  ipcMain.handle('projects:pause', (_, id: string) => projectsRepository.pause(id))
  ipcMain.handle('projects:activate', (_, id: string) => projectsRepository.activate(id))
  ipcMain.handle('projects:complete', (_, id: string) => projectsRepository.complete(id))
  ipcMain.handle('projects:reorder', (_, orderedIds: string[]) => projectsRepository.reorder(orderedIds))
  ipcMain.handle('projects:search', (_, query: string) => projectsRepository.search(query))


  // Activity & Classifications
  ipcMain.handle('activity:getToday', () => activityRepository.getToday())
  ipcMain.handle('activity:getSummary', (_, date: string) => activityRepository.getSummary(date))
  ipcMain.handle('activity:getAppBreakdown', (_, date: string) => activityRepository.getAppBreakdown(date))
  ipcMain.handle('classifications:getAll', () => classificationsRepository.getAll())
  ipcMain.handle('classifications:upsert', (_, classification) =>
    classificationsRepository.upsert(classification)
  )

  // Scores
  ipcMain.handle('scores:getToday', () => scoresRepository.getToday())
  ipcMain.handle('scores:getRecent', (_, days: number) => scoresRepository.getRecent(days))
  ipcMain.handle('scores:getCurrentStreak', () => scoresRepository.getCurrentStreak())
  ipcMain.handle('scores:calculate', () => scoringEngine.getTodayScore())
  ipcMain.handle('scores:getBreakdown', (_, date: string) => scoringEngine.getScoreBreakdown(date))

  // Activity monitoring
  ipcMain.handle('monitoring:start', () => activityMonitor.start())
  ipcMain.handle('monitoring:stop', () => activityMonitor.stop())
  ipcMain.handle('monitoring:pause', () => activityMonitor.pause())
  ipcMain.handle('monitoring:resume', () => activityMonitor.resume())
  ipcMain.handle('monitoring:toggle', () => activityMonitor.togglePause())
  ipcMain.handle('monitoring:status', () => activityMonitor.getStatus())

  // AI Provider integration
  ipcMain.handle('ai:initialize', (_, apiKey: string, provider?: AIProviderType, model?: string) => {
    const providerType = provider || settingsRepository.getApiProvider()
    const modelId = model || settingsRepository.getApiModel() || undefined
    initializeProvider(providerType, apiKey, modelId)
    return getActiveProvider()?.isInitialized() ?? false
  })

  ipcMain.handle('ai:isInitialized', () => getActiveProvider()?.isInitialized() ?? false)

  // AI Provider settings
  ipcMain.handle('ai:getProviderType', () => {
    const provider = getActiveProvider()
    return provider?.type ?? settingsRepository.getApiProvider()
  })

  ipcMain.handle('ai:getModel', () => {
    const provider = getActiveProvider()
    return provider?.getModel() ?? settingsRepository.getApiModel()
  })

  ipcMain.handle('ai:getProviderModels', (_, providerType: AIProviderType) => {
    return PROVIDER_MODELS[providerType] || []
  })

  ipcMain.handle('ai:getDefaultModel', (_, providerType: AIProviderType) => {
    return DEFAULT_MODELS[providerType]
  })

  ipcMain.handle('ai:morningBriefing', async (_, input: MorningBriefingInput) => {
    const provider = getActiveProvider()
    if (!provider) throw new Error('AI provider not initialized. Please set your API key.')
    try {
      analytics.trackEvent('morning_briefing_started')

      let portfolioContext = ''
      try {
        portfolioContext = formatPortfolioForBriefing()
      } catch (err) {
        console.warn('[IPC] Portfolio context unavailable:', err)
      }

      const enrichedInput: MorningBriefingInput = { ...input, portfolioContext }
      const result = await provider.generateMorningBriefing(enrichedInput)
      analytics.trackEvent('morning_briefing_completed')
      return result
    } catch (error) {
      console.error('[IPC] Morning briefing error:', error)
      analytics.trackError('error_api', error as Error, { operation: 'morning_briefing' })
      throw error
    }
  })

  ipcMain.handle('portfolio:getSnapshot', () => readPortfolio())
  ipcMain.handle('portfolio:scan', (_, dryRun: boolean = false) => scanPortfolio(undefined, dryRun))
  ipcMain.handle('portfolio:propose', (_, proposal: Parameters<typeof proposePortfolioGoal>[0]) => {
    proposePortfolioGoal(proposal)
    return { success: true }
  })

  ipcMain.handle('ai:eveningReview', async (_, input: EveningReviewInput) => {
    const provider = getActiveProvider()
    if (!provider) throw new Error('AI provider not initialized. Please set your API key.')
    try {
      analytics.trackEvent('evening_review_started')
      const result = await provider.generateEveningReview(input)
      analytics.trackEvent('evening_review_completed')
      return result
    } catch (error) {
      console.error('[IPC] Evening review error:', error)
      analytics.trackError('error_api', error as Error, { operation: 'evening_review' })
      throw error
    }
  })

  ipcMain.handle('ai:parseTasks', async (_, text: string) => {
    const provider = getActiveProvider()
    if (!provider) throw new Error('AI provider not initialized. Please set your API key.')
    try {
      const goals = goalsRepository.getAll()
      return await provider.parseTasks(text, goals)
    } catch (error) {
      console.error('[IPC] Task parsing error:', error)
      throw error
    }
  })

  ipcMain.handle('ai:generateNudge', async (_, driftMinutes: number, currentApp: string) => {
    const provider = getActiveProvider()
    if (!provider) throw new Error('AI provider not initialized. Please set your API key.')
    try {
      const activeTask = tasksRepository.getActive()
      return await provider.generateNudge(driftMinutes, currentApp, activeTask || undefined)
    } catch (error) {
      console.error('[IPC] Nudge generation error:', error)
      throw error
    }
  })

  // Plan processing
  ipcMain.handle('ai:processPlan', async (_, rawPlan: string, context?: string) => {
    const provider = getActiveProvider()
    if (!provider) throw new Error('AI provider not initialized. Please set your API key.')
    try {
      return await provider.processPlan(rawPlan, context)
    } catch (error) {
      console.error('[IPC] Plan processing error:', error)
      throw error
    }
  })

  // Chat with MILO - now with tool execution
  ipcMain.handle('ai:chat', async (_, input: { message: string; conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>; activeProjectId?: string | null }) => {
    const provider = getActiveProvider()
    if (!provider) throw new Error('AI provider not initialized. Please set your API key.')
    try {
      // Gather context - include task IDs for tool matching
      const goals = goalsRepository.getAll()
      const todayTasks = tasksRepository.getToday()
      const allIncompleteTasks = tasksRepository.getAllIncomplete()
      const activeTask = tasksRepository.getActive()
      const dailyScore = scoresRepository.getToday()
      const categories = categoriesRepository.getActive()

      // Get activity summary
      const today = new Date().toISOString().split('T')[0]
      const activitySummary = activityRepository.getSummary(today)

      // Use all incomplete tasks for better context matching
      const tasksForContext = allIncompleteTasks.length > 0 ? allIncompleteTasks : todayTasks

      let portfolioContext = ''
      try {
        portfolioContext = formatPortfolioForBriefing()
      } catch (err) {
        console.warn('[IPC] Portfolio context unavailable for chat:', err)
      }

      const response = await provider.chat({
        message: input.message,
        conversationHistory: input.conversationHistory,
        context: {
          goals,
          todayTasks: tasksForContext,
          activeTask: activeTask || undefined,
          dailyScore: dailyScore || undefined,
          activitySummary: {
            greenMinutes: activitySummary.green,
            amberMinutes: activitySummary.amber,
            redMinutes: activitySummary.red,
          },
          // Add categories context for task assignment
          categories,
          activeProjectId: input.activeProjectId,
          portfolioContext,
        },
      })

      // Helper to resolve task ID - tries ID first, then searches by title
      const resolveTaskId = (taskIdOrTitle: string): string | null => {
        // First try as-is (exact ID match)
        const byId = tasksRepository.getById(taskIdOrTitle)
        if (byId) return taskIdOrTitle

        // Try searching all tasks for a title match
        const allTasks = [...allIncompleteTasks, ...todayTasks]
        const byTitle = allTasks.find(t =>
          t.title.toLowerCase() === taskIdOrTitle.toLowerCase() ||
          t.title.toLowerCase().includes(taskIdOrTitle.toLowerCase())
        )
        if (byTitle) {
          console.log(`[IPC] Resolved task by title: "${taskIdOrTitle}" → ${byTitle.id}`)
          return byTitle.id
        }

        return null
      }

      // Execute any tool calls
      const toolResults: string[] = []
      let tasksModified = false

      if (response.toolCalls) {
        for (const toolCall of response.toolCalls) {
          try {
            let result = ''
            const input = toolCall.input

            switch (toolCall.name) {
              case 'complete_task': {
                const taskIdOrTitle = input.task_id as string
                const resolvedId = resolveTaskId(taskIdOrTitle)
                if (!resolvedId) {
                  result = `Task not found: ${taskIdOrTitle}`
                  break
                }
                const task = tasksRepository.complete(resolvedId)
                result = task ? `Completed: ${task.title}` : `Failed to complete task`
                tasksModified = true
                break
              }
              case 'update_task_priority': {
                const taskIdOrTitle = input.task_id as string
                const resolvedId = resolveTaskId(taskIdOrTitle)
                if (!resolvedId) {
                  result = `Task not found: ${taskIdOrTitle}`
                  break
                }
                const priority = input.priority as number
                const task = tasksRepository.update(resolvedId, { priority })
                result = task ? `Updated priority for "${task.title}" to ${priority}` : `Failed to update task`
                tasksModified = true
                break
              }
              case 'update_task_status': {
                const taskIdOrTitle = input.task_id as string
                const resolvedId = resolveTaskId(taskIdOrTitle)
                if (!resolvedId) {
                  result = `Task not found: ${taskIdOrTitle}`
                  break
                }
                const status = input.status as string
                const task = tasksRepository.update(resolvedId, { status: status as 'pending' | 'in_progress' | 'completed' | 'deferred' })
                result = task ? `Updated status for "${task.title}" to ${status}` : `Failed to update task`
                tasksModified = true
                break
              }
              case 'create_task': {
                const today = new Date().toISOString().split('T')[0]
                const task = tasksRepository.create({
                  title: input.title as string,
                  description: (input.description as string) || undefined,
                  priority: (input.priority as number) || 3,
                  categoryId: (input.category_id as string) || undefined,
                  status: 'pending',
                  goalId: null,
                  scheduledDate: today,
                  estimatedDays: 1,
                  rationale: undefined,
                })
                result = `Created task: ${task.title}`
                tasksModified = true
                break
              }
              case 'delete_task': {
                const taskIdOrTitle = input.task_id as string
                const resolvedId = resolveTaskId(taskIdOrTitle)
                if (!resolvedId) {
                  result = `Task not found: ${taskIdOrTitle}`
                  break
                }
                const task = tasksRepository.getById(resolvedId)
                const deleted = tasksRepository.delete(resolvedId)
                result = deleted && task ? `Deleted: ${task.title}` : `Failed to delete task`
                tasksModified = true
                break
              }
              case 'start_task': {
                const taskIdOrTitle = input.task_id as string
                const resolvedId = resolveTaskId(taskIdOrTitle)
                if (!resolvedId) {
                  result = `Task not found: ${taskIdOrTitle}`
                  break
                }
                const task = tasksRepository.start(resolvedId)
                result = task ? `Started: ${task.title}` : `Failed to start task`
                tasksModified = true
                break
              }
              case 'defer_task': {
                const taskIdOrTitle = input.task_id as string
                const resolvedId = resolveTaskId(taskIdOrTitle)
                if (!resolvedId) {
                  result = `Task not found: ${taskIdOrTitle}`
                  break
                }
                const task = tasksRepository.defer(resolvedId)
                result = task ? `Deferred: ${task.title}` : `Failed to defer task`
                tasksModified = true
                break
              }
              // Project/Category management tools
              case 'move_task_to_project': {
                const taskIdOrTitle = input.task_id as string
                const categoryId = input.category_id as string
                const resolvedId = resolveTaskId(taskIdOrTitle)
                if (!resolvedId) {
                  result = `Task not found: ${taskIdOrTitle}`
                  break
                }
                // Verify category exists
                const category = categoriesRepository.getById(categoryId)
                if (!category) {
                  result = `Project not found: ${categoryId}`
                  break
                }
                const task = tasksRepository.update(resolvedId, { categoryId })
                result = task ? `Moved "${task.title}" to project "${category.name}"` : `Failed to move task`
                tasksModified = true
                break
              }
              case 'get_projects': {
                const projects = categoriesRepository.getActive()
                if (projects.length === 0) {
                  result = 'No projects found. You can create one with create_project.'
                } else {
                  result = 'Available projects:\n' + projects.map(p => `- [${p.id}] ${p.name}`).join('\n')
                }
                break
              }
              case 'create_project': {
                const name = input.name as string
                const color = (input.color as string) || '#00FF00'
                const existingProjects = categoriesRepository.getAll()
                const newProject = categoriesRepository.create({
                  name,
                  color,
                  sortOrder: existingProjects.length,
                  isActive: true,
                })
                result = newProject ? `Created project "${newProject.name}" [${newProject.id}]` : 'Failed to create project'
                tasksModified = true // Trigger UI refresh
                break
              }
              case 'get_orphaned_tasks': {
                const allTasks = tasksRepository.getAllIncomplete()
                const orphaned = allTasks.filter(t => !t.categoryId)
                if (orphaned.length === 0) {
                  result = 'No orphaned tasks found. All tasks are assigned to projects.'
                } else {
                  result = `Found ${orphaned.length} orphaned task(s):\n` + orphaned.map(t => `- [${t.id}] ${t.title}`).join('\n')
                }
                break
              }
              default:
                result = `Unknown tool: ${toolCall.name}`
            }

            toolResults.push(result)
            console.log(`[IPC] Tool executed: ${toolCall.name} → ${result}`)
          } catch (toolError) {
            console.error(`[IPC] Tool error (${toolCall.name}):`, toolError)
            toolResults.push(`Error: ${toolCall.name} failed`)
          }
        }
      }

      // Notify renderer to refresh tasks if any were modified
      if (tasksModified && mainWindow) {
        mainWindow.webContents.send('tasks-changed')
      }

      // Combine message with tool results
      let finalMessage = response.message
      if (toolResults.length > 0) {
        const toolSummary = toolResults.join('\n')
        finalMessage = finalMessage
          ? `${finalMessage}\n\n✓ Actions taken:\n${toolSummary}`
          : `✓ Actions taken:\n${toolSummary}`
      }

      return finalMessage
    } catch (error) {
      console.error('[IPC] Chat error:', error)
      throw error
    }
  })

  // Apply processed plan (create goals and tasks)
  ipcMain.handle('plan:apply', async (_, processedPlan) => {
    try {
      const createdGoalIds: string[] = []
      const createdTaskIds: string[] = []

      // Create goals first
      for (const goalData of processedPlan.goals) {
        const goal = goalsRepository.create({
          title: goalData.title,
          description: goalData.description,
          timeframe: goalData.timeframe,
          targetDate: goalData.suggestedDeadline,
          status: 'active',
          parentId: null,
        })
        createdGoalIds.push(goal.id)
      }

      // Create tasks linked to goals
      for (const taskData of processedPlan.tasks) {
        const task = tasksRepository.create({
          title: taskData.title,
          description: taskData.description,
          status: 'pending',
          priority: taskData.priority === 'high' ? 5 : taskData.priority === 'medium' ? 3 : 1,
          scheduledDate: taskData.dueDate || new Date().toISOString().split('T')[0],
          goalId: taskData.goalIndex !== null && createdGoalIds[taskData.goalIndex]
            ? createdGoalIds[taskData.goalIndex]
            : null,
        })
        createdTaskIds.push(task.id)
      }

      analytics.trackEvent('plan_imported', {
        goalsCreated: createdGoalIds.length,
        tasksCreated: createdTaskIds.length,
      })

      return {
        success: true,
        goalsCreated: createdGoalIds.length,
        tasksCreated: createdTaskIds.length,
        goalIds: createdGoalIds,
        taskIds: createdTaskIds,
      }
    } catch (error) {
      console.error('[IPC] Plan apply error:', error)
      analytics.trackError('error_api', error as Error, { operation: 'plan_apply' })
      throw error
    }
  })

  // Nudge management
  ipcMain.handle('nudge:getConfig', () => nudgeManager.getConfig())
  ipcMain.handle('nudge:setConfig', (_, config) => nudgeManager.setConfig(config))
  ipcMain.handle('nudge:getDriftStatus', () => nudgeManager.getDriftStatus())

  // Settings management
  ipcMain.handle('settings:get', () => settingsRepository.get())
  ipcMain.handle('settings:getApiKey', () => settingsRepository.getApiKey())
  ipcMain.handle('settings:saveApiKey', (_, apiKey: string | null) => {
    settingsRepository.saveApiKey(apiKey)
    // Initialize provider if API key is provided
    if (apiKey) {
      const providerType = settingsRepository.getApiProvider()
      const model = settingsRepository.getApiModel() || undefined
      initializeProvider(providerType, apiKey, model)
      console.log(`[Settings] ${providerType} provider initialized with saved API key`)
    }
    return true
  })

  // Full AI settings save (provider, model, and key)
  ipcMain.handle('settings:saveAiSettings', (_, settings: { apiKey?: string | null; apiProvider?: AIProviderType; apiModel?: string | null }) => {
    settingsRepository.saveAiSettings(settings)
    // Re-initialize provider if we have an API key
    const currentSettings = settingsRepository.getAiSettings()
    if (currentSettings.apiKey) {
      initializeProvider(
        currentSettings.apiProvider,
        currentSettings.apiKey,
        currentSettings.apiModel || undefined
      )
      console.log(`[Settings] ${currentSettings.apiProvider} provider initialized`)
    }
    return true
  })

  ipcMain.handle('settings:getAiSettings', () => {
    return settingsRepository.getAiSettings()
  })
  ipcMain.handle('settings:getRefillMode', () => settingsRepository.getRefillMode())
  ipcMain.handle('settings:saveRefillMode', (_, mode: 'endless' | 'daily_reset') => {
    settingsRepository.saveRefillMode(mode)
    return true
  })
  ipcMain.handle('settings:update', (_, updates) => {
    settingsRepository.update(updates)
    return true
  })
  ipcMain.handle('settings:getThemeColors', () => settingsRepository.getThemeColors())
  ipcMain.handle('settings:setThemeColor', (_, key: keyof ThemeColors, value: string) => {
    settingsRepository.setThemeColor(key, value)
    return true
  })
  ipcMain.handle('settings:setThemeColors', (_, colors) => {
    settingsRepository.setThemeColors(colors)
    return true
  })

  // Analytics management
  ipcMain.handle('analytics:isEnabled', () => analytics.isAnalyticsEnabled())
  ipcMain.handle('analytics:isAvailable', () => analytics.isAnalyticsAvailable())
  ipcMain.handle('analytics:enable', () => {
    analytics.enableAnalytics()
    return true
  })
  ipcMain.handle('analytics:disable', () => {
    analytics.disableAnalytics()
    return true
  })

  // Update checker
  ipcMain.handle('updates:check', () => checkForUpdates())
  ipcMain.handle('updates:getVersion', () => getCurrentVersion())

  // Briefing management
  ipcMain.handle('briefing:getStatus', () => briefScheduler.getStatus())
  ipcMain.handle('briefing:triggerMorning', () => {
    briefScheduler.triggerManualBrief('morning')
    analytics.trackEvent('morning_briefing_manual')
    return true
  })
  ipcMain.handle('briefing:triggerEvening', () => {
    briefScheduler.triggerManualBrief('evening')
    analytics.trackEvent('evening_review_manual')
    return true
  })
  ipcMain.handle('briefing:setEnabled', (_, enabled: boolean) => {
    briefScheduler.setEnabled(enabled)
    return true
  })
  ipcMain.handle('briefing:getConfig', () => settingsRepository.getBriefingConfig())
  ipcMain.handle('briefing:updateConfig', (_, config) => {
    settingsRepository.updateBriefingConfig(config)
    return true
  })
  ipcMain.handle('briefing:getCalendarConfig', () => settingsRepository.getCalendarConfig())
  ipcMain.handle('briefing:updateCalendarConfig', (_, config) => {
    settingsRepository.updateCalendarConfig(config)
    return true
  })

  // Calendar integration
  ipcMain.handle('calendar:getStatus', () => calendarService.getStatus())
  ipcMain.handle('calendar:getDaySchedule', async () => {
    try {
      return await calendarService.getDaySchedule()
    } catch (error) {
      console.error('[IPC] Calendar getDaySchedule error:', error)
      return { events: [], freeBlocks: [], busyMinutes: 0, freeMinutes: 0 }
    }
  })
  ipcMain.handle('calendar:getTodayEvents', async () => {
    try {
      return await calendarService.getTodayEvents()
    } catch (error) {
      console.error('[IPC] Calendar getTodayEvents error:', error)
      return []
    }
  })
  ipcMain.handle('calendar:connectGoogle', async () => {
    try {
      return await calendarService.startGoogleAuth()
    } catch (error) {
      console.error('[IPC] Calendar connectGoogle error:', error)
      return { success: false, error: 'Failed to start OAuth flow' }
    }
  })
  ipcMain.handle('calendar:disconnectGoogle', () => {
    calendarService.disconnectGoogle()
    return true
  })

  // Task execution (smart task automation)
  ipcMain.handle('taskExecution:classifyTask', async (_, taskId: string) => {
    const provider = getActiveProvider()
    if (!provider) throw new Error('AI provider not initialized. Please set your API key.')
    try {
      const task = tasksRepository.getById(taskId)
      if (!task) {
        throw new Error(`Task not found: ${taskId}`)
      }
      const projects = taskExecutor.getProjects()
      return await provider.classifyTaskAction(task, projects)
    } catch (error) {
      console.error('[IPC] Task classification error:', error)
      throw error
    }
  })

  ipcMain.handle('taskExecution:executeTask', async (_, taskId: string) => {
    const provider = getActiveProvider()
    if (!provider) throw new Error('AI provider not initialized. Please set your API key.')
    try {
      const task = tasksRepository.getById(taskId)
      if (!task) {
        throw new Error(`Task not found: ${taskId}`)
      }

      // First, classify the task
      const projects = taskExecutor.getProjects()
      const actionPlan = await provider.classifyTaskAction(task, projects)

      // Then execute based on the plan
      return await taskExecutor.execute(actionPlan, task)
    } catch (error) {
      console.error('[IPC] Task execution error:', error)
      throw error
    }
  })

  ipcMain.handle('taskExecution:getAvailableProjects', () => {
    return taskExecutor.getProjects()
  })

  ipcMain.handle('taskExecution:hasClaudeCli', () => {
    return taskExecutor.hasClaudeCli()
  })

  // New modal-based execution methods
  ipcMain.handle('taskExecution:executeWithTarget', async (_, target: ExecutionTarget, prompt: string, projectPath: string | null) => {
    try {
      return await taskExecutor.executeWithTarget(target, prompt, projectPath)
    } catch (error) {
      console.error('[IPC] Execute with target error:', error)
      throw error
    }
  })

  ipcMain.handle('taskExecution:generatePrompt', async (_, taskId: string) => {
    try {
      const task = tasksRepository.getById(taskId)
      if (!task) {
        throw new Error(`Task not found: ${taskId}`)
      }

      // Find the best project path for this task
      const projectPath = await taskExecutor.findProjectForTask(task)

      // Generate the prompt
      const prompt = await taskExecutor.generateTaskPrompt(task, projectPath)

      return { prompt, projectPath }
    } catch (error) {
      console.error('[IPC] Generate prompt error:', error)
      throw error
    }
  })

  // ==================== Chat Conversations & Messages ====================

  // Conversations
  ipcMain.handle('chat:getAllConversations', () => chatRepository.getAllConversations())
  ipcMain.handle('chat:getConversation', (_, id: string) => chatRepository.getConversation(id))
  ipcMain.handle('chat:createConversation', (_, title?: string) => chatRepository.createConversation(title))
  ipcMain.handle('chat:updateConversationTitle', (_, id: string, title: string) => {
    chatRepository.updateConversationTitle(id, title)
    return true
  })
  ipcMain.handle('chat:deleteConversation', (_, id: string) => {
    chatRepository.deleteConversation(id)
    return true
  })
  ipcMain.handle('chat:autoTitleConversation', (_, id: string) => {
    chatRepository.autoTitleConversation(id)
    return chatRepository.getConversation(id)
  })

  // Messages
  ipcMain.handle('chat:getMessages', (_, conversationId: string) => chatRepository.getMessages(conversationId))
  ipcMain.handle('chat:addMessage', (_, conversationId: string, role: 'user' | 'assistant', content: string) => {
    const message = chatRepository.addMessage(conversationId, role, content)
    if (role === 'user') {
      analytics.trackEvent('chat_message_sent')
    }
    return message
  })
  ipcMain.handle('chat:deleteMessage', (_, id: string) => {
    chatRepository.deleteMessage(id)
    return true
  })
}

// Initialize activity monitoring
function initActivityMonitoring(): void {
  // Set the state detector
  activityMonitor.setStateDetector(detectState)

  // Set the main window reference for activity monitor
  if (mainWindow) {
    activityMonitor.setMainWindow(mainWindow)
    nudgeManager.setMainWindow(mainWindow)
    briefScheduler.setMainWindow(mainWindow)
    calendarService.setMainWindow(mainWindow)
  }

  // Wire nudge manager to activity state changes
  activityMonitor.setOnStateChange(({ state, appName }) => {
    nudgeManager.onStateChange(state, appName)
  })

  // Start monitoring
  activityMonitor.start()

  // Start brief scheduler for morning/evening notifications
  briefScheduler.start()

  // Set up periodic nudge check (every 30 seconds)
  setInterval(() => {
    nudgeManager.tick()
  }, 30000)
}

// App lifecycle
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.id8labs.milo')

  // Initialize database
  initDatabase()

  // Auto-initialize AI provider if API key exists in settings
  const aiSettings = settingsRepository.getAiSettings()
  if (aiSettings.apiKey) {
    initializeProvider(
      aiSettings.apiProvider,
      aiSettings.apiKey,
      aiSettings.apiModel || undefined
    )
    console.log(`[Main] ${aiSettings.apiProvider} provider auto-initialized from saved settings`)
  } else {
    console.log('[Main] No API key found - AI provider not initialized')
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Request microphone permissions for voice assistant (macOS)
  if (process.platform === 'darwin') {
    const micStatus = systemPreferences.getMediaAccessStatus('microphone')
    console.log('[Main] Microphone permission status:', micStatus)
    if (micStatus !== 'granted') {
      systemPreferences.askForMediaAccess('microphone').then((granted) => {
        console.log('[Main] Microphone access granted:', granted)
      })
    }
  }

  // Set up permission handler for media access (speech recognition)
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    // Allow media permissions (includes microphone for speech recognition)
    if (permission === 'media') {
      console.log('[Main] Granting permission:', permission)
      callback(true)
    } else {
      callback(true) // Allow other permissions too for now
    }
  })

  // Also handle permission check requests
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    if (permission === 'media') {
      return true
    }
    return true // Allow other checks too
  })

  createTray()
  createWindow()
  setupIPC()

  // Initialize task executor (detects Claude CLI, discovers projects)
  taskExecutor.initialize().catch(err => {
    console.error('[Main] Failed to initialize TaskExecutor:', err)
  })

  // Initialize activity monitoring after window is created
  initActivityMonitoring()

  // Initialize analytics (respects user opt-in preference)
  analytics.initAnalytics()
  analytics.trackEvent('app_opened')

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

// macOS: Keep app running when windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Cleanup
app.on('before-quit', async () => {
  // Track app closed before shutting down analytics
  analytics.trackEvent('app_closed')

  // Shutdown analytics (flushes pending events)
  await analytics.shutdownAnalytics()

  // Stop activity monitoring
  activityMonitor.stop()

  // Stop brief scheduler
  briefScheduler.stop()

  // Close database connection
  closeDatabase()

  // Cleanup tray
  tray?.destroy()
})

// Global error handlers for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught exception:', error)
  analytics.trackError('error_uncaught', error, { type: 'uncaughtException' })
})

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason))
  console.error('[Main] Unhandled rejection:', error)
  analytics.trackError('error_uncaught', error, { type: 'unhandledRejection' })
})
