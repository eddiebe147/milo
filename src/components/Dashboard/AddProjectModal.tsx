import React, { useState, useEffect, useRef } from 'react'
import { X, FolderPlus, Loader2 } from 'lucide-react'
import { useProjectsStore } from '@/stores'

interface AddProjectModalProps {
  isOpen: boolean
  onClose: () => void
}

// Preset colors for projects
const PROJECT_COLORS = [
  '#00ff41', // pipboy green
  '#4ade80', // green
  '#22d3ee', // cyan
  '#60a5fa', // blue
  '#a78bfa', // purple
  '#f472b6', // pink
  '#fb923c', // orange
  '#facc15', // yellow
  '#f87171', // red
]

/**
 * AddProjectModal - Modal for creating new projects
 *
 * Features:
 * - Project name input (required)
 * - Color picker with presets
 * - Auto-focuses input on open
 * - Escape to close
 */
export const AddProjectModal: React.FC<AddProjectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const { createProject } = useProjectsStore()

  const [name, setName] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('')
      setColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)])
      setError(null)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      await createProject({
        name: name.trim(),
        color,
        isActive: true,
        sortOrder: 0, // Will be sorted to end
      })
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Failed to create project')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-pipboy-background border border-pipboy-border rounded-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-pipboy-border">
          <h2 className="text-sm font-bold text-pipboy-green tracking-wide">
            NEW PROJECT
          </h2>
          <button
            onClick={onClose}
            className="text-pipboy-green-dim hover:text-pipboy-green transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[10px] text-pipboy-green-dim mb-1 uppercase tracking-wide">
              Project Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., MILO Development"
              className="
                w-full px-3 py-2 rounded-sm
                bg-pipboy-surface border border-pipboy-border
                text-pipboy-green placeholder-pipboy-green-dim/50
                focus:outline-none focus:border-pipboy-green/50
                font-mono text-sm
              "
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-[10px] text-pipboy-green-dim mb-1 uppercase tracking-wide">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`
                    w-8 h-8 rounded-sm transition-all
                    ${color === c
                      ? 'ring-2 ring-offset-2 ring-offset-pipboy-background ring-pipboy-green scale-110'
                      : 'hover:scale-105'
                    }
                  `}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-[10px] text-pipboy-green-dim mb-1 uppercase tracking-wide">
              Preview
            </label>
            <div className="flex items-center gap-2 p-2 bg-pipboy-surface rounded-sm border border-pipboy-border">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-pipboy-green font-mono text-sm">
                {name || 'Project Name'}
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/30 rounded-sm px-3 py-2">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="
                flex-1 py-2 rounded-sm
                border border-pipboy-border text-pipboy-green-dim
                hover:border-pipboy-green/50 hover:text-pipboy-green
                transition-all text-sm font-mono
              "
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="
                flex-1 py-2 rounded-sm
                bg-pipboy-green/20 border border-pipboy-green text-pipboy-green
                hover:bg-pipboy-green/30
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all text-sm font-mono
                flex items-center justify-center gap-2
              "
            >
              {isSubmitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <FolderPlus size={14} />
                  <span>Create</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddProjectModal
