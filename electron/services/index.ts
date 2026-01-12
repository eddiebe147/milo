export { initDatabase, closeDatabase, getDatabase } from './database'
export { activityMonitor } from './ActivityMonitor'
export { stateDetector, detectState } from './StateDetector'
export { scoringEngine } from './ScoringEngine'
export { nudgeManager } from './NudgeManager'
export type { NudgeEvent } from './NudgeManager'
export { briefScheduler } from './BriefScheduler'
export type { BriefType, ScheduledBriefEvent } from './BriefScheduler'
export { calendarService } from './CalendarService'
export type { CalendarEvent, FreeBlock, DaySchedule } from './CalendarService'
export {
  initAnalytics,
  shutdownAnalytics,
  trackEvent,
  trackError,
  enableAnalytics,
  disableAnalytics,
  isAnalyticsEnabled,
  isAnalyticsAvailable,
} from './analytics'
export type { AnalyticsEvent, AnalyticsProperties } from './analytics'
export { checkForUpdates, getCurrentVersion } from './UpdateChecker'
export type { UpdateInfo } from './UpdateChecker'
