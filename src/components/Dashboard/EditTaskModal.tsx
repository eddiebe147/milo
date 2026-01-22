import React, { useState, useEffect, useRef } from 'react'
import { X, Save, Loader2, Mic, MicOff } from 'lucide-react'
import { useTasksStore, useProjectsStore } from '@/stores'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import type { Task } from '@/types'

interface EditTaskModalProps {
    isOpen: boolean
    onClose: () => void
    task: Task | null
}

/**
 * EditTaskModal - Modal for editing existing tasks
 *
 * Features:
 * - Pre-populated task data (title, project, priority)
 * - Voice dictation support for title field
 * - Project selector dropdown
 * - Priority selector (1-5)
 * - Auto-focuses input on open
 * - Escape to close
 * - Updates task via store
 */
export const EditTaskModal: React.FC<EditTaskModalProps> = ({
    isOpen,
    onClose,
    task,
}) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const { updateTask, refreshSignalQueue } = useTasksStore()
    const { projects } = useProjectsStore()

    const [title, setTitle] = useState('')
    const [projectId, setProjectId] = useState<string | null>(null)
    const [priority, setPriority] = useState(3)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Voice input hook
    const {
        isListening,
        isSupported: isVoiceSupported,
        toggleListening,
        stopListening,
    } = useVoiceInput({
        onTranscript: (transcript, isFinal) => {
            if (isFinal) {
                setTitle(prev => prev + transcript)
            }
        },
        continuous: true,
    })

    // Populate form when task changes or modal opens
    useEffect(() => {
        if (isOpen && task) {
            setTitle(task.title)
            setProjectId(task.categoryId || task.projectId || null)
            setPriority(task.priority)
            setError(null)
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [isOpen, task])

    // Stop listening when modal closes
    useEffect(() => {
        if (!isOpen && isListening) {
            stopListening()
        }
    }, [isOpen, isListening, stopListening])

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                if (isListening) {
                    stopListening()
                }
                onClose()
            }
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose, isListening, stopListening])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !task) return

        // Stop voice if active
        if (isListening) {
            stopListening()
        }

        setIsSubmitting(true)
        setError(null)

        try {
            await updateTask(task.id, {
                title: title.trim(),
                priority,
                categoryId: projectId,
            })
            await refreshSignalQueue()
            onClose()
        } catch (err) {
            setError((err as Error).message || 'Failed to update task')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen || !task) return null

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
                        EDIT TASK
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
                    {/* Title with voice input */}
                    <div>
                        <label className="block text-[10px] text-pipboy-green-dim mb-1 uppercase tracking-wide">
                            Task Title
                        </label>
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="What needs to be done?"
                                className={`
                  flex-1 px-3 py-2 rounded-sm
                  bg-pipboy-surface border 
                  ${isListening ? 'border-red-500/70' : 'border-pipboy-border'}
                  text-pipboy-green placeholder-pipboy-green-dim/50
                  focus:outline-none focus:border-pipboy-green/50
                  font-mono text-sm
                  transition-colors
                `}
                            />
                            {/* Voice input button */}
                            {isVoiceSupported && (
                                <button
                                    type="button"
                                    onClick={toggleListening}
                                    className={`
                    flex-shrink-0 w-10 h-10 rounded-sm
                    border transition-all duration-200
                    flex items-center justify-center
                    ${isListening
                                            ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                                            : 'bg-pipboy-surface border-pipboy-border text-pipboy-green-dim hover:text-pipboy-green hover:border-pipboy-green/50'
                                        }
                  `}
                                    title={isListening ? 'Stop dictation' : 'Start voice dictation'}
                                >
                                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                                </button>
                            )}
                        </div>
                        {isListening && (
                            <p className="text-[10px] text-red-400 mt-1 animate-pulse">
                                🎤 Listening... speak now
                            </p>
                        )}
                    </div>

                    {/* Project */}
                    <div>
                        <label className="block text-[10px] text-pipboy-green-dim mb-1 uppercase tracking-wide">
                            Project
                        </label>
                        <select
                            value={projectId || ''}
                            onChange={(e) => setProjectId(e.target.value || null)}
                            className="
                w-full px-3 py-2 rounded-sm
                bg-pipboy-surface border border-pipboy-border
                text-pipboy-green
                focus:outline-none focus:border-pipboy-green/50
                font-mono text-sm
              "
                        >
                            <option value="">No project</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="block text-[10px] text-pipboy-green-dim mb-1 uppercase tracking-wide">
                            Priority
                        </label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPriority(p)}
                                    className={`
                    flex-1 py-1.5 rounded-sm text-xs font-mono
                    border transition-all
                    ${priority === p
                                            ? 'bg-pipboy-green/20 border-pipboy-green text-pipboy-green'
                                            : 'bg-pipboy-surface border-pipboy-border text-pipboy-green-dim hover:border-pipboy-green/50'
                                        }
                  `}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-between text-[9px] text-pipboy-green-dim/60 mt-1 px-1">
                            <span>Low</span>
                            <span>High</span>
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
                            disabled={!title.trim() || isSubmitting}
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
                                    <Save size={14} />
                                    <span>Save</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default EditTaskModal
