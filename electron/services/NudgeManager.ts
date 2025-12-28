import { BrowserWindow, Notification } from 'electron'
import type { ActivityState } from '../../src/types'
import { claudeClient } from '../ai/ClaudeClient'
import { tasksRepository } from '../repositories'

// Nudge configuration
interface NudgeConfig {
  // Time in red state before first nudge (milliseconds)
  firstNudgeThresholdMs: number
  // Time between subsequent nudges (milliseconds)
  nudgeCooldownMs: number
  // Whether to show system notifications
  showSystemNotifications: boolean
  // Whether AI nudges are enabled
  aiNudgesEnabled: boolean
}

// Nudge event for renderer
export interface NudgeEvent {
  message: string
  driftMinutes: number
  currentApp: string
  timestamp: Date
  isAiGenerated: boolean
}

// Default configuration
const DEFAULT_CONFIG: NudgeConfig = {
  firstNudgeThresholdMs: 10 * 60 * 1000, // 10 minutes
  nudgeCooldownMs: 5 * 60 * 1000, // 5 minutes between nudges
  showSystemNotifications: true,
  aiNudgesEnabled: true,
}

// Fallback nudge messages when AI is unavailable
const FALLBACK_NUDGES = [
  "You've been drifting for a while. Time to refocus?",
  'Signal check: Is this moving the needle?',
  "Noise detected. What's the priority right now?",
  'The mission awaits. Ready to return?',
  "Drift alert! Let's get back on track.",
]

class NudgeManager {
  private config: NudgeConfig = DEFAULT_CONFIG
  private mainWindow: BrowserWindow | null = null

  // Drift tracking
  private driftStartTime: Date | null = null
  private lastNudgeTime: Date | null = null
  private currentDriftApp: string = ''
  private isInDriftState: boolean = false

  // For tracking consecutive drift time
  private totalDriftMs: number = 0
  private nudgeCount: number = 0

  // Set main window reference for IPC
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  // Update configuration
  setConfig(config: Partial<NudgeConfig>): void {
    this.config = { ...this.config, ...config }
    console.log('[NudgeManager] Config updated:', this.config)
  }

  // Get current configuration
  getConfig(): NudgeConfig {
    return { ...this.config }
  }

  // Handle state change from ActivityMonitor
  onStateChange(state: ActivityState, appName: string): void {
    if (state === 'red') {
      this.handleDriftStart(appName)
    } else {
      this.handleDriftEnd()
    }
  }

  // Start tracking drift
  private handleDriftStart(appName: string): void {
    if (!this.isInDriftState) {
      this.isInDriftState = true
      this.driftStartTime = new Date()
      this.currentDriftApp = appName
      console.log('[NudgeManager] Drift started:', appName)
    } else if (this.currentDriftApp !== appName) {
      // Still drifting but switched apps
      this.currentDriftApp = appName
    }

    // Check if we should nudge
    this.checkAndTriggerNudge()
  }

  // End drift tracking
  private handleDriftEnd(): void {
    if (this.isInDriftState && this.driftStartTime) {
      const driftDuration = Date.now() - this.driftStartTime.getTime()
      this.totalDriftMs += driftDuration

      console.log(
        `[NudgeManager] Drift ended. Duration: ${Math.round(driftDuration / 1000)}s, Total today: ${Math.round(this.totalDriftMs / 1000)}s`
      )
    }

    this.isInDriftState = false
    this.driftStartTime = null
    this.currentDriftApp = ''
    // Reset nudge count when user returns to productive work
    this.nudgeCount = 0
  }

  // Check if a nudge should be triggered
  private checkAndTriggerNudge(): void {
    if (!this.driftStartTime) return

    const driftDurationMs = Date.now() - this.driftStartTime.getTime()
    const driftMinutes = Math.round(driftDurationMs / 60000)

    // Check if we've passed the threshold for first nudge
    if (driftDurationMs < this.config.firstNudgeThresholdMs) {
      return
    }

    // Check cooldown
    if (this.lastNudgeTime) {
      const timeSinceLastNudge = Date.now() - this.lastNudgeTime.getTime()
      if (timeSinceLastNudge < this.config.nudgeCooldownMs) {
        return
      }
    }

    // Trigger the nudge
    this.triggerNudge(driftMinutes)
  }

  // Generate and send a nudge
  private async triggerNudge(driftMinutes: number): Promise<void> {
    this.lastNudgeTime = new Date()
    this.nudgeCount++

    console.log(
      `[NudgeManager] Triggering nudge #${this.nudgeCount} after ${driftMinutes}m drift on ${this.currentDriftApp}`
    )

    let message: string
    let isAiGenerated = false

    // Try AI-generated nudge if enabled and initialized
    if (this.config.aiNudgesEnabled && claudeClient.isInitialized()) {
      try {
        const activeTask = tasksRepository.getActive()
        message = await claudeClient.generateNudge(
          driftMinutes,
          this.currentDriftApp,
          activeTask || undefined
        )
        isAiGenerated = true
      } catch (error) {
        console.error('[NudgeManager] AI nudge failed, using fallback:', error)
        message = this.getFallbackNudge()
      }
    } else {
      message = this.getFallbackNudge()
    }

    const nudgeEvent: NudgeEvent = {
      message,
      driftMinutes,
      currentApp: this.currentDriftApp,
      timestamp: new Date(),
      isAiGenerated,
    }

    // Send to renderer
    this.sendToRenderer(nudgeEvent)

    // Show system notification if enabled
    if (this.config.showSystemNotifications) {
      this.showSystemNotification(nudgeEvent)
    }
  }

  // Get a random fallback nudge
  private getFallbackNudge(): string {
    const index = Math.floor(Math.random() * FALLBACK_NUDGES.length)
    return FALLBACK_NUDGES[index]
  }

  // Send nudge event to renderer
  private sendToRenderer(event: NudgeEvent): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('nudge:triggered', event)
    }
  }

  // Show system notification
  private showSystemNotification(event: NudgeEvent): void {
    if (!Notification.isSupported()) {
      console.log('[NudgeManager] System notifications not supported')
      return
    }

    const notification = new Notification({
      title: 'MILO - Signal Check',
      body: event.message,
      silent: false,
      urgency: 'normal',
    })

    notification.on('click', () => {
      // Show main window when notification is clicked
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.show()
        this.mainWindow.focus()
      }
    })

    notification.show()
  }

  // Get current drift status
  getDriftStatus(): {
    isInDriftState: boolean
    currentDriftMinutes: number
    totalDriftMinutesToday: number
    nudgeCount: number
    currentApp: string
  } {
    let currentDriftMinutes = 0
    if (this.isInDriftState && this.driftStartTime) {
      currentDriftMinutes = Math.round((Date.now() - this.driftStartTime.getTime()) / 60000)
    }

    return {
      isInDriftState: this.isInDriftState,
      currentDriftMinutes,
      totalDriftMinutesToday: Math.round(this.totalDriftMs / 60000),
      nudgeCount: this.nudgeCount,
      currentApp: this.currentDriftApp,
    }
  }

  // Reset daily stats (call at midnight or on new day)
  resetDailyStats(): void {
    this.totalDriftMs = 0
    this.nudgeCount = 0
    console.log('[NudgeManager] Daily stats reset')
  }

  // Manually trigger a check (useful for periodic polling)
  tick(): void {
    if (this.isInDriftState) {
      this.checkAndTriggerNudge()
    }
  }
}

// Singleton instance
export const nudgeManager = new NudgeManager()
