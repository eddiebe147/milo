# MILO - Life's Plan Mode

A signal-based task management system designed for deep work and focused execution. MILO cuts through the noise of endless todo lists by surfacing only what matters right now.

## Philosophy

Traditional task managers bury you in lists. MILO operates differently:

- **Signal Queue**: Your top 5 priorities, always visible. In-progress tasks first, then highest priority pending.
- **Backlog**: Everything else, organized by project. Out of sight until you need it.
- **Categories as Projects**: Group related work. Color-coded. Drag to reorder.
- **Work Tracking**: Multi-day tasks track progress. Know how much effort you've invested.

## Features

### Task Management
- Create tasks with priority levels (1-5, where 1 is highest)
- Track estimated days vs actual days worked
- Start, complete, or defer tasks to future dates
- Signal queue surfaces what needs attention now
- Backlog keeps everything else organized

### Project Organization
- Categories act as projects or life areas
- Custom colors for visual organization
- Drag-and-drop reordering
- Tasks automatically organized by category

### AI Integration
- **Plan Import Agent**: Paste markdown plans, MILO parses them into structured tasks
- **MCP Server**: Claude Code can manage your tasks via natural language
- Deep integration with AI workflows for task capture and management

### Claude Code Integration (MCP)

MILO includes a Model Context Protocol server that lets Claude Code manage your tasks directly:

```
"Create a task called 'Build login form' with priority 1"
"Show me my signal queue"
"Mark task [id] as complete"
"Create a category called 'Sprint 5'"
```

**17 tools available:**
- 11 task tools (CRUD, lifecycle, signal queue, work tracking)
- 6 category tools (projects, organization, reordering)
- 4 read-only resources (signal queue, backlog, categories, today)

See [MCP Server README](./packages/mcp-server/README.md) for setup instructions.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  MILO Electron App                                              │
│  ├── React + TypeScript frontend                                │
│  ├── SQLite database (better-sqlite3)                           │
│  └── AI integration (Claude API)                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Shared SQLite Database
                              │
┌─────────────────────────────────────────────────────────────────┐
│  MCP Server (packages/mcp-server)                               │
│  ├── stdio transport for Claude Code                            │
│  ├── Task & Category tools                                      │
│  └── Real-time sync with Electron app                           │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS
- **Desktop**: Electron with electron-vite
- **Database**: SQLite via better-sqlite3
- **AI**: Anthropic Claude API
- **MCP**: @modelcontextprotocol/sdk
- **Validation**: Zod
- **Testing**: Vitest, Playwright

## Development

### Prerequisites
- Node.js 18+
- npm or pnpm

### Setup

```bash
# Clone the repository
git clone https://github.com/eddiebe147/milo.git
cd milo

# Install dependencies
npm install

# Start development server
npm run dev
```

### Scripts

```bash
npm run dev          # Start Electron in dev mode
npm run build        # Build for production
npm run build:mac    # Build macOS app
npm run test         # Run unit tests
npm run test:e2e     # Run Playwright E2E tests
npm run mcp          # Start MCP server for Claude Code
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
```

### MCP Server Development

```bash
cd packages/mcp-server
npm install
npm run build
npm run dev    # Watch mode
```

## Project Structure

```
milo/
├── electron/              # Electron main process
│   ├── ai/               # AI integration (Claude API)
│   ├── services/         # Database, IPC handlers
│   └── main.ts           # Entry point
├── src/                   # React renderer
│   ├── components/       # UI components
│   ├── hooks/            # React hooks
│   └── stores/           # Zustand state
├── packages/
│   └── mcp-server/       # MCP server for Claude Code
└── tests/                 # E2E tests
```

## Database Schema

```sql
-- Tasks table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'deferred')),
  priority INTEGER CHECK(priority BETWEEN 1 AND 5),
  category_id TEXT REFERENCES categories(id),
  scheduled_date TEXT,
  start_date TEXT,
  end_date TEXT,
  estimated_days INTEGER DEFAULT 1,
  days_worked INTEGER DEFAULT 0,
  last_worked_date TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- Categories table
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER,
  created_at TEXT,
  updated_at TEXT
);
```

## Roadmap

- [ ] Time blocking integration
- [ ] Goal tracking with task rollup
- [ ] Calendar sync
- [ ] Mobile companion app
- [ ] Team collaboration features

## License

MIT

## Author

Built by [ID8Labs](https://id8labs.com) - Eddie Belaval

---

*"The goal is not to do more. It's to do what matters."*
