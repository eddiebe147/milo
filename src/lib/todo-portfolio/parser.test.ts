import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { parseTodoFile, writeTodoFile, appendProposal, findGoalsByState, daysSince } from './parser';

const TEST_FILE = join(tmpdir(), 'test-portfolio-todo.md');

const SAMPLE = `# Portfolio Goals — 2026-04-16

Source of truth for cross-project goals.

## Product Milestones

- [active] Profesa workshop shipped for Jose
  owner: eddie | timeframe: 2026-05-14 to 2026-05-16 | last_touched: 2026-04-16
  priority: tier-1 | stakeholder: jose | source: eddie
  next: attorney meeting 2026-04-20

- [active] Homer operational
  owner: eddie | timeframe: tbd-post-roadmap | last_touched: 2026-04-16
  priority: tier-1 | source: eddie
  blocked_by: attorney_meeting_2026-04-18

## Revenue / Money

- [active] Monthly revenue target
  owner: eddie | timeframe: ongoing | last_touched: 2026-04-01
  priority: tier-2 | source: eddie

## Archived — 2026-04-16

- [archived] Anna onboarding
  reason: "Resigned" | archived_on: 2026-04-16
`;

describe('parseTodoFile', () => {
  beforeEach(() => writeFileSync(TEST_FILE, SAMPLE, 'utf-8'));
  afterEach(() => existsSync(TEST_FILE) && unlinkSync(TEST_FILE));

  it('parses all goals with correct states', () => {
    const parsed = parseTodoFile(TEST_FILE);
    expect(parsed.goals).toHaveLength(4);
    expect(parsed.goals.map(g => g.state)).toEqual(['active', 'active', 'active', 'archived']);
  });

  it('extracts metadata from pipe-separated pairs', () => {
    const parsed = parseTodoFile(TEST_FILE);
    const profesa = parsed.goals[0];
    expect(profesa.metadata.owner).toBe('eddie');
    expect(profesa.metadata.priority).toBe('tier-1');
    expect(profesa.metadata.stakeholder).toBe('jose');
    expect(profesa.metadata.next).toContain('attorney meeting');
  });

  it('assigns goals to their correct sections', () => {
    const parsed = parseTodoFile(TEST_FILE);
    expect(parsed.goals[0].section).toBe('Product Milestones');
    expect(parsed.goals[2].section).toBe('Revenue / Money');
    expect(parsed.goals[3].section).toBe('Archived — 2026-04-16');
  });

  it('preserves preamble before first section', () => {
    const parsed = parseTodoFile(TEST_FILE);
    expect(parsed.preamble).toContain('# Portfolio Goals');
    expect(parsed.preamble).toContain('Source of truth');
  });

  it('preserves unknown metadata keys for forward compat', () => {
    const customFile = join(tmpdir(), 'custom.md');
    writeFileSync(customFile, `## Product Milestones\n\n- [active] test\n  owner: eddie | custom_future_key: future_value | another_new: 42\n`);
    const parsed = parseTodoFile(customFile);
    expect(parsed.goals[0].metadata.custom_future_key).toBe('future_value');
    expect(parsed.goals[0].metadata.another_new).toBe('42');
    unlinkSync(customFile);
  });

  it('returns empty result for nonexistent file', () => {
    const parsed = parseTodoFile('/nonexistent/path/file.md');
    expect(parsed.goals).toEqual([]);
    expect(parsed.sections).toEqual([]);
  });
});

describe('writeTodoFile round-trip', () => {
  beforeEach(() => writeFileSync(TEST_FILE, SAMPLE, 'utf-8'));
  afterEach(() => existsSync(TEST_FILE) && unlinkSync(TEST_FILE));

  it('parse -> write -> parse produces equivalent data', () => {
    const parsed1 = parseTodoFile(TEST_FILE);
    writeTodoFile(TEST_FILE, parsed1);
    const parsed2 = parseTodoFile(TEST_FILE);
    expect(parsed2.goals.length).toBe(parsed1.goals.length);
    for (let i = 0; i < parsed1.goals.length; i++) {
      expect(parsed2.goals[i].state).toBe(parsed1.goals[i].state);
      expect(parsed2.goals[i].title).toBe(parsed1.goals[i].title);
      expect(parsed2.goals[i].metadata).toEqual(parsed1.goals[i].metadata);
      expect(parsed2.goals[i].section).toBe(parsed1.goals[i].section);
    }
  });

  it('persists state changes on write', () => {
    const parsed = parseTodoFile(TEST_FILE);
    const updated = parsed.goals.map(g =>
      g.title === 'Monthly revenue target' ? { ...g, state: 'review' as const, metadata: { ...g.metadata, flag: 'stale' } } : g
    );
    writeTodoFile(TEST_FILE, parsed, updated);
    const reparsed = parseTodoFile(TEST_FILE);
    const target = reparsed.goals.find(g => g.title === 'Monthly revenue target')!;
    expect(target.state).toBe('review');
    expect(target.metadata.flag).toBe('stale');
  });
});

describe('appendProposal', () => {
  beforeEach(() => writeFileSync(TEST_FILE, SAMPLE, 'utf-8'));
  afterEach(() => existsSync(TEST_FILE) && unlinkSync(TEST_FILE));

  it('appends a proposed goal with milo as default source', () => {
    appendProposal(TEST_FILE, {
      title: 'Ship welcome flow v2',
      section: 'Product Milestones',
      metadata: { owner: 'eddie', timeframe: 'Q2' },
    });
    const parsed = parseTodoFile(TEST_FILE);
    const proposed = findGoalsByState(parsed, 'proposed');
    expect(proposed).toHaveLength(1);
    expect(proposed[0].title).toBe('Ship welcome flow v2');
    expect(proposed[0].metadata.source).toBe('milo');
    expect(proposed[0].metadata.last_touched).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('does not modify existing goals', () => {
    const before = parseTodoFile(TEST_FILE);
    appendProposal(TEST_FILE, {
      title: 'New thing',
      section: 'Revenue / Money',
      metadata: { owner: 'milo' },
    });
    const after = parseTodoFile(TEST_FILE);
    const beforeActive = findGoalsByState(before, 'active');
    const afterActive = findGoalsByState(after, 'active');
    expect(afterActive.length).toBe(beforeActive.length);
    for (let i = 0; i < beforeActive.length; i++) {
      expect(afterActive[i].title).toBe(beforeActive[i].title);
      expect(afterActive[i].metadata).toEqual(beforeActive[i].metadata);
    }
  });
});

describe('daysSince', () => {
  it('calculates days between ISO date and now', () => {
    const now = new Date('2026-04-16T12:00:00Z');
    expect(daysSince('2026-04-01', now)).toBe(15);
    expect(daysSince('2026-04-16', now)).toBe(0);
    expect(daysSince('2026-03-05', now)).toBe(42);
  });
});
