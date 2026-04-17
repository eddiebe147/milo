import type { Goal, GoalState, ParsedTodoFile, GoalProposal } from './types';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const STATE_LINE_RE = /^-\s+\[(proposed|active|review|done|archived)\]\s+(.+)$/;
const SECTION_RE = /^##\s+(.+?)\s*$/;
const METADATA_LINE_RE = /^\s{2,}(.+)$/;

function parseMetadataLine(line: string): Record<string, string> {
  const trimmed = line.trim();
  const pairs = trimmed.split('|').map(s => s.trim()).filter(Boolean);
  const meta: Record<string, string> = {};
  for (const pair of pairs) {
    const colonIdx = pair.indexOf(':');
    if (colonIdx === -1) continue;
    const key = pair.slice(0, colonIdx).trim();
    const value = pair.slice(colonIdx + 1).trim();
    if (key) meta[key] = value;
  }
  return meta;
}

export function parseTodoFile(path: string): ParsedTodoFile {
  if (!existsSync(path)) {
    return { goals: [], preamble: '', sections: [] };
  }
  const content = readFileSync(path, 'utf-8');
  const lines = content.split('\n');

  const goals: Goal[] = [];
  const sections: string[] = [];
  let currentSection = '';
  let preambleLines: string[] = [];
  let seenFirstSection = false;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      if (!sections.includes(currentSection)) sections.push(currentSection);
      seenFirstSection = true;
      i++;
      continue;
    }

    if (!seenFirstSection) {
      preambleLines.push(line);
      i++;
      continue;
    }

    const goalMatch = line.match(STATE_LINE_RE);
    if (goalMatch) {
      const state = goalMatch[1] as GoalState;
      const title = goalMatch[2].trim();
      const rawLines = [line];
      const metadata: Record<string, string> = {};

      let j = i + 1;
      while (j < lines.length && METADATA_LINE_RE.test(lines[j]) && !STATE_LINE_RE.test(lines[j]) && !SECTION_RE.test(lines[j])) {
        rawLines.push(lines[j]);
        Object.assign(metadata, parseMetadataLine(lines[j]));
        j++;
      }

      goals.push({
        state,
        title,
        section: currentSection,
        metadata,
        raw: rawLines.join('\n'),
      });
      i = j;
      continue;
    }

    i++;
  }

  return {
    goals,
    preamble: preambleLines.join('\n').trimEnd(),
    sections,
  };
}

function serializeGoal(goal: Goal): string {
  const header = `- [${goal.state}] ${goal.title}`;
  const metaKeys = Object.keys(goal.metadata);
  if (metaKeys.length === 0) return header;

  const primary = ['owner', 'timeframe', 'last_touched', 'priority', 'source'].filter(k => k in goal.metadata);
  const secondary = metaKeys.filter(k => !primary.includes(k));

  const lines = [header];
  if (primary.length > 0) {
    lines.push('  ' + primary.map(k => `${k}: ${goal.metadata[k]}`).join(' | '));
  }
  for (const k of secondary) {
    lines.push(`  ${k}: ${goal.metadata[k]}`);
  }
  return lines.join('\n');
}

export function writeTodoFile(path: string, parsed: ParsedTodoFile, updatedGoals?: Goal[]): void {
  const goals = updatedGoals ?? parsed.goals;
  const goalsBySection = new Map<string, Goal[]>();
  for (const goal of goals) {
    if (!goalsBySection.has(goal.section)) goalsBySection.set(goal.section, []);
    goalsBySection.get(goal.section)!.push(goal);
  }

  const parts: string[] = [];
  if (parsed.preamble) parts.push(parsed.preamble, '');

  for (const section of parsed.sections) {
    parts.push(`## ${section}`, '');
    const sectionGoals = goalsBySection.get(section) ?? [];
    for (const goal of sectionGoals) {
      const originalGoal = parsed.goals.find(g => g.title === goal.title && g.section === goal.section);
      const unchanged = originalGoal &&
        originalGoal.state === goal.state &&
        JSON.stringify(originalGoal.metadata) === JSON.stringify(goal.metadata);
      parts.push(unchanged ? goal.raw : serializeGoal(goal), '');
    }
  }

  writeFileSync(path, parts.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n', 'utf-8');
}

export function appendProposal(path: string, proposal: GoalProposal): void {
  const parsed = parseTodoFile(path);
  const metadata = {
    ...proposal.metadata,
    source: proposal.metadata.source ?? 'milo',
    last_touched: proposal.metadata.last_touched ?? new Date().toISOString().slice(0, 10),
  };
  const newGoal: Goal = {
    state: 'proposed',
    title: proposal.title,
    section: proposal.section,
    metadata,
    raw: '',
  };
  if (!parsed.sections.includes(proposal.section)) {
    parsed.sections.push(proposal.section);
  }
  writeTodoFile(path, parsed, [...parsed.goals, newGoal]);
}

export function findGoalsByState(parsed: ParsedTodoFile, state: GoalState): Goal[] {
  return parsed.goals.filter(g => g.state === state);
}

export function daysSince(isoDate: string, now: Date = new Date()): number {
  const then = new Date(isoDate + 'T00:00:00Z').getTime();
  const ms = now.getTime() - then;
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}
