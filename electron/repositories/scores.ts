import { getDatabase } from '../services/database'
import { nanoid } from 'nanoid'
import type { DailyScore } from '../../src/types'

// Convert DB row to DailyScore type
function rowToScore(row: Record<string, unknown>): DailyScore {
  return {
    id: row.id as string,
    date: row.date as string,
    signalMinutes: row.signal_minutes as number,
    noiseMinutes: row.noise_minutes as number,
    adjacentMinutes: row.adjacent_minutes as number,
    totalTrackedMinutes: row.total_tracked_minutes as number,
    tasksCompleted: row.tasks_completed as number,
    tasksTotal: row.tasks_total as number,
    score: row.score as number,
    streakDay: row.streak_day as number,
    insights: row.insights as string | undefined,
    createdAt: row.created_at as string,
  }
}

// Type for raw database rows
type ScoreRow = Record<string, unknown>

export const scoresRepository = {
  // Get score for a specific date
  getByDate(date: string): DailyScore | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM daily_scores WHERE date = ?').get(date)
    return row ? rowToScore(row as ScoreRow) : null
  },

  // Get today's score
  getToday(): DailyScore | null {
    const today = new Date().toISOString().split('T')[0]
    return this.getByDate(today)
  },

  // Get scores for a date range
  getRange(startDate: string, endDate: string): DailyScore[] {
    const db = getDatabase()
    const rows = db
      .prepare('SELECT * FROM daily_scores WHERE date BETWEEN ? AND ? ORDER BY date ASC')
      .all(startDate, endDate) as ScoreRow[]
    return rows.map(rowToScore)
  },

  // Get last N days of scores
  getRecent(days: number = 7): DailyScore[] {
    const db = getDatabase()
    const rows = db
      .prepare('SELECT * FROM daily_scores ORDER BY date DESC LIMIT ?')
      .all(days) as ScoreRow[]
    return rows.map(rowToScore).reverse()
  },

  // Get current streak
  getCurrentStreak(): number {
    const db = getDatabase()
    const today = new Date().toISOString().split('T')[0]
    const row = db.prepare('SELECT streak_day FROM daily_scores WHERE date = ?').get(today)
    return row ? (row as { streak_day: number }).streak_day : 0
  },

  // Create or update a daily score
  upsert(score: Omit<DailyScore, 'id' | 'createdAt'>): DailyScore {
    const db = getDatabase()
    const existing = this.getByDate(score.date)
    const now = new Date().toISOString()

    if (existing) {
      db.prepare(`
        UPDATE daily_scores SET
          signal_minutes = ?,
          noise_minutes = ?,
          adjacent_minutes = ?,
          total_tracked_minutes = ?,
          tasks_completed = ?,
          tasks_total = ?,
          score = ?,
          streak_day = ?,
          insights = ?
        WHERE date = ?
      `).run(
        score.signalMinutes,
        score.noiseMinutes,
        score.adjacentMinutes,
        score.totalTrackedMinutes,
        score.tasksCompleted,
        score.tasksTotal,
        score.score,
        score.streakDay,
        score.insights ?? null,
        score.date
      )
      return this.getByDate(score.date)!
    }

    const id = nanoid()
    db.prepare(`
      INSERT INTO daily_scores (id, date, signal_minutes, noise_minutes, adjacent_minutes, total_tracked_minutes, tasks_completed, tasks_total, score, streak_day, insights, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      score.date,
      score.signalMinutes,
      score.noiseMinutes,
      score.adjacentMinutes,
      score.totalTrackedMinutes,
      score.tasksCompleted,
      score.tasksTotal,
      score.score,
      score.streakDay,
      score.insights ?? null,
      now
    )

    return this.getByDate(score.date)!
  },

  // Calculate streak based on previous days
  calculateStreak(date: string): number {
    // Get the score from yesterday
    const yesterday = new Date(date)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const yesterdayScore = this.getByDate(yesterdayStr)

    // If yesterday had a score >= 50, continue streak
    if (yesterdayScore && yesterdayScore.score >= 50) {
      return yesterdayScore.streakDay + 1
    }

    // Check if there was any score today already
    const todayScore = this.getByDate(date)
    if (todayScore && todayScore.score >= 50) {
      return 1 // Start new streak
    }

    return 0
  },

  // Get average score for a period
  getAverageScore(startDate: string, endDate: string): number {
    const db = getDatabase()
    const result = db
      .prepare('SELECT AVG(score) as avg_score FROM daily_scores WHERE date BETWEEN ? AND ?')
      .get(startDate, endDate) as { avg_score: number | null }
    return result.avg_score ?? 0
  },

  // Get best streak ever
  getBestStreak(): number {
    const db = getDatabase()
    const result = db
      .prepare('SELECT MAX(streak_day) as max_streak FROM daily_scores')
      .get() as { max_streak: number | null }
    return result.max_streak ?? 0
  },

  // Get total signal minutes ever
  getTotalSignalMinutes(): number {
    const db = getDatabase()
    const result = db
      .prepare('SELECT SUM(signal_minutes) as total FROM daily_scores')
      .get() as { total: number | null }
    return result.total ?? 0
  },
}
