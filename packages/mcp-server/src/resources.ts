/**
 * MILO Task Management MCP Server - Resources
 *
 * Implements read-only MCP resources for quick data access:
 * - tasks://signal-queue - Top priority tasks (in_progress + pending by priority)
 * - tasks://backlog - All non-completed, non-deferred tasks
 * - categories://list - All categories sorted by sort_order
 * - tasks://today - Tasks scheduled for today
 */

import { getDatabase } from './db.js';
import { Task, Category } from './types.js';

/**
 * Resource definition interface
 */
export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
function today(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Convert snake_case DB row to camelCase Task object
 */
function dbRowToTask(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    status: row.status,
    priority: row.priority,
    categoryId: row.category_id || undefined,
    startDate: row.start_date || undefined,
    endDate: row.end_date || undefined,
    estimatedDays: row.estimated_days || undefined,
    daysWorked: row.days_worked || undefined,
    lastWorkedDate: row.last_worked_date || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert snake_case DB row to camelCase Category object
 */
function dbRowToCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color || undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get all available resources
 */
export function getResources(): ResourceDefinition[] {
  return [
    {
      uri: 'tasks://signal-queue',
      name: 'Signal Queue',
      description: 'Top priority tasks - in_progress tasks first, then pending by priority (limit 5)',
      mimeType: 'application/json',
    },
    {
      uri: 'tasks://backlog',
      name: 'Task Backlog',
      description: 'All non-completed, non-deferred tasks (excludes signal queue)',
      mimeType: 'application/json',
    },
    {
      uri: 'categories://list',
      name: 'Category List',
      description: 'All categories sorted by sort order',
      mimeType: 'application/json',
    },
    {
      uri: 'tasks://today',
      name: 'Today\'s Tasks',
      description: 'Tasks scheduled for today',
      mimeType: 'application/json',
    },
  ];
}

/**
 * Handle reading a resource by URI
 */
export async function handleResourceRead(uri: string) {
  const db = getDatabase();

  try {
    switch (uri) {
      case 'tasks://signal-queue': {
        // Signal queue: in_progress tasks first, then pending tasks, ordered by priority
        const query = `
          SELECT * FROM tasks
          WHERE status IN ('in_progress', 'pending')
          ORDER BY
            CASE status
              WHEN 'in_progress' THEN 0
              ELSE 1
            END,
            priority ASC,
            created_at ASC
          LIMIT 5
        `;

        const rows = db.prepare(query).all();
        const tasks = rows.map(dbRowToTask);

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(tasks, null, 2),
            },
          ],
        };
      }

      case 'tasks://backlog': {
        // Backlog: all non-completed, non-deferred tasks
        const query = `
          SELECT * FROM tasks
          WHERE status NOT IN ('completed', 'deferred')
          ORDER BY priority ASC, created_at ASC
        `;

        const rows = db.prepare(query).all();
        const tasks = rows.map(dbRowToTask);

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(tasks, null, 2),
            },
          ],
        };
      }

      case 'categories://list': {
        // All categories sorted by sort_order
        const query = `
          SELECT * FROM categories
          ORDER BY sort_order ASC
        `;

        const rows = db.prepare(query).all();
        const categories = rows.map(dbRowToCategory);

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(categories, null, 2),
            },
          ],
        };
      }

      case 'tasks://today': {
        // Tasks scheduled for today
        const todayDate = today();
        const query = `
          SELECT * FROM tasks
          WHERE scheduled_date = ?
          ORDER BY priority ASC, created_at ASC
        `;

        const rows = db.prepare(query).all(todayDate);
        const tasks = rows.map(dbRowToTask);

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(tasks, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown resource URI: ${uri}`);
    }
  } catch (error) {
    throw new Error(
      `Failed to read resource ${uri}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
