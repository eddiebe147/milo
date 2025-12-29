import { useEffect, useState } from 'react'
import { useTasksStore } from '../stores'

/**
 * Hook for managing day-over-day continuity in MILO.
 *
 * Key features:
 * - Detects first visit of the day
 * - Fetches tasks worked on yesterday
 * - Provides morning context for resuming work
 * - Tracks multi-day task progress
 */
export function useContinuity() {
  const {
    continuityTasks,
    hasSeenMorningContext,
    fetchContinuityTasks,
    fetchSignalQueue,
    dismissMorningContext,
  } = useTasksStore()

  const [isFirstVisitToday, setIsFirstVisitToday] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // On mount, check if this is first visit today and load continuity data
  useEffect(() => {
    const checkAndLoad = async () => {
      const lastVisit = localStorage.getItem('milo_last_visit_date')
      const today = new Date().toISOString().split('T')[0]

      const isFirst = lastVisit !== today
      setIsFirstVisitToday(isFirst)

      // Update last visit date
      localStorage.setItem('milo_last_visit_date', today)

      // Load continuity tasks if first visit
      if (isFirst) {
        await fetchContinuityTasks()
      }

      // Always load signal queue
      await fetchSignalQueue()

      setIsLoaded(true)
    }

    checkAndLoad()
  }, [fetchContinuityTasks, fetchSignalQueue])

  // Should we show the morning context panel?
  const showMorningContext =
    isLoaded &&
    isFirstVisitToday &&
    !hasSeenMorningContext &&
    continuityTasks.length > 0

  // Helper to get progress info for multi-day tasks
  const getTaskProgress = (task: { estimatedDays?: number; daysWorked?: number }) => {
    const estimated = task.estimatedDays ?? 1
    const worked = task.daysWorked ?? 0
    const isMultiDay = estimated > 1
    const percentComplete = Math.min(100, Math.round((worked / estimated) * 100))

    return {
      isMultiDay,
      daysWorked: worked,
      estimatedDays: estimated,
      percentComplete,
      progressLabel: isMultiDay ? `Day ${worked + 1} of ${estimated}` : null,
    }
  }

  return {
    // State
    isFirstVisitToday,
    showMorningContext,
    continuityTasks,
    isLoaded,

    // Actions
    dismissMorningContext,
    getTaskProgress,
  }
}
