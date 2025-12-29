/**
 * MILO MCP Server - Category Tools
 *
 * Provides tools for managing categories/projects in the MILO system.
 * Categories are used to organize tasks into projects or areas of work.
 */

import { z } from 'zod';
import { getDatabase } from '../db.js';
import type { Category } from '../types.js';
import { randomUUID } from 'crypto';

/**
 * Tool definition interface
 */
export interface CategoryToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Zod schemas for input validation
 */
const CategoryCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)').optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const CategoryGetSchema = z.object({
  categoryId: z.string().uuid('Category ID must be a valid UUID'),
});

const CategoryUpdateSchema = z.object({
  categoryId: z.string().uuid('Category ID must be a valid UUID'),
  name: z.string().min(1, 'Name cannot be empty').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)').optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const CategoryDeleteSchema = z.object({
  categoryId: z.string().uuid('Category ID must be a valid UUID'),
});

const CategoryReorderSchema = z.object({
  orderedIds: z.array(z.string().uuid('All IDs must be valid UUIDs')).min(1, 'Must provide at least one category ID'),
});

/**
 * Utility: Convert database row (snake_case) to TypeScript object (camelCase)
 */
function dbRowToCategory(row: {
  id: string;
  name: string;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color || undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Tool 1: Create a new category
 */
async function categoryCreate(args: unknown): Promise<{ content: { type: 'text'; text: string }[] }> {
  const params = CategoryCreateSchema.parse(args);
  const db = getDatabase();

  try {
    const id = randomUUID();
    const now = new Date().toISOString();

    // If sortOrder not provided, use max+1
    let sortOrder = params.sortOrder;
    if (sortOrder === undefined) {
      const maxResult = db.prepare('SELECT MAX(sort_order) as max_order FROM categories').get() as { max_order: number | null };
      sortOrder = (maxResult.max_order ?? -1) + 1;
    }

    const stmt = db.prepare(`
      INSERT INTO categories (id, name, color, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, params.name, params.color || null, sortOrder, now, now);

    const category: Category = {
      id,
      name: params.name,
      color: params.color,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          category,
          message: `Category "${params.name}" created successfully`,
        }, null, 2),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }, null, 2),
      }],
    };
  }
}

/**
 * Tool 2: List all categories
 */
async function categoryList(): Promise<{ content: { type: 'text'; text: string }[] }> {
  const db = getDatabase();

  try {
    const stmt = db.prepare(`
      SELECT id, name, color, sort_order, created_at, updated_at
      FROM categories
      ORDER BY sort_order ASC
    `);

    const rows = stmt.all() as Array<{
      id: string;
      name: string;
      color: string | null;
      sort_order: number;
      created_at: string;
      updated_at: string;
    }>;

    const categories = rows.map(dbRowToCategory);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          categories,
          count: categories.length,
        }, null, 2),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }, null, 2),
      }],
    };
  }
}

/**
 * Tool 3: Get a single category by ID
 */
async function categoryGet(args: unknown): Promise<{ content: { type: 'text'; text: string }[] }> {
  const params = CategoryGetSchema.parse(args);
  const db = getDatabase();

  try {
    const stmt = db.prepare(`
      SELECT id, name, color, sort_order, created_at, updated_at
      FROM categories
      WHERE id = ?
    `);

    const row = stmt.get(params.categoryId) as {
      id: string;
      name: string;
      color: string | null;
      sort_order: number;
      created_at: string;
      updated_at: string;
    } | undefined;

    if (!row) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Category with ID "${params.categoryId}" not found`,
          }, null, 2),
        }],
      };
    }

    const category = dbRowToCategory(row);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          category,
        }, null, 2),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }, null, 2),
      }],
    };
  }
}

/**
 * Tool 4: Update a category
 */
async function categoryUpdate(args: unknown): Promise<{ content: { type: 'text'; text: string }[] }> {
  const params = CategoryUpdateSchema.parse(args);
  const db = getDatabase();

  try {
    // First check if category exists
    const existsStmt = db.prepare('SELECT id FROM categories WHERE id = ?');
    const exists = existsStmt.get(params.categoryId);

    if (!exists) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Category with ID "${params.categoryId}" not found`,
          }, null, 2),
        }],
      };
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];

    if (params.name !== undefined) {
      updates.push('name = ?');
      values.push(params.name);
    }

    if (params.color !== undefined) {
      updates.push('color = ?');
      values.push(params.color);
    }

    if (params.sortOrder !== undefined) {
      updates.push('sort_order = ?');
      values.push(params.sortOrder);
    }

    if (updates.length === 0) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'No fields provided to update',
          }, null, 2),
        }],
      };
    }

    const now = new Date().toISOString();
    updates.push('updated_at = ?');
    values.push(now);
    values.push(params.categoryId);

    const updateStmt = db.prepare(`
      UPDATE categories
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    updateStmt.run(...values);

    // Fetch updated category
    const selectStmt = db.prepare(`
      SELECT id, name, color, sort_order, created_at, updated_at
      FROM categories
      WHERE id = ?
    `);

    const row = selectStmt.get(params.categoryId) as {
      id: string;
      name: string;
      color: string | null;
      sort_order: number;
      created_at: string;
      updated_at: string;
    };

    const category = dbRowToCategory(row);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          category,
          message: 'Category updated successfully',
        }, null, 2),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }, null, 2),
      }],
    };
  }
}

/**
 * Tool 5: Delete a category
 */
async function categoryDelete(args: unknown): Promise<{ content: { type: 'text'; text: string }[] }> {
  const params = CategoryDeleteSchema.parse(args);
  const db = getDatabase();

  try {
    // First check if category exists
    const existsStmt = db.prepare('SELECT id, name FROM categories WHERE id = ?');
    const category = existsStmt.get(params.categoryId) as { id: string; name: string } | undefined;

    if (!category) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Category with ID "${params.categoryId}" not found`,
          }, null, 2),
        }],
      };
    }

    // Update tasks to remove category reference (set to null instead of cascade delete)
    const updateTasksStmt = db.prepare(`
      UPDATE tasks
      SET category_id = NULL, updated_at = ?
      WHERE category_id = ?
    `);
    const now = new Date().toISOString();
    const updateResult = updateTasksStmt.run(now, params.categoryId);

    // Delete the category
    const deleteStmt = db.prepare('DELETE FROM categories WHERE id = ?');
    deleteStmt.run(params.categoryId);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: `Category "${category.name}" deleted successfully`,
          tasksUpdated: updateResult.changes,
        }, null, 2),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }, null, 2),
      }],
    };
  }
}

/**
 * Tool 6: Reorder categories
 */
async function categoryReorder(args: unknown): Promise<{ content: { type: 'text'; text: string }[] }> {
  const params = CategoryReorderSchema.parse(args);
  const db = getDatabase();

  try {
    const now = new Date().toISOString();

    // Use a transaction to ensure all updates succeed or fail together
    const transaction = db.transaction((orderedIds: string[]) => {
      const updateStmt = db.prepare(`
        UPDATE categories
        SET sort_order = ?, updated_at = ?
        WHERE id = ?
      `);

      for (let i = 0; i < orderedIds.length; i++) {
        const result = updateStmt.run(i, now, orderedIds[i]);

        // Check if category exists
        if (result.changes === 0) {
          throw new Error(`Category with ID "${orderedIds[i]}" not found`);
        }
      }
    });

    transaction(params.orderedIds);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: `Reordered ${params.orderedIds.length} categories`,
          orderedIds: params.orderedIds,
        }, null, 2),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }, null, 2),
      }],
    };
  }
}

/**
 * Get all category tool definitions
 */
export function getCategoryTools(): CategoryToolDefinition[] {
  return [
    {
      name: 'category_create',
      description: 'Create a new category/project for organizing tasks. Categories help group related tasks together.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the category (required)',
          },
          color: {
            type: 'string',
            description: 'Hex color code for the category (e.g., #FF5733). Optional.',
          },
          sortOrder: {
            type: 'number',
            description: 'Sort order for the category. If not provided, will be placed at the end. Optional.',
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'category_list',
      description: 'List all categories, sorted by their sort order. Returns an array of all categories in the system.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'category_get',
      description: 'Get a single category by its ID. Returns full category details.',
      inputSchema: {
        type: 'object',
        properties: {
          categoryId: {
            type: 'string',
            description: 'UUID of the category to retrieve (required)',
          },
        },
        required: ['categoryId'],
      },
    },
    {
      name: 'category_update',
      description: 'Update one or more fields of an existing category. Only provided fields will be updated.',
      inputSchema: {
        type: 'object',
        properties: {
          categoryId: {
            type: 'string',
            description: 'UUID of the category to update (required)',
          },
          name: {
            type: 'string',
            description: 'New name for the category. Optional.',
          },
          color: {
            type: 'string',
            description: 'New hex color code (e.g., #FF5733). Optional.',
          },
          sortOrder: {
            type: 'number',
            description: 'New sort order. Optional.',
          },
        },
        required: ['categoryId'],
      },
    },
    {
      name: 'category_delete',
      description: 'Delete a category. Tasks assigned to this category will have their categoryId set to null (not deleted).',
      inputSchema: {
        type: 'object',
        properties: {
          categoryId: {
            type: 'string',
            description: 'UUID of the category to delete (required)',
          },
        },
        required: ['categoryId'],
      },
    },
    {
      name: 'category_reorder',
      description: 'Reorder all categories by providing an array of category IDs in the desired order. The sort order will be updated based on the position in the array.',
      inputSchema: {
        type: 'object',
        properties: {
          orderedIds: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Array of category UUIDs in the desired order (required)',
          },
        },
        required: ['orderedIds'],
      },
    },
  ];
}

/**
 * Handle category tool calls
 */
export async function handleCategoryTool(
  name: string,
  args: unknown
): Promise<{ content: { type: 'text'; text: string }[] }> {
  switch (name) {
    case 'category_create':
      return categoryCreate(args);
    case 'category_list':
      return categoryList();
    case 'category_get':
      return categoryGet(args);
    case 'category_update':
      return categoryUpdate(args);
    case 'category_delete':
      return categoryDelete(args);
    case 'category_reorder':
      return categoryReorder(args);
    default:
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Unknown category tool: ${name}`,
          }, null, 2),
        }],
      };
  }
}
