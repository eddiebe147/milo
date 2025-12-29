import React, { useState, useEffect } from 'react'
import { Radio, Loader2, AlertCircle, RefreshCw, Pause } from 'lucide-react'
import { useTasksStore, useProjectsStore, useSettingsStore } from '@/stores'
import { TaskRow } from './TaskRow'
import { TaskExecutionModal, type ExecutionTarget } from './TaskExecutionModal'
import type { Task } from '@/types'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'

/**
 * SortableTaskRow Component
 *
 * Wraps TaskRow with drag-and-drop functionality using @dnd-kit/sortable
 */
interface SortableTaskRowProps {
  task: Task
  isActive: boolean
  isExpanded: boolean
  relatedTasks: Task[]
  isExecuting: boolean
  onToggleComplete: () => void
  onStart: () => void
  onExpand: () => void
}

const SortableTaskRow: React.FC<SortableTaskRowProps> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-b border-pipboy-border/50 last:border-b-0 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* Invisible drag handle overlay on left side */}
      <div className="relative">
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 top-0 bottom-0 w-8 cursor-grab active:cursor-grabbing z-20 hover:bg-pipboy-green/5 focus:bg-pipboy-green/10 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-pipboy-green/50"
          aria-label="Drag to reorder task. Use arrow keys when focused to move."
          role="button"
          tabIndex={0}
        />
        <TaskRow {...props} />
      </div>
    </div>
  )
}

/**
 * SignalQueue Component
 *
 * Displays top 3-5 priority tasks from the signal queue with terminal aesthetic.
 * Features:
 * - Adjustable queue size (3-5 tasks)
 * - Drag-and-drop reordering (grab left edge of task)
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
    getRelatedTasks,
    isExecuting,
    executingTaskId,
    reorderSignalQueue,
  } = useTasksStore()

  // Projects store for category badges (future use)
  const _projectsStore = useProjectsStore()
  void _projectsStore // Suppress unused warning - will use for project display

  // Settings store for refill mode
  const { settings, toggleRefillMode } = useSettingsStore()
  const refillMode = settings.refillMode

  // Track which task is expanded
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  // Modal state
  const [modalTask, setModalTask] = useState<Task | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null)
  const [projectPath, setProjectPath] = useState<string | null>(null)

  // Fetch queue on mount
  useEffect(() => {
    fetchSignalQueue()
  }, [fetchSignalQueue])

  // Handler: Toggle completion
  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    if (currentStatus === 'completed') return
    await completeTask(taskId)
  }

  // Handler: Open execution modal (new flow)
  const handleOpenExecutionModal = async (task: Task) => {
    setModalTask(task)
    setIsModalOpen(true)
    setIsGeneratingPrompt(true)
    setGeneratedPrompt(null)
    setProjectPath(null)

    try {
      // Generate the prompt for this task
      const result = await window.milo.taskExecution.generatePrompt(task.id)
      setGeneratedPrompt(result.prompt)
      setProjectPath(result.projectPath)
    } catch (error) {
      console.error('[SignalQueue] Failed to generate prompt:', error)
      // Set a fallback prompt
      setGeneratedPrompt(`## Task: ${task.title}\n\n${task.description || 'No description provided.'}\n\nPlease complete this task.`)
    } finally {
      setIsGeneratingPrompt(false)
    }
  }

  // Handler: Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setModalTask(null)
    setGeneratedPrompt(null)
    setProjectPath(null)
  }

  // Handler: Execute with selected target
  const handleExecute = async (target: ExecutionTarget, prompt: string) => {
    if (!modalTask) return

    try {
      // First, mark the task as started
      await window.milo.tasks.start(modalTask.id)
      await window.milo.tasks.recordWork(modalTask.id)

      // Execute with the selected target
      const result = await window.milo.taskExecution.executeWithTarget(target, prompt, projectPath)
      console.log('[SignalQueue] Execution result:', result)

      // Close the modal
      handleCloseModal()

      // Refresh the queue
      await fetchSignalQueue()
    } catch (error) {
      console.error('[SignalQueue] Execution failed:', error)
    }
  }

  // Handler: Regenerate prompt
  const handleRegeneratePrompt = async () => {
    if (!modalTask) return

    setIsGeneratingPrompt(true)
    try {
      const result = await window.milo.taskExecution.generatePrompt(modalTask.id)
      setGeneratedPrompt(result.prompt)
      setProjectPath(result.projectPath)
    } catch (error) {
      console.error('[SignalQueue] Failed to regenerate prompt:', error)
    } finally {
      setIsGeneratingPrompt(false)
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

  // Setup drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts (prevents accidental drags)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handler: Drag end - reorder tasks
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = signalQueue.findIndex((task) => task.id === active.id)
    const newIndex = signalQueue.findIndex((task) => task.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(signalQueue, oldIndex, newIndex)
      const taskIds = newOrder.map((task) => task.id)

      // Optimistically update UI, then persist to database
      await reorderSignalQueue(taskIds)
    }
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

      {/* Task queue with drag-and-drop */}
      {signalQueue.length === 0 ? (
        <div className="p-6 text-center text-pipboy-green-dim">
          <p className="text-xs">No tasks in queue.</p>
          <p className="text-[10px] mt-1 opacity-70">
            Create tasks to populate the signal queue
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext
            items={signalQueue.map((task) => task.id)}
            strategy={verticalListSortingStrategy}
          >
            <div>
              {signalQueue.map((task) => {
                const isActive = activeTask?.id === task.id
                const relatedTasks = getRelatedTasks(task)
                const isTaskExecuting = isExecuting && executingTaskId === task.id

                return (
                  <SortableTaskRow
                    key={task.id}
                    task={task}
                    isActive={isActive}
                    isExpanded={expandedTaskId === task.id}
                    relatedTasks={relatedTasks}
                    isExecuting={isTaskExecuting}
                    onToggleComplete={() => handleToggleComplete(task.id, task.status)}
                    onStart={() => handleOpenExecutionModal(task)}
                    onExpand={() => handleExpandTask(task.id)}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Execution Modal */}
      <TaskExecutionModal
        isOpen={isModalOpen}
        task={modalTask}
        isGeneratingPrompt={isGeneratingPrompt}
        generatedPrompt={generatedPrompt}
        projectPath={projectPath}
        onClose={handleCloseModal}
        onExecute={handleExecute}
        onRegeneratePrompt={handleRegeneratePrompt}
      />
    </div>
  )
}
