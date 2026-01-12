/**
 * MILO Task Management MCP Server - Type Definitions
 *
 * These types match the SQLite schema used by the MILO Electron app.
 */

/**
 * Task status values
 * Matches the CHECK constraint in the tasks table:
 * status IN ('pending', 'in_progress', 'completed', 'deferred')
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'deferred';

/**
 * Task interface matching MILO's database schema
 */
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: number; // 1-5, where 1 is highest priority
  categoryId?: string;
  startDate?: string; // ISO 8601 date string
  endDate?: string; // ISO 8601 date string
  estimatedDays?: number;
  daysWorked?: number;
  lastWorkedDate?: string; // ISO 8601 date string
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

/**
 * Category interface matching MILO's database schema
 */
export interface Category {
  id: string;
  name: string;
  color?: string; // Hex color code
  sortOrder: number;
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

/**
 * Goal timeframe values
 * Hierarchical: yearly (beacon) → quarterly (milestone) → monthly (objective) → weekly (target)
 */
export type GoalTimeframe = 'yearly' | 'quarterly' | 'monthly' | 'weekly';

/**
 * Goal status values
 */
export type GoalStatus = 'active' | 'completed' | 'archived';

/**
 * Goal interface matching MILO's database schema
 */
export interface Goal {
  id: string;
  title: string;
  description?: string;
  parentId?: string; // Links to parent goal for hierarchy
  timeframe: GoalTimeframe;
  status: GoalStatus;
  targetDate?: string; // ISO 8601 date string
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

/**
 * Activity state values
 * GREEN = productive, AMBER = neutral, RED = distracted
 */
export type ActivityState = 'GREEN' | 'AMBER' | 'RED';

/**
 * Activity log entry interface
 */
export interface ActivityLog {
  id: string;
  appName: string;
  windowTitle: string;
  state: ActivityState;
  durationSeconds: number;
  timestamp: string; // ISO 8601 timestamp
}

/**
 * Daily stats interface
 */
export interface DailyStats {
  date: string; // YYYY-MM-DD
  greenMinutes: number;
  amberMinutes: number;
  redMinutes: number;
  signalScore: number; // 0-100
  tasksCompleted: number;
  streak: number;
}

// ==================== BRIEFING TYPES ====================

/**
 * Calendar event for briefing display
 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  allDay: boolean;
  source: 'google' | 'apple' | 'manual';
}

/**
 * Streak information
 */
export interface StreakInfo {
  streak: number;
  isActive: boolean;
  lastDate: string | null;
  message?: string;
}

/**
 * Signal task with rationale (for briefing display)
 */
export interface SignalTask {
  task: Task;
  rationale?: string;
  linkedGoal?: string;
}

/**
 * Carryover task with decision recommendation
 */
export interface CarryoverTask {
  task: Task;
  daysOverdue: number;
  suggestion: 'tackle_today' | 'defer' | 'break_down' | 'drop';
}

/**
 * Morning Brief Output - Complete structured response
 */
export interface MorningBriefOutput {
  date: string;
  type: 'morning';

  // Core: Signal queue (always included)
  signalQueue: Task[];

  // Optional sections
  carryoverTasks?: Task[];
  weeklyGoals?: Goal[];
  quarterlyMilestone?: Goal | null;
  yesterdayStats?: DailyStats | null;
  streak?: StreakInfo;

  // Calendar (when integrated)
  calendar?: {
    events: CalendarEvent[];
    freeBlocks: { start: string; end: string; durationMinutes: number }[];
    busyHours: number;
  };

  // AI-generated content
  insights?: string[];
  briefing?: string;
  warnings?: string[];
}

/**
 * Evening Brief Output - Complete structured response
 */
export interface EveningBriefOutput {
  date: string;
  type: 'evening';

  // Accomplishments
  accomplishments?: Task[];

  // Metrics
  todayStats?: DailyStats | null;

  // Carryover
  incompleteTasksForReview?: Task[];

  // Tomorrow prep
  tomorrowSignalQueue?: Task[];

  // Streak
  streak?: StreakInfo;

  // AI-generated content
  insights?: string[];
  wins?: string[];
  improvements?: string[];

  // Shutdown ritual
  shutdownMessage?: string;
}

/**
 * Briefing configuration (user preferences)
 */
export interface BriefingConfig {
  // Morning sections
  morningCalendar: boolean;
  morningCarryover: boolean;
  morningGoals: boolean;
  morningYesterdayStats: boolean;
  morningStreak: boolean;
  morningAiInsights: boolean;
  morningQuickCapture: boolean;

  // Evening sections
  eveningAccomplishments: boolean;
  eveningMetrics: boolean;
  eveningWins: boolean;
  eveningReflection: boolean;
  eveningCarryover: boolean;
  eveningTomorrowTop3: boolean;
  eveningShutdown: boolean;
  eveningAiInsights: boolean;
}
