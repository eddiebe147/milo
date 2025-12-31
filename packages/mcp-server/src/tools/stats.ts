/**
 * MILO MCP Server - Stats Tools
 *
 * Provides tools for querying MILO's activity and productivity statistics.
 * Includes daily stats, weekly summaries, streaks, and signal scores.
 */

import { z } from 'zod';
import { getDatabase } from '../db.js';
import type { DailyStats } from '../types.js';

/**
 * Tool definition interface
 */
export interface StatsToolDefinition {
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
const StatsGetDaySchema = z.object({
  date: z.string().optional().describe('Date in YYYY-MM-DD format. Defaults to today.'),
});

const StatsGetRangeSchema = z.object({
  startDate: z.string().describe('Start date in YYYY-MM-DD format'),
  endDate: z.string().describe('End date in YYYY-MM-DD format'),
});

const StatsGetWeekSchema = z.object({
  weekOffset: z.number().int().default(0).describe('Week offset from current week. 0 = this week, -1 = last week'),
});

/**
 * Utility: Get today's date in YYYY-MM-DD format
 */
function today(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Utility: Get start and end of a week
 */
function getWeekBounds(offset: number = 0): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek + (offset * 7));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  return {
    start: startOfWeek.toISOString().split('T')[0],
    end: endOfWeek.toISOString().split('T')[0],
  };
}

/**
 * Utility: Calculate signal score from state minutes
 * GREEN = +1, AMBER = 0, RED = -1
 * Score is normalized to 0-100 scale
 */
function calculateSignalScore(greenMinutes: number, amberMinutes: number, redMinutes: number): number {
  const totalMinutes = greenMinutes + amberMinutes + redMinutes;
  if (totalMinutes === 0) return 50; // Neutral if no activity

  // Score formula: (green - red) / total, normalized to 0-100
  const rawScore = (greenMinutes - redMinutes) / totalMinutes;
  // Convert from -1..1 to 0..100
  return Math.round((rawScore + 1) * 50);
}

/**
 * Tool 1: Get today's stats (or specific day)
 */
async function statsGetDay(args: unknown): Promise<{ content: { type: 'text'; text: string }[] }> {
  const params = StatsGetDaySchema.parse(args);
  const targetDate = params.date || today();
  const db = getDatabase();

  try {
    // Get activity stats for the day
    const activityStmt = db.prepare(`
      SELECT
        state,
        SUM(duration_seconds) / 60.0 as minutes
      FROM activity_logs
      WHERE date(timestamp) = ?
      GROUP BY state
    `);

    const activityRows = activityStmt.all(targetDate) as Array<{ state: string; minutes: number }>;

    let greenMinutes = 0;
    let amberMinutes = 0;
    let redMinutes = 0;

    for (const row of activityRows) {
      if (row.state === 'GREEN') greenMinutes = Math.round(row.minutes);
      else if (row.state === 'AMBER') amberMinutes = Math.round(row.minutes);
      else if (row.state === 'RED') redMinutes = Math.round(row.minutes);
    }

    // Get tasks completed today
    const tasksStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM tasks
      WHERE status = 'completed'
      AND date(updated_at) = ?
    `);
    const tasksRow = tasksStmt.get(targetDate) as { count: number };
    const tasksCompleted = tasksRow?.count || 0;

    // Get current streak from daily_stats if it exists
    const streakStmt = db.prepare(`
      SELECT streak
      FROM daily_stats
      WHERE date = ?
    `);
    const streakRow = streakStmt.get(targetDate) as { streak: number } | undefined;
    const streak = streakRow?.streak || 0;

    const signalScore = calculateSignalScore(greenMinutes, amberMinutes, redMinutes);

    const stats: DailyStats = {
      date: targetDate,
      greenMinutes,
      amberMinutes,
      redMinutes,
      signalScore,
      tasksCompleted,
      streak,
    };

    // Calculate total productive time
    const totalMinutes = greenMinutes + amberMinutes + redMinutes;
    const productivePercentage = totalMinutes > 0
      ? Math.round((greenMinutes / totalMinutes) * 100)
      : 0;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          stats,
          summary: {
            totalTrackedMinutes: totalMinutes,
            productivePercentage,
            isToday: targetDate === today(),
          },
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
 * Tool 2: Get stats for a date range
 */
async function statsGetRange(args: unknown): Promise<{ content: { type: 'text'; text: string }[] }> {
  const params = StatsGetRangeSchema.parse(args);
  const db = getDatabase();

  try {
    // Get daily stats for the range
    const stmt = db.prepare(`
      SELECT
        date(timestamp) as date,
        state,
        SUM(duration_seconds) / 60.0 as minutes
      FROM activity_logs
      WHERE date(timestamp) BETWEEN ? AND ?
      GROUP BY date(timestamp), state
      ORDER BY date(timestamp)
    `);

    const rows = stmt.all(params.startDate, params.endDate) as Array<{
      date: string;
      state: string;
      minutes: number;
    }>;

    // Group by date
    const dailyMap = new Map<string, { green: number; amber: number; red: number }>();

    for (const row of rows) {
      if (!dailyMap.has(row.date)) {
        dailyMap.set(row.date, { green: 0, amber: 0, red: 0 });
      }
      const day = dailyMap.get(row.date)!;
      if (row.state === 'GREEN') day.green = Math.round(row.minutes);
      else if (row.state === 'AMBER') day.amber = Math.round(row.minutes);
      else if (row.state === 'RED') day.red = Math.round(row.minutes);
    }

    // Get tasks completed per day
    const tasksStmt = db.prepare(`
      SELECT
        date(updated_at) as date,
        COUNT(*) as count
      FROM tasks
      WHERE status = 'completed'
      AND date(updated_at) BETWEEN ? AND ?
      GROUP BY date(updated_at)
    `);
    const taskRows = tasksStmt.all(params.startDate, params.endDate) as Array<{
      date: string;
      count: number;
    }>;
    const tasksMap = new Map(taskRows.map(r => [r.date, r.count]));

    // Build daily stats array
    const dailyStats: DailyStats[] = [];
    let totalGreen = 0;
    let totalAmber = 0;
    let totalRed = 0;
    let totalTasks = 0;

    for (const [date, minutes] of dailyMap) {
      const signalScore = calculateSignalScore(minutes.green, minutes.amber, minutes.red);
      dailyStats.push({
        date,
        greenMinutes: minutes.green,
        amberMinutes: minutes.amber,
        redMinutes: minutes.red,
        signalScore,
        tasksCompleted: tasksMap.get(date) || 0,
        streak: 0, // Would need to calculate from daily_stats table
      });
      totalGreen += minutes.green;
      totalAmber += minutes.amber;
      totalRed += minutes.red;
      totalTasks += tasksMap.get(date) || 0;
    }

    const averageScore = dailyStats.length > 0
      ? Math.round(dailyStats.reduce((sum, d) => sum + d.signalScore, 0) / dailyStats.length)
      : 50;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          range: { start: params.startDate, end: params.endDate },
          dailyStats,
          summary: {
            daysTracked: dailyStats.length,
            totalGreenMinutes: totalGreen,
            totalAmberMinutes: totalAmber,
            totalRedMinutes: totalRed,
            totalTasksCompleted: totalTasks,
            averageSignalScore: averageScore,
          },
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
 * Tool 3: Get weekly summary
 */
async function statsGetWeek(args: unknown): Promise<{ content: { type: 'text'; text: string }[] }> {
  const params = StatsGetWeekSchema.parse(args);
  const { start, end } = getWeekBounds(params.weekOffset);

  // Delegate to statsGetRange
  return statsGetRange({ startDate: start, endDate: end });
}

/**
 * Tool 4: Get current streak info
 */
async function statsGetStreak(): Promise<{ content: { type: 'text'; text: string }[] }> {
  const db = getDatabase();

  try {
    // Get the most recent streak value from daily_stats
    const stmt = db.prepare(`
      SELECT date, streak, signal_score
      FROM daily_stats
      ORDER BY date DESC
      LIMIT 1
    `);

    const row = stmt.get() as { date: string; streak: number; signal_score: number } | undefined;

    if (!row) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            streak: 0,
            message: 'No streak data yet. Complete your first day to start a streak!',
          }, null, 2),
        }],
      };
    }

    // Check if streak is current (yesterday or today)
    const lastDate = new Date(row.date);
    const todayDate = new Date(today());
    const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    const isActive = daysDiff <= 1;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          streak: isActive ? row.streak : 0,
          lastRecordedDate: row.date,
          lastSignalScore: row.signal_score,
          isActive,
          message: isActive
            ? `You're on a ${row.streak} day streak! Keep it going!`
            : `Your streak ended. Start fresh today!`,
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
 * Tool 5: Get productivity insights
 */
async function statsGetInsights(): Promise<{ content: { type: 'text'; text: string }[] }> {
  const db = getDatabase();

  try {
    // Get last 7 days of activity by app
    const appStmt = db.prepare(`
      SELECT
        app_name,
        state,
        SUM(duration_seconds) / 60.0 as minutes
      FROM activity_logs
      WHERE timestamp >= datetime('now', '-7 days')
      GROUP BY app_name, state
      ORDER BY minutes DESC
      LIMIT 20
    `);

    const appRows = appStmt.all() as Array<{
      app_name: string;
      state: string;
      minutes: number;
    }>;

    // Group by app
    const appMap = new Map<string, { green: number; amber: number; red: number; total: number }>();

    for (const row of appRows) {
      if (!appMap.has(row.app_name)) {
        appMap.set(row.app_name, { green: 0, amber: 0, red: 0, total: 0 });
      }
      const app = appMap.get(row.app_name)!;
      const minutes = Math.round(row.minutes);
      if (row.state === 'GREEN') app.green = minutes;
      else if (row.state === 'AMBER') app.amber = minutes;
      else if (row.state === 'RED') app.red = minutes;
      app.total += minutes;
    }

    // Sort by total time
    const topApps = Array.from(appMap.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Find top productive and distracting apps
    const productiveApps = topApps
      .filter(a => a.green > a.red)
      .sort((a, b) => b.green - a.green)
      .slice(0, 5);

    const distractingApps = topApps
      .filter(a => a.red > a.green)
      .sort((a, b) => b.red - a.red)
      .slice(0, 5);

    // Get task completion rate
    const taskStmt = db.prepare(`
      SELECT
        status,
        COUNT(*) as count
      FROM tasks
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY status
    `);

    const taskRows = taskStmt.all() as Array<{ status: string; count: number }>;
    const taskStats = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      deferred: 0,
    };

    for (const row of taskRows) {
      if (row.status in taskStats) {
        taskStats[row.status as keyof typeof taskStats] = row.count;
      }
    }

    const totalTasks = Object.values(taskStats).reduce((a, b) => a + b, 0);
    const completionRate = totalTasks > 0
      ? Math.round((taskStats.completed / totalTasks) * 100)
      : 0;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          period: 'Last 7 days',
          topApps,
          productiveApps: productiveApps.map(a => ({ name: a.name, greenMinutes: a.green })),
          distractingApps: distractingApps.map(a => ({ name: a.name, redMinutes: a.red })),
          taskStats,
          taskCompletionRate: completionRate,
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
 * Get all stats tool definitions
 */
export function getStatsTools(): StatsToolDefinition[] {
  return [
    {
      name: 'stats_get_day',
      description: 'Get productivity stats for a specific day. Includes GREEN/AMBER/RED time, signal score, tasks completed, and streak.',
      inputSchema: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date in YYYY-MM-DD format. Defaults to today if not specified.',
          },
        },
      },
    },
    {
      name: 'stats_get_range',
      description: 'Get productivity stats for a date range. Returns daily breakdown plus summary totals.',
      inputSchema: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: 'Start date in YYYY-MM-DD format (required)',
          },
          endDate: {
            type: 'string',
            description: 'End date in YYYY-MM-DD format (required)',
          },
        },
        required: ['startDate', 'endDate'],
      },
    },
    {
      name: 'stats_get_week',
      description: 'Get productivity stats for a week. Defaults to current week.',
      inputSchema: {
        type: 'object',
        properties: {
          weekOffset: {
            type: 'number',
            description: 'Week offset from current week. 0 = this week, -1 = last week, etc.',
          },
        },
      },
    },
    {
      name: 'stats_get_streak',
      description: 'Get current streak information. Shows consecutive days of activity and whether streak is still active.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'stats_get_insights',
      description: 'Get productivity insights from the last 7 days. Includes top apps by usage, most productive apps, most distracting apps, and task completion rate.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ];
}

/**
 * Handle stats tool calls
 */
export async function handleStatsTool(
  name: string,
  args: unknown
): Promise<{ content: { type: 'text'; text: string }[] }> {
  switch (name) {
    case 'stats_get_day':
      return statsGetDay(args);
    case 'stats_get_range':
      return statsGetRange(args);
    case 'stats_get_week':
      return statsGetWeek(args);
    case 'stats_get_streak':
      return statsGetStreak();
    case 'stats_get_insights':
      return statsGetInsights();
    default:
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Unknown stats tool: ${name}`,
          }, null, 2),
        }],
      };
  }
}
