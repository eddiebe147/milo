# MILO MCP Server - Task Tools API Reference

## Overview

The MILO MCP server now includes 11 task management tools for comprehensive task lifecycle management. These tools follow the Model Context Protocol specification and integrate with the existing MILO SQLite database.

---

## Tools

### 1. task_create

Create a new task with optional details.

**Parameters:**
```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "categoryId": "string (optional)",
  "priority": "number (1-5, default: 3)",
  "estimatedDays": "number (optional)",
  "startDate": "string (ISO 8601, optional)",
  "endDate": "string (ISO 8601, optional)"
}
```

**Example:**
```json
{
  "title": "Build MCP server tools",
  "description": "Implement 11 task management tools",
  "priority": 1,
  "estimatedDays": 3
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Build MCP server tools",
  "description": "Implement 11 task management tools",
  "status": "todo",
  "priority": 1,
  "estimatedDays": 3,
  "daysWorked": 0,
  "createdAt": "2025-12-28T...",
  "updatedAt": "2025-12-28T..."
}
```

---

### 2. task_list

List tasks with optional filters.

**Parameters:**
```json
{
  "categoryId": "string (optional)",
  "status": "enum: todo|in_progress|done|paused|deferred (optional)",
  "priority": "number 1-5 (optional)",
  "limit": "number (default: 50)"
}
```

**Example:**
```json
{
  "status": "in_progress",
  "limit": 10
}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Task 1",
    "status": "in_progress",
    ...
  },
  {
    "id": "uuid",
    "title": "Task 2",
    "status": "in_progress",
    ...
  }
]
```

---

### 3. task_get

Get a single task by ID.

**Parameters:**
```json
{
  "taskId": "string (required)"
}
```

**Example:**
```json
{
  "taskId": "abc123-def456-..."
}
```

**Response:**
```json
{
  "id": "abc123-def456-...",
  "title": "Task title",
  "status": "todo",
  ...
}
```

**Error:**
```json
{
  "error": "Task not found: abc123-def456-..."
}
```

---

### 4. task_update

Update task fields (only provided fields are updated).

**Parameters:**
```json
{
  "taskId": "string (required)",
  "title": "string (optional)",
  "description": "string (optional)",
  "categoryId": "string (optional)",
  "priority": "number 1-5 (optional)",
  "status": "enum: todo|in_progress|done|paused|deferred (optional)",
  "estimatedDays": "number (optional)",
  "startDate": "string (ISO 8601, optional)",
  "endDate": "string (ISO 8601, optional)"
}
```

**Example:**
```json
{
  "taskId": "abc123-def456-...",
  "priority": 2,
  "status": "in_progress"
}
```

**Response:**
```json
{
  "id": "abc123-def456-...",
  "title": "Task title",
  "status": "in_progress",
  "priority": 2,
  "updatedAt": "2025-12-28T...",
  ...
}
```

---

### 5. task_delete

Delete a task by ID.

**Parameters:**
```json
{
  "taskId": "string (required)"
}
```

**Example:**
```json
{
  "taskId": "abc123-def456-..."
}
```

**Response:**
```json
{
  "success": true
}
```

---

### 6. task_start

Start working on a task (sets status to `in_progress` and updates `lastWorkedDate`).

**Parameters:**
```json
{
  "taskId": "string (required)"
}
```

**Example:**
```json
{
  "taskId": "abc123-def456-..."
}
```

**Response:**
```json
{
  "id": "abc123-def456-...",
  "status": "in_progress",
  "lastWorkedDate": "2025-12-28",
  "updatedAt": "2025-12-28T...",
  ...
}
```

---

### 7. task_complete

Mark a task as complete (sets status to `done`).

**Parameters:**
```json
{
  "taskId": "string (required)"
}
```

**Example:**
```json
{
  "taskId": "abc123-def456-..."
}
```

**Response:**
```json
{
  "id": "abc123-def456-...",
  "status": "done",
  "updatedAt": "2025-12-28T...",
  ...
}
```

---

### 8. task_defer

Defer a task to a future date (sets status to `deferred` and updates `startDate`).

**Parameters:**
```json
{
  "taskId": "string (required)",
  "deferTo": "string (ISO 8601 date, required)"
}
```

**Example:**
```json
{
  "taskId": "abc123-def456-...",
  "deferTo": "2025-12-31"
}
```

**Response:**
```json
{
  "id": "abc123-def456-...",
  "status": "deferred",
  "startDate": "2025-12-31",
  "updatedAt": "2025-12-28T...",
  ...
}
```

---

### 9. task_signal_queue

Get top priority tasks (the signal queue). Returns `in_progress` tasks first, then `todo` tasks ordered by priority (1 = highest).

**Parameters:**
```json
{
  "limit": "number (default: 5)"
}
```

**Example:**
```json
{
  "limit": 5
}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "High priority in-progress task",
    "status": "in_progress",
    "priority": 1,
    ...
  },
  {
    "id": "uuid",
    "title": "High priority todo task",
    "status": "todo",
    "priority": 1,
    ...
  }
]
```

**Priority Scoring:**
- `in_progress` tasks appear first
- Then `todo` tasks
- Within each group, sorted by priority (1-5, lower = higher importance)
- Then by creation date (oldest first)

---

### 10. task_backlog

Get backlog tasks (excludes `done` and `deferred` tasks).

**Parameters:**
```json
{
  "categoryId": "string (optional)",
  "limit": "number (default: 50)"
}
```

**Example:**
```json
{
  "categoryId": "work-category-id",
  "limit": 20
}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Backlog task 1",
    "status": "todo",
    "priority": 3,
    ...
  },
  {
    "id": "uuid",
    "title": "Backlog task 2",
    "status": "paused",
    "priority": 4,
    ...
  }
]
```

---

### 11. task_record_work

Record work on a multi-day task (increments `daysWorked`, updates `lastWorkedDate`).

**Parameters:**
```json
{
  "taskId": "string (required)"
}
```

**Example:**
```json
{
  "taskId": "abc123-def456-..."
}
```

**Response:**
```json
{
  "id": "abc123-def456-...",
  "daysWorked": 2,
  "lastWorkedDate": "2025-12-28",
  "updatedAt": "2025-12-28T...",
  ...
}
```

---

## Data Model

### Task Object

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done' | 'paused' | 'deferred';
  priority: number; // 1-5, where 1 is highest priority
  categoryId?: string;
  startDate?: string; // ISO 8601 date
  endDate?: string; // ISO 8601 date
  estimatedDays?: number;
  daysWorked?: number;
  lastWorkedDate?: string; // ISO 8601 date
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}
```

### Database Schema

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  priority INTEGER DEFAULT 3,
  category_id TEXT REFERENCES categories(id),
  start_date TEXT,
  end_date TEXT,
  estimated_days INTEGER,
  days_worked INTEGER DEFAULT 0,
  last_worked_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Note: Database uses `snake_case`, API uses `camelCase`.

---

## Error Handling

All tools return errors in a consistent format:

### Validation Error (Zod)
```json
{
  "error": "Validation error",
  "details": [
    {
      "path": ["priority"],
      "message": "Number must be greater than or equal to 1"
    }
  ]
}
```

### Not Found Error
```json
{
  "error": "Task not found: abc123-def456-..."
}
```

### Database Error
```json
{
  "error": "Database connection failed: ..."
}
```

---

## Implementation Notes

### Architecture Decisions

1. **Validation**: Uses Zod for runtime validation with automatic JSON Schema conversion
2. **Database**: Better-sqlite3 for synchronous SQLite operations
3. **Naming**: snake_case in DB, camelCase in API (automatic conversion)
4. **UUIDs**: Generated client-side using v4 format
5. **Timestamps**: ISO 8601 format for consistency
6. **Priority**: Lower number = higher priority (1 is highest)

### Performance Considerations

1. **Indexing**: Ensure DB has indexes on:
   - `status` (for filtering)
   - `priority` (for signal queue)
   - `category_id` (for category filtering)
   - `created_at` (for ordering)

2. **Limits**: Default limits prevent large result sets:
   - `task_list`: 50 tasks
   - `task_signal_queue`: 5 tasks
   - `task_backlog`: 50 tasks

3. **Connection Management**: Database connections are created per-request (stateless)

### Scaling Considerations

**Current Design (Single User):**
- Synchronous SQLite operations
- No connection pooling needed
- File-based database in user's app data directory

**Future Enhancements:**
- Add pagination for large result sets
- Add sorting options
- Add full-text search on title/description
- Add task dependencies and relationships
- Add task templates
- Add recurring tasks

---

## Usage Examples

### Typical Workflow

```javascript
// 1. Create a task
const task = await task_create({
  title: "Build feature X",
  priority: 1,
  estimatedDays: 3
});

// 2. Start working on it
await task_start({ taskId: task.id });

// 3. Record daily work
await task_record_work({ taskId: task.id });
await task_record_work({ taskId: task.id });

// 4. Complete it
await task_complete({ taskId: task.id });

// 5. View signal queue
const queue = await task_signal_queue({ limit: 5 });
```

### Filtering Tasks

```javascript
// Get all high priority tasks
const highPriority = await task_list({
  priority: 1,
  limit: 20
});

// Get in-progress tasks
const inProgress = await task_list({
  status: "in_progress"
});

// Get tasks in a specific category
const categoryTasks = await task_list({
  categoryId: "work-category-id"
});
```

### Managing Backlog

```javascript
// Get all backlog items
const backlog = await task_backlog({ limit: 100 });

// Filter backlog by category
const workBacklog = await task_backlog({
  categoryId: "work-category-id",
  limit: 50
});
```

---

## Files

- **Implementation**: `/Users/eddiebelaval/Development/milo/packages/mcp-server/src/tools/tasks.ts`
- **Types**: `/Users/eddiebelaval/Development/milo/packages/mcp-server/src/types.ts`
- **Database**: `/Users/eddiebelaval/Development/milo/packages/mcp-server/src/db.ts`
- **Main Server**: `/Users/eddiebelaval/Development/milo/packages/mcp-server/src/index.ts`
