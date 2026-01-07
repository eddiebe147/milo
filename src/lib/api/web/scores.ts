import { db } from './db'
import { nanoid } from 'nanoid'
import type { DailyScore } from '../../../types'

export const scoresWebRepository = {
    async getByDate(date: string): Promise<DailyScore | null> {
        return (await db.scores.where('date').equals(date).first()) || null
    },

    async getToday(): Promise<DailyScore | null> {
        const today = new Date().toISOString().split('T')[0]
        return this.getByDate(today)
    },

    async getRecent(days: number = 7): Promise<DailyScore[]> {
        return db.scores.orderBy('date').reverse().limit(days).toArray()
    },

    async getCurrentStreak(): Promise<number> {
        const today = new Date().toISOString().split('T')[0]
        const score = await this.getByDate(today)
        return score ? score.streakDay : 0
    },

    async upsert(score: Omit<DailyScore, 'id' | 'createdAt'>): Promise<DailyScore> {
        const existing = await this.getByDate(score.date)
        const now = new Date().toISOString()

        if (existing) {
            await db.scores.update(existing.id, score)
            return (await db.scores.get(existing.id))!
        }

        const id = nanoid()
        const newScore: DailyScore = {
            ...score,
            id,
            createdAt: now
        }
        await db.scores.add(newScore)
        return newScore
    },

    async calculate(): Promise<DailyScore> {
        // Basic calculation for web placeholder
        return {} as any
    },

    async getBreakdown(_date: string): Promise<any> {
        // Placeholder
        return {}
    }
}
