/**
 * MILO MCP Server - Goal Tools
 *
 * Provides tools for managing goals in the MILO system.
 * Goals are hierarchical: yearly → quarterly → monthly → weekly
 */

import { z } from 'zod';
import { getDatabase } from '../db.js';
import type { Goal } from '../types.js';
import { randomUUID } from 'crypto';

/**
 * Tool definition interface
 */
export interface GoalToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Zod schemas for input validation
 */
const GoalCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  timeframe: z.enum(['yearly', 'quarterly', 'monthly', 'weekly']),
  parentId: z.string().uuid('Parent ID must be a valid UUID').optional(),
  targetDate: z.string().optional(),
});

const GoalGetSchema = z.object({
  goalId: z.string().uuid('Goal ID must be a valid UUID'),
});

const GoalUpdateSchema = z.object({
  goalId: z.string().uuid('Goal ID must be a valid UUID'),
  title: z.string().min(1, 'Title cannot be empty').optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
  targetDate: z.string().optional(),
});

const GoalDeleteSchema = z.object({
  goalId: z.string().uuid('Goal ID must be a valid UUID'),
});

const GoalListByTimeframeSchema = z.object({
  timeframe: z.enum(['yearly', 'quarterly', 'monthly', 'weekly']),
});

/**
 * Utility: Convert database row (snake_case) to TypeScript object (camelCase)
 */
function dbRowToGoal(row: {
  id: string;
  title: string;
  description: string | null;
  parent_id: string | null;
  timeframe: string;
  status: string;
  target_date: string | null;
  created_at: string;
  updated_at: string;
}): Goal {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    parentId: row.parent_id || undefined,
    timeframe: row.timeframe as Goal['timeframe'],
    status: row.status as Goal['status'],
    targetDate: row.target_date || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Tool 1: Create a new goal
 */
async function goalCreate(args: unknown): Promise<{ content: { type: 'text'; text: string }[] }> {
  const params = GoalCreateSchema.parse(args);
  const db = getDatabase();

  try {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO goals (id, title, description, parent_id, timeframe, status, target_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `);

    stmt.run(
      id,
      params.title,
      params.description || null,
      params.parentId || null,
      params.timeframe,
      params.targetDate || null,
      now,
      now
    );

    const goal: Goal = {
      id,
      title: params.title,
      description: params.description,
      parentId: params.parentId,
      timeframe: params.timeframe,
      status: 'active',
      targetDate: params.targetDate,
      createdAt: now,
      updatedAt: now,
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          goal,
          message: `Goal "${params.title}" (${params.timeframe}) created successfully`,
        }, null, 2),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }, null, 2),
      }],
    };
  }
}

/**
 * Tool 2: List all goals
 */
async function goalList(): Promise<{ content: { type: 'text'; text: string }[] }> {
  const db = getDatabase();

  try {
    const stmt = db.prepare(`
      SELECT id, title, description, parent_id, timeframe, status, target_date, created_at, updated_at
      FROM goals
      ORDER BY
        CASE timeframe
          WHEN 'yearly' THEN 1
          WHEN 'quarterly' THEN 2
          WHEN 'monthly' THEN 3
          WHEN 'weekly' THEN 4
        END,
        created_at DESC
    `);

    const rows = stmt.all() as Array<{
      id: string;
      title: string;
      description: string | null;
      parent_id: string | null;
      timeframe: string;
      status: string;
      target_date: string | null;
      created_at: string;
      updated_at: string;
    }>;

    const goals = rows.map(dbRowToGoal);

    // Group by timeframe for easier viewing
    const hierarchy = {
      yearly: goals.filter(g => g.timeframe === 'yearly'),
      quarterly: goals.filter(g => g.timeframe === 'quarterly'),
      monthly: goals.filter(g => g.timeframe === 'monthly'),
      weekly: goals.filter(g => g.timeframe === 'weekly'),
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          goals,
          hierarchy,
          count: goals.length,
        }, null, 2),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }, null, 2),
      }],
    };
  }
}

/**
 * Tool 3: List goals by timeframe
 */
async function goalListByTimeframe(args: unknown): Promise<{ content: { type: 'text'; text: string }[] }> {
  const params = GoalListByTimeframeSchema.parse(args);
  const db = getDatabase();

  try {
    const stmt = db.prepare(`
      SELECT id, title, description, parent_id, timeframe, status, target_date, created_at, updated_at
      FROM goals
      WHERE timeframe = ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(params.timeframe) as Array<{
      id: string;
      title: string;
      description: string | null;
      parent_id: string | null;
      timeframe: string;
      status: string;
      target_date: string | null;
      created_at: string;
      updated_at: string;
    }>;

    const goals = rows.map(dbRowToGoal);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          timeframe: params.timeframe,
          goals,
          count: goals.length,
        }, null, 2),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }, null, 2),
      }],
    };
  }
}

/**
 * Tool 4: Get a single goal by ID
 */
async function goalGet(args: unknown): Promise<{ content: { type: 'text'; text: string }[] }> {
  const params = GoalGetSchema.parse(args);
  const db = getDatabase();

  try {
    const stmt = db.prepare(`
      SELECT id, title, description, parent_id, timeframe, status, target_date, created_at, updated_at
      FROM goals
      WHERE id = ?
    `);

    const row = stmt.get(params.goalId) as {
      id: string;
      title: string;
      description: string | null;
      parent_id: string | null;
      timeframe: string;
      status: string;
      target_date: string | null;
      created_at: string;
      updated_at: string;
    } | undefined;

    if (!row) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Goal with ID "${params.goalId}" not found`,
          }, null, 2),
        }],
      };
    }

    const goal = dbRowToGoal(row);

    // Also get child goals
    const childStmt = db.prepare(`
      SELECT id, title, description, parent_id, timeframe, status, target_date, created_at, updated_at
      FROM goals
      WHERE parent_id = ?
    `);
    const childRows = childStmt.all(params.goalId) as typeof row[];
    const children = childRows.map(dbRowToGoal);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          goal,
          children,
        }, null, 2),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }, null, 2),
      }],
    };
  }
}

/**
 * Tool 5: Update a goal
 */
async function goalUpdate(args: unknown): Promise<{ content: { type: 'text'; text: string }[] }> {
  const params = GoalUpdateSchema.parse(args);
  const db = getDatabase();

  try {
    // First check if goal exists
    const existsStmt = db.prepare('SELECT id FROM goals WHERE id = ?');
    const exists = existsStmt.get(params.goalId);

    if (!exists) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Goal with ID "${params.goalId}" not found`,
          }, null, 2),
        }],
      };
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];

    if (params.title !== undefined) {
      updates.push('title = ?');
      values.push(params.title);
    }

    if (params.description !== undefined) {
      updates.push('description = ?');
      values.push(params.description);
    }

    if (params.status !== undefined) {
      updates.push('status = ?');
      values.push(params.status);
    }

    if (params.targetDate !== undefined) {
      updates.push('target_date = ?');
      values.push(params.targetDate);
    }

    if (updates.length === 0) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'No fields provided to update',
          }, null, 2),
        }],
      };
    }

    const now = new Date().toISOString();
    updates.push('updated_at = ?');
    values.push(now);
    values.push(params.goalId);

    const updateStmt = db.prepare(`
      UPDATE goals
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    updateStmt.run(...values);

    // Fetch updated goal
    const selectStmt = db.prepare(`
      SELECT id, title, description, parent_id, timeframe, status, target_date, created_at, updated_at
      FROM goals
      WHERE id = ?
    `);

    const row = selectStmt.get(params.goalId) as {
      id: string;
      title: string;
      description: string | null;
      parent_id: string | null;
      timeframe: string;
      status: string;
      target_date: string | null;
      created_at: string;
      updated_at: string;
    };

    const goal = dbRowToGoal(row);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          goal,
          message: 'Goal updated successfully',
        }, null, 2),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }, null, 2),
      }],
    };
  }
}

/**
 * Tool 6: Delete a goal
 */
async function goalDelete(args: unknown): Promise<{ content: { type: 'text'; text: string }[] }> {
  const params = GoalDeleteSchema.parse(args);
  const db = getDatabase();

  try {
    // First check if goal exists
    const existsStmt = db.prepare('SELECT id, title FROM goals WHERE id = ?');
    const goal = existsStmt.get(params.goalId) as { id: string; title: string } | undefined;

    if (!goal) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Goal with ID "${params.goalId}" not found`,
          }, null, 2),
        }],
      };
    }

    // Update child goals to remove parent reference
    const updateChildrenStmt = db.prepare(`
      UPDATE goals
      SET parent_id = NULL, updated_at = ?
      WHERE parent_id = ?
    `);
    const now = new Date().toISOString();
    const updateResult = updateChildrenStmt.run(now, params.goalId);

    // Delete the goal
    const deleteStmt = db.prepare('DELETE FROM goals WHERE id = ?');
    deleteStmt.run(params.goalId);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: `Goal "${goal.title}" deleted successfully`,
          childrenOrphaned: updateResult.changes,
        }, null, 2),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }, null, 2),
      }],
    };
  }
}

/**
 * Tool 7: Complete a goal
 */
async function goalComplete(args: unknown): Promise<{ content: { type: 'text'; text: string }[] }> {
  const params = GoalGetSchema.parse(args);
  const db = getDatabase();

  try {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE goals
      SET status = 'completed', updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(now, params.goalId);

    if (result.changes === 0) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Goal with ID "${params.goalId}" not found`,
          }, null, 2),
        }],
      };
    }

    // Fetch updated goal
    const selectStmt = db.prepare(`
      SELECT id, title, description, parent_id, timeframe, status, target_date, created_at, updated_at
      FROM goals
      WHERE id = ?
    `);

    const row = selectStmt.get(params.goalId) as {
      id: string;
      title: string;
      description: string | null;
      parent_id: string | null;
      timeframe: string;
      status: string;
      target_date: string | null;
      created_at: string;
      updated_at: string;
    };

    const goal = dbRowToGoal(row);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          goal,
          message: `Goal "${goal.title}" marked as completed! 🎉`,
        }, null, 2),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }, null, 2),
      }],
    };
  }
}

/**
 * Get all goal tool definitions
 */
export function getGoalTools(): GoalToolDefinition[] {
  return [
    {
      name: 'goal_create',
      description: 'Create a new goal. Goals are hierarchical: yearly (beacons) → quarterly (milestones) → monthly (objectives) → weekly (targets). You can link child goals to parents.',
      inputSchema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Title of the goal (required)',
          },
          description: {
            type: 'string',
            description: 'Detailed description of what this goal entails. Optional.',
          },
          timeframe: {
            type: 'string',
            enum: ['yearly', 'quarterly', 'monthly', 'weekly'],
            description: 'Timeframe for the goal: yearly, quarterly, monthly, or weekly (required)',
          },
          parentId: {
            type: 'string',
            description: 'UUID of the parent goal. Used to create goal hierarchy. Optional.',
          },
          targetDate: {
            type: 'string',
            description: 'Target completion date in ISO format (YYYY-MM-DD). Optional.',
          },
        },
        required: ['title', 'timeframe'],
      },
    },
    {
      name: 'goal_list',
      description: 'List all goals, organized by timeframe hierarchy. Returns goals grouped into yearly, quarterly, monthly, and weekly categories.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'goal_list_by_timeframe',
      description: 'List goals filtered by a specific timeframe (yearly, quarterly, monthly, or weekly).',
      inputSchema: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            enum: ['yearly', 'quarterly', 'monthly', 'weekly'],
            description: 'Timeframe to filter by (required)',
          },
        },
        required: ['timeframe'],
      },
    },
    {
      name: 'goal_get',
      description: 'Get a single goal by its ID. Returns the goal details and any child goals linked to it.',
      inputSchema: {
        type: 'object',
        properties: {
          goalId: {
            type: 'string',
            description: 'UUID of the goal to retrieve (required)',
          },
        },
        required: ['goalId'],
      },
    },
    {
      name: 'goal_update',
      description: 'Update one or more fields of an existing goal. Only provided fields will be updated.',
      inputSchema: {
        type: 'object',
        properties: {
          goalId: {
            type: 'string',
            description: 'UUID of the goal to update (required)',
          },
          title: {
            type: 'string',
            description: 'New title for the goal. Optional.',
          },
          description: {
            type: 'string',
            description: 'New description. Optional.',
          },
          status: {
            type: 'string',
            enum: ['active', 'completed', 'archived'],
            description: 'New status. Optional.',
          },
          targetDate: {
            type: 'string',
            description: 'New target date in ISO format. Optional.',
          },
        },
        required: ['goalId'],
      },
    },
    {
      name: 'goal_delete',
      description: 'Delete a goal. Child goals will have their parentId set to null (not deleted).',
      inputSchema: {
        type: 'object',
        properties: {
          goalId: {
            type: 'string',
            description: 'UUID of the goal to delete (required)',
          },
        },
        required: ['goalId'],
      },
    },
    {
      name: 'goal_complete',
      description: 'Mark a goal as completed. This is a shortcut for updating the status to "completed".',
      inputSchema: {
        type: 'object',
        properties: {
          goalId: {
            type: 'string',
            description: 'UUID of the goal to complete (required)',
          },
        },
        required: ['goalId'],
      },
    },
  ];
}

/**
 * Handle goal tool calls
 */
export async function handleGoalTool(
  name: string,
  args: unknown
): Promise<{ content: { type: 'text'; text: string }[] }> {
  switch (name) {
    case 'goal_create':
      return goalCreate(args);
    case 'goal_list':
      return goalList();
    case 'goal_list_by_timeframe':
      return goalListByTimeframe(args);
    case 'goal_get':
      return goalGet(args);
    case 'goal_update':
      return goalUpdate(args);
    case 'goal_delete':
      return goalDelete(args);
    case 'goal_complete':
      return goalComplete(args);
    default:
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Unknown goal tool: ${name}`,
          }, null, 2),
        }],
      };
  }
}
