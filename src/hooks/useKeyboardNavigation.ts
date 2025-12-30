import { useState, useEffect, useCallback } from 'react'
import { useTasksStore } from '@/stores'
import type { Task } from '@/types'

export interface UseKeyboardNavigationOptions {
  /** Whether to wrap around at list boundaries (default: true) */
  wrapAround?: boolean
  /** Whether the navigation is enabled (default: true) */
  enabled?: boolean
  /** Custom event handler for 'N' key (new task) */
  onNewTask?: () => void
}

export interface UseKeyboardNavigationReturn {
  /** Currently selected task index (null if no selection) */
  selectedIndex: number | null
  /** Manually set the selected index */
  setSelectedIndex: (index: number | null) => void
  /** Clear the current selection */
  clearSelection: () => void
  /** Get the currently selected task */
  selectedTask: Task | null
}

/**
 * useKeyboardNavigation Hook
 *
 * Provides keyboard navigation for task lists in MILO.
 *
 * Keyboard Shortcuts:
 * - J or ↓: Move selection down
 * - K or ↑: Move selection up
 * - X: Toggle completion of selected task
 * - Enter: Start working on selected task
 * - N: Create new task (emits custom event or calls onNewTask)
 * - Escape: Clear selection
 *
 * Features:
 * - Only active when no input/textarea is focused
 * - Optional wrap-around at list boundaries
 * - Auto-clears selection when task list length changes
 * - Integrates with tasksStore for actions
 *
 * @param tasks - Array of tasks to navigate
 * @param options - Configuration options
 * @returns Navigation state and controls
 *
 * @example
 * ```tsx
 * function TaskList() {
 *   const { tasks } = useTasksStore()
 *   const { selectedIndex } = useKeyboardNavigation(tasks, {
 *     onNewTask: () => setShowModal(true)
 *   })
 *
 *   return (
 *     <div>
 *       {tasks.map((task, index) => (
 *         <TaskRow
 *           key={task.id}
 *           task={task}
 *           isSelected={index === selectedIndex}
 *         />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useKeyboardNavigation(
  tasks: Task[],
  options: UseKeyboardNavigationOptions = {}
): UseKeyboardNavigationReturn {
  const {
    wrapAround = true,
    enabled = true,
    onNewTask,
  } = options

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const { completeTask, startTask } = useTasksStore()

  // Clear selection when task list length changes (tasks completed/deleted)
  useEffect(() => {
    if (selectedIndex !== null && selectedIndex >= tasks.length) {
      setSelectedIndex(tasks.length > 0 ? tasks.length - 1 : null)
    }
  }, [tasks.length, selectedIndex])

  /**
   * Clear the current selection
   */
  const clearSelection = useCallback(() => {
    setSelectedIndex(null)
  }, [])

  /**
   * Move selection up
   */
  const moveUp = useCallback(() => {
    if (tasks.length === 0) return

    setSelectedIndex(prev => {
      if (prev === null || prev === 0) {
        return wrapAround ? tasks.length - 1 : 0
      }
      return prev - 1
    })
  }, [tasks.length, wrapAround])

  /**
   * Move selection down
   */
  const moveDown = useCallback(() => {
    if (tasks.length === 0) return

    setSelectedIndex(prev => {
      if (prev === null) return 0
      if (prev === tasks.length - 1) {
        return wrapAround ? 0 : prev
      }
      return prev + 1
    })
  }, [tasks.length, wrapAround])

  /**
   * Toggle completion of selected task
   */
  const toggleComplete = useCallback(async () => {
    if (selectedIndex === null) return
    const task = tasks[selectedIndex]
    if (!task || task.status === 'completed') return

    await completeTask(task.id)
    // Selection will auto-adjust via useEffect when task is removed
  }, [selectedIndex, tasks, completeTask])

  /**
   * Start working on selected task
   */
  const startSelected = useCallback(async () => {
    if (selectedIndex === null) return
    const task = tasks[selectedIndex]
    if (!task || task.status === 'completed') return

    await startTask(task.id)
  }, [selectedIndex, tasks, startTask])

  /**
   * Handle new task action
   */
  const handleNewTask = useCallback(() => {
    if (onNewTask) {
      onNewTask()
    } else {
      // Emit custom event for other components to listen to
      window.dispatchEvent(new CustomEvent('milo:new-task'))
    }
  }, [onNewTask])

  /**
   * Check if an input element is currently focused
   */
  const isInputFocused = useCallback((): boolean => {
    const activeElement = document.activeElement
    if (!activeElement) return false

    const tagName = activeElement.tagName.toLowerCase()
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      activeElement.getAttribute('contenteditable') === 'true'
    )
  }, [])

  /**
   * Main keyboard event handler
   */
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle keyboard shortcuts when input is focused
      if (isInputFocused()) return

      const key = event.key.toLowerCase()

      switch (key) {
        case 'j':
        case 'arrowdown':
          event.preventDefault()
          moveDown()
          break

        case 'k':
        case 'arrowup':
          event.preventDefault()
          moveUp()
          break

        case 'x':
          event.preventDefault()
          toggleComplete()
          break

        case 'enter':
          event.preventDefault()
          startSelected()
          break

        case 'n':
          event.preventDefault()
          handleNewTask()
          break

        case 'escape':
          event.preventDefault()
          clearSelection()
          break

        default:
          // No action for other keys
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    enabled,
    isInputFocused,
    moveDown,
    moveUp,
    toggleComplete,
    startSelected,
    handleNewTask,
    clearSelection,
  ])

  // Get the currently selected task
  const selectedTask = selectedIndex !== null ? tasks[selectedIndex] ?? null : null

  return {
    selectedIndex,
    setSelectedIndex,
    clearSelection,
    selectedTask,
  }
}
