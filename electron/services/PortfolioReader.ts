import { homedir } from 'os';
import { join } from 'path';
import {
  parseTodoFile,
  appendProposal,
  scanTodoFile,
  findGoalsByState,
  type Goal as PortfolioGoal,
  type GoalProposal,
} from '../../src/lib/todo-portfolio';

const PORTFOLIO_PATH = join(homedir(), 'Development/id8/TODO.md');

export interface PortfolioSnapshot {
  path: string;
  active: PortfolioGoal[];
  review: PortfolioGoal[];
  proposed: PortfolioGoal[];
  archived: PortfolioGoal[];
  exists: boolean;
}

export function readPortfolio(path: string = PORTFOLIO_PATH): PortfolioSnapshot {
  const parsed = parseTodoFile(path);
  return {
    path,
    active: findGoalsByState(parsed, 'active'),
    review: findGoalsByState(parsed, 'review'),
    proposed: findGoalsByState(parsed, 'proposed'),
    archived: findGoalsByState(parsed, 'archived'),
    exists: parsed.goals.length > 0,
  };
}

export function scanPortfolio(path: string = PORTFOLIO_PATH, dryRun = false) {
  return scanTodoFile(path, new Date(), dryRun);
}

export function proposePortfolioGoal(proposal: GoalProposal, path: string = PORTFOLIO_PATH): void {
  appendProposal(path, proposal);
}

/**
 * Formats portfolio state for the morning briefing.
 *
 * KEY RULE: Only [active] goals are included. [review], [proposed], [archived] are NEVER
 * surfaced to the AI for "pulse check" purposes. This prevents the AI from fabricating
 * idle-day counts or nagging about goals that are already pending decision.
 *
 * Returns a context block that gets injected into the AI prompt with explicit
 * anti-fabrication instructions.
 */
export function formatPortfolioForBriefing(path: string = PORTFOLIO_PATH): string {
  const snap = readPortfolio(path);
  if (!snap.exists) return '';

  const lines: string[] = [];
  lines.push('## Portfolio Goals — Ground Truth from ~/Development/id8/TODO.md');
  lines.push('');
  lines.push('CRITICAL INSTRUCTIONS FOR THE AI:');
  lines.push('- These are the ONLY portfolio goals to mention in the briefing.');
  lines.push('- DO NOT fabricate idle-day counts, progress percentages, or status claims.');
  lines.push('- DO NOT mention goals that are in review, proposed, or archived states.');
  lines.push('- If `last_touched` is missing, do not guess when it was last worked on.');
  lines.push('- If `blocked_by` is set, acknowledge the blocker rather than nagging about progress.');
  lines.push('');

  if (snap.active.length === 0) {
    lines.push('No active portfolio goals. Do not invent any.');
  } else {
    lines.push(`### Active goals (${snap.active.length})`);
    for (const g of snap.active) {
      const meta = g.metadata;
      const parts = [`**${g.title}**`];
      if (meta.section || g.section) parts.push(`[${g.section}]`);
      if (meta.priority) parts.push(`priority: ${meta.priority}`);
      if (meta.timeframe) parts.push(`timeframe: ${meta.timeframe}`);
      if (meta.last_touched) parts.push(`last_touched: ${meta.last_touched}`);
      if (meta.stakeholder) parts.push(`stakeholder: ${meta.stakeholder}`);
      if (meta.blocked_by) parts.push(`blocked_by: ${meta.blocked_by}`);
      if (meta.next) parts.push(`next: ${meta.next}`);
      lines.push('- ' + parts.join(' | '));
    }
  }
  lines.push('');

  if (snap.review.length > 0) {
    lines.push(`### Goals pending Eddie's review (${snap.review.length}) — DO NOT NAG, just note if asked`);
    for (const g of snap.review) {
      lines.push(`- ${g.title} (flag: ${g.metadata.flag ?? 'stale'})`);
    }
    lines.push('');
  }

  if (snap.proposed.length > 0) {
    lines.push(`### Proposed goals awaiting Eddie's approval (${snap.proposed.length})`);
    for (const g of snap.proposed) {
      lines.push(`- ${g.title} (proposed by ${g.metadata.source ?? 'unknown'})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
