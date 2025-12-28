import React, { useEffect } from 'react'
import { Flame, Calendar, Trophy, Zap } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { GlowText } from '@/components/ui/GlowText'
import { useScoresStore } from '@/stores'

// Streak milestones for achievements
const STREAK_MILESTONES = [
  { days: 3, label: 'Warming Up', icon: '🔥' },
  { days: 7, label: 'Weekly Warrior', icon: '⚡' },
  { days: 14, label: 'Fortnight Focus', icon: '💪' },
  { days: 30, label: 'Monthly Master', icon: '🏆' },
  { days: 60, label: 'Two-Month Titan', icon: '🌟' },
  { days: 90, label: 'Quarter Champion', icon: '👑' },
  { days: 180, label: 'Half-Year Hero', icon: '🎯' },
  { days: 365, label: 'Year-Long Legend', icon: '🏅' },
]

const getStreakMilestone = (streak: number) => {
  // Find the highest milestone achieved
  for (let i = STREAK_MILESTONES.length - 1; i >= 0; i--) {
    if (streak >= STREAK_MILESTONES[i].days) {
      return STREAK_MILESTONES[i]
    }
  }
  return null
}

const getNextMilestone = (streak: number) => {
  for (const milestone of STREAK_MILESTONES) {
    if (streak < milestone.days) {
      return milestone
    }
  }
  return null
}

const getDayOfWeek = (daysAgo: number): string => {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return days[date.getDay()]
}

interface StreakDisplayProps {
  compact?: boolean
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({ compact = false }) => {
  const { currentStreak, recentScores, fetchStreak, fetchRecentScores } = useScoresStore()

  useEffect(() => {
    fetchStreak()
    fetchRecentScores(14) // Get 2 weeks for visualization
  }, [fetchStreak, fetchRecentScores])

  const currentMilestone = getStreakMilestone(currentStreak)
  const nextMilestone = getNextMilestone(currentStreak)
  const daysToNext = nextMilestone ? nextMilestone.days - currentStreak : 0

  // Create a 14-day calendar view
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const daysAgo = 13 - i
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    const dateStr = date.toISOString().split('T')[0]
    const scoreForDay = recentScores.find(s => s.date === dateStr)
    return {
      date: dateStr,
      dayOfWeek: getDayOfWeek(daysAgo),
      score: scoreForDay?.score ?? null,
      isToday: daysAgo === 0,
    }
  })

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Flame size={16} className={currentStreak > 0 ? 'text-pipboy-amber animate-pulse' : 'text-pipboy-green-dim'} />
        <span className="font-mono text-pipboy-green">
          {currentStreak}
        </span>
        {currentMilestone && (
          <span className="text-sm">{currentMilestone.icon}</span>
        )}
      </div>
    )
  }

  return (
    <Card variant="default" padding="md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame size={16} className={currentStreak > 0 ? 'text-pipboy-amber' : 'text-pipboy-green-dim'} />
            <CardTitle>Streak</CardTitle>
          </div>
          {currentMilestone && (
            <span className="text-lg">{currentMilestone.icon}</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Main streak display */}
        <div className="text-center mb-4">
          <GlowText intensity="high" className="text-4xl font-bold">
            {currentStreak}
          </GlowText>
          <p className="text-sm text-pipboy-green-dim mt-1">
            {currentStreak === 1 ? 'day' : 'days'} in a row
          </p>
          {currentMilestone && (
            <p className="text-xs text-pipboy-amber mt-1">
              {currentMilestone.label}
            </p>
          )}
        </div>

        {/* 14-day calendar view */}
        <div className="border-t border-pipboy-border pt-3">
          <div className="flex items-center gap-1 mb-2">
            <Calendar size={12} className="text-pipboy-green-dim" />
            <span className="text-xs text-pipboy-green-dim">Last 14 days</span>
          </div>

          <div className="grid grid-cols-14 gap-0.5">
            {/* Day labels */}
            {last14Days.map((day, i) => (
              <div key={`label-${i}`} className="text-center">
                <span className="text-[8px] text-pipboy-green-dim">{day.dayOfWeek}</span>
              </div>
            ))}

            {/* Day indicators */}
            {last14Days.map((day, i) => {
              let bgClass = 'bg-pipboy-surface border-pipboy-border'
              let borderClass = ''

              if (day.score !== null) {
                if (day.score >= 70) {
                  bgClass = 'bg-pipboy-green/40'
                } else if (day.score >= 40) {
                  bgClass = 'bg-pipboy-amber/40'
                } else {
                  bgClass = 'bg-pipboy-red/30'
                }
              }

              if (day.isToday) {
                borderClass = 'ring-1 ring-pipboy-green'
              }

              return (
                <div
                  key={i}
                  className={`
                    aspect-square rounded-sm border border-pipboy-border/50
                    flex items-center justify-center
                    ${bgClass} ${borderClass}
                  `}
                  title={`${day.date}: ${day.score ?? 'No data'}`}
                >
                  {day.score !== null && day.score >= 70 && (
                    <Zap size={8} className="text-pipboy-green" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Next milestone */}
        {nextMilestone && (
          <div className="mt-3 pt-3 border-t border-pipboy-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={12} className="text-pipboy-green-dim" />
                <span className="text-xs text-pipboy-green-dim">
                  Next: {nextMilestone.label}
                </span>
              </div>
              <span className="text-xs font-mono text-pipboy-amber">
                {daysToNext} days
              </span>
            </div>
            {/* Progress bar to next milestone */}
            <div className="mt-2 h-1 bg-pipboy-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-pipboy-amber rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (currentStreak / nextMilestone.days) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* No streak message */}
        {currentStreak === 0 && (
          <div className="text-center py-2">
            <p className="text-xs text-pipboy-green-dim">
              Complete today to start your streak!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
