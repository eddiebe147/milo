import { BrowserWindow, shell } from 'electron'
import { settingsRepository } from '../repositories/settings'
import http from 'http'
import { URL } from 'url'

/**
 * CalendarService
 *
 * Handles calendar integration for morning briefings.
 * Supports Google Calendar via OAuth2.
 * Apple Calendar support planned for future (requires native macOS APIs).
 */

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  isAllDay: boolean
  location?: string
  meetingLink?: string
  source: 'google' | 'apple'
}

export interface FreeBlock {
  startTime: Date
  endTime: Date
  durationMinutes: number
}

export interface DaySchedule {
  events: CalendarEvent[]
  freeBlocks: FreeBlock[]
  busyMinutes: number
  freeMinutes: number
}

// Google OAuth2 configuration
// These would normally be in environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const GOOGLE_REDIRECT_PORT = 8089
const GOOGLE_REDIRECT_URI = `http://localhost:${GOOGLE_REDIRECT_PORT}/oauth/callback`

class CalendarService {
  private mainWindow: BrowserWindow | null = null
  private oauthServer: http.Server | null = null

  /**
   * Set main window reference for OAuth flow
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  /**
   * Check if Google Calendar is configured and enabled
   */
  isGoogleConfigured(): boolean {
    return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)
  }

  /**
   * Check if user has connected Google Calendar
   */
  isGoogleConnected(): boolean {
    const config = settingsRepository.getCalendarConfig()
    return config.googleEnabled && Boolean(config.googleToken)
  }

  /**
   * Start Google OAuth2 flow
   * Opens browser for user to authorize, then captures the callback
   */
  async startGoogleAuth(): Promise<{ success: boolean; error?: string }> {
    if (!this.isGoogleConfigured()) {
      return { success: false, error: 'Google Calendar not configured. Missing API credentials.' }
    }

    return new Promise((resolve) => {
      // Start local server to receive OAuth callback
      this.oauthServer = http.createServer(async (req, res) => {
        const url = new URL(req.url || '', `http://localhost:${GOOGLE_REDIRECT_PORT}`)

        if (url.pathname === '/oauth/callback') {
          const code = url.searchParams.get('code')
          const error = url.searchParams.get('error')

          if (error) {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end('<html><body><h1>Authorization Failed</h1><p>You can close this window.</p></body></html>')
            this.stopOAuthServer()
            resolve({ success: false, error: `OAuth error: ${error}` })
            return
          }

          if (code) {
            try {
              // Exchange code for tokens
              const tokens = await this.exchangeCodeForTokens(code)

              // Save tokens
              settingsRepository.updateCalendarConfig({
                googleEnabled: true,
                googleToken: tokens.accessToken,
                googleRefreshToken: tokens.refreshToken,
              })

              res.writeHead(200, { 'Content-Type': 'text/html' })
              res.end('<html><body><h1>Success!</h1><p>Google Calendar connected. You can close this window.</p></body></html>')

              // Notify renderer
              if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('calendar:connected', { provider: 'google' })
              }

              this.stopOAuthServer()
              resolve({ success: true })
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : 'Token exchange failed'
              res.writeHead(200, { 'Content-Type': 'text/html' })
              res.end(`<html><body><h1>Error</h1><p>${errorMsg}</p></body></html>`)
              this.stopOAuthServer()
              resolve({ success: false, error: errorMsg })
            }
          }
        }
      })

      this.oauthServer.listen(GOOGLE_REDIRECT_PORT, () => {
        // Build OAuth URL
        const scopes = [
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/calendar.events.readonly',
        ]

        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
        authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
        authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI)
        authUrl.searchParams.set('response_type', 'code')
        authUrl.searchParams.set('scope', scopes.join(' '))
        authUrl.searchParams.set('access_type', 'offline')
        authUrl.searchParams.set('prompt', 'consent')

        // Open in external browser
        shell.openExternal(authUrl.toString())
      })

      // Timeout after 5 minutes
      setTimeout(() => {
        if (this.oauthServer) {
          this.stopOAuthServer()
          resolve({ success: false, error: 'OAuth flow timed out' })
        }
      }, 5 * 60 * 1000)
    })
  }

  /**
   * Exchange authorization code for access/refresh tokens
   */
  private async exchangeCodeForTokens(code: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Token exchange failed: ${error}`)
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    }
  }

  /**
   * Refresh the access token using refresh token
   */
  private async refreshAccessToken(): Promise<string | null> {
    const config = settingsRepository.getCalendarConfig()

    if (!config.googleRefreshToken) {
      return null
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: config.googleRefreshToken,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          grant_type: 'refresh_token',
        }),
      })

      if (!response.ok) {
        console.error('[CalendarService] Token refresh failed')
        return null
      }

      const data = await response.json()
      const newToken = data.access_token

      // Update stored token
      settingsRepository.updateCalendarConfig({
        googleToken: newToken,
      })

      return newToken
    } catch (error) {
      console.error('[CalendarService] Token refresh error:', error)
      return null
    }
  }

  /**
   * Stop the OAuth callback server
   */
  private stopOAuthServer(): void {
    if (this.oauthServer) {
      this.oauthServer.close()
      this.oauthServer = null
    }
  }

  /**
   * Disconnect Google Calendar
   */
  disconnectGoogle(): void {
    settingsRepository.updateCalendarConfig({
      googleEnabled: false,
      googleToken: null,
      googleRefreshToken: null,
    })

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('calendar:disconnected', { provider: 'google' })
    }

    console.log('[CalendarService] Google Calendar disconnected')
  }

  /**
   * Get today's calendar events from Google Calendar
   */
  async getTodayEvents(): Promise<CalendarEvent[]> {
    if (!this.isGoogleConnected()) {
      return []
    }

    const config = settingsRepository.getCalendarConfig()
    let accessToken = config.googleToken

    // Try to fetch events
    let events = await this.fetchGoogleEvents(accessToken!)

    // If failed, try refreshing token
    if (events === null) {
      accessToken = await this.refreshAccessToken()
      if (accessToken) {
        events = await this.fetchGoogleEvents(accessToken)
      }
    }

    return events || []
  }

  /**
   * Fetch events from Google Calendar API
   */
  private async fetchGoogleEvents(accessToken: string): Promise<CalendarEvent[] | null> {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    const params = new URLSearchParams({
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    })

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (response.status === 401) {
        // Token expired
        return null
      }

      if (!response.ok) {
        console.error('[CalendarService] Failed to fetch events:', response.status)
        return []
      }

      const data = await response.json()

      return (data.items || []).map((item: GoogleCalendarEvent) => this.parseGoogleEvent(item))
    } catch (error) {
      console.error('[CalendarService] Error fetching events:', error)
      return []
    }
  }

  /**
   * Parse Google Calendar event to our format
   */
  private parseGoogleEvent(item: GoogleCalendarEvent): CalendarEvent {
    const isAllDay = Boolean(item.start?.date)

    let startTime: Date
    let endTime: Date

    if (isAllDay) {
      startTime = new Date(item.start.date!)
      endTime = new Date(item.end.date!)
    } else {
      startTime = new Date(item.start.dateTime!)
      endTime = new Date(item.end.dateTime!)
    }

    // Extract meeting link if present
    let meetingLink: string | undefined
    if (item.hangoutLink) {
      meetingLink = item.hangoutLink
    } else if (item.conferenceData?.entryPoints) {
      const videoEntry = item.conferenceData.entryPoints.find(
        (e: { entryPointType: string }) => e.entryPointType === 'video'
      )
      if (videoEntry) {
        meetingLink = videoEntry.uri
      }
    }

    return {
      id: item.id,
      title: item.summary || '(No title)',
      description: item.description,
      startTime,
      endTime,
      isAllDay,
      location: item.location,
      meetingLink,
      source: 'google',
    }
  }

  /**
   * Calculate free blocks between events
   */
  calculateFreeBlocks(events: CalendarEvent[], workStart: string, workEnd: string): FreeBlock[] {
    const now = new Date()
    const [startHour, startMin] = workStart.split(':').map(Number)
    const [endHour, endMin] = workEnd.split(':').map(Number)

    const workStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMin)
    const workEndTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMin)

    // Filter to non-all-day events and sort by start time
    const timedEvents = events
      .filter(e => !e.isAllDay)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

    const freeBlocks: FreeBlock[] = []
    let currentTime = workStartTime

    for (const event of timedEvents) {
      // Skip events that end before work starts or start after work ends
      if (event.endTime <= workStartTime || event.startTime >= workEndTime) {
        continue
      }

      const eventStart = event.startTime < workStartTime ? workStartTime : event.startTime
      const eventEnd = event.endTime > workEndTime ? workEndTime : event.endTime

      // If there's a gap before this event
      if (eventStart > currentTime) {
        const durationMinutes = Math.round((eventStart.getTime() - currentTime.getTime()) / 60000)
        if (durationMinutes >= 15) { // Only count blocks of 15+ minutes
          freeBlocks.push({
            startTime: new Date(currentTime),
            endTime: new Date(eventStart),
            durationMinutes,
          })
        }
      }

      // Move current time to end of this event
      if (eventEnd > currentTime) {
        currentTime = eventEnd
      }
    }

    // Check for free time after last event
    if (currentTime < workEndTime) {
      const durationMinutes = Math.round((workEndTime.getTime() - currentTime.getTime()) / 60000)
      if (durationMinutes >= 15) {
        freeBlocks.push({
          startTime: new Date(currentTime),
          endTime: new Date(workEndTime),
          durationMinutes,
        })
      }
    }

    return freeBlocks
  }

  /**
   * Get complete day schedule with events and free blocks
   */
  async getDaySchedule(): Promise<DaySchedule> {
    const events = await this.getTodayEvents()
    const settings = settingsRepository.get()
    const freeBlocks = this.calculateFreeBlocks(events, settings.workStartTime, settings.workEndTime)

    // Calculate busy/free minutes
    const busyMinutes = events
      .filter(e => !e.isAllDay)
      .reduce((sum, e) => sum + Math.round((e.endTime.getTime() - e.startTime.getTime()) / 60000), 0)

    const freeMinutes = freeBlocks.reduce((sum, b) => sum + b.durationMinutes, 0)

    return {
      events,
      freeBlocks,
      busyMinutes,
      freeMinutes,
    }
  }

  /**
   * Get connection status for all calendar providers
   */
  getStatus(): {
    google: { configured: boolean; connected: boolean }
    apple: { configured: boolean; connected: boolean }
  } {
    const config = settingsRepository.getCalendarConfig()

    return {
      google: {
        configured: this.isGoogleConfigured(),
        connected: this.isGoogleConnected(),
      },
      apple: {
        configured: false, // Apple Calendar requires native integration
        connected: config.appleEnabled,
      },
    }
  }
}

// Google Calendar API response types
interface GoogleCalendarEvent {
  id: string
  summary?: string
  description?: string
  start: {
    date?: string
    dateTime?: string
    timeZone?: string
  }
  end: {
    date?: string
    dateTime?: string
    timeZone?: string
  }
  location?: string
  hangoutLink?: string
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string
      uri?: string
    }>
  }
}

// Singleton instance
export const calendarService = new CalendarService()
