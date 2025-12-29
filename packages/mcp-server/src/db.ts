/**
 * MILO Task Management MCP Server - Database Connection
 *
 * Connects to the MILO SQLite database shared with the Electron app.
 * Database is located at: ~/Library/Application Support/milo/data/milo.db
 */

import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Get the path to the MILO database
 * Path matches Electron's app.getPath('userData') + '/data/milo.db'
 */
function getDatabasePath(): string {
  const home = homedir();
  return join(home, 'Library', 'Application Support', 'milo', 'data', 'milo.db');
}

/**
 * Get a connection to the MILO database
 *
 * @throws {Error} If the database file doesn't exist
 * @returns {Database.Database} SQLite database connection
 */
export function getDatabase(): Database.Database {
  const dbPath = getDatabasePath();

  if (!existsSync(dbPath)) {
    throw new Error(
      `MILO database not found at: ${dbPath}\n` +
      'Please ensure the MILO Electron app has been run at least once to create the database.'
    );
  }

  const db = new Database(dbPath, {
    readonly: false,
    fileMustExist: true
  });

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  return db;
}

/**
 * Close a database connection
 */
export function closeDatabase(db: Database.Database): void {
  db.close();
}
