import { PlatformAdapter } from './types'
import { goalsWebRepository } from './web/goals'
import { tasksWebRepository } from './web/tasks'
import { categoriesWebRepository } from './web/categories'
import { projectsWebRepository } from './web/projects'
import { settingsWebRepository } from './web/settings'
import { activityWebRepository, classificationsWebRepository } from './web/activity'
import { scoresWebRepository } from './web/scores'
import { chatWebRepository } from './web/chat'

/**
 * Web adapter for browser/mobile environments
 * This uses IndexedDB (Dexie) for persistence
 */
export const WebAdapter: PlatformAdapter = {
    platform: 'web',
    window: {
        minimize: async () => console.log('Window minimize not supported on web'),
        close: async () => console.log('Window close not supported on web'),
        toggleAlwaysOnTop: async () => {
            console.log('Always on top not supported on web')
            return false
        }
    },
    tray: {
        setState: async (state) => console.log('Tray state not supported on web', state)
    },
    events: {
        onShowMorningBriefing: () => () => { },
        onShowEveningReview: () => () => { },
        onShowSettings: () => () => { },
        onToggleMonitoring: () => () => { },
        onActivityStateChanged: () => () => { },
        onNudgeTriggered: () => () => { },
        onTasksChanged: () => () => { }
    },
    portfolio: {
        getSnapshot: async () => ({
            path: '',
            active: [],
            review: [],
            proposed: [],
            archived: [],
            exists: false,
        }),
        scan: async () => ({
            path: '',
            scannedAt: new Date().toISOString(),
            totalGoals: 0,
            flipped: [],
            alreadyFlagged: [],
            actionable: [],
        }),
        propose: async () => ({ success: false }),
    },
    goals: goalsWebRepository,
    tasks: tasksWebRepository,
    categories: categoriesWebRepository,
    projects: projectsWebRepository,
    activity: activityWebRepository,
    classifications: classificationsWebRepository,
    scores: scoresWebRepository,
    monitoring: {
        start: async () => { },
        stop: async () => { },
        pause: async () => { },
        resume: async () => { },
        toggle: async () => false,
        status: async () => ({} as any)
    },
    ai: {
        initialize: async () => false,
        isInitialized: async () => false,
        getProviderType: async () => 'anthropic' as any,
        getModel: async () => null,
        getProviderModels: async () => [],
        getDefaultModel: async () => '',
        morningBriefing: async () => ({} as any),
        eveningReview: async () => ({} as any),
        parseTasks: async () => ({} as any),
        generateNudge: async () => '',
        processPlan: async () => ({} as any),
        chat: async () => ''
    },
    plan: {
        apply: async () => ({ success: false, goalsCreated: 0, tasksCreated: 0, goalIds: [], taskIds: [] })
    },
    nudge: {
        getConfig: async () => ({} as any),
        setConfig: async () => { },
        getDriftStatus: async () => ({} as any)
    },
    taskExecution: {
        classifyTask: async () => ({} as any),
        executeTask: async () => ({} as any),
        executeWithTarget: async () => ({} as any),
        generatePrompt: async () => ({} as any),
        getAvailableProjects: async () => [],
        hasClaudeCli: async () => false
    },
    settings: settingsWebRepository,
    analytics: {
        isEnabled: async () => false,
        isAvailable: async () => false,
        enable: async () => false,
        disable: async () => false
    },
    updates: {
        check: async () => ({
            hasUpdate: false,
            currentVersion: '0.0.0',
            latestVersion: '0.0.0',
            releaseUrl: '',
            downloadUrl: '',
            releaseNotes: '',
            publishedAt: ''
        }),
        getVersion: async () => '0.0.0'
    },
    chat: chatWebRepository
}

