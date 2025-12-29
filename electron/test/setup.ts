/**
 * Test setup for Electron repository tests
 * Uses in-memory SQLite database for fast, isolated tests
 */
import Database from 'better-sqlite3'
import { vi } from 'vitest'

// Create an in-memory database for testing
let testDb: Database.Database | null = null

export function createTestDatabase(): Database.Database {
  testDb = new Database(':memory:')

  // Create all tables needed for testing using prepare().run()
  const createGoals = testDb.prepare(`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      parent_id TEXT,
      timeframe TEXT NOT NULL CHECK(timeframe IN ('yearly', 'quarterly', 'monthly', 'weekly')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived')),
      target_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (parent_id) REFERENCES goals(id) ON DELETE SET NULL
    )
  `)
  createGoals.run()

  const createCategories = testDb.prepare(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  createCategories.run()

  const createTasks = testDb.prepare(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      goal_id TEXT,
      category_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'deferred')),
      priority INTEGER NOT NULL DEFAULT 3 CHECK(priority BETWEEN 1 AND 5),
      rationale TEXT,
      scheduled_date TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      estimated_days INTEGER DEFAULT 1,
      days_worked INTEGER DEFAULT 0,
      last_worked_date TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `)
  createTasks.run()

  const createConversations = testDb.prepare(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'New Chat',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  createConversations.run()

  const createMessages = testDb.prepare(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
    )
  `)
  createMessages.run()

  const createActivityLogs = testDb.prepare(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      app_name TEXT NOT NULL,
      window_title TEXT,
      bundle_id TEXT,
      url TEXT,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      state TEXT NOT NULL CHECK(state IN ('green', 'amber', 'red')),
      task_id TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
    )
  `)
  createActivityLogs.run()

  const createScores = testDb.prepare(`
    CREATE TABLE IF NOT EXISTS score_snapshots (
      id TEXT PRIMARY KEY,
      snapshot_date TEXT NOT NULL UNIQUE,
      productivity_score INTEGER NOT NULL DEFAULT 0,
      focus_minutes INTEGER NOT NULL DEFAULT 0,
      drift_minutes INTEGER NOT NULL DEFAULT 0,
      tasks_completed INTEGER NOT NULL DEFAULT 0,
      goals_progressed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  createScores.run()

  const createClassifications = testDb.prepare(`
    CREATE TABLE IF NOT EXISTS app_classifications (
      id TEXT PRIMARY KEY,
      app_name TEXT NOT NULL,
      bundle_id TEXT,
      default_state TEXT NOT NULL CHECK(default_state IN ('green', 'amber', 'red')),
      keywords TEXT,
      is_custom INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  createClassifications.run()

  return testDb
}

export function getTestDatabase(): Database.Database {
  if (!testDb) {
    throw new Error('Test database not initialized. Call createTestDatabase() first.')
  }
  return testDb
}

export function closeTestDatabase(): void {
  if (testDb) {
    testDb.close()
    testDb = null
  }
}

// Mock the getDatabase function from the database service
export function mockGetDatabase(): void {
  vi.mock('../services/database', () => ({
    getDatabase: () => getTestDatabase(),
    initDatabase: () => getTestDatabase(),
  }))
}

// Clear all data from test database (for test isolation)
export function clearTestDatabase(): void {
  if (!testDb) return

  testDb.prepare('DELETE FROM chat_messages').run()
  testDb.prepare('DELETE FROM chat_conversations').run()
  testDb.prepare('DELETE FROM activity_logs').run()
  testDb.prepare('DELETE FROM tasks').run()
  testDb.prepare('DELETE FROM categories').run()
  testDb.prepare('DELETE FROM goals').run()
  testDb.prepare('DELETE FROM score_snapshots').run()
  testDb.prepare('DELETE FROM app_classifications').run()
}
