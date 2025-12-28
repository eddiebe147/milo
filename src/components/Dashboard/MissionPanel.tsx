import React, { useEffect } from 'react'
import { Target, CheckCircle, Circle, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useTasksStore } from '@/stores'

export const MissionPanel: React.FC = () => {
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
    if (currentStatus === 'completed') {
      // Can't un-complete for now - would need an uncomplete action
      return
    }
    await completeTask(taskId)
  }

  const handleStartTask = async (taskId: string) => {
    await startTask(taskId)
  }

  // Loading state
  if (isLoading && tasks.length === 0) {
    return (
      <Card variant="default" padding="none" className="flex-1">
        <CardHeader className="p-4 pb-2 border-b border-pipboy-border">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-pipboy-green" />
            <CardTitle>Signal Tasks</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-8 flex flex-col items-center justify-center text-pipboy-green-dim">
            <Loader2 size={24} className="animate-spin mb-2" />
            <p className="text-sm">Loading tasks...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card variant="default" padding="none" className="flex-1">
        <CardHeader className="p-4 pb-2 border-b border-pipboy-border">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-pipboy-green" />
            <CardTitle>Signal Tasks</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 flex flex-col items-center justify-center text-pipboy-red">
            <AlertCircle size={24} className="mb-2" />
            <p className="text-sm">Failed to load tasks</p>
            <p className="text-xs text-pipboy-red/70 mt-1">{error}</p>
            <button
              onClick={() => fetchTodaysTasks()}
              className="mt-3 text-xs text-pipboy-green hover:text-pipboy-green/80 underline"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="default" padding="none" className="flex-1">
      <CardHeader className="p-4 pb-2 border-b border-pipboy-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-pipboy-green" />
            <CardTitle>Signal Tasks</CardTitle>
          </div>
          {totalCount > 0 && (
            <Badge variant={completedCount === totalCount ? 'success' : 'info'} glow>
              {completedCount}/{totalCount}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {signalTasks.length === 0 ? (
          <div className="p-6 text-center text-pipboy-green-dim">
            <Target size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No signal tasks for today.</p>
            <p className="text-xs mt-2 opacity-70">
              Use Quick Capture below or run Morning Briefing to set your mission.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-pipboy-border max-h-[300px] overflow-y-auto">
            {signalTasks.map(task => {
              const isActive = activeTask?.id === task.id
              const isCompleted = task.status === 'completed'
              const isInProgress = task.status === 'in_progress' || isActive

              return (
                <li
                  key={task.id}
                  className={`
                    p-3 transition-all duration-200
                    hover:bg-pipboy-surface/50
                    ${isInProgress ? 'bg-pipboy-green/5 border-l-2 border-l-pipboy-green' : ''}
                    ${isCompleted ? 'opacity-60' : ''}
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleTask(task.id, task.status)}
                      disabled={isCompleted}
                      className={`
                        mt-0.5 transition-all duration-200
                        ${isCompleted
                          ? 'text-pipboy-green cursor-default'
                          : 'text-pipboy-green-dim hover:text-pipboy-green'
                        }
                      `}
                      title={isCompleted ? 'Completed' : 'Mark as complete'}
                    >
                      {isCompleted ? (
                        <CheckCircle size={18} className="fill-pipboy-green/20" />
                      ) : (
                        <Circle size={18} />
                      )}
                    </button>

                    {/* Task content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`
                            text-sm
                            ${isCompleted
                              ? 'line-through text-pipboy-green-dim'
                              : 'text-pipboy-green'
                            }
                          `}
                        >
                          {task.title}
                        </span>
                        {isInProgress && !isCompleted && (
                          <Badge variant="success" size="sm">
                            Active
                          </Badge>
                        )}
                      </div>

                      {/* Rationale */}
                      {task.rationale && !isCompleted && (
                        <p className="text-xs text-pipboy-green-dim mt-1">
                          → {task.rationale}
                        </p>
                      )}

                      {/* Priority indicator */}
                      {!isCompleted && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`
                            text-[10px] px-1.5 py-0.5 rounded
                            ${task.priority >= 4 ? 'bg-pipboy-red/20 text-pipboy-red' :
                              task.priority >= 3 ? 'bg-pipboy-amber/20 text-pipboy-amber' :
                              'bg-pipboy-green/20 text-pipboy-green-dim'}
                          `}>
                            P{task.priority}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Start button for pending tasks */}
                    {task.status === 'pending' && !isActive && (
                      <button
                        onClick={() => handleStartTask(task.id)}
                        className="text-xs text-pipboy-green-dim hover:text-pipboy-green transition-colors px-2 py-1 border border-pipboy-border rounded hover:border-pipboy-green/50"
                        title="Set as current task"
                      >
                        Start
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
