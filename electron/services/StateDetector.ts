import { classificationsRepository } from '../repositories'
import { tasksRepository } from '../repositories'
import type { ActivityState, AppClassification, Task } from '../../src/types'

// URL patterns for common distracting sites
const DISTRACTION_URL_PATTERNS = [
  /twitter\.com/i,
  /x\.com/i,
  /facebook\.com/i,
  /instagram\.com/i,
  /tiktok\.com/i,
  /reddit\.com/i,
  /youtube\.com\/watch/i, // YouTube videos (not homepage)
  /netflix\.com\/watch/i,
  /twitch\.tv/i,
  /discord\.com\/channels/i, // Discord chat (not just app)
]

// URL patterns for productive sites
const PRODUCTIVE_URL_PATTERNS = [
  /github\.com/i,
  /gitlab\.com/i,
  /stackoverflow\.com/i,
  /docs\./i, // documentation sites
  /developer\./i,
  /api\./i,
  /console\./i, // cloud consoles
  /vercel\.com/i,
  /supabase\.com/i,
  /figma\.com/i,
  /notion\.so/i,
  /linear\.app/i,
]

class StateDetector {
  private classificationsCache: Map<string, AppClassification> = new Map()
  private cacheExpiry: number = 0
  private cacheTtlMs = 60000 // 1 minute cache

  // Get current active task for context-aware detection
  private getCurrentTask(): Task | null {
    try {
      return tasksRepository.getActive()
    } catch {
      return null
    }
  }

  // Refresh classifications cache
  private refreshCache(): void {
    const now = Date.now()
    if (now < this.cacheExpiry) return

    try {
      const classifications = classificationsRepository.getAll()
      this.classificationsCache.clear()

      for (const classification of classifications) {
        // Key by lowercase app name for case-insensitive matching
        this.classificationsCache.set(classification.appName.toLowerCase(), classification)
        if (classification.bundleId) {
          this.classificationsCache.set(classification.bundleId.toLowerCase(), classification)
        }
      }

      this.cacheExpiry = now + this.cacheTtlMs
    } catch (error) {
      console.error('[StateDetector] Error refreshing cache:', error)
    }
  }

  // Main detection function
  detect(appName: string, windowTitle: string, url?: string): ActivityState {
    this.refreshCache()

    // Step 1: Check for URL-based classification (most specific)
    if (url) {
      const urlState = this.classifyUrl(url)
      if (urlState !== 'amber') {
        return urlState
      }
    }

    // Step 2: Check app classification from database
    const appClassification = this.getAppClassification(appName)
    if (appClassification) {
      // Check if window title keywords modify the state
      if (appClassification.keywords && appClassification.keywords.length > 0) {
        const keywordState = this.checkKeywords(windowTitle, appClassification.keywords)
        if (keywordState) {
          return keywordState
        }
      }
      return appClassification.defaultState
    }

    // Step 3: Context-aware classification based on active task
    const activeTask = this.getCurrentTask()
    if (activeTask) {
      const contextState = this.classifyByTaskContext(appName, windowTitle, activeTask)
      if (contextState !== 'amber') {
        return contextState
      }
    }

    // Step 4: Heuristic-based classification
    return this.classifyByHeuristics(appName, windowTitle)
  }

  // Get app classification from cache
  private getAppClassification(appName: string): AppClassification | null {
    return this.classificationsCache.get(appName.toLowerCase()) || null
  }

  // Classify URL
  private classifyUrl(url: string): ActivityState {
    // Check distraction patterns first
    for (const pattern of DISTRACTION_URL_PATTERNS) {
      if (pattern.test(url)) {
        return 'red'
      }
    }

    // Check productive patterns
    for (const pattern of PRODUCTIVE_URL_PATTERNS) {
      if (pattern.test(url)) {
        return 'green'
      }
    }

    return 'amber'
  }

  // Check window title against keywords
  private checkKeywords(
    windowTitle: string,
    keywords: string[]
  ): ActivityState | null {
    const lowerTitle = windowTitle.toLowerCase()

    for (const keyword of keywords) {
      if (keyword.startsWith('!')) {
        // Negation: if keyword present, mark as red
        if (lowerTitle.includes(keyword.substring(1).toLowerCase())) {
          return 'red'
        }
      } else if (keyword.startsWith('+')) {
        // Positive: if keyword present, mark as green
        if (lowerTitle.includes(keyword.substring(1).toLowerCase())) {
          return 'green'
        }
      }
    }

    return null
  }

  // Context-aware classification based on active task
  private classifyByTaskContext(
    appName: string,
    windowTitle: string,
    task: Task
  ): ActivityState {
    const taskTitle = task.title.toLowerCase()
    const lowerWindowTitle = windowTitle.toLowerCase()
    const lowerAppName = appName.toLowerCase()

    // Extract keywords from task title
    const taskKeywords = taskTitle
      .split(/\s+/)
      .filter(word => word.length > 3) // Skip short words

    // Check if window title or app name contains task keywords
    for (const keyword of taskKeywords) {
      if (lowerWindowTitle.includes(keyword) || lowerAppName.includes(keyword)) {
        return 'green' // Directly related to task
      }
    }

    return 'amber' // Not clearly related
  }

  // Heuristic-based classification for unknown apps
  private classifyByHeuristics(appName: string, windowTitle: string): ActivityState {
    const lowerApp = appName.toLowerCase()
    const lowerTitle = windowTitle.toLowerCase()

    // Development tools (green)
    if (
      lowerApp.includes('code') ||
      lowerApp.includes('studio') ||
      lowerApp.includes('terminal') ||
      lowerApp.includes('iterm') ||
      lowerApp.includes('xcode') ||
      lowerApp.includes('intellij') ||
      lowerApp.includes('vim') ||
      lowerApp.includes('emacs')
    ) {
      return 'green'
    }

    // Design tools (green)
    if (
      lowerApp.includes('figma') ||
      lowerApp.includes('sketch') ||
      lowerApp.includes('photoshop') ||
      lowerApp.includes('illustrator')
    ) {
      return 'green'
    }

    // Productivity apps (green)
    if (
      lowerApp.includes('notion') ||
      lowerApp.includes('obsidian') ||
      lowerApp.includes('bear') ||
      lowerApp.includes('notes')
    ) {
      return 'green'
    }

    // Window title hints for browsers
    if (lowerTitle.includes('- youtube') && !lowerTitle.includes('music')) {
      return 'red' // YouTube video
    }

    if (lowerTitle.includes('- github') || lowerTitle.includes('- gitlab')) {
      return 'green'
    }

    if (lowerTitle.includes('- stack overflow') || lowerTitle.includes('- documentation')) {
      return 'green'
    }

    // Social media in window title
    if (
      lowerTitle.includes('twitter') ||
      lowerTitle.includes('facebook') ||
      lowerTitle.includes('instagram') ||
      lowerTitle.includes('reddit')
    ) {
      return 'red'
    }

    // Default to amber (unknown/neutral)
    return 'amber'
  }

  // Add a custom classification
  addClassification(
    appName: string,
    state: ActivityState,
    bundleId?: string,
    keywords?: string[]
  ): void {
    classificationsRepository.upsert({
      appName,
      bundleId,
      defaultState: state,
      keywords,
      isCustom: true,
    })

    // Invalidate cache
    this.cacheExpiry = 0
  }

  // Remove a custom classification
  removeClassification(id: string): boolean {
    const result = classificationsRepository.delete(id)
    if (result) {
      this.cacheExpiry = 0 // Invalidate cache
    }
    return result
  }

  // Get all classifications
  getClassifications(): AppClassification[] {
    this.refreshCache()
    return Array.from(this.classificationsCache.values())
  }
}

// Singleton instance
export const stateDetector = new StateDetector()

// Export the detect function for use in ActivityMonitor
export const detectState = (appName: string, windowTitle: string, url?: string): ActivityState => {
  return stateDetector.detect(appName, windowTitle, url)
}
