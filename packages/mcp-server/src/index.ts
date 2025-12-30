/**
 * MILO Task Management MCP Server
 *
 * Provides Model Context Protocol server capabilities for managing tasks and projects
 * in the MILO task management system.
 *
 * This server connects to MILO's SQLite database and exposes tools for:
 * - Creating, updating, and deleting tasks
 * - Querying tasks by various filters
 * - Managing categories
 * - Getting task statistics and insights
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getCategoryTools, handleCategoryTool } from './tools/categories.js';
import { getTaskTools, handleTaskTool } from './tools/tasks.js';
import { getGoalTools, handleGoalTool } from './tools/goals.js';
import { getStatsTools, handleStatsTool } from './tools/stats.js';
import { getResources, handleResourceRead } from './resources.js';

/**
 * Initialize the MCP server
 */
const server = new Server(
  {
    name: 'milo',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

/**
 * Handler for listing available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      ...getCategoryTools(),
      ...getTaskTools(),
      ...getGoalTools(),
      ...getStatsTools(),
    ],
  };
});

/**
 * Handler for tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Route to appropriate tool handler
  if (name.startsWith('category_')) {
    return handleCategoryTool(name, args);
  }

  if (name.startsWith('task_')) {
    return handleTaskTool(name, args);
  }

  if (name.startsWith('goal_')) {
    return handleGoalTool(name, args);
  }

  if (name.startsWith('stats_')) {
    return handleStatsTool(name, args);
  }

  throw new Error(`Unknown tool: ${name}`);
});

/**
 * Handler for listing available resources
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: getResources(),
  };
});

/**
 * Handler for reading a resource
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  return await handleResourceRead(uri);
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('MILO MCP Server running on stdio');
  console.error('Version: 1.0.0');
  console.error('Database: ~/Library/Application Support/milo/milo.db');
}

main().catch((error) => {
  console.error('Fatal error starting MILO MCP server:', error);
  process.exit(1);
});
