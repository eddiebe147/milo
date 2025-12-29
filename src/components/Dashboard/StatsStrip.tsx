import React, { useEffect, useState } from 'react'
import { Flame, Loader2 } from 'lucide-react'
import { formatDuration, getScoreColor } from '@/lib/utils'
import { useScoresStore, useActivityStore, useTasksStore } from '@/stores'

export const StatsStrip: React.FC = () => {
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  const {
    todayScore,
    currentStreak,
    isLoading: scoresLoading,
    fetchTodayScore,
    fetchStreak,
  } = useScoresStore()

  const {
    todaySummary,
    isLoading: activityLoading,
    fetchTodayData,
  } = useActivityStore()

  const {
    tasks,
    isLoading: tasksLoading,
    fetchTodaysTasks,
  } = useTasksStore()

  const isLoading = isInitialLoad && (scoresLoading || activityLoading || tasksLoading)

  // Fetch all data on mount
  useEffect(() => {
    const fetchAll = async () => {
      await Promise.all([
        fetchTodayScore(),
        fetchStreak(),
        fetchTodayData(),
        fetchTodaysTasks(),
      ])
      setIsInitialLoad(false)
    }
    fetchAll()
  }, [])

  // Calculate values
  const score = todayScore?.score ?? 0
  const streak = currentStreak
  const greenMinutes = todaySummary.green
  const totalMinutes = todaySummary.green + todaySummary.amber + todaySummary.red
  const focusPercentage = totalMinutes > 0 ? Math.round((greenMinutes / totalMinutes) * 100) : 0

  const signalTasks = tasks.filter(t => t.status !== 'deferred')
  const signalCompleted = signalTasks.filter(t => t.status === 'completed').length
  const signalTotal = signalTasks.length

  const scoreColor = getScoreColor(score)

  if (isLoading) {
    return (
      <div className="border-t border-pipboy-border px-4 py-3">
        <div className="flex items-center justify-center gap-2 text-pipboy-green-dim">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-xs">Loading stats...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-pipboy-border">
      <div className="grid grid-cols-4 divide-x divide-pipboy-border/50">
        {/* Score */}
        <div className="px-3 py-3 text-center">
          <div className={`text-lg font-bold text-pipboy-${scoreColor} glow-low`}>
            {score}
          </div>
          <div className="text-[10px] text-pipboy-green-dim uppercase tracking-wider">
            score
          </div>
        </div>

        {/* Streak */}
        <div className="px-3 py-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <Flame size={14} className="text-pipboy-amber" />
            <span className="text-lg font-bold text-pipboy-green glow-low">
              {streak}
            </span>
          </div>
          <div className="text-[10px] text-pipboy-green-dim uppercase tracking-wider">
            streak
          </div>
        </div>

        {/* Focus time */}
        <div className="px-3 py-3 text-center">
          <div className="text-lg font-bold text-pipboy-green glow-low">
            {formatDuration(greenMinutes)}
          </div>
          <div className="text-[10px] text-pipboy-green-dim uppercase tracking-wider">
            focused
          </div>
        </div>

        {/* Focus rate or Tasks */}
        <div className="px-3 py-3 text-center">
          <div className="text-lg font-bold text-pipboy-green glow-low">
            {signalTotal > 0 ? `${signalCompleted}/${signalTotal}` : `${focusPercentage}%`}
          </div>
          <div className="text-[10px] text-pipboy-green-dim uppercase tracking-wider">
            {signalTotal > 0 ? 'tasks' : 'rate'}
          </div>
        </div>
      </div>
    </div>
  )
}
