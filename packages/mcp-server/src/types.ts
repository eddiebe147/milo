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
