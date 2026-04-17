import type { Goal } from './types';

/**
 * STALENESS RULES — Eddie owns this file.
 *
 * These are the only business rules in the scanner. Everything else is plumbing.
 * If Milo pesters you about something you don't want pestered about, OR fails to
 * flag something that should be flagged, the fix is probably here.
 *
 * Keep these rules tight. A rule that's complicated to read is a rule that lies.
 */

export interface StalenessVerdict {
  shouldFlag: boolean;
  flag?: 'stale' | 'expired' | 'blocked-overdue';
  reason?: string;
}

/**
 * Default idle threshold: 14 days. Can be overridden per-priority below.
 */
const DEFAULT_STALENESS_DAYS = 14;

/**
 * Per-priority overrides. Uncomment and tune to taste.
 * Example: tier-1 items should probably be touched more often than tier-3.
 */
const PRIORITY_THRESHOLDS: Partial<Record<string, number>> = {
  // 'tier-1': 7,   // Top-priority silence = alarming, flag sooner
  // 'tier-2': 14,
  // 'tier-3': 30,
};

/**
 * Per-section overrides. If revenue goes silent, that's worse than ops silence.
 */
const SECTION_THRESHOLDS: Partial<Record<string, number>> = {
  // 'Revenue / Money': 7,
  // 'Product Milestones': 14,
  // 'Ops / Infra / Systems': 30,
};

/**
 * Blocked-by reprieve. If a goal has `blocked_by: event_2026-04-18`, the staleness
 * clock pauses until that date. This prevents Homer-style goals (waiting on attorney
 * meeting) from being flagged as idle when they're actually just waiting correctly.
 *
 * Format expected: `<event_name>_YYYY-MM-DD`
 */
function parseBlockedByDate(blockedBy?: string): Date | null {
  if (!blockedBy) return null;
  const m = blockedBy.match(/_(\d{4}-\d{2}-\d{2})$/);
  return m ? new Date(m[1] + 'T00:00:00Z') : null;
}

/**
 * Main staleness check. Called for every [active] goal.
 *
 * TODO(eddie): if you want to add custom logic — e.g., "never flag Parallax maintenance"
 * or "double threshold during weeks I'm at conferences" — add it here.
 */
export function checkStaleness(goal: Goal, now: Date = new Date()): StalenessVerdict {
  if (goal.state !== 'active') {
    return { shouldFlag: false };
  }

  const blockedUntil = parseBlockedByDate(goal.metadata.blocked_by);
  if (blockedUntil && blockedUntil > now) {
    return { shouldFlag: false };
  }
  if (blockedUntil && blockedUntil <= now) {
    const daysOverdue = Math.floor((now.getTime() - blockedUntil.getTime()) / 86_400_000);
    if (daysOverdue > 3) {
      return {
        shouldFlag: true,
        flag: 'blocked-overdue',
        reason: `blocked_by event was ${daysOverdue} days ago — time to unblock`,
      };
    }
    return { shouldFlag: false };
  }

  if (goal.metadata.timeframe && isExpiredTimeframe(goal.metadata.timeframe, now)) {
    return {
      shouldFlag: true,
      flag: 'expired',
      reason: `timeframe "${goal.metadata.timeframe}" has passed`,
    };
  }

  const lastTouched = goal.metadata.last_touched;
  if (!lastTouched) return { shouldFlag: false };

  const daysIdle = Math.floor(
    (now.getTime() - new Date(lastTouched + 'T00:00:00Z').getTime()) / 86_400_000
  );

  const threshold =
    PRIORITY_THRESHOLDS[goal.metadata.priority ?? ''] ??
    SECTION_THRESHOLDS[goal.section] ??
    DEFAULT_STALENESS_DAYS;

  if (daysIdle > threshold) {
    return {
      shouldFlag: true,
      flag: 'stale',
      reason: `idle ${daysIdle} days (threshold: ${threshold})`,
    };
  }

  return { shouldFlag: false };
}

function isExpiredTimeframe(timeframe: string, now: Date): boolean {
  const tf = timeframe.toLowerCase().trim();
  if (tf === 'ongoing' || tf.startsWith('tbd')) return false;

  const isoMatch = tf.match(/(\d{4}-\d{2}-\d{2})/g);
  if (isoMatch) {
    const last = new Date(isoMatch[isoMatch.length - 1] + 'T23:59:59Z');
    return now > last;
  }

  const quarterMatch = tf.match(/^q(\d)\s*(\d{4})?$/i);
  if (quarterMatch) {
    const q = parseInt(quarterMatch[1], 10);
    const y = quarterMatch[2] ? parseInt(quarterMatch[2], 10) : now.getUTCFullYear();
    const endMonth = q * 3;
    const qEnd = new Date(Date.UTC(y, endMonth, 0, 23, 59, 59));
    return now > qEnd;
  }

  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                      'july', 'august', 'september', 'october', 'november', 'december'];
  for (let i = 0; i < monthNames.length; i++) {
    if (tf === monthNames[i]) {
      const y = now.getUTCFullYear();
      const monthEnd = new Date(Date.UTC(y, i + 1, 0, 23, 59, 59));
      return now > monthEnd;
    }
  }

  return false;
}
