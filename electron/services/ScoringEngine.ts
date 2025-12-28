import { activityRepository, scoresRepository, tasksRepository } from '../repositories'
import type { DailyScore, ScoreBreakdown } from '../../src/types'

// Scoring weights
const WEIGHTS = {
  signalRatio: 0.6, // 60% weight on green time
  taskCompletion: 0.3, // 30% weight on task completion
  streakBonus: 0.1, // 10% weight on streak
}

// Streak bonus thresholds
const STREAK_BONUSES = [
  { days: 30, bonus: 10 }, // 30+ days: +10 points
  { days: 14, bonus: 7 }, // 14+ days: +7 points
  { days: 7, bonus: 5 }, // 7+ days: +5 points
  { days: 3, bonus: 3 }, // 3+ days: +3 points
  { days: 1, bonus: 1 }, // 1+ days: +1 point
]

class ScoringEngine {
  // Calculate score for a specific date
  calculateScore(date: string): ScoreBreakdown {
    // Get activity summary
    const activitySummary = activityRepository.getSummary(date)
    const { green, total } = activitySummary

    // Get task completion
    const tasks = tasksRepository.getByDate(date)
    const completedTasks = tasks.filter(t => t.status === 'completed').length
    const totalTasks = tasks.length

    // Get current streak
    const currentStreak = this.calculateStreak(date)

    // Calculate component scores
    const signalRatio = total > 0 ? green / total : 0
    const taskCompletionRatio = totalTasks > 0 ? completedTasks / totalTasks : 0
    const streakBonus = this.getStreakBonus(currentStreak)

    // Calculate final score (0-100)
    const signalScore = signalRatio * 100 * WEIGHTS.signalRatio
    const taskScore = taskCompletionRatio * 100 * WEIGHTS.taskCompletion
    const streakScore = streakBonus * WEIGHTS.streakBonus

    const finalScore = Math.min(100, Math.round(signalScore + taskScore + streakScore))

    return {
      signalRatio,
      taskCompletionRatio,
      streakBonus,
      finalScore,
    }
  }

  // Calculate streak for a date
  private calculateStreak(date: string): number {
    // Check yesterday's score
    const yesterday = new Date(date)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const yesterdayScore = scoresRepository.getByDate(yesterdayStr)

    if (yesterdayScore && yesterdayScore.score >= 50) {
      return yesterdayScore.streakDay + 1
    }

    // Check if today already has a score >= 50
    const todayScore = scoresRepository.getByDate(date)
    if (todayScore && todayScore.score >= 50) {
      return 1
    }

    return 0
  }

  // Get streak bonus points
  private getStreakBonus(streak: number): number {
    for (const { days, bonus } of STREAK_BONUSES) {
      if (streak >= days) {
        return bonus
      }
    }
    return 0
  }

  // Save/update score for a date
  saveScore(date: string): DailyScore {
    const activitySummary = activityRepository.getSummary(date)
    const tasks = tasksRepository.getByDate(date)
    const breakdown = this.calculateScore(date)
    const streak = this.calculateStreak(date)

    const score = scoresRepository.upsert({
      date,
      signalMinutes: activitySummary.green,
      noiseMinutes: activitySummary.red,
      adjacentMinutes: activitySummary.amber,
      totalTrackedMinutes: activitySummary.total,
      tasksCompleted: tasks.filter(t => t.status === 'completed').length,
      tasksTotal: tasks.length,
      score: breakdown.finalScore,
      streakDay: streak,
    })

    return score
  }

  // Get today's score (calculate if not exists)
  getTodayScore(): DailyScore {
    const today = new Date().toISOString().split('T')[0]
    return this.saveScore(today)
  }

  // Get score breakdown for display
  getScoreBreakdown(date: string): {
    score: number
    breakdown: ScoreBreakdown
    summary: {
      signalMinutes: number
      noiseMinutes: number
      adjacentMinutes: number
      totalMinutes: number
      tasksCompleted: number
      tasksTotal: number
      streak: number
    }
  } {
    const activitySummary = activityRepository.getSummary(date)
    const tasks = tasksRepository.getByDate(date)
    const breakdown = this.calculateScore(date)
    const streak = this.calculateStreak(date)

    return {
      score: breakdown.finalScore,
      breakdown,
      summary: {
        signalMinutes: activitySummary.green,
        noiseMinutes: activitySummary.red,
        adjacentMinutes: activitySummary.amber,
        totalMinutes: activitySummary.total,
        tasksCompleted: tasks.filter(t => t.status === 'completed').length,
        tasksTotal: tasks.length,
        streak,
      },
    }
  }

  // Get score label based on value
  getScoreLabel(score: number): string {
    if (score >= 90) return 'Musk-Level'
    if (score >= 75) return 'Strong Signal'
    if (score >= 60) return 'Moderate'
    if (score >= 40) return 'Noisy'
    return 'Static'
  }

  // Get score color based on value
  getScoreColor(score: number): 'green' | 'amber' | 'red' {
    if (score >= 75) return 'green'
    if (score >= 50) return 'amber'
    return 'red'
  }

  // Generate AI insights (placeholder - will integrate with Claude)
  generateInsight(date: string): string {
    const { score, summary } = this.getScoreBreakdown(date)

    const insights: string[] = []

    // Signal ratio insight
    const signalRatio = summary.totalMinutes > 0
      ? summary.signalMinutes / summary.totalMinutes
      : 0

    if (signalRatio >= 0.7) {
      insights.push('Excellent focus today! You spent most of your time on mission-critical work.')
    } else if (signalRatio >= 0.5) {
      insights.push('Good signal-to-noise ratio. Try to minimize amber time for even better focus.')
    } else if (signalRatio >= 0.3) {
      insights.push('Your focus was split today. Consider blocking distracting apps during deep work.')
    } else {
      insights.push('High noise today. Tomorrow, try starting with your most important task before checking messages.')
    }

    // Task completion insight
    if (summary.tasksTotal > 0) {
      const completionRatio = summary.tasksCompleted / summary.tasksTotal
      if (completionRatio === 1) {
        insights.push(`All ${summary.tasksTotal} tasks completed! 🎯`)
      } else if (completionRatio >= 0.8) {
        insights.push(`Great progress: ${summary.tasksCompleted}/${summary.tasksTotal} tasks done.`)
      } else if (completionRatio >= 0.5) {
        insights.push(`${summary.tasksCompleted}/${summary.tasksTotal} tasks completed. Prioritize the remaining ones tomorrow.`)
      } else {
        insights.push(`Only ${summary.tasksCompleted}/${summary.tasksTotal} tasks done. Were tasks too big? Try breaking them down.`)
      }
    }

    // Streak insight
    if (summary.streak >= 7) {
      insights.push(`${summary.streak}-day streak! You're building powerful momentum.`)
    } else if (summary.streak >= 3) {
      insights.push(`${summary.streak}-day streak. Keep going!`)
    } else if (summary.streak === 0 && score < 50) {
      insights.push('Start fresh tomorrow. One good day begins a new streak.')
    }

    return insights.join(' ')
  }
}

// Singleton instance
export const scoringEngine = new ScoringEngine()
