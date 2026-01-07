import { db } from './db'
import type { AIProviderType } from '../../../../electron/ai/providers'

const DEFAULT_SETTINGS = {
    apiKey: null,
    apiProvider: 'anthropic' as AIProviderType,
    apiModel: 'claude-3-5-sonnet-latest',
    refillMode: 'daily_reset',
    workStartTime: '09:00',
    workEndTime: '17:00',
    workDays: [1, 2, 3, 4, 5],
    monitoringEnabled: true,
    pollingIntervalMs: 5000,
    driftAlertEnabled: true,
    driftAlertDelayMinutes: 5,
    morningBriefingTime: '08:30',
    eveningReviewTime: '17:30',
    alwaysOnTop: false,
    startMinimized: false,
    showInDock: true,
    analyticsEnabled: true,
    themePrimaryColor: '#00FF41',
    themeAccentColor: '#00CC33',
    themeDangerColor: '#FF3333',
    themeUserMessageColor: '#004411',
    themeAiMessageColor: '#112211',
}

export const settingsWebRepository = {
    async get() {
        const all = await db.settings.toArray()
        const settings = { ...DEFAULT_SETTINGS }
        all.forEach(item => {
            (settings as any)[item.key] = item.value
        })
        return settings as any
    },

    async update(updates: Record<string, unknown>): Promise<boolean> {
        await db.transaction('rw', db.settings, async () => {
            for (const [key, value] of Object.entries(updates)) {
                await db.settings.put({ key, value })
            }
        })
        return true
    },

    async getApiKey(): Promise<string | null> {
        const item = await db.settings.get('apiKey')
        return item ? item.value : null
    },

    async saveApiKey(apiKey: string | null): Promise<boolean> {
        await db.settings.put({ key: 'apiKey', value: apiKey })
        return true
    },

    async getAiSettings() {
        const apiKey = await this.getApiKey()
        const apiProvider = (await db.settings.get('apiProvider'))?.value || DEFAULT_SETTINGS.apiProvider
        const apiModel = (await db.settings.get('apiModel'))?.value || DEFAULT_SETTINGS.apiModel
        return { apiKey, apiProvider, apiModel }
    },

    async saveAiSettings(settings: { apiKey?: string | null; apiProvider?: AIProviderType; apiModel?: string | null }) {
        if (settings.apiKey !== undefined) await this.saveApiKey(settings.apiKey)
        if (settings.apiProvider !== undefined) await db.settings.put({ key: 'apiProvider', value: settings.apiProvider })
        if (settings.apiModel !== undefined) await db.settings.put({ key: 'apiModel', value: settings.apiModel })
        return true
    },

    async getRefillMode(): Promise<'endless' | 'daily_reset'> {
        const item = await db.settings.get('refillMode')
        return item ? item.value : 'daily_reset'
    },

    async saveRefillMode(mode: 'endless' | 'daily_reset'): Promise<boolean> {
        await db.settings.put({ key: 'refillMode', value: mode })
        return true
    },

    async getThemeColors() {
        const settings = await this.get()
        return {
            themePrimaryColor: settings.themePrimaryColor,
            themeAccentColor: settings.themeAccentColor,
            themeDangerColor: settings.themeDangerColor,
            themeUserMessageColor: settings.themeUserMessageColor,
            themeAiMessageColor: settings.themeAiMessageColor,
        } as any
    },

    async setThemeColor(key: any, value: string): Promise<boolean> {
        await db.settings.put({ key, value })
        return true
    },

    async setThemeColors(colors: any): Promise<boolean> {
        await db.transaction('rw', db.settings, async () => {
            for (const [key, value] of Object.entries(colors)) {
                await db.settings.put({ key, value })
            }
        })
        return true
    }
}
