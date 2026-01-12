/**
 * MILO MCP Server - Briefing Tools
 *
 * Provides morning and evening briefing tools that aggregate data from tasks, goals, and stats
 * to create comprehensive briefings for daily planning and review.
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getDatabase } from '../db.js';
import type { Task, Goal, DailyStats } from '../types.js';

/**
 * Tool definition interface
 */
export interface BriefToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
}

/**
 * Utility: Get today's date in YYYY-MM-DD format
 */
function today(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Utility: Get yesterday's date in YYYY-MM-DD format
 */
function yesterday(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

/**
 * Utility: Convert snake_case DB row to camelCase Task object
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
 * Utility: Convert snake_case DB row to camelCase Goal object
 */
function dbRowToGoal(row: any): Goal {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    parentId: row.parent_id || undefined,
    timeframe: row.timeframe,
    status: row.status,
    targetDate: row.target_date || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Utility: Calculate signal score from state minutes
 */
function calculateSignalScore(greenMinutes: number, amberMinutes: number, redMinutes: number): number {
  const totalMinutes = greenMinutes + amberMinutes + redMinutes;
  if (totalMinutes === 0) return 50;
  const rawScore = (greenMinutes - redMinutes) / totalMinutes;
  return Math.round((rawScore + 1) * 50);
}

/**
 * Get signal queue (top priority tasks)
 */
function getSignalQueue(db: any, limit: number): Task[] {
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
  const rows = db.prepare(query).all(limit);
  return rows.map(dbRowToTask);
}

/**
 * Get carryover tasks (overdue - past their end_date)
 */
function getCarryoverTasks(db: any): Task[] {
  const todayDate = today();
  const query = `
    SELECT * FROM tasks
    WHERE status IN ('pending', 'in_progress')
    AND end_date IS NOT NULL
    AND end_date < ?
    ORDER BY priority ASC, end_date ASC
  `;
  const rows = db.prepare(query).all(todayDate);
  return rows.map(dbRowToTask);
}

/**
 * Get active goals by timeframe
 */
function getActiveGoals(db: any, timeframe: 'weekly' | 'quarterly'): Goal[] {
  const query = `
    SELECT * FROM goals
    WHERE timeframe = ? AND status = 'active'
    ORDER BY created_at DESC
  `;
  const rows = db.prepare(query).all(timeframe);
  return rows.map(dbRowToGoal);
}

/**
 * Get daily stats for a specific date
 */
function getDailyStats(db: any, date: string): DailyStats | null {
  // Get activity stats
  const activityStmt = db.prepare(`
    SELECT
      state,
      SUM(duration_seconds) / 60.0 as minutes
    FROM activity_logs
    WHERE date(timestamp) = ?
    GROUP BY state
  `);
  const activityRows = activityStmt.all(date) as Array<{ state: string; minutes: number }>;

  let greenMinutes = 0;
  let amberMinutes = 0;
  let redMinutes = 0;

  for (const row of activityRows) {
    if (row.state === 'GREEN') greenMinutes = Math.round(row.minutes);
    else if (row.state === 'AMBER') amberMinutes = Math.round(row.minutes);
    else if (row.state === 'RED') redMinutes = Math.round(row.minutes);
  }

  // If no activity, return null
  if (greenMinutes === 0 && amberMinutes === 0 && redMinutes === 0) {
    return null;
  }

  // Get tasks completed
  const tasksStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM tasks
    WHERE status = 'completed'
    AND date(updated_at) = ?
  `);
  const tasksRow = tasksStmt.get(date) as { count: number };
  const tasksCompleted = tasksRow?.count || 0;

  // Get streak
  const streakStmt = db.prepare(`
    SELECT streak
    FROM daily_stats
    WHERE date = ?
  `);
  const streakRow = streakStmt.get(date) as { streak: number } | undefined;
  const streak = streakRow?.streak || 0;

  return {
    date,
    greenMinutes,
    amberMinutes,
    redMinutes,
    signalScore: calculateSignalScore(greenMinutes, amberMinutes, redMinutes),
    tasksCompleted,
    streak,
  };
}

/**
 * Get current streak info
 */
function getCurrentStreak(db: any): { streak: number; isActive: boolean; lastDate: string | null } {
  const stmt = db.prepare(`
    SELECT date, streak
    FROM daily_stats
    ORDER BY date DESC
    LIMIT 1
  `);
  const row = stmt.get() as { date: string; streak: number } | undefined;

  if (!row) {
    return { streak: 0, isActive: false, lastDate: null };
  }

  const lastDate = new Date(row.date);
  const todayDate = new Date(today());
  const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  const isActive = daysDiff <= 1;

  return {
    streak: isActive ? row.streak : 0,
    isActive,
    lastDate: row.date,
  };
}

/**
 * Get completed tasks for a specific date
 */
function getCompletedTasks(db: any, date: string): Task[] {
  const query = `
    SELECT * FROM tasks
    WHERE status = 'completed'
    AND date(updated_at) = ?
    ORDER BY updated_at DESC
  `;
  const rows = db.prepare(query).all(date);
  return rows.map(dbRowToTask);
}

/**
 * Get incomplete tasks for carryover decisions
 */
function getIncompleteTasks(db: any): Task[] {
  const query = `
    SELECT * FROM tasks
    WHERE status IN ('pending', 'in_progress')
    ORDER BY priority ASC, created_at ASC
  `;
  const rows = db.prepare(query).all();
  return rows.map(dbRowToTask);
}

/**
 * Generate simple insights based on data
 */
function generateInsights(data: any): string[] {
  const insights: string[] = [];

  // Carryover insights
  if (data.carryoverTasks && data.carryoverTasks.length > 0) {
    insights.push(`You have ${data.carryoverTasks.length} task(s) that need attention from previous days`);
  }

  // Signal queue insights
  if (data.signalQueue) {
    const inProgress = data.signalQueue.filter((t: Task) => t.status === 'in_progress').length;
    if (inProgress > 0) {
      insights.push(`${inProgress} task(s) currently in progress - consider completing before starting new ones`);
    }
  }

  // Stats insights
  if (data.yesterdayStats) {
    const stats = data.yesterdayStats;

    if (stats.signalScore >= 70) {
      insights.push(`Strong performance yesterday with a signal score of ${stats.signalScore}`);
    } else if (stats.signalScore < 50) {
      insights.push(`Yesterday's signal score was ${stats.signalScore} - consider what might have caused distractions`);
    }
  }

  // Streak insights
  if (data.streak) {
    if (data.streak.isActive && data.streak.streak >= 7) {
      insights.push(`Outstanding! You're on a ${data.streak.streak} day streak`);
    } else if (!data.streak.isActive && data.streak.lastDate) {
      insights.push(`Your streak ended. Start fresh today to begin a new one`);
    }
  }

  // Goal insights
  if (data.weeklyGoals !== undefined && data.weeklyGoals.length === 0) {
    insights.push(`No weekly goals set - consider defining your targets for this week`);
  }

  // Completion insights
  if (data.todayStats) {
    if (data.todayStats.tasksCompleted >= 5) {
      insights.push(`Excellent productivity! You completed ${data.todayStats.tasksCompleted} tasks today`);
    } else if (data.todayStats.tasksCompleted === 0) {
      insights.push(`No tasks completed yet today - focus on completing at least one high-priority task`);
    }
  }

  return insights;
}

// ==================== TOOL SCHEMAS ====================

const BriefMorningSchema = z.object({
  includeCarryover: z.boolean().default(true).describe('Include carryover tasks from previous days'),
  includeGoals: z.boolean().default(true).describe('Include weekly and quarterly goals'),
  includeStats: z.boolean().default(true).describe('Include yesterday\'s stats'),
  includeStreak: z.boolean().default(true).describe('Include streak information'),
  generateInsights: z.boolean().default(true).describe('Generate AI insights based on the data'),
});

const BriefEveningSchema = z.object({
  includeAccomplishments: z.boolean().default(true).describe('Include completed tasks today'),
  includeMetrics: z.boolean().default(true).describe('Include today\'s GREEN/AMBER/RED minutes and signal score'),
  includeCarryover: z.boolean().default(true).describe('Include incomplete tasks for carryover decisions'),
  includeTomorrowPrep: z.boolean().default(true).describe('Include signal queue for tomorrow prep'),
  generateInsights: z.boolean().default(true).describe('Generate AI insights based on the data'),
});

// ==================== TOOL DEFINITIONS ====================

export function getBriefTools(): BriefToolDefinition[] {
  return [
    {
      name: 'brief_morning',
      description: 'Generate morning briefing with signal queue, carryover tasks, goals, and yesterday\'s performance',
      inputSchema: zodToJsonSchema(BriefMorningSchema),
    },
    {
      name: 'brief_evening',
      description: 'Generate evening review with today\'s accomplishments, metrics, and carryover decisions',
      inputSchema: zodToJsonSchema(BriefEveningSchema),
    },
  ];
}

// ==================== TOOL HANDLERS ====================

async function handleBriefMorning(args: z.infer<typeof BriefMorningSchema>): Promise<any> {
  const db = getDatabase();
  const briefing: any = {
    date: today(),
    type: 'morning',
  };

  // Signal queue (top 5 priority tasks)
  briefing.signalQueue = getSignalQueue(db, 5);

  // Carryover tasks
  if (args.includeCarryover) {
    briefing.carryoverTasks = getCarryoverTasks(db);
  }

  // Goals
  if (args.includeGoals) {
    briefing.weeklyGoals = getActiveGoals(db, 'weekly');
    briefing.quarterlyMilestone = getActiveGoals(db, 'quarterly')[0] || null;
  }

  // Yesterday's stats
  if (args.includeStats) {
    briefing.yesterdayStats = getDailyStats(db, yesterday());
  }

  // Streak info
  if (args.includeStreak) {
    briefing.streak = getCurrentStreak(db);
  }

  // Generate insights
  if (args.generateInsights) {
    briefing.insights = generateInsights(briefing);
  }

  return briefing;
}

async function handleBriefEvening(args: z.infer<typeof BriefEveningSchema>): Promise<any> {
  const db = getDatabase();
  const briefing: any = {
    date: today(),
    type: 'evening',
  };

  // Completed tasks today
  if (args.includeAccomplishments) {
    briefing.accomplishments = getCompletedTasks(db, today());
  }

  // Daily stats
  if (args.includeMetrics) {
    briefing.todayStats = getDailyStats(db, today());
  }

  // Incomplete tasks for carryover
  if (args.includeCarryover) {
    briefing.incompleteTasksForReview = getIncompleteTasks(db);
  }

  // Tomorrow prep (signal queue)
  if (args.includeTomorrowPrep) {
    briefing.tomorrowSignalQueue = getSignalQueue(db, 5);
  }

  // Streak status
  briefing.streak = getCurrentStreak(db);

  // Generate insights
  if (args.generateInsights) {
    briefing.insights = generateInsights(briefing);
  }

  return briefing;
}

// ==================== MAIN HANDLER ====================

export async function handleBriefTool(
  name: string,
  args: unknown
): Promise<{ content: { type: 'text', text: string }[] }> {
  try {
    let result: any;

    switch (name) {
      case 'brief_morning':
        result = await handleBriefMorning(BriefMorningSchema.parse(args));
        break;

      case 'brief_evening':
        result = await handleBriefEvening(BriefEveningSchema.parse(args));
        break;

      default:
        throw new Error(`Unknown brief tool: ${name}`);
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

    // Log error for debugging
    console.error(`[briefs] Error in ${name}:`, error);

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
