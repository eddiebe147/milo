/**
 * Analytics Service - PostHog integration for MILO
 *
 * Privacy-first analytics with explicit opt-in.
 * Tracks errors and usage patterns to improve the app.
 */

import { PostHog } from 'posthog-node'
import { app } from 'electron'
import { getDatabase } from './database'

// PostHog configuration - set via environment or .env file
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY || ''
const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://us.i.posthog.com'

// Singleton instance
let posthogClient: PostHog | null = null
let isEnabled = false
let distinctId: string | null = null

// Event types we track
export type AnalyticsEvent =
  // Feature usage
  | 'app_opened'
  | 'app_closed'
  | 'morning_briefing_started'
  | 'morning_briefing_completed'
  | 'evening_review_started'
  | 'evening_review_completed'
  | 'quick_capture_used'
  | 'task_created'
  | 'task_completed'
  | 'goal_created'
  | 'chat_message_sent'
  | 'plan_imported'
  | 'nudge_shown'
  | 'nudge_dismissed'
  | 'settings_changed'
  // Errors
  | 'error_api'
  | 'error_database'
  | 'error_native_module'
  | 'error_uncaught'

export interface AnalyticsProperties {
  [key: string]: string | number | boolean | null | undefined
}

/**
 * Initialize the analytics service
 */
export function initAnalytics(): void {
  // Check if PostHog API key is configured
  if (!POSTHOG_API_KEY) {
    console.log('[Analytics] No API key configured - analytics disabled')
    return
  }

  // Check if analytics is enabled in settings
  const db = getDatabase()
  const row = db.prepare('SELECT analytics_enabled, analytics_id FROM user_settings WHERE id = 1').get() as Record<string, unknown>

  isEnabled = Boolean(row?.analytics_enabled)
  distinctId = row?.analytics_id as string | null

  if (!isEnabled) {
    console.log('[Analytics] Disabled by user preference')
    return
  }

  // Generate anonymous ID if not exists
  if (!distinctId) {
    distinctId = generateAnonymousId()
    db.prepare('UPDATE user_settings SET analytics_id = ? WHERE id = 1').run(distinctId)
  }

  // Initialize PostHog client
  posthogClient = new PostHog(POSTHOG_API_KEY, {
    host: POSTHOG_HOST,
    flushAt: 20, // Send events in batches of 20
    flushInterval: 30000, // Or every 30 seconds
  })

  // Identify the user (anonymous)
  posthogClient.identify({
    distinctId,
    properties: {
      app_version: app.getVersion(),
      platform: process.platform,
      electron_version: process.versions.electron,
      node_version: process.versions.node,
    },
  })

  console.log('[Analytics] Initialized with anonymous ID:', distinctId.substring(0, 8) + '...')
}

/**
 * Track an analytics event
 */
export function trackEvent(event: AnalyticsEvent, properties?: AnalyticsProperties): void {
  if (!isEnabled || !posthogClient || !distinctId) {
    return
  }

  try {
    posthogClient.capture({
      distinctId,
      event,
      properties: {
        ...properties,
        app_version: app.getVersion(),
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    // Don't let analytics errors affect the app
    console.error('[Analytics] Failed to track event:', error)
  }
}

/**
 * Track an error event
 */
export function trackError(
  type: 'error_api' | 'error_database' | 'error_native_module' | 'error_uncaught',
  error: Error | string,
  context?: AnalyticsProperties
): void {
  const errorMessage = error instanceof Error ? error.message : error
  const errorStack = error instanceof Error ? error.stack : undefined

  trackEvent(type, {
    error_message: errorMessage,
    error_stack: errorStack?.substring(0, 500), // Limit stack trace size
    ...context,
  })
}

/**
 * Enable analytics (called when user opts in)
 */
export function enableAnalytics(): void {
  if (!POSTHOG_API_KEY) {
    console.log('[Analytics] Cannot enable - no API key configured')
    return
  }

  const db = getDatabase()

  // Generate new anonymous ID
  distinctId = generateAnonymousId()

  db.prepare('UPDATE user_settings SET analytics_enabled = 1, analytics_id = ? WHERE id = 1').run(distinctId)

  isEnabled = true

  // Initialize PostHog if not already
  if (!posthogClient) {
    posthogClient = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      flushAt: 20,
      flushInterval: 30000,
    })
  }

  // Identify the user
  posthogClient.identify({
    distinctId,
    properties: {
      app_version: app.getVersion(),
      platform: process.platform,
      opted_in_at: new Date().toISOString(),
    },
  })

  trackEvent('settings_changed', { analytics_enabled: true })

  console.log('[Analytics] Enabled')
}

/**
 * Disable analytics (called when user opts out)
 */
export function disableAnalytics(): void {
  const db = getDatabase()

  // Track opt-out before disabling
  if (isEnabled && posthogClient && distinctId) {
    trackEvent('settings_changed', { analytics_enabled: false })

    // Flush pending events
    posthogClient.flush()
  }

  // Clear the anonymous ID and disable
  db.prepare('UPDATE user_settings SET analytics_enabled = 0, analytics_id = NULL WHERE id = 1').run()

  isEnabled = false
  distinctId = null

  console.log('[Analytics] Disabled and data cleared')
}

/**
 * Check if analytics is currently enabled
 */
export function isAnalyticsEnabled(): boolean {
  return isEnabled
}

/**
 * Check if analytics is available (API key configured)
 */
export function isAnalyticsAvailable(): boolean {
  return Boolean(POSTHOG_API_KEY)
}

/**
 * Shutdown analytics (call on app quit)
 */
export async function shutdownAnalytics(): Promise<void> {
  if (posthogClient) {
    trackEvent('app_closed')
    await posthogClient.shutdown()
    posthogClient = null
  }
}

/**
 * Generate a random anonymous ID
 */
function generateAnonymousId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = 'milo_'
  for (let i = 0; i < 16; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return id
}

// Export for testing
export const __testing = {
  generateAnonymousId,
}
