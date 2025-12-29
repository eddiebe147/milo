# CategoryTabs Component Documentation

## Overview
Horizontal scrollable tab bar for filtering tasks by category in MILO. Features pipboy-green terminal aesthetic with smooth animations and mobile-friendly horizontal scrolling.

## File Location
`/Users/eddiebelaval/Development/milo/src/components/Dashboard/CategoryTabs.tsx`

---

## Features

### Core Functionality
- **"All" tab** - Shows all tasks, always first
- **Category tabs** - One tab per active category
- **Toggle behavior** - Click active tab again to clear filter
- **Task counts** - Badge showing number of incomplete tasks per category
- **Color indicators** - Small colored dot matching category color
- **Horizontal scroll** - Mobile-friendly with hidden scrollbar

### Visual Design
- Terminal aesthetic (monospace font, pipboy-green highlights)
- Active tab: `border-pipboy-green`, `bg-pipboy-green/10`
- Inactive tabs: subtle hover states
- Smooth transitions (200ms)
- Subtle gradient fade on right edge for scroll indication

---

## Usage

### Basic Implementation
```tsx
import { CategoryTabs } from '@/components/Dashboard/CategoryTabs'

function Dashboard() {
  return (
    <div>
      <CategoryTabs />
      {/* Other dashboard components */}
    </div>
  )
}
```

### With Task List Integration
```tsx
import { CategoryTabs } from '@/components/Dashboard/CategoryTabs'
import { TaskList } from '@/components/Dashboard/TaskList'
import { useCategoriesStore, useTasksStore } from '@/stores'

function FilteredTaskView() {
  const { activeFilter } = useCategoriesStore()
  const { allTasks } = useTasksStore()

  // Filter tasks based on active category
  const filteredTasks = activeFilter
    ? allTasks.filter(task => task.categoryId === activeFilter)
    : allTasks

  return (
    <div>
      <CategoryTabs />
      <TaskList tasks={filteredTasks} />
    </div>
  )
}
```

---

## Props
**None** - Component uses Zustand stores directly

---

## Store Integration

### From `useCategoriesStore`:
```typescript
{
  categories: Category[]        // Active categories to display
  activeFilter: string | null   // Currently selected category ID (null = all)
  setActiveFilter: (id: string | null) => void  // Set/clear filter
  fetchCategories: () => Promise<void>          // Load categories on mount
  isLoading: boolean            // Show loading state
}
```

### From `useTasksStore`:
```typescript
{
  allTasks: Task[]  // All incomplete tasks for counting
}
```

---

## Accessibility Checklist

### Implemented
- [x] **Semantic HTML** - Uses `<button>` elements for tabs
- [x] **Keyboard navigation** - All tabs focusable and clickable via keyboard
- [x] **Focus visible** - Browser default focus ring visible
- [x] **Meaningful text** - Clear tab labels ("ALL", category names)
- [x] **Title attributes** - Tooltips on category tabs show name + task count
- [x] **Color not sole indicator** - Task counts and text labels accompany colors

### To Enhance (Future Improvements)
- [ ] **ARIA roles** - Add `role="tablist"` to container, `role="tab"` to buttons
- [ ] **ARIA selected** - `aria-selected={isActive}` on each tab
- [ ] **ARIA controls** - Link tabs to task list via `aria-controls`
- [ ] **ARIA label** - Add `aria-label="Category filter"` to container
- [ ] **Keyboard arrows** - Arrow key navigation between tabs (currently Tab key only)
- [ ] **Screen reader announcements** - Announce filter changes (e.g., "Showing 5 tasks in Work category")
- [ ] **High contrast mode** - Test visibility in system high contrast modes

### Current WCAG Compliance
- **Level A**: Compliant (keyboard accessible, semantic HTML)
- **Level AA**: Mostly compliant (needs ARIA improvements for full compliance)
- **Level AAA**: Partial (color contrast good, but could improve focus indicators)

---

## Performance Considerations

### Optimizations Implemented
1. **useMemo for task counting** - Counts only recalculated when `allTasks` changes
2. **CSS transitions** - Hardware-accelerated (opacity, transform)
3. **No re-renders on scroll** - Scroll handled by CSS, not JS
4. **Lazy fetch** - Categories only fetched on mount, not on every render

### Performance Metrics (Expected)
- **Initial render**: < 50ms
- **Tab click response**: < 16ms (instant visual feedback)
- **Task count recalculation**: O(n) where n = number of tasks (optimized with memoization)

### Potential Bottlenecks
- **Large category lists** (50+ categories): Horizontal scroll still works but may feel cluttered
  - **Mitigation**: Design assumes < 20 categories (typical use case)
- **Large task lists** (1000+ tasks): Task counting in useMemo could slow down
  - **Mitigation**: Consider debouncing or virtualizing if this becomes an issue

### Code Splitting
- Component is small (~200 lines) - no need for lazy loading
- If used only in specific routes, parent can lazy load the entire Dashboard

---

## Styling Details

### Tailwind Classes Used
```css
/* Active tab */
bg-pipboy-green/10
border-pipboy-green
text-pipboy-green
shadow-sm

/* Inactive tab */
bg-pipboy-surface/50
border-pipboy-border
text-pipboy-green-dim
hover:border-pipboy-green/50
hover:text-pipboy-green

/* Transitions */
transition-all duration-200

/* Scrolling */
overflow-x-auto overflow-y-hidden
scrollbar-width: none  /* Firefox */
```

### Custom Styles
```css
/* Webkit scrollbar hiding */
.overflow-x-auto::-webkit-scrollbar {
  display: none;
}

/* Scroll fade gradient */
background: linear-gradient(to left, rgba(10, 10, 10, 0.8), transparent)
```

---

## Browser Compatibility

### Tested/Supported
- Chrome/Edge (Chromium): Full support
- Firefox: Full support
- Safari: Full support
- Mobile Safari: Full support (touch scroll works perfectly)

### Scrollbar Hiding
- Firefox: `scrollbar-width: none` ✅
- Chrome/Safari: `::-webkit-scrollbar { display: none }` ✅
- IE11: `ms-overflow-style: none` ✅ (legacy)

---

## Mobile Responsiveness

### Touch Scroll
- Horizontal swipe works natively (no JS required)
- Momentum scrolling enabled by default
- No horizontal overflow issues

### Small Screens
- Tabs flex-shrink to fit content
- "ALL" tab always visible (leftmost)
- Fade gradient indicates more tabs to the right

### Breakpoints
- **Mobile (< 640px)**: Scroll likely needed, works perfectly
- **Tablet (640-1024px)**: 5-7 tabs visible without scroll
- **Desktop (> 1024px)**: 10+ tabs visible without scroll

---

## Testing Strategy

### Unit Tests (Vitest)
See `CategoryTabs.test.tsx` for full suite:
- Renders "All" tab with correct count
- Renders category tabs with color indicators
- Displays task counts per category
- Toggles active state on click
- Clears filter when clicking active tab again
- Handles empty categories gracefully
- Shows loading state

### Integration Tests (Playwright)
Recommended E2E tests:
```typescript
test('filter tasks by category', async ({ page }) => {
  await page.goto('/dashboard')
  await page.click('button:has-text("Work")')
  await expect(page.locator('.task-list')).toContainText('Work task')
  await expect(page.locator('.task-list')).not.toContainText('Personal task')
})

test('toggle category filter', async ({ page }) => {
  await page.goto('/dashboard')
  await page.click('button:has-text("Work")')  // Activate
  await page.click('button:has-text("Work")')  // Deactivate
  await expect(page.locator('button:has-text("ALL")')).toHaveClass(/border-pipboy-green/)
})
```

### Manual Testing Checklist
- [ ] Click each tab - filter updates correctly
- [ ] Click active tab - filter clears
- [ ] Scroll horizontally - smooth with no jank
- [ ] Add new category - tab appears immediately
- [ ] Delete active category - filter clears automatically
- [ ] Keyboard Tab key - can navigate all tabs
- [ ] Keyboard Enter/Space - activates focused tab
- [ ] Mobile touch - horizontal swipe works smoothly

---

## Known Issues / Limitations

### Current Limitations
1. **No keyboard arrow navigation** - Only Tab key works (Space/Enter to select)
   - **Workaround**: Use Tab key, works fine but less ergonomic
2. **No ARIA tablist role** - Screen readers treat as buttons, not tabs
   - **Impact**: Still accessible, but semantic meaning less clear
3. **Count includes tasks without categories** - "All" tab counts uncategorized tasks
   - **Behavior**: This is intentional - "All" means ALL incomplete tasks

### Edge Cases Handled
- Empty categories list → Shows only "All" tab
- No tasks → Shows categories with zero counts (no badges)
- Active category deleted → Filter auto-clears to "All"
- Very long category names → Truncated with `whitespace-nowrap`

---

## Future Enhancements

### Planned Improvements
1. **Search/Filter categories** - If category list grows beyond 20
2. **Drag to reorder** - Let users sort categories
3. **Right-click menu** - Quick actions (edit, delete, color picker)
4. **Keyboard shortcuts** - `Cmd+1` for first category, etc.
5. **Collapsible groups** - Group categories under meta-categories

### Performance Optimizations
- Virtual scrolling if category count > 50
- Debounced task count updates for very large task lists

---

## Dependencies

### Direct Dependencies
```json
{
  "react": "^18.x",
  "zustand": "^4.x",
  "lucide-react": "^0.x" // (not used in this component, but common in MILO)
}
```

### Store Dependencies
- `useCategoriesStore` from `@/stores`
- `useTasksStore` from `@/stores`

### Type Dependencies
```typescript
import type { Category, Task } from '@/types'
```

---

## Change Log

### v1.0.0 (2025-12-28)
- Initial implementation
- Horizontal scrollable tabs
- Task count badges
- Toggle filter behavior
- Category color indicators
- Loading state
- Full test coverage
