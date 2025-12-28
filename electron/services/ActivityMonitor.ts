import { activeWindow } from 'active-win'
import { BrowserWindow } from 'electron'
import { activityRepository } from '../repositories'
import type { ActivityState } from '../../src/types'

// State change callback type
type StateChangeCallback = (state: {
  appName: string
  windowTitle: string
  state: ActivityState
  stateChanged: boolean
}) => void

class ActivityMonitor {
  private isRunning = false
  private isPaused = false
  private pollInterval: NodeJS.Timeout | null = null
  private pollIntervalMs = 5000 // Default 5 seconds

  private currentState: ActivityState = 'amber'
  private currentAppName = ''
  private currentWindowTitle = ''
  private currentLogId: string | null = null
  private stateStartTime: Date = new Date()

  private stateDetector: ((appName: string, windowTitle: string, url?: string) => ActivityState) | null = null
  private onStateChange: StateChangeCallback | null = null
  private mainWindow: BrowserWindow | null = null

  // Set the state detector function (injected from StateDetector service)
  setStateDetector(detector: (appName: string, windowTitle: string, url?: string) => ActivityState): void {
    this.stateDetector = detector
  }

  // Set the callback for state changes
  setOnStateChange(callback: StateChangeCallback): void {
    this.onStateChange = callback
  }

  // Set the main window reference for sending IPC messages
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  // Set polling interval
  setPollingInterval(ms: number): void {
    this.pollIntervalMs = ms
    if (this.isRunning) {
      this.stop()
      this.start()
    }
  }

  // Start monitoring
  start(): void {
    if (this.isRunning) return

    console.log('[ActivityMonitor] Starting activity monitoring')
    this.isRunning = true
    this.stateStartTime = new Date()

    // Initial poll
    this.poll()

    // Set up interval polling
    this.pollInterval = setInterval(() => {
      if (!this.isPaused) {
        this.poll()
      }
    }, this.pollIntervalMs)
  }

  // Stop monitoring
  stop(): void {
    if (!this.isRunning) return

    console.log('[ActivityMonitor] Stopping activity monitoring')
    this.isRunning = false

    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }

    // Finalize current log entry
    this.finalizeCurrentLog()
  }

  // Pause monitoring (keeps tracking but doesn't log)
  pause(): void {
    if (this.isPaused) return
    console.log('[ActivityMonitor] Pausing monitoring')
    this.isPaused = true
    this.finalizeCurrentLog()
  }

  // Resume monitoring
  resume(): void {
    if (!this.isPaused) return
    console.log('[ActivityMonitor] Resuming monitoring')
    this.isPaused = false
    this.stateStartTime = new Date()
    this.poll()
  }

  // Toggle pause state
  togglePause(): boolean {
    if (this.isPaused) {
      this.resume()
    } else {
      this.pause()
    }
    return this.isPaused
  }

  // Get current monitoring state
  getStatus(): {
    isRunning: boolean
    isPaused: boolean
    currentState: ActivityState
    currentAppName: string
    currentWindowTitle: string
  } {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentState: this.currentState,
      currentAppName: this.currentAppName,
      currentWindowTitle: this.currentWindowTitle,
    }
  }

  // Main polling function
  private async poll(): Promise<void> {
    try {
      const window = await activeWindow()

      if (!window) {
        // No active window (screen locked, etc.)
        return
      }

      const appName = window.owner.name
      const windowTitle = window.title
      // bundleId is available on macOS
      const bundleId = 'bundleId' in window.owner ? (window.owner as { bundleId: string }).bundleId : undefined
      // url is available on macOS for browsers
      const url = 'url' in window ? (window as { url: string }).url : undefined

      // Detect state using injected detector
      let newState: ActivityState = 'amber'
      if (this.stateDetector) {
        newState = this.stateDetector(appName, windowTitle, url)
      }

      // Check if state or app changed
      const stateChanged = newState !== this.currentState
      const appChanged = appName !== this.currentAppName || windowTitle !== this.currentWindowTitle

      if (stateChanged || appChanged) {
        // Finalize the previous log entry
        this.finalizeCurrentLog()

        // Update current tracking
        this.currentState = newState
        this.currentAppName = appName
        this.currentWindowTitle = windowTitle
        this.stateStartTime = new Date()

        // Create new log entry
        const log = activityRepository.log({
          timestamp: this.stateStartTime.toISOString(),
          appName,
          windowTitle,
          bundleId,
          url,
          durationSeconds: 0,
          state: newState,
        })
        this.currentLogId = log.id

        // Notify about state change
        if (this.onStateChange) {
          this.onStateChange({
            appName,
            windowTitle,
            state: newState,
            stateChanged,
          })
        }

        // Send to renderer
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('activity:state-changed', {
            appName,
            windowTitle,
            state: newState,
            stateChanged,
          })
        }
      }
    } catch (error) {
      console.error('[ActivityMonitor] Error polling active window:', error)
    }
  }

  // Finalize the current log entry with duration
  private finalizeCurrentLog(): void {
    if (!this.currentLogId) return

    const now = new Date()
    const durationSeconds = Math.floor((now.getTime() - this.stateStartTime.getTime()) / 1000)

    if (durationSeconds > 0) {
      activityRepository.updateDuration(this.currentLogId, durationSeconds)
    }

    this.currentLogId = null
  }
}

// Singleton instance
export const activityMonitor = new ActivityMonitor()
