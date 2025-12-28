import { create } from 'zustand'
import type { DailyScore, ScoreBreakdown } from '../types'

interface ScoreDetails {
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
}

interface ScoresState {
  todayScore: DailyScore | null
  recentScores: DailyScore[]
  currentStreak: number
  scoreDetails: ScoreDetails | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchTodayScore: () => Promise<void>
  fetchRecentScores: (days?: number) => Promise<void>
  fetchStreak: () => Promise<void>
  calculateScore: () => Promise<DailyScore | null>
  getScoreBreakdown: (date?: string) => Promise<ScoreDetails | null>
}

export const useScoresStore = create<ScoresState>((set) => ({
  todayScore: null,
  recentScores: [],
  currentStreak: 0,
  scoreDetails: null,
  isLoading: false,
  error: null,

  fetchTodayScore: async () => {
    set({ isLoading: true, error: null })
    try {
      const todayScore = await window.milo.scores.getToday()
      set({ todayScore, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  fetchRecentScores: async (days = 7) => {
    set({ isLoading: true, error: null })
    try {
      const recentScores = await window.milo.scores.getRecent(days)
      set({ recentScores, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  fetchStreak: async () => {
    try {
      const currentStreak = await window.milo.scores.getCurrentStreak()
      set({ currentStreak })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  calculateScore: async () => {
    try {
      const todayScore = await window.milo.scores.calculate()
      set({ todayScore })
      return todayScore
    } catch (error) {
      set({ error: (error as Error).message })
      return null
    }
  },

  getScoreBreakdown: async (date?: string) => {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0]
      const scoreDetails = await window.milo.scores.getBreakdown(targetDate)
      set({ scoreDetails })
      return scoreDetails
    } catch (error) {
      set({ error: (error as Error).message })
      return null
    }
  },
}))
