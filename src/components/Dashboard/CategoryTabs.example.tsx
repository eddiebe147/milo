/**
 * CategoryTabs Usage Examples
 *
 * This file demonstrates various ways to integrate CategoryTabs
 * into your MILO dashboard components.
 */

import React from 'react'
import { CategoryTabs } from './CategoryTabs'
import { useCategoriesStore, useTasksStore } from '@/stores'

// ============================================================================
// Example 1: Basic Usage
// ============================================================================
export function BasicCategoryTabsExample() {
  return (
    <div className="space-y-4">
      <h2 className="text-pipboy-green font-mono text-sm">CATEGORY FILTER</h2>
      <CategoryTabs />
    </div>
  )
}

// ============================================================================
// Example 2: With Filtered Task List
// ============================================================================
export function FilteredTaskListExample() {
  const { activeFilter } = useCategoriesStore()
  const { allTasks } = useTasksStore()

  // Filter tasks based on active category
  const filteredTasks = activeFilter
    ? allTasks.filter(task => task.categoryId === activeFilter && task.status !== 'completed')
    : allTasks.filter(task => task.status !== 'completed')

  return (
    <div className="space-y-3">
      {/* Category filter tabs */}
      <CategoryTabs />

      {/* Filtered task list */}
      <div className="border border-pipboy-border rounded-sm">
        <div className="p-3 border-b border-pipboy-border">
          <span className="text-sm font-bold text-pipboy-green tracking-wide">
            {activeFilter ? 'FILTERED TASKS' : 'ALL TASKS'}
          </span>
          <span className="ml-2 text-xs text-pipboy-green-dim">
            ({filteredTasks.length})
          </span>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="p-4 text-center text-pipboy-green-dim">
            <p className="text-xs">No tasks found</p>
          </div>
        ) : (
          <ul className="divide-y divide-pipboy-border/50">
            {filteredTasks.map(task => (
              <li key={task.id} className="px-3 py-2 text-sm text-pipboy-green">
                {task.title}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Example 3: With Clear Filter Button
// ============================================================================
export function CategoryTabsWithClearButton() {
  const { activeFilter, setActiveFilter, categories } = useCategoriesStore()

  const activeCategoryName = categories.find(c => c.id === activeFilter)?.name

  return (
    <div className="space-y-2">
      <CategoryTabs />

      {/* Active filter indicator with clear button */}
      {activeFilter && (
        <div className="flex items-center justify-between px-2 py-1 bg-pipboy-surface/30 rounded-sm border border-pipboy-border/50">
          <span className="text-xs text-pipboy-green-dim font-mono">
            Showing: <span className="text-pipboy-green">{activeCategoryName}</span>
          </span>
          <button
            onClick={() => setActiveFilter(null)}
            className="text-xs text-pipboy-green-dim hover:text-pipboy-red transition-colors"
          >
            Clear filter
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Example 4: Dashboard Layout with CategoryTabs
// ============================================================================
export function DashboardWithCategoryTabs() {
  const { activeFilter, categories } = useCategoriesStore()
  const { allTasks } = useTasksStore()

  const filteredTasks = activeFilter
    ? allTasks.filter(t => t.categoryId === activeFilter && t.status !== 'completed')
    : allTasks.filter(t => t.status !== 'completed')

  const activeCategory = categories.find(c => c.id === activeFilter)

  return (
    <div className="min-h-screen bg-pipboy-bg p-4">
      {/* Header */}
      <header className="mb-4">
        <h1 className="text-2xl font-mono font-bold text-pipboy-green mb-2">
          MILO DASHBOARD
        </h1>

        {/* Category filter tabs */}
        <CategoryTabs />
      </header>

      {/* Main content */}
      <main className="grid gap-4">
        {/* Filter status */}
        <div className="border border-pipboy-border rounded-sm p-3 bg-pipboy-surface/50">
          <div className="flex items-center gap-2">
            {activeCategory && (
              <>
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: activeCategory.color }}
                />
                <span className="text-sm font-mono text-pipboy-green">
                  {activeCategory.name}
                </span>
                <span className="text-xs text-pipboy-green-dim">
                  ({filteredTasks.length} tasks)
                </span>
              </>
            )}
            {!activeCategory && (
              <>
                <span className="text-sm font-mono text-pipboy-green">
                  All Categories
                </span>
                <span className="text-xs text-pipboy-green-dim">
                  ({filteredTasks.length} tasks)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Task list */}
        <div className="border border-pipboy-border rounded-sm">
          <div className="p-3 border-b border-pipboy-border">
            <span className="text-sm font-bold text-pipboy-green tracking-wide">
              TASKS
            </span>
          </div>
          <div className="divide-y divide-pipboy-border/50 max-h-96 overflow-y-auto">
            {filteredTasks.map(task => (
              <div key={task.id} className="px-3 py-2">
                <p className="text-sm text-pipboy-green">{task.title}</p>
                {task.description && (
                  <p className="text-xs text-pipboy-green-dim mt-1">
                    {task.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

// ============================================================================
// Example 5: Programmatic Filter Control
// ============================================================================
export function ProgrammaticCategoryControl() {
  const { categories, activeFilter, setActiveFilter } = useCategoriesStore()

  // Example: Auto-select first category on mount
  React.useEffect(() => {
    if (categories.length > 0 && !activeFilter) {
      // Optionally auto-select first category
      // setActiveFilter(categories[0].id)
    }
  }, [categories, activeFilter, setActiveFilter])

  return (
    <div className="space-y-3">
      <CategoryTabs />

      {/* Programmatic controls */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveFilter(null)}
          className="px-2 py-1 text-xs border border-pipboy-border text-pipboy-green-dim hover:text-pipboy-green rounded-sm"
        >
          Reset filter
        </button>

        {categories.slice(0, 3).map(category => (
          <button
            key={category.id}
            onClick={() => setActiveFilter(category.id)}
            className="px-2 py-1 text-xs border border-pipboy-border text-pipboy-green-dim hover:text-pipboy-green rounded-sm"
          >
            Select {category.name}
          </button>
        ))}
      </div>

      {/* Active filter display */}
      <div className="text-xs font-mono text-pipboy-green-dim">
        Active filter: {activeFilter || 'None'}
      </div>
    </div>
  )
}

// ============================================================================
// Example 6: Mobile-Optimized Layout
// ============================================================================
export function MobileCategoryTabsExample() {
  return (
    <div className="max-w-md mx-auto p-2 space-y-3">
      {/* Sticky header with tabs */}
      <div className="sticky top-0 bg-pipboy-bg z-10 pb-2 border-b border-pipboy-border">
        <h2 className="text-sm font-mono font-bold text-pipboy-green mb-2">
          FILTERS
        </h2>
        <CategoryTabs />
      </div>

      {/* Scrollable content */}
      <div className="space-y-2">
        {/* Content goes here */}
        <div className="border border-pipboy-border rounded-sm p-3">
          <p className="text-xs text-pipboy-green-dim">
            Swipe horizontally on the category tabs above to see more categories.
          </p>
        </div>
      </div>
    </div>
  )
}
