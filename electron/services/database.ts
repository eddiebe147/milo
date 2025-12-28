import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

let db: Database.Database | null = null

// Get database path (in user data directory)
function getDatabasePath(): string {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'data')

  // Ensure directory exists
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  return join(dbDir, 'milo.db')
}

// Initialize the database with schema
export function initDatabase(): Database.Database {
  if (db) return db

  const dbPath = getDatabasePath()
  console.log(`[Database] Initializing at: ${dbPath}`)

  db = new Database(dbPath)

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL')

  // Create tables
  createTables(db)

  // Seed default app classifications
  seedDefaultClassifications(db)

  console.log('[Database] Initialized successfully')
  return db
}

function createTables(database: Database.Database): void {
  // Goals table
  database.prepare(`
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
  `).run()

  // Tasks table
  database.prepare(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      goal_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'deferred')),
      priority INTEGER NOT NULL DEFAULT 3 CHECK(priority BETWEEN 1 AND 5),
      rationale TEXT,
      scheduled_date TEXT NOT NULL,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
    )
  `).run()

  // Activity logs table
  database.prepare(`
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
  `).run()

  // Create index for faster activity queries by date
  database.prepare(`
    CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp
    ON activity_logs(timestamp)
  `).run()

  // App classifications table
  database.prepare(`
    CREATE TABLE IF NOT EXISTS app_classifications (
      id TEXT PRIMARY KEY,
      app_name TEXT NOT NULL,
      bundle_id TEXT,
      default_state TEXT NOT NULL CHECK(default_state IN ('green', 'amber', 'red')),
      keywords TEXT,
      is_custom INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(app_name, bundle_id)
    )
  `).run()

  // Daily scores table
  database.prepare(`
    CREATE TABLE IF NOT EXISTS daily_scores (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      signal_minutes INTEGER NOT NULL DEFAULT 0,
      noise_minutes INTEGER NOT NULL DEFAULT 0,
      adjacent_minutes INTEGER NOT NULL DEFAULT 0,
      total_tracked_minutes INTEGER NOT NULL DEFAULT 0,
      tasks_completed INTEGER NOT NULL DEFAULT 0,
      tasks_total INTEGER NOT NULL DEFAULT 0,
      score INTEGER NOT NULL DEFAULT 0,
      streak_day INTEGER NOT NULL DEFAULT 0,
      insights TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run()

  // Dialogue sessions table
  database.prepare(`
    CREATE TABLE IF NOT EXISTS dialogue_sessions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('morning_briefing', 'evening_review')),
      date TEXT NOT NULL,
      messages TEXT NOT NULL,
      summary TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run()

  // User settings table (single row)
  database.prepare(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      work_start_time TEXT NOT NULL DEFAULT '09:00',
      work_end_time TEXT NOT NULL DEFAULT '17:00',
      work_days TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
      monitoring_enabled INTEGER NOT NULL DEFAULT 1,
      polling_interval_ms INTEGER NOT NULL DEFAULT 5000,
      drift_alert_enabled INTEGER NOT NULL DEFAULT 1,
      drift_alert_delay_minutes INTEGER NOT NULL DEFAULT 10,
      morning_briefing_time TEXT NOT NULL DEFAULT '09:00',
      evening_review_time TEXT NOT NULL DEFAULT '18:00',
      always_on_top INTEGER NOT NULL DEFAULT 0,
      start_minimized INTEGER NOT NULL DEFAULT 0,
      show_in_dock INTEGER NOT NULL DEFAULT 1
    )
  `).run()

  // Insert default settings if not exists
  database.prepare(`
    INSERT OR IGNORE INTO user_settings (id) VALUES (1)
  `).run()
}

// Default app classifications for common productivity apps
function seedDefaultClassifications(database: Database.Database): void {
  const defaults = [
    // Green: Productive work apps
    { appName: 'Visual Studio Code', state: 'green' },
    { appName: 'Code', state: 'green' },
    { appName: 'Cursor', state: 'green' },
    { appName: 'Xcode', state: 'green' },
    { appName: 'Terminal', state: 'green' },
    { appName: 'iTerm2', state: 'green' },
    { appName: 'Warp', state: 'green' },
    { appName: 'Notion', state: 'green' },
    { appName: 'Obsidian', state: 'green' },
    { appName: 'Figma', state: 'green' },
    { appName: 'Sketch', state: 'green' },
    { appName: 'Linear', state: 'green' },
    { appName: 'GitHub Desktop', state: 'green' },

    // Amber: Potentially productive, context-dependent
    { appName: 'Slack', state: 'amber' },
    { appName: 'Discord', state: 'amber' },
    { appName: 'Messages', state: 'amber' },
    { appName: 'Mail', state: 'amber' },
    { appName: 'Microsoft Outlook', state: 'amber' },
    { appName: 'Zoom', state: 'amber' },
    { appName: 'Google Meet', state: 'amber' },
    { appName: 'Safari', state: 'amber' },
    { appName: 'Google Chrome', state: 'amber' },
    { appName: 'Arc', state: 'amber' },
    { appName: 'Firefox', state: 'amber' },
    { appName: 'Brave Browser', state: 'amber' },

    // Red: Known distractions
    { appName: 'Twitter', state: 'red' },
    { appName: 'X', state: 'red' },
    { appName: 'Facebook', state: 'red' },
    { appName: 'Instagram', state: 'red' },
    { appName: 'TikTok', state: 'red' },
    { appName: 'YouTube', state: 'red' },
    { appName: 'Netflix', state: 'red' },
    { appName: 'Spotify', state: 'red' },
    { appName: 'Apple Music', state: 'red' },
    { appName: 'Steam', state: 'red' },
    { appName: 'Reddit', state: 'red' },
  ]

  const stmt = database.prepare(`
    INSERT OR IGNORE INTO app_classifications (id, app_name, default_state, is_custom)
    VALUES (?, ?, ?, 0)
  `)

  for (const appConfig of defaults) {
    stmt.run(
      `default-${appConfig.appName.toLowerCase().replace(/\s+/g, '-')}`,
      appConfig.appName,
      appConfig.state
    )
  }
}

// Get database instance
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

// Close database connection
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    console.log('[Database] Closed')
  }
}
