import { PlatformAdapter } from './types'

/**
 * Electron adapter that wraps the window.milo API exposed via preload
 */
export const ElectronAdapter: PlatformAdapter = {
    platform: 'electron',
    window: window.milo.window,
    tray: window.milo.tray,
    events: window.milo.events,
    goals: window.milo.goals,
    tasks: window.milo.tasks,
    categories: window.milo.categories,
    activity: window.milo.activity,
    classifications: window.milo.classifications,
    scores: window.milo.scores,
    monitoring: window.milo.monitoring,
    ai: window.milo.ai,
    plan: window.milo.plan,
    nudge: window.milo.nudge,
    taskExecution: window.milo.taskExecution,
    settings: window.milo.settings,
    analytics: window.milo.analytics,
    updates: window.milo.updates,
    chat: window.milo.chat,
}
