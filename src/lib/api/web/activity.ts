import { db } from './db'
import { nanoid } from 'nanoid'
import type { ActivityLog, AppClassification, ActivityState } from '../../../types'

export const activityWebRepository = {
    async log(activity: Omit<ActivityLog, 'id'>): Promise<ActivityLog> {
        const id = nanoid()
        const newLog: ActivityLog = { id, ...activity }
        await db.activityLogs.add(newLog)
        return newLog
    },

    async getByDate(date: string): Promise<ActivityLog[]> {
        const startOfDay = `${date}T00:00:00`
        const endOfDay = `${date}T23:59:59`
        return db.activityLogs
            .where('timestamp')
            .between(startOfDay, endOfDay)
            .sortBy('timestamp')
    },

    async getToday(): Promise<ActivityLog[]> {
        const today = new Date().toISOString().split('T')[0]
        return this.getByDate(today)
    },

    async getSummary(date: string) {
        const logs = await this.getByDate(date)
        const summary = { green: 0, amber: 0, red: 0, total: 0 }

        logs.forEach(log => {
            const mins = log.durationSeconds / 60
            if (log.state === 'green') summary.green += mins
            else if (log.state === 'amber') summary.amber += mins
            else if (log.state === 'red') summary.red += mins
            summary.total += mins
        })

        return {
            green: Math.floor(summary.green),
            amber: Math.floor(summary.amber),
            red: Math.floor(summary.red),
            total: Math.floor(summary.total)
        }
    },

    async getAppBreakdown(date: string) {
        const logs = await this.getByDate(date)
        const breakdown: Record<string, { minutes: number; state: ActivityState }> = {}

        logs.forEach(log => {
            const key = `${log.appName}-${log.state}`
            if (!breakdown[key]) {
                breakdown[key] = { minutes: 0, state: log.state }
            }
            breakdown[key].minutes += log.durationSeconds / 60
        })

        return Object.entries(breakdown).map(([key, val]) => ({
            appName: key.split('-')[0],
            state: val.state,
            minutes: Math.floor(val.minutes)
        }))
    }
}

export const classificationsWebRepository = {
    async getAll(): Promise<AppClassification[]> {
        return db.classifications.toArray()
    },

    async upsert(classification: Omit<AppClassification, 'id' | 'createdAt'>): Promise<AppClassification> {
        const id = nanoid()
        const now = new Date().toISOString()
        const existing = await db.classifications.where('appName').equals(classification.appName).first()

        if (existing) {
            await db.classifications.update(existing.id, {
                ...classification,
                updatedAt: now // Note: Types say createdAt, but repository uses updatedAt in logic sometimes
            } as any)
            return (await db.classifications.get(existing.id))!
        }

        const newClassification: AppClassification = {
            ...classification,
            id,
            createdAt: now
        }
        await db.classifications.add(newClassification)
        return newClassification
    }
}
