import React, { useState, useEffect } from 'react'
import {
  X,
  Globe,
  Terminal,
  Monitor,
  Copy,
  Check,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

// Execution target options
export type ExecutionTarget = 'claude_web' | 'claude_cli' | 'claude_desktop'

export interface ExecutionTargetOption {
  id: ExecutionTarget
  label: string
  description: string
  icon: React.ElementType
  shortcut: string
}

const EXECUTION_TARGETS: ExecutionTargetOption[] = [
  {
    id: 'claude_web',
    label: 'Claude Web',
    description: 'Open claude.ai in browser',
    icon: Globe,
    shortcut: '⌘1',
  },
  {
    id: 'claude_cli',
    label: 'Claude CLI',
    description: 'New iTerm2 session',
    icon: Terminal,
    shortcut: '⌘2',
  },
  {
    id: 'claude_desktop',
    label: 'Claude Desktop',
    description: 'Native Mac app',
    icon: Monitor,
    shortcut: '⌘3',
  },
]

interface TaskExecutionModalProps {
  isOpen: boolean
  task: Task | null
  isGeneratingPrompt: boolean
  generatedPrompt: string | null
  projectPath?: string | null
  onClose: () => void
  onExecute: (target: ExecutionTarget, prompt: string) => void
  onRegeneratePrompt?: () => void
}

export const TaskExecutionModal: React.FC<TaskExecutionModalProps> = ({
  isOpen,
  task,
  isGeneratingPrompt,
  generatedPrompt,
  projectPath,
  onClose,
  onExecute,
  onRegeneratePrompt,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<ExecutionTarget>('claude_cli')
  const [editedPrompt, setEditedPrompt] = useState('')
  const [isPromptExpanded, setIsPromptExpanded] = useState(true)
  const [copied, setCopied] = useState(false)

  // Update edited prompt when generated prompt changes
  useEffect(() => {
    if (generatedPrompt) {
      setEditedPrompt(generatedPrompt)
    }
  }, [generatedPrompt])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Cmd+1/2/3 to select target
      if (e.metaKey && e.key === '1') {
        e.preventDefault()
        setSelectedTarget('claude_web')
      } else if (e.metaKey && e.key === '2') {
        e.preventDefault()
        setSelectedTarget('claude_cli')
      } else if (e.metaKey && e.key === '3') {
        e.preventDefault()
        setSelectedTarget('claude_desktop')
      }

      // Cmd+Enter to execute
      if (e.metaKey && e.key === 'Enter' && editedPrompt) {
        e.preventDefault()
        onExecute(selectedTarget, editedPrompt)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedTarget, editedPrompt, onClose, onExecute])

  // Copy prompt to clipboard
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(editedPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy prompt:', err)
    }
  }

  if (!isOpen || !task) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-pipboy-background border border-pipboy-green/50 rounded-sm shadow-glow-green">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-pipboy-border">
          <div className="flex items-center gap-3">
            <Sparkles size={18} className="text-pipboy-green" />
            <div>
              <h2 className="text-sm font-bold text-pipboy-green tracking-wide">
                EXECUTE TASK
              </h2>
              <p className="text-xs text-pipboy-green-dim truncate max-w-[400px]">
                {task.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-pipboy-green-dim hover:text-pipboy-green transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Target Selection */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-pipboy-green-dim mb-2 block">
              Choose Target
            </label>
            <div className="grid grid-cols-3 gap-2">
              {EXECUTION_TARGETS.map((target) => {
                const Icon = target.icon
                const isSelected = selectedTarget === target.id
                return (
                  <button
                    key={target.id}
                    onClick={() => setSelectedTarget(target.id)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-sm border transition-all',
                      isSelected
                        ? 'border-pipboy-green bg-pipboy-green/10 shadow-glow-green'
                        : 'border-pipboy-border hover:border-pipboy-green/50 bg-pipboy-surface'
                    )}
                  >
                    <Icon
                      size={24}
                      className={cn(
                        'transition-colors',
                        isSelected ? 'text-pipboy-green' : 'text-pipboy-green-dim'
                      )}
                    />
                    <div className="text-center">
                      <p
                        className={cn(
                          'text-xs font-medium',
                          isSelected ? 'text-pipboy-green' : 'text-pipboy-green-dim'
                        )}
                      >
                        {target.label}
                      </p>
                      <p className="text-[10px] text-pipboy-green-dim/70">
                        {target.description}
                      </p>
                    </div>
                    <span className="text-[10px] text-pipboy-green-dim/50">
                      {target.shortcut}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Project Path (for CLI) */}
          {selectedTarget === 'claude_cli' && projectPath && (
            <div className="text-xs text-pipboy-green-dim bg-pipboy-surface p-2 rounded-sm border border-pipboy-border">
              <span className="text-pipboy-green-dim/70">Working directory: </span>
              <span className="text-pipboy-green font-mono">{projectPath}</span>
            </div>
          )}

          {/* Generated Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-pipboy-green-dim hover:text-pipboy-green transition-colors"
              >
                Prompt Preview
                {isPromptExpanded ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
              </button>
              <div className="flex items-center gap-2">
                {onRegeneratePrompt && (
                  <button
                    onClick={onRegeneratePrompt}
                    disabled={isGeneratingPrompt}
                    className="flex items-center gap-1 text-[10px] text-pipboy-green-dim hover:text-pipboy-green transition-colors disabled:opacity-50"
                  >
                    <Sparkles size={10} />
                    Regenerate
                  </button>
                )}
                <button
                  onClick={handleCopyPrompt}
                  disabled={!editedPrompt}
                  className="flex items-center gap-1 text-[10px] text-pipboy-green-dim hover:text-pipboy-green transition-colors disabled:opacity-50"
                >
                  {copied ? (
                    <>
                      <Check size={10} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={10} />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {isPromptExpanded && (
              <div className="relative">
                {isGeneratingPrompt ? (
                  <div className="bg-pipboy-surface border border-pipboy-border rounded-sm p-6 flex flex-col items-center justify-center text-pipboy-green-dim">
                    <Loader2 size={24} className="animate-spin mb-2" />
                    <p className="text-xs">Generating prompt...</p>
                    <p className="text-[10px] text-pipboy-green-dim/70 mt-1">
                      Analyzing task context and expected output
                    </p>
                  </div>
                ) : (
                  <textarea
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    placeholder="Prompt will be generated..."
                    className={cn(
                      'w-full h-48 p-3 text-xs font-mono',
                      'bg-pipboy-surface border border-pipboy-border rounded-sm',
                      'text-pipboy-green placeholder:text-pipboy-green-dim/50',
                      'focus:outline-none focus:border-pipboy-green/50',
                      'resize-none'
                    )}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-pipboy-border bg-pipboy-surface/50">
          <p className="text-[10px] text-pipboy-green-dim">
            Press <kbd className="px-1 py-0.5 bg-pipboy-surface border border-pipboy-border rounded text-[9px]">⌘↵</kbd> to launch
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-pipboy-green-dim border border-pipboy-border rounded-sm hover:border-pipboy-green/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onExecute(selectedTarget, editedPrompt)}
              disabled={!editedPrompt || isGeneratingPrompt}
              className={cn(
                'flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-sm border transition-all',
                editedPrompt && !isGeneratingPrompt
                  ? 'border-pipboy-green bg-pipboy-green/10 text-pipboy-green hover:bg-pipboy-green/20 shadow-glow-green'
                  : 'border-pipboy-border text-pipboy-green-dim cursor-not-allowed'
              )}
            >
              {(() => {
                const target = EXECUTION_TARGETS.find(t => t.id === selectedTarget)
                const Icon = target?.icon || Globe
                return (
                  <>
                    <Icon size={14} />
                    <span>Launch {target?.label}</span>
                  </>
                )
              })()}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskExecutionModal
