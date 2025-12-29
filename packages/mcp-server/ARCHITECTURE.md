# MILO MCP Server - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      MCP Client                              │
│                  (Claude, etc.)                              │
└───────────────────────────┬─────────────────────────────────┘
                            │ MCP Protocol (stdio)
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    MCP Server (index.ts)                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ListToolsRequestSchema Handler                     │   │
│  │  - getCategoryTools()                               │   │
│  │  - getTaskTools()                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  CallToolRequestSchema Handler                      │   │
│  │  - Route to handleCategoryTool()                    │   │
│  │  - Route to handleTaskTool()                        │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────▼──────────┐                 ┌──────────▼────────┐
│  Category Tools  │                 │    Task Tools     │
│ (categories.ts)  │                 │   (tasks.ts)      │
│                  │                 │                   │
│ - create         │                 │ - create          │
│ - list           │                 │ - list            │
│ - get            │                 │ - get             │
│ - update         │                 │ - update          │
│ - delete         │                 │ - delete          │
│ - reorder        │                 │ - complete        │
└───────┬──────────┘                 └──────────┬────────┘
        │                                       │
        │         ┌────────────┐                │
        └─────────► Database   ◄────────────────┘
                  │  (db.ts)   │
                  └──────┬─────┘
                         │
                         │ better-sqlite3
                         │
            ┌────────────▼─────────────┐
            │   SQLite Database        │
            │  ~/Library/Application   │
            │  Support/milo/milo.db    │
            │                          │
            │  ┌────────────────────┐  │
            │  │   categories       │  │
            │  │  - id              │  │
            │  │  - name            │  │
            │  │  - color           │  │
            │  │  - sort_order      │  │
            │  │  - created_at      │  │
            │  │  - updated_at      │  │
            │  └────────────────────┘  │
            │                          │
            │  ┌────────────────────┐  │
            │  │   tasks            │  │
            │  │  - id              │  │
            │  │  - title           │  │
            │  │  - category_id ────┼──┘ (FK)
            │  │  - status          │
            │  │  - priority        │
            │  │  - ...             │
            │  └────────────────────┘
            └──────────────────────────┘
```

## Layer Responsibilities

### Layer 1: MCP Server (index.ts)
**Responsibility:** Protocol handling and routing

- Implements MCP protocol via SDK
- Registers tools from all modules
- Routes tool calls to appropriate handlers
- Runs on stdio transport

**Key Functions:**
- `ListToolsRequestSchema` handler: Aggregates tool definitions
- `CallToolRequestSchema` handler: Routes to tool handlers

### Layer 2: Tool Modules (categories.ts, tasks.ts)
**Responsibility:** Business logic and validation

- Define tool schemas (input/output)
- Validate inputs with Zod
- Execute business logic
- Format responses
- Handle errors gracefully

**Category Tools Functions:**
- `getCategoryTools()`: Returns tool definitions
- `handleCategoryTool()`: Routes to specific tool
- `categoryCreate()`: Creates new category
- `categoryList()`: Lists all categories
- `categoryGet()`: Fetches single category
- `categoryUpdate()`: Updates category fields
- `categoryDelete()`: Deletes category safely
- `categoryReorder()`: Reorders all categories

**Helper Functions:**
- `dbRowToCategory()`: Converts DB row to TypeScript object

### Layer 3: Database (db.ts)
**Responsibility:** Database connection management

- Provides database connection via `getDatabase()`
- Configures SQLite (foreign keys, readonly, etc.)
- Manages database lifecycle
- Validates database file exists

### Layer 4: Types (types.ts)
**Responsibility:** Shared type definitions

- `Category` interface
- `Task` interface
- `TaskStatus` type
- Ensures type consistency across modules

## Data Flow: Create Category Example

```
1. MCP Client
   └─> Calls: category_create({ name: "Work", color: "#FF5733" })

2. MCP Server (index.ts)
   └─> CallToolRequestSchema handler receives request
   └─> Routes to handleCategoryTool("category_create", args)

3. Category Tools (categories.ts)
   └─> handleCategoryTool() routes to categoryCreate()
   └─> CategoryCreateSchema.parse(args)  // Zod validation
   └─> getDatabase() to get DB connection
   └─> Generate UUID
   └─> Calculate sortOrder (max + 1)
   └─> Execute INSERT INTO categories
   └─> Return success response with category object

4. Response flows back up
   └─> MCP Server sends response to client
   └─> Client receives formatted JSON
```

## Error Handling Flow

```
Error occurs at any layer
    │
    ├─> Validation Error (Zod)
    │   └─> Caught in try-catch
    │   └─> Return { success: false, error: "validation message" }
    │
    ├─> Database Error
    │   └─> Caught in try-catch
    │   └─> Return { success: false, error: "db error message" }
    │
    └─> Unknown Error
        └─> Caught in try-catch
        └─> Return { success: false, error: "Unknown error occurred" }

All errors return consistent format:
{
  content: [{
    type: 'text',
    text: JSON.stringify({ success: false, error: "..." })
  }]
}
```

## File Organization

```
/Users/eddiebelaval/Development/milo/packages/mcp-server/
├── src/
│   ├── index.ts           # MCP server setup & routing
│   ├── db.ts              # Database connection
│   ├── types.ts           # Shared types
│   └── tools/
│       ├── categories.ts  # Category tools (600 lines)
│       └── tasks.ts       # Task tools
├── dist/                  # Compiled JavaScript
├── package.json           # Dependencies & scripts
├── tsconfig.json          # TypeScript config
├── CATEGORY_TOOLS.md      # Category tools documentation
├── IMPLEMENTATION_SUMMARY.md  # Implementation overview
├── QUICK_REFERENCE.md     # Developer cheat sheet
└── ARCHITECTURE.md        # This file
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Protocol | MCP SDK | Model Context Protocol implementation |
| Runtime | Node.js | JavaScript runtime |
| Language | TypeScript | Type-safe development |
| Database | better-sqlite3 | SQLite database driver |
| Validation | Zod | Runtime type validation & parsing |
| Transport | stdio | Communication channel |

## Design Patterns

### 1. Repository Pattern
Each tool module (categories, tasks) acts as a repository for its entity type, encapsulating all data access logic.

### 2. Command Pattern
Each tool is a command with:
- Input schema (what it accepts)
- Handler function (what it does)
- Output format (what it returns)

### 3. Factory Pattern
`getCategoryTools()` and `getTaskTools()` are factories that produce tool definitions.

### 4. Strategy Pattern
`handleCategoryTool()` uses a switch statement to select the appropriate strategy (tool handler) based on the tool name.

### 5. Builder Pattern
Zod schemas build validation rules declaratively.

## Scalability Considerations

### Horizontal Scaling
- MCP server is stateless
- Each request is independent
- No shared state between tool calls
- Can run multiple instances

### Vertical Scaling
- SQLite single-threaded by design
- Better-sqlite3 is synchronous (no async overhead)
- Prepared statements for performance
- Indexes on key columns (id, sort_order)

### Adding New Tools
1. Create function following existing pattern
2. Add Zod schema for validation
3. Add to `getXxxTools()` array
4. Add case to `handleXxxTool()` switch
5. No changes needed to index.ts (routing is prefix-based)

### Adding New Modules
1. Create `src/tools/newmodule.ts`
2. Export `getNewModuleTools()` and `handleNewModuleTool()`
3. Import in `index.ts`
4. Add to tools array in ListToolsRequestSchema
5. Add routing in CallToolRequestSchema

## Database Design

### Categories Table
```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,           -- UUID
  name TEXT NOT NULL,            -- Category name
  color TEXT,                    -- Hex color (#RRGGBB)
  sort_order INTEGER DEFAULT 0,  -- Display order
  created_at TEXT NOT NULL,      -- ISO 8601 timestamp
  updated_at TEXT NOT NULL       -- ISO 8601 timestamp
);

CREATE INDEX idx_categories_sort_order ON categories(sort_order);
```

### Tasks Table (Reference)
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category_id TEXT,              -- FK to categories.id
  status TEXT NOT NULL,
  priority INTEGER DEFAULT 3,
  -- ... other fields ...
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE INDEX idx_tasks_category_id ON tasks(category_id);
```

### Relationship
- One-to-Many: Category → Tasks
- Soft delete: Deleting category sets task.category_id to NULL
- No cascade delete to preserve task data

## Transaction Strategy

### Single-Row Operations
No transaction needed:
- `category_create`
- `category_get`
- `category_update`
- `category_delete`

### Multi-Row Operations
Transaction required:
- `category_reorder`: Updates multiple rows atomically
  - Uses `db.transaction()` from better-sqlite3
  - Either all updates succeed or all fail
  - No partial reordering

### Consistency Guarantees
- SQLite provides ACID guarantees
- Foreign keys enforced (`PRAGMA foreign_keys = ON`)
- Prepared statements prevent SQL injection

## Security Considerations

### Input Validation
- All inputs validated with Zod before DB access
- UUID format validation
- Hex color format validation
- String length limits
- Type coercion prevented

### SQL Injection Prevention
- Always use prepared statements
- Never concatenate user input into SQL
- Parameterized queries only

### Error Messages
- Don't expose internal DB structure
- Generic errors for security issues
- Detailed errors only for validation

### Access Control
- Currently no authentication (single-user system)
- Database file permissions rely on OS
- Future: Add auth middleware if needed

## Performance Optimization

### Database
- Prepared statements cached by better-sqlite3
- Indexes on frequently queried columns
- Synchronous API (no async overhead)
- WAL mode for better concurrency (can be enabled)

### Validation
- Zod schemas compiled once at module load
- Fast runtime validation
- Early exit on validation failure

### Response Size
- Return only necessary fields
- Use pagination for large lists (future)
- JSON stringify only once per response

## Testing Strategy

### Unit Tests (Recommended)
- Test each tool function in isolation
- Mock database with in-memory SQLite
- Validate Zod schemas
- Test error conditions

### Integration Tests (Recommended)
- Test full MCP request/response cycle
- Use test database
- Verify database state after operations
- Test transactions rollback

### Example Test Cases
```typescript
// category_create
- Creates with valid data
- Auto-assigns sortOrder
- Rejects invalid color
- Rejects empty name

// category_update
- Updates single field
- Updates multiple fields
- Rejects non-existent ID
- Rejects no fields to update

// category_delete
- Deletes successfully
- Updates related tasks
- Returns task count
- Handles non-existent ID

// category_reorder
- Reorders all categories
- Uses transaction
- Rolls back on invalid ID
- Updates sortOrder correctly
```

## Future Enhancements

### Category Tools
- [ ] Bulk operations (create/update/delete multiple)
- [ ] Category statistics (task count, completion rate)
- [ ] Category templates
- [ ] Category archiving (soft delete)
- [ ] Category search/filter
- [ ] Category duplication

### Infrastructure
- [ ] Caching layer (Redis/in-memory)
- [ ] Audit logging
- [ ] Webhooks on category changes
- [ ] Real-time sync with Electron app
- [ ] Migration system for schema changes

### API Improvements
- [ ] Pagination for large lists
- [ ] Sorting options
- [ ] Field selection (sparse fieldsets)
- [ ] Bulk validation improvements
- [ ] Rate limiting

## Monitoring & Observability

### Recommended Metrics
- Tool call frequency
- Error rate by tool
- Database query duration
- Response size distribution
- Validation failure rate

### Logging Strategy
- Log all errors with context
- Log slow queries (>100ms)
- Log validation failures
- Structured logging (JSON format)

### Health Checks
- Database connection status
- File system access
- Tool registration status
