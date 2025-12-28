import React, { useState, useRef, useEffect } from 'react'
import { Plus, Send } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export const QuickCapture: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus()
    }
  }, [isExpanded])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskTitle.trim()) return

    // TODO: Create task via IPC
    console.log('Creating task:', taskTitle)

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
      <Button
        type="submit"
        variant="primary"
        size="md"
        disabled={!taskTitle.trim()}
      >
        <Send size={14} />
      </Button>
    </form>
  )
}
