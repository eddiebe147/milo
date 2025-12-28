import React, { useEffect } from 'react'
import { Sun, Target, AlertTriangle, CheckCircle } from 'lucide-react'
import { DialogueModal } from './DialogueModal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { GlowText } from '@/components/ui/GlowText'
import { useAIStore, useGoalsStore, useTasksStore } from '@/stores'

interface MorningBriefingProps {
  isOpen: boolean
  onClose: () => void
}

export const MorningBriefing: React.FC<MorningBriefingProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    dialogueMessages,
    isGenerating,
    lastBriefing,
    error,
    generateMorningBriefing,
    clearMessages,
  } = useAIStore()

  const { goals, fetchGoals } = useGoalsStore()
  const { tasks, fetchTodaysTasks } = useTasksStore()

  // Fetch data when opening
  useEffect(() => {
    if (isOpen) {
      fetchGoals()
      fetchTodaysTasks()
      clearMessages()
    }
  }, [isOpen, fetchGoals, fetchTodaysTasks, clearMessages])

  // Generate briefing
  const handleGenerate = async () => {
    const today = new Date().toISOString().split('T')[0]
    const carryoverTasks = tasks.filter(
      (t) => t.status === 'deferred' || (t.scheduledDate < today && t.status === 'pending')
    )

    await generateMorningBriefing({
      goals,
      tasks: tasks.filter((t) => t.scheduledDate === today || t.status === 'pending'),
      carryoverTasks,
      todayDate: today,
    })
  }

  // Apply signal tasks (mark them as today's priorities)
  const handleApplySignalTasks = async () => {
    if (!lastBriefing) return

    // Update task priorities based on briefing
    for (const signal of lastBriefing.signalTasks) {
      await window.milo?.tasks.update(signal.taskId, {
        priority: signal.priority,
        rationale: signal.rationale,
      })
    }

    // Refresh and close
    await fetchTodaysTasks()
    onClose()
  }

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <DialogueModal
      isOpen={isOpen}
      onClose={onClose}
      title="MORNING BRIEFING"
      subtitle={todayFormatted}
      messages={dialogueMessages}
      isGenerating={isGenerating}
      footer={
        <div className="flex gap-2">
          {!lastBriefing ? (
            <Button
              variant="primary"
              glow
              onClick={handleGenerate}
              disabled={isGenerating || tasks.length === 0}
              className="flex-1"
            >
              <Sun size={16} />
              {isGenerating ? 'Analyzing...' : 'Generate Briefing'}
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={handleGenerate} className="flex-1">
                Regenerate
              </Button>
              <Button variant="primary" glow onClick={handleApplySignalTasks} className="flex-1">
                <CheckCircle size={16} />
                Apply Signal Tasks
              </Button>
            </>
          )}
        </div>
      }
    >
      {/* Signal Tasks Display */}
      {lastBriefing && lastBriefing.signalTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-pipboy-green" />
            <GlowText intensity="medium" className="text-sm font-bold">
              TODAY'S SIGNAL TASKS
            </GlowText>
          </div>

          <div className="space-y-2">
            {lastBriefing.signalTasks.map((signal, index) => {
              const task = tasks.find((t) => t.id === signal.taskId)
              return (
                <Card
                  key={signal.taskId}
                  variant="inset"
                  padding="sm"
                  className="border-l-2 border-l-pipboy-green"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-pipboy-green font-mono text-sm">
                      #{index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-pipboy-green font-medium">
                        {task?.title || signal.taskId}
                      </p>
                      <p className="text-xs text-pipboy-green-dim mt-0.5">
                        {signal.rationale}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Warnings */}
      {lastBriefing && lastBriefing.warnings.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-pipboy-amber" />
            <span className="text-sm font-bold text-pipboy-amber">WARNINGS</span>
          </div>
          {lastBriefing.warnings.map((warning, index) => (
            <p key={index} className="text-xs text-pipboy-amber/80 pl-6">
              • {warning}
            </p>
          ))}
        </div>
      )}

      {/* Empty state */}
      {tasks.length === 0 && !isGenerating && (
        <div className="text-center py-4">
          <p className="text-pipboy-green-dim text-sm">
            No tasks found. Add some tasks first to generate a briefing.
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mt-4 p-3 bg-pipboy-red/10 border border-pipboy-red/30 rounded-sm">
          <p className="text-sm text-pipboy-red">{error}</p>
        </div>
      )}
    </DialogueModal>
  )
}
