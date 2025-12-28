import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useScoresStore } from './scoresStore'
import type { DailyScore } from '../types'

const mockDailyScore: DailyScore = {
  id: 'score-1',
  date: '2024-12-28',
  signalMinutes: 180,
  noiseMinutes: 30,
  adjacentMinutes: 60,
  totalTrackedMinutes: 270,
  tasksCompleted: 5,
  tasksTotal: 8,
  score: 75,
  streakDay: 3,
  createdAt: '2024-12-28T18:00:00Z',
}

describe('scoresStore', () => {
  beforeEach(() => {
    // Reset store state
    useScoresStore.setState({
      todayScore: null,
      recentScores: [],
      currentStreak: 0,
      scoreDetails: null,
      isLoading: false,
      error: null,
    })

    // Reset mocks
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('has null todayScore', () => {
      const state = useScoresStore.getState()
      expect(state.todayScore).toBeNull()
    })

    it('has empty recentScores array', () => {
      const state = useScoresStore.getState()
      expect(state.recentScores).toEqual([])
    })

    it('has zero currentStreak', () => {
      const state = useScoresStore.getState()
      expect(state.currentStreak).toBe(0)
    })
  })

  describe('fetchTodayScore', () => {
    it('fetches and stores today score', async () => {
      window.milo.scores.getToday = vi.fn().mockResolvedValue(mockDailyScore)

      const store = useScoresStore.getState()
      await store.fetchTodayScore()

      const state = useScoresStore.getState()
      expect(state.todayScore).toEqual(mockDailyScore)
      expect(state.isLoading).toBe(false)
    })

    it('sets loading state while fetching', async () => {
      window.milo.scores.getToday = vi.fn().mockResolvedValue(mockDailyScore)

      const store = useScoresStore.getState()
      const fetchPromise = store.fetchTodayScore()

      expect(useScoresStore.getState().isLoading).toBe(true)
      await fetchPromise
      expect(useScoresStore.getState().isLoading).toBe(false)
    })

    it('handles errors', async () => {
      window.milo.scores.getToday = vi.fn().mockRejectedValue(new Error('Fetch failed'))

      const store = useScoresStore.getState()
      await store.fetchTodayScore()

      const state = useScoresStore.getState()
      expect(state.error).toBe('Fetch failed')
      expect(state.isLoading).toBe(false)
    })
  })

  describe('fetchRecentScores', () => {
    const recentScores = [mockDailyScore, { ...mockDailyScore, id: 'score-2', date: '2024-12-27' }]

    it('fetches recent scores with default days', async () => {
      window.milo.scores.getRecent = vi.fn().mockResolvedValue(recentScores)

      const store = useScoresStore.getState()
      await store.fetchRecentScores()

      expect(window.milo.scores.getRecent).toHaveBeenCalledWith(7)
      expect(useScoresStore.getState().recentScores).toEqual(recentScores)
    })

    it('fetches recent scores with custom days', async () => {
      window.milo.scores.getRecent = vi.fn().mockResolvedValue(recentScores)

      const store = useScoresStore.getState()
      await store.fetchRecentScores(14)

      expect(window.milo.scores.getRecent).toHaveBeenCalledWith(14)
    })
  })

  describe('fetchStreak', () => {
    it('fetches and stores current streak', async () => {
      window.milo.scores.getCurrentStreak = vi.fn().mockResolvedValue(5)

      const store = useScoresStore.getState()
      await store.fetchStreak()

      expect(useScoresStore.getState().currentStreak).toBe(5)
    })

    it('handles errors', async () => {
      window.milo.scores.getCurrentStreak = vi.fn().mockRejectedValue(new Error('Streak failed'))

      const store = useScoresStore.getState()
      await store.fetchStreak()

      expect(useScoresStore.getState().error).toBe('Streak failed')
    })
  })

  describe('calculateScore', () => {
    it('calculates and returns score', async () => {
      window.milo.scores.calculate = vi.fn().mockResolvedValue(mockDailyScore)

      const store = useScoresStore.getState()
      const result = await store.calculateScore()

      expect(result).toEqual(mockDailyScore)
      expect(useScoresStore.getState().todayScore).toEqual(mockDailyScore)
    })

    it('returns null on error', async () => {
      window.milo.scores.calculate = vi.fn().mockRejectedValue(new Error('Calc failed'))

      const store = useScoresStore.getState()
      const result = await store.calculateScore()

      expect(result).toBeNull()
      expect(useScoresStore.getState().error).toBe('Calc failed')
    })
  })
})
