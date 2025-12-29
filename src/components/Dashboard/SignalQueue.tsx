import React, { useState, useEffect } from 'react'
import { Radio, Loader2, AlertCircle, RefreshCw, Pause } from 'lucide-react'
import { useTasksStore, useProjectsStore, useSettingsStore } from '@/stores'
import { TaskRow } from './TaskRow'

/**
 * SignalQueue Component
 *
 * Displays top 3-5 priority tasks from the signal queue with terminal aesthetic.
 * Features:
 * - Adjustable queue size (3-5 tasks)
 * - Expandable task rows with details
 * - Smart task execution (Claude Code, Web, Research)
 * - Priority-based ordering
 * - Active task highlighting
 * - Multi-day progress tracking
 * - Related tasks display
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
    completeTask,
    smartStartTask,
    getRelatedTasks,
    isExecuting,
    executingTaskId,
  } = useTasksStore()

  // Projects store for category badges (future use)
  const _projectsStore = useProjectsStore()
  void _projectsStore // Suppress unused warning - will use for project display

  // Settings store for refill mode
  const { settings, toggleRefillMode } = useSettingsStore()
  const refillMode = settings.refillMode

  // Track which task is expanded
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  // Fetch queue on mount
  useEffect(() => {
    fetchSignalQueue()
  }, [fetchSignalQueue])

  // Handler: Toggle completion
  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    if (currentStatus === 'completed') return
    await completeTask(taskId)
  }

  // Handler: Smart start (classifies and executes)
  const handleSmartStart = async (taskId: string) => {
    const result = await smartStartTask(taskId)
    if (result) {
      console.log('[SignalQueue] Task execution result:', result)
    }
  }

  // Handler: Expand/collapse task
  const handleExpandTask = (taskId: string) => {
    setExpandedTaskId(prev => prev === taskId ? null : taskId)
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

        {/* Controls row: Size slider + Refill mode */}
        <div className="flex items-center justify-between">
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

          {/* Refill mode toggle */}
          <button
            onClick={toggleRefillMode}
            className={`
              flex items-center gap-1.5 px-2 py-0.5 rounded-sm
              text-[10px] transition-all border
              ${refillMode === 'endless'
                ? 'bg-pipboy-green/10 text-pipboy-green border-pipboy-green/50'
                : 'bg-pipboy-surface text-pipboy-green-dim border-pipboy-border hover:border-pipboy-green/30'
              }
            `}
            title={refillMode === 'endless'
              ? 'Endless: Auto-refills when tasks complete'
              : 'Daily: Queue empties as you complete tasks'
            }
          >
            {refillMode === 'endless' ? (
              <>
                <RefreshCw size={10} className="animate-spin-slow" />
                <span>ENDLESS</span>
              </>
            ) : (
              <>
                <Pause size={10} />
                <span>DAILY</span>
              </>
            )}
          </button>
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
          {signalQueue.map((task) => {
            const isActive = activeTask?.id === task.id
            const relatedTasks = getRelatedTasks(task)
            const isTaskExecuting = isExecuting && executingTaskId === task.id

            return (
              <TaskRow
                key={task.id}
                task={task}
                isActive={isActive}
                isExpanded={expandedTaskId === task.id}
                relatedTasks={relatedTasks}
                isExecuting={isTaskExecuting}
                onToggleComplete={() => handleToggleComplete(task.id, task.status)}
                onStart={() => handleSmartStart(task.id)}
                onExpand={() => handleExpandTask(task.id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
