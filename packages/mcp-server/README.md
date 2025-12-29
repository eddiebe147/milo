# MILO MCP Server

A Model Context Protocol (MCP) server that provides AI assistants like Claude with direct access to your MILO task management system. This allows you to manage tasks, categories, and projects using natural language commands through Claude Desktop or other MCP-compatible clients.

## Overview

The MILO MCP Server exposes 17 tools that let AI assistants interact with your MILO database:

- **11 Task Tools**: Create, read, update, delete tasks; manage task lifecycle; track work
- **6 Category Tools**: Organize tasks into projects; create, update, and reorder categories

All operations connect directly to MILO's SQLite database, providing real-time task management capabilities through conversational AI.

## Prerequisites

**Important**: The MILO Electron application must be run at least once before using the MCP server. This creates the SQLite database at:

```
~/Library/Application Support/milo/milo.db
```

If the database doesn't exist, the MCP server will fail to start.

### System Requirements

- Node.js 18 or higher
- MILO Electron app installed and initialized
- macOS (paths may differ on other operating systems)

## Installation & Building

### 1. Install Dependencies

From the MILO project root:

```bash
npm install
```

Or specifically for the MCP server:

```bash
cd packages/mcp-server
npm install
```

### 2. Build the Server

```bash
cd packages/mcp-server
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### 3. Test the Server (Optional)

```bash
npm run start
```

The server will output:

```
MILO MCP Server running on stdio
Version: 1.0.0
Database: ~/Library/Application Support/milo/milo.db
```

Press Ctrl+C to stop.

## Configuration

### Option 1: Per-Project Configuration (Recommended)

Create a `.mcp.json` file in the MILO project root:

```json
{
  "mcpServers": {
    "milo": {
      "command": "node",
      "args": ["./packages/mcp-server/dist/index.js"]
    }
  }
}
```

This configuration only applies when working within the MILO project directory.

### Option 2: Global Configuration

Add to your Claude Desktop configuration file:

**Location**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "milo": {
      "command": "node",
      "args": ["/absolute/path/to/milo/packages/mcp-server/dist/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/milo` with your actual path.

### Verifying Configuration

1. Restart Claude Desktop after adding the configuration
2. Look for the hammer icon in Claude's interface
3. The MILO server tools should appear when you click it

## Available Tools

### Task Management Tools (11)

#### CRUD Operations

- **task_create**: Create a new task with optional details (description, category, priority, dates)
- **task_list**: List tasks with filters (category, status, priority, limit)
- **task_get**: Get a single task by ID
- **task_update**: Update any task fields (only provided fields are updated)
- **task_delete**: Delete a task by ID

#### Task Lifecycle

- **task_start**: Start working on a task (sets status to `in_progress`)
- **task_complete**: Mark a task as done (sets status to `completed`)
- **task_defer**: Defer a task to a future date (sets status to `deferred`)

#### Queues & Organization

- **task_signal_queue**: Get your top priority tasks (in-progress first, then highest priority pending)
- **task_backlog**: Get all non-completed, non-deferred tasks not in signal queue

#### Work Tracking

- **task_record_work**: Record a day of work on a task (increments `days_worked`, updates `last_worked_date`)

### Category Management Tools (6)

- **category_create**: Create a new category/project for organizing tasks
- **category_list**: List all categories, sorted by order
- **category_get**: Get a single category by ID
- **category_update**: Update category fields (name, color, sort order)
- **category_delete**: Delete a category (tasks remain, their categoryId is set to null)
- **category_reorder**: Reorder categories by providing an array of IDs in desired order

## Usage Examples

Once configured, you can use natural language commands in Claude:

### Creating Tasks

```
Create a task called "Design new landing page" in the Marketing category
with priority 2 and estimate 3 days
```

```
Add a task: "Fix login bug" - make it high priority
```

### Viewing Tasks

```
Show me my signal queue - what should I work on right now?
```

```
List all tasks in the Development category
```

```
Show me all completed tasks
```

### Managing Tasks

```
Start working on the "Design new landing page" task
```

```
Mark the "Fix login bug" task as complete
```

```
Defer the "Write blog post" task to next Monday
```

```
Record a day of work on task [task-id]
```

### Category Management

```
Create a new category called "Q1 Goals" with color #3B82F6
```

```
List all my categories
```

```
Reorder my categories: put Marketing first, then Development, then Design
```

## Architecture

### Database Connection

The server connects to MILO's SQLite database using `better-sqlite3`. The database path is:

```
~/Library/Application Support/milo/milo.db
```

### Data Format

**Tasks** have the following structure:

```typescript
{
  id: string              // UUID
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'deferred'
  priority: 1 | 2 | 3 | 4 | 5  // 1 is highest
  categoryId?: string     // UUID of category
  startDate?: string      // ISO 8601
  endDate?: string        // ISO 8601
  estimatedDays?: number
  daysWorked?: number
  lastWorkedDate?: string // ISO 8601 date
  createdAt: string       // ISO 8601
  updatedAt: string       // ISO 8601
}
```

**Categories** have the following structure:

```typescript
{
  id: string          // UUID
  name: string
  color?: string      // Hex color (e.g., #FF5733)
  sortOrder: number   // Display order
  createdAt: string   // ISO 8601
  updatedAt: string   // ISO 8601
}
```

### Technology Stack

- **MCP SDK**: `@modelcontextprotocol/sdk` for protocol implementation
- **Database**: `better-sqlite3` for SQLite access
- **Validation**: `zod` for input schema validation
- **TypeScript**: Full type safety throughout

## Development

### Project Structure

```
packages/mcp-server/
├── src/
│   ├── index.ts           # Server initialization and routing
│   ├── db.ts              # Database connection management
│   ├── types.ts           # TypeScript type definitions
│   ├── tools/
│   │   ├── tasks.ts       # 11 task management tools
│   │   └── categories.ts  # 6 category management tools
├── dist/                  # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

### Development Mode

Watch for changes and auto-restart:

```bash
npm run dev
```

### Scripts

- `npm run build`: Compile TypeScript to JavaScript
- `npm run dev`: Development mode with hot reload
- `npm run start`: Run the compiled server

## Troubleshooting

### "Database not found" Error

**Solution**: Run the MILO Electron app at least once to create the database.

### Tools Not Appearing in Claude

1. Check that the `.mcp.json` file exists in the project root
2. Verify the path to `dist/index.js` is correct
3. Ensure the server is built (`npm run build`)
4. Restart Claude Desktop completely
5. Check Claude's console logs for MCP connection errors

### Server Fails to Start

1. Verify Node.js version: `node --version` (should be 18+)
2. Check that dependencies are installed: `npm install`
3. Ensure the database exists at `~/Library/Application Support/milo/milo.db`
4. Try running manually: `node packages/mcp-server/dist/index.js`

### Permission Errors

The server needs read/write access to:

```
~/Library/Application Support/milo/milo.db
```

Check file permissions with:

```bash
ls -la ~/Library/Application\ Support/milo/
```

## Security Considerations

- The MCP server has full read/write access to your MILO database
- Only use with trusted AI assistants
- The server runs locally and does not expose any network ports
- All communication happens via stdio (standard input/output)

## Contributing

When adding new tools:

1. Define the Zod schema for input validation
2. Implement the handler function
3. Add the tool definition to `getTaskTools()` or `getCategoryTools()`
4. Add routing logic in `handleTaskTool()` or `handleCategoryTool()`
5. Update this README with the new tool description

## License

MIT

## Support

For issues or questions:

- MILO Project: [GitHub Issues](https://github.com/id8labs/milo)
- MCP Protocol: [Model Context Protocol Documentation](https://modelcontextprotocol.io)
