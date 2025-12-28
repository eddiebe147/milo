import React, { useEffect } from 'react'
import { Moon, Trophy, TrendingUp, ArrowRight, RefreshCw } from 'lucide-react'
import { DialogueModal } from './DialogueModal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { GlowText } from '@/components/ui/GlowText'
import { Progress } from '@/components/ui/Progress'
import { useAIStore, useTasksStore, useScoresStore, useActivityStore } from '@/stores'

interface EveningReviewProps {
  isOpen: boolean
  onClose: () => void
}

export const EveningReview: React.FC<EveningReviewProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    dialogueMessages,
    isGenerating,
    lastReview,
    error,
    generateEveningReview,
    clearMessages,
  } = useAIStore()

  const { tasks, fetchTodaysTasks } = useTasksStore()
  const { todayScore, fetchTodayScore } = useScoresStore()
  const { todaySummary, fetchTodayData } = useActivityStore()

  // Fetch data when opening
  useEffect(() => {
    if (isOpen) {
      fetchTodaysTasks()
      fetchTodayScore()
      fetchTodayData()
      clearMessages()
    }
  }, [isOpen, fetchTodaysTasks, fetchTodayScore, fetchTodayData, clearMessages])

  // Generate review
  const handleGenerate = async () => {
    if (!todayScore) return

    const signalTasks = tasks.filter((t) => t.rationale) // Tasks with AI rationale = signal tasks
    const completedTasks = tasks.filter((t) => t.status === 'completed')

    await generateEveningReview({
      signalTasks,
      completedTasks,
      score: todayScore,
      activitySummary: {
        greenMinutes: todaySummary.green,
        amberMinutes: todaySummary.amber,
        redMinutes: todaySummary.red,
      },
      todayDate: new Date().toISOString().split('T')[0],
    })
  }

  // Handle carryover recommendations
  const handleCarryover = async (taskId: string, recommendation: 'defer' | 'tomorrow' | 'break_down') => {
    if (recommendation === 'defer') {
      await window.milo?.tasks.defer(taskId)
    } else if (recommendation === 'tomorrow') {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      await window.milo?.tasks.update(taskId, {
        scheduledDate: tomorrow.toISOString().split('T')[0],
      })
    }
    // For 'break_down', user needs to manually split the task
    await fetchTodaysTasks()
  }

  const completionRate = lastReview
    ? Math.round((lastReview.summary.completed / lastReview.summary.total) * 100) || 0
    : 0

  return (
    <DialogueModal
      isOpen={isOpen}
      onClose={onClose}
      title="EVENING REVIEW"
      subtitle="End of Day Debrief"
      messages={dialogueMessages}
      isGenerating={isGenerating}
      footer={
        <div className="flex gap-2">
          <Button
            variant={lastReview ? 'secondary' : 'primary'}
            glow={!lastReview}
            onClick={handleGenerate}
            disabled={isGenerating || !todayScore}
            className="flex-1"
          >
            <Moon size={16} />
            {isGenerating ? 'Analyzing...' : lastReview ? 'Regenerate' : 'Generate Review'}
          </Button>
          {lastReview && (
            <Button variant="primary" onClick={onClose} className="flex-1">
              Done
            </Button>
          )}
        </div>
      }
    >
      {/* Summary Stats */}
      {lastReview && (
        <div className="space-y-4">
          {/* Completion Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <GlowText intensity="medium" className="text-sm font-bold">
                MISSION COMPLETION
              </GlowText>
              <span className="text-sm text-pipboy-green font-mono">
                {lastReview.summary.completed}/{lastReview.summary.total}
              </span>
            </div>
            <Progress
              value={completionRate}
              variant={completionRate >= 80 ? 'success' : completionRate >= 50 ? 'warning' : 'default'}
              showLabel
            />
          </div>

          {/* Time Breakdown */}
          <Card variant="inset" padding="sm">
            <div className="flex justify-between text-sm">
              <div className="text-center">
                <p className="text-pipboy-green font-mono">{lastReview.summary.focusMinutes}m</p>
                <p className="text-xs text-pipboy-green-dim">Focus</p>
              </div>
              <div className="text-center">
                <p className="text-pipboy-red font-mono">{lastReview.summary.driftMinutes}m</p>
                <p className="text-xs text-pipboy-green-dim">Drift</p>
              </div>
              <div className="text-center">
                <p className="text-pipboy-amber font-mono">
                  {Math.round((lastReview.summary.focusMinutes / (lastReview.summary.focusMinutes + lastReview.summary.driftMinutes)) * 100) || 0}%
                </p>
                <p className="text-xs text-pipboy-green-dim">S/N Ratio</p>
              </div>
            </div>
          </Card>

          {/* Wins */}
          {lastReview.wins.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-pipboy-green" />
                <span className="text-sm font-bold text-pipboy-green">WINS</span>
              </div>
              {lastReview.wins.map((win, index) => (
                <p key={index} className="text-xs text-pipboy-green-dim pl-6">
                  • {win}
                </p>
              ))}
            </div>
          )}

          {/* Improvements */}
          {lastReview.improvements.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-pipboy-amber" />
                <span className="text-sm font-bold text-pipboy-amber">IMPROVEMENTS</span>
              </div>
              {lastReview.improvements.map((improvement, index) => (
                <p key={index} className="text-xs text-pipboy-amber/80 pl-6">
                  • {improvement}
                </p>
              ))}
            </div>
          )}

          {/* Carryover Tasks */}
          {lastReview.carryover.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw size={16} className="text-pipboy-green-dim" />
                <span className="text-sm font-bold text-pipboy-green-dim">CARRYOVER</span>
              </div>
              {lastReview.carryover.map((item) => {
                const task = tasks.find((t) => t.id === item.taskId)
                return (
                  <Card key={item.taskId} variant="inset" padding="sm" className="space-y-2">
                    <p className="text-sm text-pipboy-green">{task?.title || item.taskId}</p>
                    <p className="text-xs text-pipboy-green-dim">{item.reason}</p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCarryover(item.taskId, item.recommendation)}
                      >
                        <ArrowRight size={12} />
                        {item.recommendation === 'defer' && 'Defer'}
                        {item.recommendation === 'tomorrow' && 'Tomorrow'}
                        {item.recommendation === 'break_down' && 'Break Down'}
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Tomorrow Focus */}
          {lastReview.tomorrowFocus && (
            <Card variant="elevated" padding="sm" className="mt-4">
              <p className="text-xs text-pipboy-green-dim mb-1">TOMORROW'S FOCUS</p>
              <p className="text-sm text-pipboy-green">{lastReview.tomorrowFocus}</p>
            </Card>
          )}
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
