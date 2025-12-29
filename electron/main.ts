import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase, closeDatabase, activityMonitor, detectState, scoringEngine, nudgeManager } from './services'
import { goalsRepository, tasksRepository, categoriesRepository, activityRepository, scoresRepository, classificationsRepository, settingsRepository, chatRepository } from './repositories'
import { claudeClient } from './ai/ClaudeClient'
import type { Goal, Task } from '../src/types'
import type { MorningBriefingInput, EveningReviewInput } from './ai/ClaudeClient'
import { taskExecutor } from './services/TaskExecutor'

// Window references
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    minWidth: 320,
    minHeight: 480,
    show: false,
    frame: false,
    transparent: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
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
  ipcMain.handle('goals:create', (_, goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) =>
    goalsRepository.create(goal)
  )
  ipcMain.handle('goals:update', (_, id: string, updates: Partial<Goal>) =>
    goalsRepository.update(id, updates)
  )
  ipcMain.handle('goals:delete', (_, id: string) => goalsRepository.delete(id))

  // Tasks CRUD
  ipcMain.handle('tasks:getAll', () => tasksRepository.getAll())
  ipcMain.handle('tasks:getToday', () => tasksRepository.getToday())
  ipcMain.handle('tasks:getById', (_, id: string) => tasksRepository.getById(id))
  ipcMain.handle('tasks:getActive', () => tasksRepository.getActive())
  ipcMain.handle('tasks:create', (_, task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) =>
    tasksRepository.create(task)
  )
  ipcMain.handle('tasks:update', (_, id: string, updates: Partial<Task>) =>
    tasksRepository.update(id, updates)
  )
  ipcMain.handle('tasks:delete', (_, id: string) => tasksRepository.delete(id))
  ipcMain.handle('tasks:start', (_, id: string) => tasksRepository.start(id))
  ipcMain.handle('tasks:complete', (_, id: string) => tasksRepository.complete(id))
  ipcMain.handle('tasks:defer', (_, id: string) => tasksRepository.defer(id))

  // New task methods for signal queue & continuity
  ipcMain.handle('tasks:getAllIncomplete', () => tasksRepository.getAllIncomplete())
  ipcMain.handle('tasks:getByCategory', (_, categoryId: string) => tasksRepository.getByCategory(categoryId))
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

  // AI / Claude integration
  ipcMain.handle('ai:initialize', (_, apiKey: string) => {
    claudeClient.initialize(apiKey)
    return claudeClient.isInitialized()
  })

  ipcMain.handle('ai:isInitialized', () => claudeClient.isInitialized())

  ipcMain.handle('ai:morningBriefing', async (_, input: MorningBriefingInput) => {
    try {
      return await claudeClient.generateMorningBriefing(input)
    } catch (error) {
      console.error('[IPC] Morning briefing error:', error)
      throw error
    }
  })

  ipcMain.handle('ai:eveningReview', async (_, input: EveningReviewInput) => {
    try {
      return await claudeClient.generateEveningReview(input)
    } catch (error) {
      console.error('[IPC] Evening review error:', error)
      throw error
    }
  })

  ipcMain.handle('ai:parseTasks', async (_, text: string) => {
    try {
      const goals = goalsRepository.getAll()
      return await claudeClient.parseTasks(text, goals)
    } catch (error) {
      console.error('[IPC] Task parsing error:', error)
      throw error
    }
  })

  ipcMain.handle('ai:generateNudge', async (_, driftMinutes: number, currentApp: string) => {
    try {
      const activeTask = tasksRepository.getActive()
      return await claudeClient.generateNudge(driftMinutes, currentApp, activeTask || undefined)
    } catch (error) {
      console.error('[IPC] Nudge generation error:', error)
      throw error
    }
  })

  // Plan processing (Haiku agent)
  ipcMain.handle('ai:processPlan', async (_, rawPlan: string, context?: string) => {
    try {
      return await claudeClient.processPlan(rawPlan, context)
    } catch (error) {
      console.error('[IPC] Plan processing error:', error)
      throw error
    }
  })

  // Chat with MILO
  ipcMain.handle('ai:chat', async (_, input: { message: string; conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> }) => {
    try {
      // Gather context
      const goals = goalsRepository.getAll()
      const todayTasks = tasksRepository.getToday()
      const activeTask = tasksRepository.getActive()
      const dailyScore = scoresRepository.getToday()

      // Get activity summary
      const today = new Date().toISOString().split('T')[0]
      const activitySummary = activityRepository.getSummary(today)

      return await claudeClient.chat({
        message: input.message,
        conversationHistory: input.conversationHistory,
        context: {
          goals,
          todayTasks,
          activeTask: activeTask || undefined,
          dailyScore: dailyScore || undefined,
          activitySummary: {
            greenMinutes: activitySummary.green,
            amberMinutes: activitySummary.amber,
            redMinutes: activitySummary.red,
          },
        },
      })
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

      return {
        success: true,
        goalsCreated: createdGoalIds.length,
        tasksCreated: createdTaskIds.length,
        goalIds: createdGoalIds,
        taskIds: createdTaskIds,
      }
    } catch (error) {
      console.error('[IPC] Plan apply error:', error)
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
    // Initialize Claude client if API key is provided
    if (apiKey) {
      claudeClient.initialize(apiKey)
      console.log('[Settings] Claude client initialized with saved API key')
    }
    return true
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
  ipcMain.handle('settings:setThemeColor', (_, key: string, value: string) => {
    settingsRepository.setThemeColor(key as any, value)
    return true
  })
  ipcMain.handle('settings:setThemeColors', (_, colors) => {
    settingsRepository.setThemeColors(colors)
    return true
  })

  // Task execution (smart task automation)
  ipcMain.handle('taskExecution:classifyTask', async (_, taskId: string) => {
    try {
      const task = tasksRepository.getById(taskId)
      if (!task) {
        throw new Error(`Task not found: ${taskId}`)
      }
      const projects = taskExecutor.getProjects()
      return await claudeClient.classifyTaskAction(task, projects)
    } catch (error) {
      console.error('[IPC] Task classification error:', error)
      throw error
    }
  })

  ipcMain.handle('taskExecution:executeTask', async (_, taskId: string) => {
    try {
      const task = tasksRepository.getById(taskId)
      if (!task) {
        throw new Error(`Task not found: ${taskId}`)
      }

      // First, classify the task
      const projects = taskExecutor.getProjects()
      const actionPlan = await claudeClient.classifyTaskAction(task, projects)

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
  ipcMain.handle('taskExecution:executeWithTarget', async (_, target: string, prompt: string, projectPath: string | null) => {
    try {
      return await taskExecutor.executeWithTarget(target as any, prompt, projectPath)
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
    return chatRepository.addMessage(conversationId, role, content)
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
  }

  // Wire nudge manager to activity state changes
  activityMonitor.setOnStateChange(({ state, appName }) => {
    nudgeManager.onStateChange(state, appName)
  })

  // Start monitoring
  activityMonitor.start()

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

  // Auto-initialize Claude client if API key exists in settings
  const savedApiKey = settingsRepository.getApiKey()
  if (savedApiKey) {
    claudeClient.initialize(savedApiKey)
    console.log('[Main] Claude client auto-initialized from saved API key')
  } else {
    console.log('[Main] No API key found - Claude client not initialized')
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
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
app.on('before-quit', () => {
  // Stop activity monitoring
  activityMonitor.stop()

  // Close database connection
  closeDatabase()

  // Cleanup tray
  tray?.destroy()
})
