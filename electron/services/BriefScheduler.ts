import { BrowserWindow, Notification } from 'electron'
import { settingsRepository } from '../repositories/settings'

/**
 * BriefScheduler Service
 *
 * Manages scheduled morning and evening briefings.
 * Checks every minute if it's time for a briefing and sends system notifications.
 * When clicked, opens MILO and triggers the briefing in chat.
 */

export type BriefType = 'morning' | 'evening'

export interface ScheduledBriefEvent {
  type: BriefType
  scheduledTime: string
  triggeredAt: Date
}

class BriefScheduler {
  private mainWindow: BrowserWindow | null = null
  private checkInterval: NodeJS.Timeout | null = null
  private lastMorningTriggerDate: string | null = null
  private lastEveningTriggerDate: string | null = null
  private isEnabled: boolean = true

  /**
   * Set main window reference for IPC and focus
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  /**
   * Start the scheduler - checks every minute
   */
  start(): void {
    if (this.checkInterval) {
      console.log('[BriefScheduler] Already running')
      return
    }

    console.log('[BriefScheduler] Starting scheduler')

    // Check immediately on start
    this.checkScheduledBriefs()

    // Then check every minute
    this.checkInterval = setInterval(() => {
      this.checkScheduledBriefs()
    }, 60 * 1000) // Every minute
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
      console.log('[BriefScheduler] Stopped')
    }
  }

  /**
   * Enable or disable the scheduler
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    console.log(`[BriefScheduler] ${enabled ? 'Enabled' : 'Disabled'}`)
  }

  /**
   * Check if it's time for morning or evening brief
   */
  private checkScheduledBriefs(): void {
    if (!this.isEnabled) return

    const now = new Date()
    const currentTime = this.formatTime(now)
    const currentDate = this.formatDate(now)

    try {
      const settings = settingsRepository.get()
      const morningTime = settings.morningBriefingTime
      const eveningTime = settings.eveningReviewTime

      // Check morning briefing
      if (
        currentTime === morningTime &&
        this.lastMorningTriggerDate !== currentDate
      ) {
        this.lastMorningTriggerDate = currentDate
        this.triggerBrief('morning', morningTime)
      }

      // Check evening briefing
      if (
        currentTime === eveningTime &&
        this.lastEveningTriggerDate !== currentDate
      ) {
        this.lastEveningTriggerDate = currentDate
        this.triggerBrief('evening', eveningTime)
      }
    } catch (error) {
      console.error('[BriefScheduler] Error checking schedules:', error)
    }
  }

  /**
   * Trigger a briefing notification
   */
  private triggerBrief(type: BriefType, scheduledTime: string): void {
    console.log(`[BriefScheduler] Triggering ${type} brief at ${scheduledTime}`)

    const event: ScheduledBriefEvent = {
      type,
      scheduledTime,
      triggeredAt: new Date(),
    }

    // Show system notification
    this.showNotification(event)

    // Also send to renderer in case window is open
    this.sendToRenderer(event)
  }

  /**
   * Show system notification for briefing
   */
  private showNotification(event: ScheduledBriefEvent): void {
    if (!Notification.isSupported()) {
      console.log('[BriefScheduler] System notifications not supported')
      return
    }

    const title =
      event.type === 'morning'
        ? 'MILO - Morning Briefing Ready'
        : 'MILO - Evening Review Time'

    const body =
      event.type === 'morning'
        ? "Start your day with clarity. Here's your mission briefing."
        : "Time to review your day and prepare for tomorrow."

    const notification = new Notification({
      title,
      body,
      silent: false,
      urgency: 'normal',
    })

    notification.on('click', () => {
      // Show main window and trigger briefing
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.show()
        this.mainWindow.focus()
        // Send event to trigger briefing in chat
        this.mainWindow.webContents.send('brief:triggered', event)
      }
    })

    notification.show()
  }

  /**
   * Send briefing event to renderer
   */
  private sendToRenderer(event: ScheduledBriefEvent): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('brief:scheduled', event)
    }
  }

  /**
   * Manually trigger a briefing (from button click or chat command)
   */
  triggerManualBrief(type: BriefType): void {
    console.log(`[BriefScheduler] Manual ${type} brief triggered`)

    const event: ScheduledBriefEvent = {
      type,
      scheduledTime: 'manual',
      triggeredAt: new Date(),
    }

    this.sendToRenderer(event)
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean
    isEnabled: boolean
    lastMorningTrigger: string | null
    lastEveningTrigger: string | null
    nextMorningTime: string
    nextEveningTime: string
  } {
    const settings = settingsRepository.get()

    return {
      isRunning: this.checkInterval !== null,
      isEnabled: this.isEnabled,
      lastMorningTrigger: this.lastMorningTriggerDate,
      lastEveningTrigger: this.lastEveningTriggerDate,
      nextMorningTime: settings.morningBriefingTime,
      nextEveningTime: settings.eveningReviewTime,
    }
  }

  /**
   * Reset daily triggers (call at midnight)
   */
  resetDailyTriggers(): void {
    this.lastMorningTriggerDate = null
    this.lastEveningTriggerDate = null
    console.log('[BriefScheduler] Daily triggers reset')
  }

  /**
   * Format time as HH:MM
   */
  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }
}

// Singleton instance
export const briefScheduler = new BriefScheduler()
