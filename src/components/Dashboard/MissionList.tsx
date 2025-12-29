import React, { useEffect } from 'react'
import { Target, CheckCircle, Circle, Loader2, AlertCircle } from 'lucide-react'
import { useTasksStore } from '@/stores'

export const MissionList: React.FC = () => {
  const {
    tasks,
    activeTask,
    isLoading,
    error,
    fetchTodaysTasks,
    startTask,
    completeTask,
  } = useTasksStore()

  // Fetch tasks on mount
  useEffect(() => {
    fetchTodaysTasks()
  }, [fetchTodaysTasks])

  const signalTasks = tasks.filter(t => t.status !== 'deferred')
  const completedCount = signalTasks.filter(t => t.status === 'completed').length
  const totalCount = signalTasks.length

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    if (currentStatus === 'completed') return
    await completeTask(taskId)
  }

  const handleStartTask = async (taskId: string) => {
    await startTask(taskId)
  }

  // Loading state
  if (isLoading && tasks.length === 0) {
    return (
      <div className="border border-pipboy-border rounded-sm">
        <div className="p-3 border-b border-pipboy-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-pipboy-green" />
            <span className="text-sm font-bold text-pipboy-green">SIGNAL TASKS</span>
          </div>
        </div>
        <div className="p-6 flex flex-col items-center justify-center text-pipboy-green-dim">
          <Loader2 size={20} className="animate-spin mb-2" />
          <p className="text-xs">Loading tasks...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="border border-pipboy-border rounded-sm">
        <div className="p-3 border-b border-pipboy-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-pipboy-green" />
            <span className="text-sm font-bold text-pipboy-green">SIGNAL TASKS</span>
          </div>
        </div>
        <div className="p-4 flex flex-col items-center justify-center text-pipboy-red">
          <AlertCircle size={20} className="mb-2" />
          <p className="text-xs">Failed to load</p>
          <button
            onClick={() => fetchTodaysTasks()}
            className="mt-2 text-xs text-pipboy-green hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-pipboy-border rounded-sm">
      {/* Header */}
      <div className="p-3 border-b border-pipboy-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-pipboy-green" />
          <span className="text-sm font-bold text-pipboy-green tracking-wide">SIGNAL TASKS</span>
        </div>
        {totalCount > 0 && (
          <span className={`
            text-xs px-2 py-0.5 rounded-sm
            ${completedCount === totalCount
              ? 'bg-pipboy-green/20 text-pipboy-green'
              : 'bg-pipboy-surface text-pipboy-green-dim'
            }
          `}>
            {completedCount}/{totalCount}
          </span>
        )}
      </div>

      {/* Task list */}
      {signalTasks.length === 0 ? (
        <div className="p-4 text-center text-pipboy-green-dim">
          <p className="text-xs">No signal tasks yet.</p>
          <p className="text-[10px] mt-1 opacity-70">
            Ask MILO for your morning briefing
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-pipboy-border/50 max-h-[200px] overflow-y-auto">
          {signalTasks.map(task => {
            const isActive = activeTask?.id === task.id
            const isCompleted = task.status === 'completed'
            const isInProgress = task.status === 'in_progress' || isActive

            return (
              <li
                key={task.id}
                className={`
                  px-3 py-2.5 flex items-center gap-3 transition-all duration-200
                  hover:bg-pipboy-surface/30
                  ${isInProgress && !isCompleted ? 'bg-pipboy-green/5 border-l-2 border-l-pipboy-green' : ''}
                  ${isCompleted ? 'opacity-50' : ''}
                `}
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleToggleTask(task.id, task.status)}
                  disabled={isCompleted}
                  className={`
                    transition-all duration-200 flex-shrink-0
                    ${isCompleted
                      ? 'text-pipboy-green cursor-default'
                      : 'text-pipboy-green-dim hover:text-pipboy-green'
                    }
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle size={16} className="fill-pipboy-green/20" />
                  ) : (
                    <Circle size={16} />
                  )}
                </button>

                {/* Task title */}
                <span
                  className={`
                    flex-1 text-sm truncate
                    ${isCompleted
                      ? 'line-through text-pipboy-green-dim'
                      : 'text-pipboy-green'
                    }
                  `}
                >
                  {task.title}
                </span>

                {/* Active badge or Start button */}
                {isInProgress && !isCompleted ? (
                  <span className="text-[10px] px-1.5 py-0.5 bg-pipboy-green/20 text-pipboy-green rounded-sm">
                    ACTIVE
                  </span>
                ) : task.status === 'pending' && !isActive ? (
                  <button
                    onClick={() => handleStartTask(task.id)}
                    className="text-[10px] px-1.5 py-0.5 border border-pipboy-border text-pipboy-green-dim hover:text-pipboy-green hover:border-pipboy-green/50 rounded-sm transition-colors"
                  >
                    Start
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
