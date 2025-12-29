# Category Tools Documentation

This document describes the 6 category management tools implemented for the MILO MCP Server.

## Implementation Details

**File:** `/Users/eddiebelaval/Development/milo/packages/mcp-server/src/tools/categories.ts`

All tools follow these patterns:
- Use Zod for input validation with clear error messages
- Return structured JSON responses with `success` flag
- Convert between database snake_case and TypeScript camelCase
- Include timestamps and proper error handling
- Use transactions where appropriate (e.g., reordering)

## Tools

### 1. category_create

Create a new category/project for organizing tasks.

**Parameters:**
- `name` (required): Name of the category
- `color` (optional): Hex color code (e.g., `#FF5733`)
- `sortOrder` (optional): Sort order. If not provided, defaults to max+1

**Example Request:**
```json
{
  "name": "Q1 2024 Goals",
  "color": "#4CAF50",
  "sortOrder": 0
}
```

**Example Response:**
```json
{
  "success": true,
  "category": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Q1 2024 Goals",
    "color": "#4CAF50",
    "sortOrder": 0,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Category \"Q1 2024 Goals\" created successfully"
}
```

---

### 2. category_list

List all categories sorted by their sort order.

**Parameters:** None

**Example Response:**
```json
{
  "success": true,
  "categories": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Q1 2024 Goals",
      "color": "#4CAF50",
      "sortOrder": 0,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Personal Projects",
      "color": "#2196F3",
      "sortOrder": 1,
      "createdAt": "2024-01-16T11:00:00.000Z",
      "updatedAt": "2024-01-16T11:00:00.000Z"
    }
  ],
  "count": 2
}
```

---

### 3. category_get

Get a single category by its ID.

**Parameters:**
- `categoryId` (required): UUID of the category

**Example Request:**
```json
{
  "categoryId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Example Response:**
```json
{
  "success": true,
  "category": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Q1 2024 Goals",
    "color": "#4CAF50",
    "sortOrder": 0,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Category with ID \"550e8400-e29b-41d4-a716-446655440000\" not found"
}
```

---

### 4. category_update

Update one or more fields of an existing category. Only provided fields are updated.

**Parameters:**
- `categoryId` (required): UUID of the category to update
- `name` (optional): New name
- `color` (optional): New hex color code
- `sortOrder` (optional): New sort order

**Example Request:**
```json
{
  "categoryId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Q1 2024 Priorities",
  "color": "#FF5722"
}
```

**Example Response:**
```json
{
  "success": true,
  "category": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Q1 2024 Priorities",
    "color": "#FF5722",
    "sortOrder": 0,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T12:45:00.000Z"
  },
  "message": "Category updated successfully"
}
```

---

### 5. category_delete

Delete a category. Tasks assigned to this category will have their `categoryId` set to null (they are NOT deleted).

**Parameters:**
- `categoryId` (required): UUID of the category to delete

**Example Request:**
```json
{
  "categoryId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Category \"Q1 2024 Goals\" deleted successfully",
  "tasksUpdated": 5
}
```

**Important:** This operation:
1. Sets `categoryId = NULL` for all tasks in this category
2. Updates the `updatedAt` timestamp on affected tasks
3. Deletes the category
4. Returns the number of tasks that were updated

---

### 6. category_reorder

Reorder all categories by providing an array of category IDs in the desired order.

**Parameters:**
- `orderedIds` (required): Array of category UUIDs in the desired order

**Example Request:**
```json
{
  "orderedIds": [
    "660e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440000",
    "770e8400-e29b-41d4-a716-446655440002"
  ]
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Reordered 3 categories",
  "orderedIds": [
    "660e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440000",
    "770e8400-e29b-41d4-a716-446655440002"
  ]
}
```

**Important:**
- Uses a database transaction to ensure atomicity
- If any category ID doesn't exist, the entire operation is rolled back
- The `sortOrder` is set to the index position in the array (0, 1, 2, etc.)

---

## Database Schema

The `categories` table structure:

```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## Error Handling

All tools return consistent error responses:

```json
{
  "success": false,
  "error": "Detailed error message here"
}
```

Common error types:
- **Validation errors**: Invalid input (e.g., invalid UUID, invalid hex color)
- **Not found errors**: Category doesn't exist
- **Database errors**: Connection or query failures

## Architecture Notes

### Snake_case ↔ CamelCase Conversion

The `dbRowToCategory()` utility function handles conversion:
- Database columns: `sort_order`, `created_at`, `updated_at`
- TypeScript properties: `sortOrder`, `createdAt`, `updatedAt`

### Transaction Safety

The `category_reorder` tool uses SQLite transactions to ensure:
- All updates succeed or all fail (atomic operation)
- No partial reordering if an error occurs
- Immediate validation of category IDs

### Soft Delete Pattern

`category_delete` doesn't cascade delete tasks. Instead:
- Tasks are preserved
- Task `categoryId` is set to NULL
- Tasks can be reassigned to new categories later

This prevents accidental data loss and maintains task history.

## Integration

The tools are integrated into the main MCP server via:

1. **Tool Registration** (`src/index.ts`):
```typescript
import { getCategoryTools, handleCategoryTool } from './tools/categories.js';

// In ListToolsRequestSchema handler:
tools: [...getCategoryTools()]
```

2. **Tool Routing** (`src/index.ts`):
```typescript
// In CallToolRequestSchema handler:
if (name.startsWith('category_')) {
  return handleCategoryTool(name, args);
}
```

## Future Enhancements

Potential improvements:
- Bulk operations (create/update/delete multiple categories)
- Category statistics (task counts, completion rates)
- Category search/filter
- Category templates
- Category archiving (soft delete for categories too)
