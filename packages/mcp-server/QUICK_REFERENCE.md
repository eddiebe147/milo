# MILO MCP Server - Quick Reference

## Category Tools Cheat Sheet

### Tool Signatures

```typescript
// Create
category_create({
  name: string,           // required
  color?: string,         // hex format: #RRGGBB
  sortOrder?: number      // integer >= 0
})

// List (no params)
category_list()

// Get
category_get({
  categoryId: string      // UUID
})

// Update
category_update({
  categoryId: string,     // required UUID
  name?: string,
  color?: string,         // hex format: #RRGGBB
  sortOrder?: number      // integer >= 0
})

// Delete
category_delete({
  categoryId: string      // UUID
})

// Reorder
category_reorder({
  orderedIds: string[]    // array of UUIDs
})
```

## Response Pattern

All tools return:
```typescript
{
  content: [{
    type: 'text',
    text: string  // JSON stringified result
  }]
}
```

Result structure:
```typescript
// Success
{
  success: true,
  category?: Category,
  categories?: Category[],
  message?: string,
  count?: number
}

// Error
{
  success: false,
  error: string
}
```

## Category Type

```typescript
interface Category {
  id: string;           // UUID
  name: string;
  color?: string;       // hex color
  sortOrder: number;
  createdAt: string;    // ISO 8601
  updatedAt: string;    // ISO 8601
}
```

## Common Patterns

### Create with auto-ordering
```typescript
category_create({ name: "New Project" })
// sortOrder automatically set to max + 1
```

### Partial update
```typescript
category_update({
  categoryId: "...",
  color: "#FF5733"  // only change color
})
```

### Safe delete
```typescript
category_delete({ categoryId: "..." })
// Tasks keep their data, categoryId set to null
```

### Reorder multiple
```typescript
category_reorder({
  orderedIds: ["id-3", "id-1", "id-2"]
})
// Atomic transaction - all or nothing
```

## Validation Rules

| Field | Rules |
|-------|-------|
| `name` | Required, min 1 character |
| `color` | Optional, must match `#[0-9A-Fa-f]{6}` |
| `sortOrder` | Optional, integer >= 0 |
| `categoryId` | Must be valid UUID |
| `orderedIds` | Array of valid UUIDs, min 1 item |

## Error Messages

| Error Type | Example Message |
|------------|-----------------|
| Validation | `"Color must be a valid hex color (e.g., #FF5733)"` |
| Not Found | `"Category with ID \"...\" not found"` |
| Missing Field | `"Name is required"` |
| No Updates | `"No fields provided to update"` |

## Files Reference

| File | Purpose |
|------|---------|
| `/Users/eddiebelaval/Development/milo/packages/mcp-server/src/tools/categories.ts` | Category tools implementation |
| `/Users/eddiebelaval/Development/milo/packages/mcp-server/src/types.ts` | Type definitions |
| `/Users/eddiebelaval/Development/milo/packages/mcp-server/src/db.ts` | Database connection |
| `/Users/eddiebelaval/Development/milo/packages/mcp-server/src/index.ts` | MCP server setup |

## Database Access

```typescript
import { getDatabase } from '../db.js';

const db = getDatabase();
// Returns better-sqlite3 instance
// Database: ~/Library/Application Support/milo/milo.db
```

## Build Commands

```bash
# Development (watch mode)
npm run dev

# Build TypeScript
npm run build

# Run compiled version
npm start
```

## Adding New Tools

1. Create tool in `src/tools/categories.ts` following existing pattern
2. Add to `getCategoryTools()` array
3. Add case in `handleCategoryTool()` switch
4. Build and test

## Debugging Tips

### Check database directly
```bash
sqlite3 ~/Library/Application\ Support/milo/milo.db
.schema categories
SELECT * FROM categories;
```

### Validate UUID format
```javascript
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

### Check color format
```javascript
const colorRegex = /^#[0-9A-Fa-f]{6}$/;
```

## Common Use Cases

### Setup workspace
```typescript
// Create project categories
category_create({ name: "Frontend", color: "#61DAFB" })
category_create({ name: "Backend", color: "#68A063" })
category_create({ name: "DevOps", color: "#FF6B6B" })

// List to verify
category_list()
```

### Reorganize
```typescript
// Get current state
const result = await category_list()

// Reorder as needed
category_reorder({
  orderedIds: [
    "backend-id",
    "frontend-id",
    "devops-id"
  ]
})
```

### Cleanup
```typescript
// Safe delete - tasks preserved
category_delete({ categoryId: "old-project-id" })
```

## Performance Notes

- All operations use prepared statements
- Reorder uses transaction for atomicity
- No N+1 queries - single SELECT for list
- UUID validation happens before DB access

## Security Notes

- SQL injection prevented via prepared statements
- Input validation before DB operations
- UUID format validation
- No raw SQL string concatenation

## Next Steps

- See `CATEGORY_TOOLS.md` for detailed documentation
- See `IMPLEMENTATION_SUMMARY.md` for architecture overview
- Check task tools for related functionality
