import React, { useEffect, useState, useRef } from 'react'
import { Target, Loader2, AlertCircle, Plus, Send, X } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useTasksStore } from '@/stores'
import { TaskRow } from './TaskRow'

export const MissionPanel: React.FC = () => {
  const {
    tasks,
    activeTask,
    isLoading,
    error,
    fetchTodaysTasks,
    completeTask,
    smartStartTask,
    getRelatedTasks,
    isExecuting,
    executingTaskId,
    createTask,
  } = useTasksStore()

  // Track which task is expanded
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  // Inline add task state
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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

  const handleSmartStart = async (taskId: string) => {
    // Use the smart start which classifies and executes the task
    const result = await smartStartTask(taskId)
    if (result) {
      console.log('[MissionPanel] Task execution result:', result)
    }
  }

  const handleExpandTask = (taskId: string) => {
    setExpandedTaskId(prev => prev === taskId ? null : taskId)
  }

  // Focus input when adding task
  useEffect(() => {
    if (isAddingTask) {
      inputRef.current?.focus()
    }
  }, [isAddingTask])

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    setIsSubmitting(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      await createTask({
        title: newTaskTitle.trim(),
        status: 'pending',
        priority: 3,
        scheduledDate: today,
        goalId: null,
      })
      await fetchTodaysTasks()
      setNewTaskTitle('')
      setIsAddingTask(false)
    } catch (error) {
      console.error('Failed to create task:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelAdd = () => {
    setNewTaskTitle('')
    setIsAddingTask(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancelAdd()
    }
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
          <div className="flex items-center gap-2">
            {totalCount > 0 && (
              <Badge variant={completedCount === totalCount ? 'success' : 'info'} glow>
                {completedCount}/{totalCount}
              </Badge>
            )}
            {/* Add Task Button */}
            <button
              onClick={() => setIsAddingTask(true)}
              className="p-1 rounded-sm text-pipboy-green-dim hover:text-pipboy-green hover:bg-pipboy-surface transition-colors"
              title="Add new task"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Inline Add Task Form */}
        {isAddingTask && (
          <form onSubmit={handleAddTask} className="p-3 border-b border-pipboy-border bg-pipboy-surface/30">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What needs to be done?"
                className="flex-1 text-sm"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!newTaskTitle.trim() || isSubmitting}
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelAdd}
              >
                <X size={14} />
              </Button>
            </div>
          </form>
        )}

        {signalTasks.length === 0 && !isAddingTask ? (
          <div className="p-6 text-center text-pipboy-green-dim">
            <Target size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No signal tasks for today.</p>
            <p className="text-xs mt-2 opacity-70">
              Click + above or run Morning Briefing to set your mission.
            </p>
          </div>
        ) : signalTasks.length === 0 ? null : (
          <div className="divide-y divide-pipboy-border max-h-[400px] overflow-y-auto">
            {signalTasks.map(task => {
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
                  onToggleComplete={() => handleToggleTask(task.id, task.status)}
                  onStart={() => handleSmartStart(task.id)}
                  onExpand={() => handleExpandTask(task.id)}
                />
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
