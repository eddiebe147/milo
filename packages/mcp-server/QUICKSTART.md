# MILO MCP Server - Quick Start Guide

Get the MILO MCP server running with Claude Desktop in 5 minutes.

## Prerequisites Check

Before starting, ensure you have:

- [ ] Node.js 18 or higher installed (`node --version`)
- [ ] MILO Electron app installed and run at least once
- [ ] Claude Desktop app installed

## Step 1: Build the MCP Server

From the MILO project root:

```bash
cd packages/mcp-server
npm install
npm run build
```

You should see output confirming TypeScript compilation succeeded.

## Step 2: Configure Claude Desktop

### Option A: Per-Project (Recommended for Development)

A `.mcp.json` file has already been created in the project root at:

```
/Users/eddiebelaval/Development/milo/.mcp.json
```

This configuration automatically loads when you open the MILO project in Claude Code.

### Option B: Global (Use Everywhere)

1. Open Claude Desktop configuration:

```bash
open ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

2. Add the MILO server to the `mcpServers` section:

```json
{
  "mcpServers": {
    "milo": {
      "command": "node",
      "args": ["/Users/eddiebelaval/Development/milo/packages/mcp-server/dist/index.js"]
    }
  }
}
```

Replace the path with your actual MILO installation path.

## Step 3: Restart Claude Desktop

Completely quit and restart Claude Desktop for the configuration to take effect.

## Step 4: Verify It Works

1. Open Claude Desktop
2. Look for the hammer icon (MCP tools)
3. Click it to see available tools
4. You should see 17 MILO tools:
   - 11 task tools (task_create, task_list, etc.)
   - 6 category tools (category_create, category_list, etc.)

## Step 5: Try Your First Command

In Claude Desktop, try:

```
Create a task called "Test MCP integration" with priority 1
```

Claude should create the task and show you the result. You can verify it in the MILO Electron app.

## Troubleshooting

### No tools appearing?

- Did you build the server? (`npm run build`)
- Did you restart Claude Desktop?
- Check the path in your config is correct
- Look for errors in Claude's developer console

### Database errors?

- Run the MILO Electron app at least once to create the database
- Check database exists: `ls ~/Library/Application\ Support/milo/milo.db`

### Still not working?

Run the server manually to see errors:

```bash
cd packages/mcp-server
node dist/index.js
```

It should output:
```
MILO MCP Server running on stdio
Version: 1.0.0
Database: ~/Library/Application Support/milo/milo.db
```

Press Ctrl+C to stop.

## Next Steps

- Read the [full README](./README.md) for all available tools
- Try natural language commands in Claude
- Explore task lifecycle management (start, complete, defer)
- Create categories to organize your tasks

## Common Commands to Try

```
Show me my signal queue

List all tasks

Create a category called "Personal Projects" with color #FF5733

What tasks are in progress?

Mark task [id] as complete

Defer this task to next Monday
```

## Need Help?

See the [full documentation](./README.md) or check:

- MILO Project: https://github.com/id8labs/milo
- MCP Protocol: https://modelcontextprotocol.io
