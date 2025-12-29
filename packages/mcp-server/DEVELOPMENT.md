# MCP Server Development Guide

## Architecture Overview

The MILO MCP server follows the Model Context Protocol specification (2025-06-18) and provides task management capabilities through a clean, type-safe interface.

### Structure

```
packages/mcp-server/
├── src/
│   ├── index.ts      # Server initialization and request handlers
│   ├── db.ts         # Database connection management
│   └── types.ts      # TypeScript type definitions
├── dist/             # Compiled JavaScript output (generated)
├── package.json      # Dependencies and scripts
├── tsconfig.json     # TypeScript configuration
└── README.md         # User documentation
```

## Key Components

### 1. Server Initialization (`index.ts`)

The server uses stdio transport for communication with Claude Code:

```typescript
const server = new Server(
  { name: 'milo', version: '1.0.0' },
  { capabilities: { tools: {} } }
);
```

**Important**: All console output must go to `stderr` (using `console.error()`) to avoid interfering with the JSON-RPC protocol on stdout.

### 2. Database Connection (`db.ts`)

Connects to the shared SQLite database at:
```
~/Library/Application Support/milo/milo.db
```

**Critical**:
- The database is shared with the Electron app
- We do NOT create the database - only connect to it
- Foreign keys are enabled for referential integrity
- Connection is read-write (not readonly)

### 3. Type Definitions (`types.ts`)

Full TypeScript interfaces matching the SQLite schema:

- `Task`: All task fields with proper types
- `Category`: Category fields for task organization
- `TaskStatus`: Union type for valid status values

## Development Workflow

### Initial Setup

```bash
npm install
npm run build
```

### Development Mode

```bash
npm run dev
```

This uses `tsx` with watch mode for instant feedback on code changes.

### Building

```bash
npm run build
```

TypeScript compiles to `dist/` with:
- JavaScript output (ES modules)
- Type declarations (.d.ts)
- Source maps for debugging

### Testing Locally

To test the server manually:

```bash
npm start
```

Then send JSON-RPC requests via stdin. Example:

```json
{"jsonrpc":"2.0","id":1,"method":"tools/list"}
```

## Adding New Tools

When adding a new tool, follow this pattern:

### 1. Add Tool Definition

In `index.ts`, update the `ListToolsRequestSchema` handler:

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'my_tool',
        description: 'What this tool does',
        inputSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string', description: 'Parameter description' }
          },
          required: ['param1']
        }
      }
    ]
  };
});
```

### 2. Implement Tool Logic

In the `CallToolRequestSchema` handler:

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'my_tool':
      return await handleMyTool(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});
```

### 3. Add Validation

Use Zod for runtime validation:

```typescript
import { z } from 'zod';

const MyToolArgsSchema = z.object({
  param1: z.string()
});

async function handleMyTool(args: unknown) {
  const validated = MyToolArgsSchema.parse(args);
  // ... implementation
}
```

### 4. Database Operations

```typescript
import { getDatabase } from './db.js';

async function handleMyTool(args: { param1: string }) {
  const db = getDatabase();
  try {
    const result = db.prepare('SELECT * FROM tasks WHERE id = ?').get(args.param1);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  } finally {
    db.close();
  }
}
```

## Best Practices

### Database

- Always close connections in a `finally` block
- Use prepared statements to prevent SQL injection
- Enable foreign keys: `db.pragma('foreign_keys = ON')`
- Transaction support for multi-step operations

### Error Handling

- Throw meaningful errors with context
- Log to stderr, never stdout
- Include the tool name in error messages

### Type Safety

- Use TypeScript strict mode (enabled)
- Validate all inputs with Zod
- Export types for reuse

### Performance

- Connection pooling for high-throughput scenarios
- Prepare statements once, execute many times
- Use indexes on frequently queried columns

## Debugging

### Enable Verbose Logging

During development, add detailed logging to stderr:

```typescript
console.error('Debug: Tool called with args:', JSON.stringify(args, null, 2));
```

### Check Database State

```bash
sqlite3 ~/Library/Application\ Support/milo/milo.db ".schema"
```

### Verify Protocol Communication

Use MCP Inspector or log all JSON-RPC messages:

```typescript
console.error('Received request:', JSON.stringify(request, null, 2));
```

## Next Steps

The scaffold is complete. Next phases:

1. **Task Tools**: Implement CRUD operations for tasks
2. **Category Tools**: Manage task categories
3. **Query Tools**: Advanced filtering and search
4. **Stats Tools**: Analytics and reporting
5. **Batch Operations**: Bulk task updates

## Resources

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [better-sqlite3 Docs](https://github.com/WiseLibs/better-sqlite3)
- [Zod Documentation](https://zod.dev/)
