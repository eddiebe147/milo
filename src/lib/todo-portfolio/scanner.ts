import type { Goal } from './types';
import { parseTodoFile, writeTodoFile } from './parser';
import { checkStaleness, type StalenessVerdict } from './rules';

export interface ScanResult {
  path: string;
  scannedAt: string;
  totalGoals: number;
  flipped: Array<{ goal: Goal; verdict: StalenessVerdict }>;
  alreadyFlagged: Goal[];
  actionable: Goal[];
}

export function scanTodoFile(path: string, now: Date = new Date(), dryRun = false): ScanResult {
  const parsed = parseTodoFile(path);
  const flipped: ScanResult['flipped'] = [];

  const updatedGoals: Goal[] = parsed.goals.map(goal => {
    const verdict = checkStaleness(goal, now);
    if (verdict.shouldFlag) {
      flipped.push({ goal, verdict });
      return {
        ...goal,
        state: 'review' as const,
        metadata: {
          ...goal.metadata,
          flag: verdict.flag ?? 'stale',
          flagged_on: now.toISOString().slice(0, 10),
          flag_reason: verdict.reason ?? '',
        },
        raw: '',
      };
    }
    return goal;
  });

  if (!dryRun && flipped.length > 0) {
    writeTodoFile(path, parsed, updatedGoals);
  }

  return {
    path,
    scannedAt: now.toISOString(),
    totalGoals: parsed.goals.length,
    flipped,
    alreadyFlagged: parsed.goals.filter(g => g.state === 'review'),
    actionable: parsed.goals.filter(g => g.state === 'proposed'),
  };
}

export function formatScanReport(result: ScanResult): string {
  const lines: string[] = [];
  lines.push(`Scan: ${result.path}`);
  lines.push(`At: ${result.scannedAt}`);
  lines.push(`Total goals: ${result.totalGoals}`);
  lines.push('');

  if (result.flipped.length > 0) {
    lines.push(`Flipped to [review] (${result.flipped.length}):`);
    for (const { goal, verdict } of result.flipped) {
      lines.push(`  - ${goal.title} (${verdict.flag}) — ${verdict.reason}`);
    }
    lines.push('');
  }

  if (result.alreadyFlagged.length > 0) {
    lines.push(`Already in [review] awaiting decision (${result.alreadyFlagged.length}):`);
    for (const g of result.alreadyFlagged) {
      lines.push(`  - ${g.title} (${g.metadata.flag ?? '?'})`);
    }
    lines.push('');
  }

  if (result.actionable.length > 0) {
    lines.push(`Proposals awaiting promotion (${result.actionable.length}):`);
    for (const g of result.actionable) {
      lines.push(`  - ${g.title} (from ${g.metadata.source ?? 'unknown'})`);
    }
  }

  if (result.flipped.length === 0 && result.alreadyFlagged.length === 0 && result.actionable.length === 0) {
    lines.push('All clear. No flips, no pending reviews, no proposals.');
  }

  return lines.join('\n');
}
