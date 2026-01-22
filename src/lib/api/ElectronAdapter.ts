import { PlatformAdapter } from './types'

/**
 * Electron adapter that wraps the window.milo API exposed via preload
 * 
 * Uses a getter pattern to lazily access window.milo properties,
 * preventing errors when this module is evaluated on web where window.milo doesn't exist.
 */
function createElectronAdapter(): PlatformAdapter {
    // This function is only called when isElectron is true
    const milo = window.milo
    return {
        platform: 'electron',
        window: milo.window,
        tray: milo.tray,
        events: milo.events,
        goals: milo.goals,
        tasks: milo.tasks,
        categories: milo.categories,
        projects: milo.projects,
        activity: milo.activity,
        classifications: milo.classifications,
        scores: milo.scores,
        monitoring: milo.monitoring,
        ai: milo.ai,
        plan: milo.plan,
        nudge: milo.nudge,
        taskExecution: milo.taskExecution,
        settings: milo.settings,
        analytics: milo.analytics,
        updates: milo.updates,
        chat: milo.chat,
    }
}

export { createElectronAdapter }
