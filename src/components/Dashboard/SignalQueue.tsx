import React, { useEffect } from 'react'
import { Radio, CheckCircle, Clock, ArrowRight, X, Loader2, AlertCircle } from 'lucide-react'
import { useTasksStore, useCategoriesStore } from '@/stores'
import type { Task } from '@/types'

/**
 * SignalQueue Component
 *
 * Displays top 3-5 priority tasks from the signal queue with terminal aesthetic.
 * Features:
 * - Adjustable queue size (3-5 tasks)
 * - Priority-based ordering
 * - Active task highlighting
 * - Multi-day progress tracking
 * - Continuity badges for yesterday's work
 * - Quick actions (complete, defer)
 * - Auto-refills on task completion
 *
 * Usage:
 * <SignalQueue />
 */
export const SignalQueue: React.FC = () => {
  const {
    signalQueue,
    signalQueueSize,
    setSignalQueueSize,
    activeTask,
    isLoading,
    error,
    fetchSignalQueue,
    startTask,
    completeTask,
    deferTask,
  } = useTasksStore()

  const { categories } = useCategoriesStore()

  // Fetch queue on mount
  useEffect(() => {
    fetchSignalQueue()
  }, [fetchSignalQueue])

  // Helper: Get progress label for multi-day tasks
  const getProgressLabel = (task: Task): string | null => {
    const estimated = task.estimatedDays ?? 1
    const worked = task.daysWorked ?? 0

    if (estimated > 1) {
      return `Day ${worked + 1} of ${estimated}`
    }
    return null
  }

  // Helper: Check if task was worked on yesterday
  const isFromYesterday = (task: Task): boolean => {
    if (!task.lastWorkedDate) return false

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    return task.lastWorkedDate === yesterdayStr
  }

  // Helper: Get category color
  const getCategoryColor = (categoryId: string | null | undefined): string | null => {
    if (!categoryId) return null
    const category = categories.find(c => c.id === categoryId)
    return category?.color ?? null
  }

  // Handler: Start task
  const handleStartTask = async (taskId: string) => {
    await startTask(taskId)
  }

  // Handler: Complete task
  const handleCompleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await completeTask(taskId)
  }

  // Handler: Defer task
  const handleDeferTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deferTask(taskId)
  }

  // Handler: Adjust queue size
  const handleSizeChange = (size: number) => {
    setSignalQueueSize(size)
  }

  // Loading state
  if (isLoading && signalQueue.length === 0) {
    return (
      <div className="border border-pipboy-border rounded-sm bg-pipboy-bg">
        <div className="p-3 border-b border-pipboy-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-pipboy-green animate-pulse" />
            <span className="text-sm font-bold text-pipboy-green tracking-wide">SIGNAL QUEUE</span>
          </div>
        </div>
        <div className="p-6 flex flex-col items-center justify-center text-pipboy-green-dim">
          <Loader2 size={20} className="animate-spin mb-2" />
          <p className="text-xs">Loading queue...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="border border-pipboy-border rounded-sm bg-pipboy-bg">
        <div className="p-3 border-b border-pipboy-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-pipboy-green" />
            <span className="text-sm font-bold text-pipboy-green tracking-wide">SIGNAL QUEUE</span>
          </div>
        </div>
        <div className="p-4 flex flex-col items-center justify-center text-pipboy-red">
          <AlertCircle size={20} className="mb-2" />
          <p className="text-xs">Failed to load queue</p>
          <button
            onClick={() => fetchSignalQueue()}
            className="mt-2 text-xs text-pipboy-green hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-pipboy-border rounded-sm bg-pipboy-bg">
      {/* Header with size slider */}
      <div className="p-3 border-b border-pipboy-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-pipboy-green" />
            <span className="text-sm font-bold text-pipboy-green tracking-wide">SIGNAL QUEUE</span>
          </div>
          <span className="text-[10px] text-pipboy-green-dim">
            TOP {signalQueue.length} PRIORITY
          </span>
        </div>

        {/* Size slider */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-pipboy-green-dim">SIZE:</span>
          <div className="flex gap-1">
            {[3, 4, 5].map(size => (
              <button
                key={size}
                onClick={() => handleSizeChange(size)}
                className={`
                  text-[10px] px-2 py-0.5 rounded-sm transition-all
                  ${signalQueueSize === size
                    ? 'bg-pipboy-green/20 text-pipboy-green border border-pipboy-green/50'
                    : 'bg-pipboy-surface text-pipboy-green-dim border border-pipboy-border hover:border-pipboy-green/30'
                  }
                `}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task queue */}
      {signalQueue.length === 0 ? (
        <div className="p-6 text-center text-pipboy-green-dim">
          <p className="text-xs">No tasks in queue.</p>
          <p className="text-[10px] mt-1 opacity-70">
            Create tasks to populate the signal queue
          </p>
        </div>
      ) : (
        <div className="divide-y divide-pipboy-border/50">
          {signalQueue.map((task, index) => {
            const isActive = activeTask?.id === task.id
            const categoryColor = getCategoryColor(task.categoryId)
            const progressLabel = getProgressLabel(task)
            const showContinue = isFromYesterday(task)

            return (
              <div
                key={task.id}
                onClick={() => handleStartTask(task.id)}
                className={`
                  group relative p-3 cursor-pointer transition-all duration-200
                  hover:bg-pipboy-surface/30
                  ${isActive ? 'bg-pipboy-green/5 border-l-2 border-l-pipboy-green' : ''}
                `}
              >
                {/* Main content */}
                <div className="flex items-start gap-3">
                  {/* Priority indicator */}
                  <div className="flex-shrink-0 pt-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-pipboy-green-dim font-mono">
                        #{index + 1}
                      </span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1 h-3 ${
                              i < (task.priority ?? 1)
                                ? 'bg-pipboy-green/60'
                                : 'bg-pipboy-border/30'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Task details */}
                  <div className="flex-1 min-w-0">
                    {/* Title with category dot */}
                    <div className="flex items-start gap-2 mb-1">
                      {categoryColor && (
                        <div
                          className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5"
                          style={{ backgroundColor: categoryColor }}
                        />
                      )}
                      <p className="text-sm text-pipboy-green font-medium leading-tight">
                        {task.title}
                      </p>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {/* Active badge */}
                      {isActive && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-pipboy-green/20 text-pipboy-green rounded-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-pipboy-green animate-pulse" />
                          ACTIVE
                        </span>
                      )}

                      {/* Continue badge */}
                      {showContinue && !isActive && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 border border-pipboy-green/50 text-pipboy-green rounded-sm">
                          <ArrowRight size={10} />
                          Continue
                        </span>
                      )}

                      {/* Progress badge */}
                      {progressLabel && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-pipboy-surface text-pipboy-green-dim rounded-sm">
                          <Clock size={10} />
                          {progressLabel}
                        </span>
                      )}
                    </div>

                    {/* Rationale (if present) */}
                    {task.rationale && (
                      <p className="text-[10px] text-pipboy-green-dim/70 mt-2 leading-relaxed line-clamp-2">
                        {task.rationale}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick actions (visible on hover) */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleCompleteTask(task.id, e)}
                    className="p-1.5 bg-pipboy-bg border border-pipboy-border hover:border-pipboy-green/50 rounded-sm transition-colors"
                    title="Complete task"
                  >
                    <CheckCircle size={12} className="text-pipboy-green" />
                  </button>
                  <button
                    onClick={(e) => handleDeferTask(task.id, e)}
                    className="p-1.5 bg-pipboy-bg border border-pipboy-border hover:border-pipboy-red/50 rounded-sm transition-colors"
                    title="Defer to tomorrow"
                  >
                    <X size={12} className="text-pipboy-red" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
