import Dexie, { Table } from 'dexie'
import type { Goal, Task, Category, Project, ActivityLog, AppClassification, DailyScore } from '../../../types'

export interface ChatConversation {
    id: string
    title: string
    createdAt: string
    updatedAt: string
}

export interface ChatMessageDB {
    id: string
    conversationId: string
    role: 'user' | 'assistant'
    content: string
    createdAt: string
}

export class MiloDatabase extends Dexie {
    goals!: Table<Goal>
    tasks!: Table<Task>
    categories!: Table<Category>
    projects!: Table<Project>
    activityLogs!: Table<ActivityLog>
    classifications!: Table<AppClassification>
    scores!: Table<DailyScore>
    conversations!: Table<ChatConversation>
    messages!: Table<ChatMessageDB>
    settings!: Table<{ key: string; value: any }>

    constructor() {
        super('MiloDatabase')
        this.version(1).stores({
            goals: 'id, goalId, categoryId, status, scheduledDate',
            tasks: 'id, goalId, categoryId, status, scheduledDate, startDate, lastWorkedDate',
            categories: 'id, status',
            activityLogs: 'id, timestamp, appName, state',
            classifications: 'id, appName',
            scores: 'id, date',
            conversations: 'id, updatedAt',
            messages: 'id, conversationId, createdAt',
            settings: 'key'
        })
        // Version 2: Add projects table and projectId index to tasks
        this.version(2).stores({
            goals: 'id, goalId, categoryId, status, scheduledDate',
            tasks: 'id, goalId, categoryId, projectId, status, scheduledDate, startDate, lastWorkedDate',
            categories: 'id, status',
            projects: 'id, status, sortOrder, path',
            activityLogs: 'id, timestamp, appName, state',
            classifications: 'id, appName',
            scores: 'id, date',
            conversations: 'id, updatedAt',
            messages: 'id, conversationId, createdAt',
            settings: 'key'
        })
    }
}

export const db = new MiloDatabase()

