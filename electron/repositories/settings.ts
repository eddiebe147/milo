import { getDatabase } from '../services/database'

// AI Provider type
export type AIProviderType = 'claude' | 'openai'

export interface StoredSettings {
  apiKey: string | null
  apiProvider: AIProviderType
  apiModel: string | null
  refillMode: 'endless' | 'daily_reset'
  workStartTime: string
  workEndTime: string
  workDays: number[]
  monitoringEnabled: boolean
  pollingIntervalMs: number
  driftAlertEnabled: boolean
  driftAlertDelayMinutes: number
  morningBriefingTime: string
  eveningReviewTime: string
  alwaysOnTop: boolean
  startMinimized: boolean
  showInDock: boolean
  analyticsEnabled: boolean
  analyticsId: string | null
}

export interface ThemeColors {
  themePrimaryColor: string
  themeAccentColor: string
  themeDangerColor: string
  themeUserMessageColor: string
  themeAiMessageColor: string
}

export interface BriefingConfig {
  // Morning briefing section toggles
  morningCalendar: boolean
  morningCarryover: boolean
  morningGoals: boolean
  morningYesterdayStats: boolean
  morningStreak: boolean
  morningAiInsights: boolean
  morningQuickCapture: boolean
  // Evening briefing section toggles
  eveningAccomplishments: boolean
  eveningMetrics: boolean
  eveningWins: boolean
  eveningReflection: boolean
  eveningCarryover: boolean
  eveningTomorrowTop3: boolean
  eveningShutdown: boolean
  eveningAiInsights: boolean
}

export interface CalendarConfig {
  googleEnabled: boolean
  googleToken: string | null
  googleRefreshToken: string | null
  appleEnabled: boolean
}

// Convert DB row to StoredSettings type
function rowToSettings(row: Record<string, unknown>): StoredSettings {
  return {
    apiKey: row.api_key as string | null,
    apiProvider: (row.api_provider as AIProviderType) || 'claude',
    apiModel: row.api_model as string | null,
    refillMode: (row.refill_mode as string) === 'daily_reset' ? 'daily_reset' : 'endless',
    workStartTime: row.work_start_time as string,
    workEndTime: row.work_end_time as string,
    workDays: JSON.parse(row.work_days as string),
    monitoringEnabled: Boolean(row.monitoring_enabled),
    pollingIntervalMs: row.polling_interval_ms as number,
    driftAlertEnabled: Boolean(row.drift_alert_enabled),
    driftAlertDelayMinutes: row.drift_alert_delay_minutes as number,
    morningBriefingTime: row.morning_briefing_time as string,
    eveningReviewTime: row.evening_review_time as string,
    alwaysOnTop: Boolean(row.always_on_top),
    startMinimized: Boolean(row.start_minimized),
    showInDock: Boolean(row.show_in_dock),
    analyticsEnabled: Boolean(row.analytics_enabled),
    analyticsId: row.analytics_id as string | null,
  }
}

export const settingsRepository = {
  // Get all settings
  get(): StoredSettings {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM user_settings WHERE id = 1').get() as Record<string, unknown>
    return rowToSettings(row)
  },

  // Get just the API key
  getApiKey(): string | null {
    const db = getDatabase()
    const row = db.prepare('SELECT api_key FROM user_settings WHERE id = 1').get() as Record<string, unknown>
    return row?.api_key as string | null
  },

  // Save API key
  saveApiKey(apiKey: string | null): void {
    const db = getDatabase()
    db.prepare('UPDATE user_settings SET api_key = ? WHERE id = 1').run(apiKey)
  },

  // Get AI provider
  getApiProvider(): AIProviderType {
    const db = getDatabase()
    const row = db.prepare('SELECT api_provider FROM user_settings WHERE id = 1').get() as Record<string, unknown>
    return (row?.api_provider as AIProviderType) || 'claude'
  },

  // Save AI provider
  saveApiProvider(provider: AIProviderType): void {
    const db = getDatabase()
    db.prepare('UPDATE user_settings SET api_provider = ? WHERE id = 1').run(provider)
  },

  // Get AI model
  getApiModel(): string | null {
    const db = getDatabase()
    const row = db.prepare('SELECT api_model FROM user_settings WHERE id = 1').get() as Record<string, unknown>
    return row?.api_model as string | null
  },

  // Save AI model
  saveApiModel(model: string | null): void {
    const db = getDatabase()
    db.prepare('UPDATE user_settings SET api_model = ? WHERE id = 1').run(model)
  },

  // Get all AI settings at once
  getAiSettings(): { apiKey: string | null; apiProvider: AIProviderType; apiModel: string | null } {
    const db = getDatabase()
    const row = db.prepare('SELECT api_key, api_provider, api_model FROM user_settings WHERE id = 1').get() as Record<string, unknown>
    return {
      apiKey: row?.api_key as string | null,
      apiProvider: (row?.api_provider as AIProviderType) || 'claude',
      apiModel: row?.api_model as string | null,
    }
  },

  // Save all AI settings at once
  saveAiSettings(settings: { apiKey?: string | null; apiProvider?: AIProviderType; apiModel?: string | null }): void {
    const db = getDatabase()
    const setClauses: string[] = []
    const values: unknown[] = []

    if (settings.apiKey !== undefined) {
      setClauses.push('api_key = ?')
      values.push(settings.apiKey)
    }
    if (settings.apiProvider !== undefined) {
      setClauses.push('api_provider = ?')
      values.push(settings.apiProvider)
    }
    if (settings.apiModel !== undefined) {
      setClauses.push('api_model = ?')
      values.push(settings.apiModel)
    }

    if (setClauses.length > 0) {
      db.prepare(`UPDATE user_settings SET ${setClauses.join(', ')} WHERE id = 1`).run(...values)
    }
  },

  // Get refill mode
  getRefillMode(): 'endless' | 'daily_reset' {
    const db = getDatabase()
    const row = db.prepare('SELECT refill_mode FROM user_settings WHERE id = 1').get() as Record<string, unknown>
    return (row?.refill_mode as string) === 'daily_reset' ? 'daily_reset' : 'endless'
  },

  // Save refill mode
  saveRefillMode(mode: 'endless' | 'daily_reset'): void {
    const db = getDatabase()
    db.prepare('UPDATE user_settings SET refill_mode = ? WHERE id = 1').run(mode)
  },

  // Update multiple settings at once
  update(updates: Partial<StoredSettings>): void {
    const db = getDatabase()
    const setClauses: string[] = []
    const values: unknown[] = []

    if (updates.apiKey !== undefined) {
      setClauses.push('api_key = ?')
      values.push(updates.apiKey)
    }
    if (updates.refillMode !== undefined) {
      setClauses.push('refill_mode = ?')
      values.push(updates.refillMode)
    }
    if (updates.workStartTime !== undefined) {
      setClauses.push('work_start_time = ?')
      values.push(updates.workStartTime)
    }
    if (updates.workEndTime !== undefined) {
      setClauses.push('work_end_time = ?')
      values.push(updates.workEndTime)
    }
    if (updates.workDays !== undefined) {
      setClauses.push('work_days = ?')
      values.push(JSON.stringify(updates.workDays))
    }
    if (updates.monitoringEnabled !== undefined) {
      setClauses.push('monitoring_enabled = ?')
      values.push(updates.monitoringEnabled ? 1 : 0)
    }
    if (updates.pollingIntervalMs !== undefined) {
      setClauses.push('polling_interval_ms = ?')
      values.push(updates.pollingIntervalMs)
    }
    if (updates.driftAlertEnabled !== undefined) {
      setClauses.push('drift_alert_enabled = ?')
      values.push(updates.driftAlertEnabled ? 1 : 0)
    }
    if (updates.driftAlertDelayMinutes !== undefined) {
      setClauses.push('drift_alert_delay_minutes = ?')
      values.push(updates.driftAlertDelayMinutes)
    }
    if (updates.alwaysOnTop !== undefined) {
      setClauses.push('always_on_top = ?')
      values.push(updates.alwaysOnTop ? 1 : 0)
    }
    if (updates.startMinimized !== undefined) {
      setClauses.push('start_minimized = ?')
      values.push(updates.startMinimized ? 1 : 0)
    }
    if (updates.showInDock !== undefined) {
      setClauses.push('show_in_dock = ?')
      values.push(updates.showInDock ? 1 : 0)
    }
    if (updates.analyticsEnabled !== undefined) {
      setClauses.push('analytics_enabled = ?')
      values.push(updates.analyticsEnabled ? 1 : 0)
    }
    if (updates.analyticsId !== undefined) {
      setClauses.push('analytics_id = ?')
      values.push(updates.analyticsId)
    }

    if (setClauses.length > 0) {
      db.prepare(`UPDATE user_settings SET ${setClauses.join(', ')} WHERE id = 1`).run(...values)
    }
  },

  // Get analytics enabled status
  getAnalyticsEnabled(): boolean {
    const db = getDatabase()
    const row = db.prepare('SELECT analytics_enabled FROM user_settings WHERE id = 1').get() as Record<string, unknown>
    return Boolean(row?.analytics_enabled)
  },

  // Set analytics enabled status
  setAnalyticsEnabled(enabled: boolean): void {
    const db = getDatabase()
    db.prepare('UPDATE user_settings SET analytics_enabled = ? WHERE id = 1').run(enabled ? 1 : 0)
  },

  // Get all theme colors
  getThemeColors(): ThemeColors {
    const db = getDatabase()
    const row = db.prepare(`
      SELECT
        theme_primary_color,
        theme_accent_color,
        theme_danger_color,
        theme_user_message_color,
        theme_ai_message_color
      FROM user_settings WHERE id = 1
    `).get() as Record<string, unknown>

    return {
      themePrimaryColor: row.theme_primary_color as string,
      themeAccentColor: row.theme_accent_color as string,
      themeDangerColor: row.theme_danger_color as string,
      themeUserMessageColor: row.theme_user_message_color as string,
      themeAiMessageColor: row.theme_ai_message_color as string,
    }
  },

  // Set a single theme color
  setThemeColor(key: keyof ThemeColors, value: string): void {
    const db = getDatabase()
    // Convert camelCase to snake_case
    const columnMap: Record<keyof ThemeColors, string> = {
      themePrimaryColor: 'theme_primary_color',
      themeAccentColor: 'theme_accent_color',
      themeDangerColor: 'theme_danger_color',
      themeUserMessageColor: 'theme_user_message_color',
      themeAiMessageColor: 'theme_ai_message_color',
    }
    const columnName = columnMap[key]
    db.prepare(`UPDATE user_settings SET ${columnName} = ? WHERE id = 1`).run(value)
  },

  // Set all theme colors at once
  setThemeColors(colors: Partial<ThemeColors>): void {
    const db = getDatabase()
    const setClauses: string[] = []
    const values: unknown[] = []

    if (colors.themePrimaryColor !== undefined) {
      setClauses.push('theme_primary_color = ?')
      values.push(colors.themePrimaryColor)
    }
    if (colors.themeAccentColor !== undefined) {
      setClauses.push('theme_accent_color = ?')
      values.push(colors.themeAccentColor)
    }
    if (colors.themeDangerColor !== undefined) {
      setClauses.push('theme_danger_color = ?')
      values.push(colors.themeDangerColor)
    }
    if (colors.themeUserMessageColor !== undefined) {
      setClauses.push('theme_user_message_color = ?')
      values.push(colors.themeUserMessageColor)
    }
    if (colors.themeAiMessageColor !== undefined) {
      setClauses.push('theme_ai_message_color = ?')
      values.push(colors.themeAiMessageColor)
    }

    if (setClauses.length > 0) {
      db.prepare(`UPDATE user_settings SET ${setClauses.join(', ')} WHERE id = 1`).run(...values)
    }
  },

  // Get briefing configuration
  getBriefingConfig(): BriefingConfig {
    const db = getDatabase()
    const row = db.prepare(`
      SELECT
        briefing_morning_calendar,
        briefing_morning_carryover,
        briefing_morning_goals,
        briefing_morning_yesterday_stats,
        briefing_morning_streak,
        briefing_morning_ai_insights,
        briefing_morning_quick_capture,
        briefing_evening_accomplishments,
        briefing_evening_metrics,
        briefing_evening_wins,
        briefing_evening_reflection,
        briefing_evening_carryover,
        briefing_evening_tomorrow_top3,
        briefing_evening_shutdown,
        briefing_evening_ai_insights
      FROM user_settings WHERE id = 1
    `).get() as Record<string, unknown>

    return {
      morningCalendar: Boolean(row.briefing_morning_calendar ?? 1),
      morningCarryover: Boolean(row.briefing_morning_carryover ?? 1),
      morningGoals: Boolean(row.briefing_morning_goals ?? 1),
      morningYesterdayStats: Boolean(row.briefing_morning_yesterday_stats ?? 1),
      morningStreak: Boolean(row.briefing_morning_streak ?? 1),
      morningAiInsights: Boolean(row.briefing_morning_ai_insights ?? 1),
      morningQuickCapture: Boolean(row.briefing_morning_quick_capture ?? 1),
      eveningAccomplishments: Boolean(row.briefing_evening_accomplishments ?? 1),
      eveningMetrics: Boolean(row.briefing_evening_metrics ?? 1),
      eveningWins: Boolean(row.briefing_evening_wins ?? 1),
      eveningReflection: Boolean(row.briefing_evening_reflection ?? 1),
      eveningCarryover: Boolean(row.briefing_evening_carryover ?? 1),
      eveningTomorrowTop3: Boolean(row.briefing_evening_tomorrow_top3 ?? 1),
      eveningShutdown: Boolean(row.briefing_evening_shutdown ?? 1),
      eveningAiInsights: Boolean(row.briefing_evening_ai_insights ?? 1),
    }
  },

  // Update briefing configuration
  updateBriefingConfig(config: Partial<BriefingConfig>): void {
    const db = getDatabase()
    const setClauses: string[] = []
    const values: unknown[] = []

    const columnMap: Record<keyof BriefingConfig, string> = {
      morningCalendar: 'briefing_morning_calendar',
      morningCarryover: 'briefing_morning_carryover',
      morningGoals: 'briefing_morning_goals',
      morningYesterdayStats: 'briefing_morning_yesterday_stats',
      morningStreak: 'briefing_morning_streak',
      morningAiInsights: 'briefing_morning_ai_insights',
      morningQuickCapture: 'briefing_morning_quick_capture',
      eveningAccomplishments: 'briefing_evening_accomplishments',
      eveningMetrics: 'briefing_evening_metrics',
      eveningWins: 'briefing_evening_wins',
      eveningReflection: 'briefing_evening_reflection',
      eveningCarryover: 'briefing_evening_carryover',
      eveningTomorrowTop3: 'briefing_evening_tomorrow_top3',
      eveningShutdown: 'briefing_evening_shutdown',
      eveningAiInsights: 'briefing_evening_ai_insights',
    }

    for (const [key, value] of Object.entries(config)) {
      if (value !== undefined && key in columnMap) {
        setClauses.push(`${columnMap[key as keyof BriefingConfig]} = ?`)
        values.push(value ? 1 : 0)
      }
    }

    if (setClauses.length > 0) {
      db.prepare(`UPDATE user_settings SET ${setClauses.join(', ')} WHERE id = 1`).run(...values)
    }
  },

  // Get calendar configuration
  getCalendarConfig(): CalendarConfig {
    const db = getDatabase()
    const row = db.prepare(`
      SELECT
        calendar_google_enabled,
        calendar_google_token,
        calendar_google_refresh_token,
        calendar_apple_enabled
      FROM user_settings WHERE id = 1
    `).get() as Record<string, unknown>

    return {
      googleEnabled: Boolean(row.calendar_google_enabled ?? 0),
      googleToken: row.calendar_google_token as string | null,
      googleRefreshToken: row.calendar_google_refresh_token as string | null,
      appleEnabled: Boolean(row.calendar_apple_enabled ?? 0),
    }
  },

  // Update calendar configuration
  updateCalendarConfig(config: Partial<CalendarConfig>): void {
    const db = getDatabase()
    const setClauses: string[] = []
    const values: unknown[] = []

    if (config.googleEnabled !== undefined) {
      setClauses.push('calendar_google_enabled = ?')
      values.push(config.googleEnabled ? 1 : 0)
    }
    if (config.googleToken !== undefined) {
      setClauses.push('calendar_google_token = ?')
      values.push(config.googleToken)
    }
    if (config.googleRefreshToken !== undefined) {
      setClauses.push('calendar_google_refresh_token = ?')
      values.push(config.googleRefreshToken)
    }
    if (config.appleEnabled !== undefined) {
      setClauses.push('calendar_apple_enabled = ?')
      values.push(config.appleEnabled ? 1 : 0)
    }

    if (setClauses.length > 0) {
      db.prepare(`UPDATE user_settings SET ${setClauses.join(', ')} WHERE id = 1`).run(...values)
    }
  },
}
