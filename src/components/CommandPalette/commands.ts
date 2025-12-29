import { useTasksStore } from '@/stores/tasksStore'
import { useSettingsStore } from '@/stores/settingsStore'
import type { ModalContextValue } from '@/contexts/ModalContext'

export interface Command {
  id: string
  label: string
  description?: string
  shortcut?: string
  category: 'tasks' | 'navigation' | 'settings' | 'app'
  icon?: string
  action: () => void | Promise<void>
}

/**
 * Command Registry
 *
 * Central registry for all command palette actions.
 * Commands are organized by category and include keyboard shortcuts.
 *
 * Usage:
 * - Import getCommands() in CommandPalette component
 * - Filter by search query
 * - Execute command.action() on selection
 */
export const getCommands = (
  onNavigate?: (view: 'dashboard' | 'settings' | 'plan-import') => void,
  modalContext?: ModalContextValue
): Command[] => {
  return [
    // Task Commands
    {
      id: 'add-task',
      label: 'Add New Task',
      description: 'Create a new task',
      shortcut: 'N',
      category: 'tasks',
      icon: 'plus',
      action: () => {
        // Open add task modal via context
        modalContext?.openModalWithType('addTask')
      },
    },
    {
      id: 'complete-task',
      label: 'Complete Selected Task',
      description: 'Mark the currently selected task as complete',
      shortcut: 'X',
      category: 'tasks',
      icon: 'check',
      action: async () => {
        const { activeTask, completeTask } = useTasksStore.getState()
        if (activeTask) {
          await completeTask(activeTask.id)
        }
      },
    },
    {
      id: 'refresh-tasks',
      label: 'Refresh Tasks',
      description: 'Reload all tasks from database',
      category: 'tasks',
      icon: 'refresh',
      action: async () => {
        const { fetchSignalQueue } = useTasksStore.getState()
        await fetchSignalQueue()
      },
    },
    {
      id: 'start-task',
      label: 'Start Selected Task',
      description: 'Begin working on the selected task',
      category: 'tasks',
      icon: 'play',
      action: async () => {
        const { activeTask, startTask } = useTasksStore.getState()
        if (activeTask) {
          await startTask(activeTask.id)
        }
      },
    },
    {
      id: 'defer-task',
      label: 'Defer Selected Task',
      description: 'Move task to tomorrow',
      category: 'tasks',
      icon: 'clock',
      action: async () => {
        const { activeTask, deferTask } = useTasksStore.getState()
        if (activeTask) {
          await deferTask(activeTask.id)
        }
      },
    },

    // Navigation Commands
    {
      id: 'goto-dashboard',
      label: 'Go to Dashboard',
      description: 'Navigate to main dashboard',
      category: 'navigation',
      icon: 'home',
      action: () => {
        onNavigate?.('dashboard')
      },
    },
    {
      id: 'goto-settings',
      label: 'Open Settings',
      description: 'Navigate to settings page',
      category: 'navigation',
      icon: 'settings',
      action: () => {
        onNavigate?.('settings')
      },
    },
    {
      id: 'goto-plan-import',
      label: 'Import Plan',
      description: 'Import tasks from a text plan',
      category: 'navigation',
      icon: 'upload',
      action: () => {
        onNavigate?.('plan-import')
      },
    },

    // Settings Commands
    {
      id: 'toggle-always-on-top',
      label: 'Toggle Always On Top',
      description: 'Keep window on top of other applications',
      category: 'settings',
      icon: 'pin',
      action: async () => {
        const { toggleAlwaysOnTop } = useSettingsStore.getState()
        await toggleAlwaysOnTop()
      },
    },
    {
      id: 'toggle-refill-mode',
      label: 'Toggle Refill Mode',
      description: 'Switch between endless and daily reset modes',
      category: 'settings',
      icon: 'refresh',
      action: () => {
        const { toggleRefillMode } = useSettingsStore.getState()
        toggleRefillMode()
      },
    },
    {
      id: 'open-api-settings',
      label: 'Configure API Key',
      description: 'Set or update Claude API key',
      category: 'settings',
      icon: 'key',
      action: () => {
        modalContext?.openModalWithType('apiSettings')
      },
    },
    {
      id: 'open-theme-settings',
      label: 'Open Theme Settings',
      description: 'Customize colors and appearance',
      category: 'settings',
      icon: 'palette',
      action: () => {
        modalContext?.openModalWithType('themeSettings')
      },
    },

    // App Commands
    {
      id: 'morning-briefing',
      label: 'Start Morning Briefing',
      description: 'Open morning context review',
      category: 'app',
      icon: 'sunrise',
      action: () => {
        modalContext?.openModalWithType('morningBriefing')
      },
    },
    {
      id: 'evening-review',
      label: 'Start Evening Review',
      description: 'Review today\'s progress',
      category: 'app',
      icon: 'sunset',
      action: () => {
        modalContext?.openModalWithType('eveningReview')
      },
    },
    {
      id: 'quit-app',
      label: 'Quit MILO',
      description: 'Exit the application',
      category: 'app',
      icon: 'power',
      action: () => {
        window.milo?.window.close()
      },
    },
  ]
}

/**
 * Filter commands by search query
 * Searches label, description, and category
 */
export const filterCommands = (commands: Command[], query: string): Command[] => {
  if (!query.trim()) {
    return commands
  }

  const lowerQuery = query.toLowerCase()

  return commands.filter((cmd) => {
    return (
      cmd.label.toLowerCase().includes(lowerQuery) ||
      cmd.description?.toLowerCase().includes(lowerQuery) ||
      cmd.category.toLowerCase().includes(lowerQuery)
    )
  })
}

/**
 * Get category display name
 */
export const getCategoryLabel = (category: Command['category']): string => {
  const labels: Record<Command['category'], string> = {
    tasks: 'TASKS',
    navigation: 'NAVIGATION',
    settings: 'SETTINGS',
    app: 'APPLICATION',
  }
  return labels[category]
}

/**
 * Get category icon
 */
export const getCategoryIcon = (category: Command['category']): string => {
  const icons: Record<Command['category'], string> = {
    tasks: '□',
    navigation: '→',
    settings: '⚙',
    app: '◆',
  }
  return icons[category]
}
