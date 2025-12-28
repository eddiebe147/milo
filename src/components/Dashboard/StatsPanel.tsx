import React from 'react'
import { TrendingUp, Flame, Clock, Target } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { CircularProgress } from '@/components/ui/Progress'
import { getScoreLabel, getScoreColor, formatDuration } from '@/lib/utils'

export const StatsPanel: React.FC = () => {
  // Mock data - will be replaced with actual store data
  const todayScore = 78
  const streak = 5
  const greenMinutes = 180
  const totalMinutes = 300
  const signalCompleted = 3
  const signalTotal = 5

  const focusPercentage = Math.round((greenMinutes / totalMinutes) * 100)
  const scoreLabel = getScoreLabel(todayScore)
  const scoreColor = getScoreColor(todayScore)

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
              value={todayScore}
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

        {/* Quick insight */}
        <div className="mt-4 pt-3 border-t border-pipboy-border">
          <p className="text-xs text-pipboy-green-dim">
            💡 You're {focusPercentage >= 70 ? 'maintaining' : 'building'} strong signal today.
            {streak >= 3 && ` Keep the ${streak}-day streak going!`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
