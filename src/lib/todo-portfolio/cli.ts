#!/usr/bin/env node
import { scanTodoFile, formatScanReport } from './scanner';
import { homedir } from 'os';
import { join } from 'path';

const DEFAULT_PATH = join(homedir(), 'Development/id8/TODO.md');

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const pathArg = args.find(a => !a.startsWith('-')) ?? DEFAULT_PATH;

  const result = scanTodoFile(pathArg, new Date(), dryRun);
  console.log(formatScanReport(result));

  if (dryRun && result.flipped.length > 0) {
    console.log('\n(dry run — no changes written)');
  }

  process.exit(result.flipped.length > 0 || result.alreadyFlagged.length > 0 || result.actionable.length > 0 ? 2 : 0);
}

main();
