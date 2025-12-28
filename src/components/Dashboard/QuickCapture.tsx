import React, { useState, useRef, useEffect } from 'react'
import { Plus, Send, Sparkles, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useTasksStore, useAIStore } from '@/stores'

export const QuickCapture: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [isAiParsing, setIsAiParsing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { createTask, fetchTodaysTasks } = useTasksStore()
  const { parseTasks, isInitialized } = useAIStore()

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus()
    }
  }, [isExpanded])

  // Create a simple task directly
  const createSimpleTask = async (title: string) => {
    const today = new Date().toISOString().split('T')[0]
    await createTask({
      title: title.trim(),
      status: 'pending',
      priority: 3, // Default medium priority (1-5 scale)
      scheduledDate: today,
      goalId: null,
    })
    await fetchTodaysTasks()
  }

  // Convert string priority to numeric (1-5 scale)
  const priorityToNumber = (priority: 'high' | 'medium' | 'low'): number => {
    switch (priority) {
      case 'high': return 5
      case 'medium': return 3
      case 'low': return 1
      default: return 3
    }
  }

  // Use AI to parse tasks from natural language
  const handleAiParse = async () => {
    if (!taskTitle.trim()) return

    setIsAiParsing(true)
    try {
      const result = await parseTasks(taskTitle)
      if (result && result.tasks.length > 0) {
        // Create all parsed tasks
        for (const task of result.tasks) {
          await createTask({
            title: task.title,
            description: task.description,
            status: 'pending',
            priority: priorityToNumber(task.priority),
            scheduledDate: task.dueDate || new Date().toISOString().split('T')[0],
            goalId: null, // Could be linked later based on goalHint
          })
        }
        await fetchTodaysTasks()
        setTaskTitle('')
        setIsExpanded(false)
      }
    } catch (error) {
      console.error('AI parsing failed:', error)
      // Fall back to simple task creation
      await createSimpleTask(taskTitle)
      setTaskTitle('')
      setIsExpanded(false)
    } finally {
      setIsAiParsing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskTitle.trim()) return

    // Create task directly
    await createSimpleTask(taskTitle)
    setTaskTitle('')
    setIsExpanded(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setTaskTitle('')
      setIsExpanded(false)
    }
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`
          w-full p-3 rounded-sm border border-dashed border-pipboy-border
          flex items-center justify-center gap-2
          text-pipboy-green-dim hover:text-pipboy-green
          hover:border-pipboy-green/50 hover:bg-pipboy-surface/50
          transition-all duration-200
        `}
      >
        <Plus size={16} />
        <span className="text-sm">Quick capture task</span>
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="flex-1">
        <Input
          ref={inputRef}
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What needs to be done?"
          className="text-sm"
        />
      </div>
      {/* AI Parse Button - uses Claude to parse natural language */}
      {isInitialized && (
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={handleAiParse}
          disabled={isAiParsing || !taskTitle.trim()}
          title="Parse with AI (extracts multiple tasks, dates, priorities)"
        >
          {isAiParsing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
        </Button>
      )}
      <Button
        type="submit"
        variant="primary"
        size="md"
        disabled={!taskTitle.trim() || isAiParsing}
      >
        <Send size={14} />
      </Button>
    </form>
  )
}
