/**
 * MILO Task Management MCP Server - Task Tools
 *
 * Implements 11 task management tools for the MCP server:
 * - CRUD operations (create, list, get, update, delete)
 * - Task lifecycle (start, complete, defer)
 * - Signal queue and backlog management
 * - Work tracking
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getDatabase } from '../db.js';
import { Task, TaskStatus } from '../types.js';

/**
 * Tool definition interface
 */
export interface TaskToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get current ISO timestamp
 */
function now(): string {
  return new Date().toISOString();
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
    status: row.status as TaskStatus,
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

// ==================== TOOL SCHEMAS ====================

const TaskCreateSchema = z.object({
  title: z.string().describe('Task title'),
  description: z.string().optional().describe('Task description'),
  categoryId: z.string().optional().describe('Category ID'),
  priority: z.number().int().min(1).max(5).default(3).describe('Priority (1-5, where 1 is highest)'),
  estimatedDays: z.number().int().positive().optional().describe('Estimated days to complete'),
  startDate: z.string().optional().describe('Start date (ISO 8601 format)'),
  endDate: z.string().optional().describe('End date (ISO 8601 format)'),
});

const TaskListSchema = z.object({
  categoryId: z.string().optional().describe('Filter by category ID'),
  status: z.enum(['pending', 'in_progress', 'completed', 'deferred']).optional().describe('Filter by status'),
  priority: z.number().int().min(1).max(5).optional().describe('Filter by priority'),
  limit: z.number().int().positive().default(50).describe('Maximum number of tasks to return'),
});

const TaskGetSchema = z.object({
  taskId: z.string().describe('Task ID'),
});

const TaskUpdateSchema = z.object({
  taskId: z.string().describe('Task ID'),
  title: z.string().optional().describe('New title'),
  description: z.string().optional().describe('New description'),
  categoryId: z.string().optional().describe('New category ID'),
  priority: z.number().int().min(1).max(5).optional().describe('New priority (1-5)'),
  status: z.enum(['pending', 'in_progress', 'completed', 'deferred']).optional().describe('New status'),
  estimatedDays: z.number().int().positive().optional().describe('New estimated days'),
  startDate: z.string().optional().describe('New start date (ISO 8601)'),
  endDate: z.string().optional().describe('New end date (ISO 8601)'),
});

const TaskDeleteSchema = z.object({
  taskId: z.string().describe('Task ID to delete'),
});

const TaskStartSchema = z.object({
  taskId: z.string().describe('Task ID to start'),
});

const TaskCompleteSchema = z.object({
  taskId: z.string().describe('Task ID to mark complete'),
});

const TaskDeferSchema = z.object({
  taskId: z.string().describe('Task ID to defer'),
  deferTo: z.string().describe('Date to defer to (ISO 8601 format)'),
});

const TaskSignalQueueSchema = z.object({
  limit: z.number().int().positive().default(5).describe('Maximum number of tasks to return'),
});

const TaskBacklogSchema = z.object({
  categoryId: z.string().optional().describe('Filter by category ID'),
  limit: z.number().int().positive().default(50).describe('Maximum number of tasks to return'),
});

const TaskRecordWorkSchema = z.object({
  taskId: z.string().describe('Task ID to record work for'),
});

// ==================== TOOL DEFINITIONS ====================

export function getTaskTools(): TaskToolDefinition[] {
  return [
    {
      name: 'task_create',
      description: 'Create a new task with optional details',
      inputSchema: zodToJsonSchema(TaskCreateSchema),
    },
    {
      name: 'task_list',
      description: 'List tasks with optional filters (category, status, priority)',
      inputSchema: zodToJsonSchema(TaskListSchema),
    },
    {
      name: 'task_get',
      description: 'Get a single task by ID',
      inputSchema: zodToJsonSchema(TaskGetSchema),
    },
    {
      name: 'task_update',
      description: 'Update task fields (only provided fields will be updated)',
      inputSchema: zodToJsonSchema(TaskUpdateSchema),
    },
    {
      name: 'task_delete',
      description: 'Delete a task by ID',
      inputSchema: zodToJsonSchema(TaskDeleteSchema),
    },
    {
      name: 'task_start',
      description: 'Start working on a task (sets status to in_progress)',
      inputSchema: zodToJsonSchema(TaskStartSchema),
    },
    {
      name: 'task_complete',
      description: 'Mark a task as complete (sets status to done)',
      inputSchema: zodToJsonSchema(TaskCompleteSchema),
    },
    {
      name: 'task_defer',
      description: 'Defer a task to a future date',
      inputSchema: zodToJsonSchema(TaskDeferSchema),
    },
    {
      name: 'task_signal_queue',
      description: 'Get top priority tasks (the signal queue) - in_progress tasks first, then highest priority todos',
      inputSchema: zodToJsonSchema(TaskSignalQueueSchema),
    },
    {
      name: 'task_backlog',
      description: 'Get backlog tasks (not in signal queue, excludes completed and deferred)',
      inputSchema: zodToJsonSchema(TaskBacklogSchema),
    },
    {
      name: 'task_record_work',
      description: 'Record work on a multi-day task (increments days_worked, updates last_worked_date)',
      inputSchema: zodToJsonSchema(TaskRecordWorkSchema),
    },
  ];
}

// ==================== TOOL HANDLERS ====================

async function handleTaskCreate(args: z.infer<typeof TaskCreateSchema>): Promise<Task> {
  const db = getDatabase();
  const taskId = generateUUID();
  const timestamp = now();

  // scheduled_date is required by MILO's schema - use startDate or today's date
  const scheduledDate = args.startDate || today();

  const stmt = db.prepare(`
    INSERT INTO tasks (
      id, title, description, status, priority, category_id,
      scheduled_date, start_date, end_date, estimated_days, days_worked,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    taskId,
    args.title,
    args.description || null,
    'pending',
    args.priority,
    args.categoryId || null,
    scheduledDate,
    args.startDate || null,
    args.endDate || null,
    args.estimatedDays || 1,
    0,
    timestamp,
    timestamp
  );

  // Fetch and return the created task
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  return dbRowToTask(row);
}

async function handleTaskList(args: z.infer<typeof TaskListSchema>): Promise<Task[]> {
  const db = getDatabase();

  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params: any[] = [];

  if (args.categoryId) {
    query += ' AND category_id = ?';
    params.push(args.categoryId);
  }

  if (args.status) {
    query += ' AND status = ?';
    params.push(args.status);
  }

  if (args.priority) {
    query += ' AND priority = ?';
    params.push(args.priority);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(args.limit);

  const rows = db.prepare(query).all(...params);
  return rows.map(dbRowToTask);
}

async function handleTaskGet(args: z.infer<typeof TaskGetSchema>): Promise<Task> {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(args.taskId);

  if (!row) {
    throw new Error(`Task not found: ${args.taskId}`);
  }

  return dbRowToTask(row);
}

async function handleTaskUpdate(args: z.infer<typeof TaskUpdateSchema>): Promise<Task> {
  const db = getDatabase();

  // Check if task exists
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(args.taskId);
  if (!existing) {
    throw new Error(`Task not found: ${args.taskId}`);
  }

  // Build dynamic update query
  const updates: string[] = [];
  const params: any[] = [];

  if (args.title !== undefined) {
    updates.push('title = ?');
    params.push(args.title);
  }

  if (args.description !== undefined) {
    updates.push('description = ?');
    params.push(args.description);
  }

  if (args.categoryId !== undefined) {
    updates.push('category_id = ?');
    params.push(args.categoryId);
  }

  if (args.priority !== undefined) {
    updates.push('priority = ?');
    params.push(args.priority);
  }

  if (args.status !== undefined) {
    updates.push('status = ?');
    params.push(args.status);
  }

  if (args.estimatedDays !== undefined) {
    updates.push('estimated_days = ?');
    params.push(args.estimatedDays);
  }

  if (args.startDate !== undefined) {
    updates.push('start_date = ?');
    params.push(args.startDate);
  }

  if (args.endDate !== undefined) {
    updates.push('end_date = ?');
    params.push(args.endDate);
  }

  // Always update updatedAt
  updates.push('updated_at = ?');
  params.push(now());

  // Add taskId for WHERE clause
  params.push(args.taskId);

  const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...params);

  // Fetch and return updated task
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(args.taskId);
  return dbRowToTask(row);
}

async function handleTaskDelete(args: z.infer<typeof TaskDeleteSchema>): Promise<{ success: boolean }> {
  const db = getDatabase();

  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(args.taskId);

  if (result.changes === 0) {
    throw new Error(`Task not found: ${args.taskId}`);
  }

  return { success: true };
}

async function handleTaskStart(args: z.infer<typeof TaskStartSchema>): Promise<Task> {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE tasks
    SET status = 'in_progress', last_worked_date = ?, updated_at = ?
    WHERE id = ?
  `);

  const result = stmt.run(today(), now(), args.taskId);

  if (result.changes === 0) {
    throw new Error(`Task not found: ${args.taskId}`);
  }

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(args.taskId);
  return dbRowToTask(row);
}

async function handleTaskComplete(args: z.infer<typeof TaskCompleteSchema>): Promise<Task> {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE tasks
    SET status = 'completed', updated_at = ?
    WHERE id = ?
  `);

  const result = stmt.run(now(), args.taskId);

  if (result.changes === 0) {
    throw new Error(`Task not found: ${args.taskId}`);
  }

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(args.taskId);
  return dbRowToTask(row);
}

async function handleTaskDefer(args: z.infer<typeof TaskDeferSchema>): Promise<Task> {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE tasks
    SET status = 'deferred', start_date = ?, updated_at = ?
    WHERE id = ?
  `);

  const result = stmt.run(args.deferTo, now(), args.taskId);

  if (result.changes === 0) {
    throw new Error(`Task not found: ${args.taskId}`);
  }

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(args.taskId);
  return dbRowToTask(row);
}

async function handleTaskSignalQueue(args: z.infer<typeof TaskSignalQueueSchema>): Promise<Task[]> {
  const db = getDatabase();

  // Signal queue: in_progress tasks first, then todo tasks, ordered by priority (lower = higher importance)
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
    LIMIT ?
  `;

  const rows = db.prepare(query).all(args.limit);
  return rows.map(dbRowToTask);
}

async function handleTaskBacklog(args: z.infer<typeof TaskBacklogSchema>): Promise<Task[]> {
  const db = getDatabase();

  let query = `
    SELECT * FROM tasks
    WHERE status NOT IN ('completed', 'deferred')
  `;
  const params: any[] = [];

  if (args.categoryId) {
    query += ' AND category_id = ?';
    params.push(args.categoryId);
  }

  query += ' ORDER BY priority ASC, created_at ASC LIMIT ?';
  params.push(args.limit);

  const rows = db.prepare(query).all(...params);
  return rows.map(dbRowToTask);
}

async function handleTaskRecordWork(args: z.infer<typeof TaskRecordWorkSchema>): Promise<Task> {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE tasks
    SET days_worked = days_worked + 1, last_worked_date = ?, updated_at = ?
    WHERE id = ?
  `);

  const result = stmt.run(today(), now(), args.taskId);

  if (result.changes === 0) {
    throw new Error(`Task not found: ${args.taskId}`);
  }

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(args.taskId);
  return dbRowToTask(row);
}

// ==================== MAIN HANDLER ====================

export async function handleTaskTool(
  name: string,
  args: unknown
): Promise<{ content: { type: 'text', text: string }[] }> {
  try {
    let result: any;

    switch (name) {
      case 'task_create':
        result = await handleTaskCreate(TaskCreateSchema.parse(args));
        break;

      case 'task_list':
        result = await handleTaskList(TaskListSchema.parse(args));
        break;

      case 'task_get':
        result = await handleTaskGet(TaskGetSchema.parse(args));
        break;

      case 'task_update':
        result = await handleTaskUpdate(TaskUpdateSchema.parse(args));
        break;

      case 'task_delete':
        result = await handleTaskDelete(TaskDeleteSchema.parse(args));
        break;

      case 'task_start':
        result = await handleTaskStart(TaskStartSchema.parse(args));
        break;

      case 'task_complete':
        result = await handleTaskComplete(TaskCompleteSchema.parse(args));
        break;

      case 'task_defer':
        result = await handleTaskDefer(TaskDeferSchema.parse(args));
        break;

      case 'task_signal_queue':
        result = await handleTaskSignalQueue(TaskSignalQueueSchema.parse(args));
        break;

      case 'task_backlog':
        result = await handleTaskBacklog(TaskBacklogSchema.parse(args));
        break;

      case 'task_record_work':
        result = await handleTaskRecordWork(TaskRecordWorkSchema.parse(args));
        break;

      default:
        throw new Error(`Unknown task tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Validation error',
              details: error.errors,
            }, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
          }, null, 2),
        },
      ],
    };
  }
}
