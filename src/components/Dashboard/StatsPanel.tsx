import React, { useEffect, useState } from 'react'
import { TrendingUp, Flame, Clock, Target, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { CircularProgress } from '@/components/ui/Progress'
import { getScoreLabel, getScoreColor, formatDuration } from '@/lib/utils'
import { useScoresStore, useActivityStore, useTasksStore } from '@/stores'

export const StatsPanel: React.FC = () => {
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const {
    todayScore,
    currentStreak,
    recentScores,
    isLoading: scoresLoading,
    error: scoresError,
    fetchTodayScore,
    fetchStreak,
    fetchRecentScores,
    getScoreBreakdown,
  } = useScoresStore()

  const { todaySummary, isLoading: activityLoading, error: activityError, fetchTodayData } = useActivityStore()
  const { tasks, isLoading: tasksLoading, error: tasksError, fetchTodaysTasks } = useTasksStore()

  // Aggregate loading and error states
  const isLoading = isInitialLoad && (scoresLoading || activityLoading || tasksLoading)
  const error = loadError || scoresError || activityError || tasksError

  // Fetch all data on mount
  const fetchAllData = async () => {
    setLoadError(null)
    try {
      await Promise.all([
        fetchTodayScore(),
        fetchStreak(),
        fetchRecentScores(7),
        getScoreBreakdown(),
        fetchTodayData(),
        fetchTodaysTasks(),
      ])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setIsInitialLoad(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  // Calculate values from real data or use fallbacks
  const score = todayScore?.score ?? 0
  const streak = currentStreak
  const greenMinutes = todaySummary.green
  const totalMinutes = todaySummary.green + todaySummary.amber + todaySummary.red
  const signalTasks = tasks.filter(t => t.rationale) // Tasks marked as signal tasks
  const signalCompleted = signalTasks.filter(t => t.status === 'completed').length
  const signalTotal = signalTasks.length || tasks.filter(t => t.status !== 'deferred').length

  const focusPercentage = totalMinutes > 0 ? Math.round((greenMinutes / totalMinutes) * 100) : 0
  const scoreLabel = getScoreLabel(score)
  const scoreColor = getScoreColor(score)

  // Loading state
  if (isLoading) {
    return (
      <Card variant="default" padding="md">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-pipboy-green" />
            <CardTitle>Today's Signal</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-8 text-pipboy-green-dim">
            <Loader2 size={24} className="animate-spin mb-2" />
            <p className="text-sm">Loading stats...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card variant="default" padding="md">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-pipboy-green" />
            <CardTitle>Today's Signal</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-6 text-pipboy-red">
            <AlertCircle size={24} className="mb-2" />
            <p className="text-sm">Failed to load stats</p>
            <p className="text-xs text-pipboy-red/70 mt-1 max-w-[200px] text-center">{error}</p>
            <button
              onClick={fetchAllData}
              className="mt-3 flex items-center gap-1 text-xs text-pipboy-green hover:text-pipboy-green/80"
            >
              <RefreshCw size={12} />
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="default" padding="md">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-pipboy-green" />
          <CardTitle>Today's Signal</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex items-center gap-4">
          {/* Main score circle */}
          <div className="flex flex-col items-center">
            <CircularProgress
              value={score}
              max={100}
              size={80}
              strokeWidth={6}
              variant={scoreColor === 'green' ? 'success' : scoreColor === 'amber' ? 'warning' : 'danger'}
            />
            <span className={`text-xs mt-2 text-pipboy-${scoreColor}`}>
              {scoreLabel}
            </span>
          </div>

          {/* Stats grid */}
          <div className="flex-1 grid grid-cols-2 gap-3">
            {/* Streak */}
            <div className="flex items-center gap-2">
              <Flame size={14} className="text-pipboy-amber" />
              <div>
                <div className="text-lg font-bold text-pipboy-green glow-low">
                  {streak}
                </div>
                <div className="text-xs text-pipboy-green-dim">
                  day streak
                </div>
              </div>
            </div>

            {/* Focus time */}
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-pipboy-green" />
              <div>
                <div className="text-lg font-bold text-pipboy-green glow-low">
                  {formatDuration(greenMinutes)}
                </div>
                <div className="text-xs text-pipboy-green-dim">
                  focused
                </div>
              </div>
            </div>

            {/* Focus percentage */}
            <div className="flex items-center gap-2">
              <Target size={14} className="text-pipboy-green" />
              <div>
                <div className="text-lg font-bold text-pipboy-green glow-low">
                  {focusPercentage}%
                </div>
                <div className="text-xs text-pipboy-green-dim">
                  focus rate
                </div>
              </div>
            </div>

            {/* Tasks completed */}
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-pipboy-green flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-pipboy-green" />
              </div>
              <div>
                <div className="text-lg font-bold text-pipboy-green glow-low">
                  {signalCompleted}/{signalTotal}
                </div>
                <div className="text-xs text-pipboy-green-dim">
                  signal done
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly trend chart */}
        {recentScores.length > 0 && (
          <div className="mt-4 pt-3 border-t border-pipboy-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-pipboy-green-dim">7-Day Trend</span>
              <span className="text-xs text-pipboy-green-dim font-mono">
                avg: {Math.round(recentScores.reduce((sum, s) => sum + s.score, 0) / recentScores.length)}
              </span>
            </div>
            <div className="flex items-end gap-1 h-12">
              {/* Ensure we show 7 days, pad with zeros if needed */}
              {Array.from({ length: 7 }, (_, i) => {
                const dayScore = recentScores[recentScores.length - 7 + i]
                const value = dayScore?.score ?? 0
                const height = value > 0 ? Math.max(4, (value / 100) * 48) : 2
                const barColor = value >= 70 ? 'bg-pipboy-green' : value >= 40 ? 'bg-pipboy-amber' : 'bg-pipboy-red/50'

                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className={`w-full rounded-t-sm transition-all duration-300 ${barColor} ${value > 0 ? 'opacity-100' : 'opacity-30'}`}
                      style={{ height: `${height}px` }}
                      title={dayScore?.date ? `${dayScore.date}: ${value}` : 'No data'}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-pipboy-green-dim">7d ago</span>
              <span className="text-[10px] text-pipboy-green-dim">today</span>
            </div>
          </div>
        )}

        {/* Quick insight */}
        <div className="mt-3 pt-3 border-t border-pipboy-border">
          <p className="text-xs text-pipboy-green-dim">
            {score > 0 ? (
              <>
                💡 You're {focusPercentage >= 70 ? 'maintaining' : 'building'} strong signal today.
                {streak >= 3 && ` Keep the ${streak}-day streak going!`}
              </>
            ) : (
              <>💡 Start your day with a morning briefing to set your signal tasks.</>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
