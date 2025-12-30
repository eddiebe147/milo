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
