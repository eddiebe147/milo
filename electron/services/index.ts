export { initDatabase, closeDatabase, getDatabase } from './database'
export { activityMonitor } from './ActivityMonitor'
export { stateDetector, detectState } from './StateDetector'
export { scoringEngine } from './ScoringEngine'
export { nudgeManager } from './NudgeManager'
export type { NudgeEvent } from './NudgeManager'
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
