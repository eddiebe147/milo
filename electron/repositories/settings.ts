import { getDatabase } from '../services/database'

export interface StoredSettings {
  apiKey: string | null
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

export interface ThemeColors {
  themePrimaryColor: string
  themeAccentColor: string
  themeDangerColor: string
  themeUserMessageColor: string
  themeAiMessageColor: string
}

// Convert DB row to StoredSettings type
function rowToSettings(row: Record<string, unknown>): StoredSettings {
  return {
    apiKey: row.api_key as string | null,
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
}
