import React, { useEffect, useMemo } from 'react'
import { useCategoriesStore, useTasksStore } from '@/stores'

/**
 * CategoryTabs - Horizontal scrollable filter tabs for task categories
 *
 * Features:
 * - "All" tab + one tab per active category
 * - Active tab highlighted with pipboy-green border/background
 * - Click active tab again to clear filter (toggle behavior)
 * - Category color indicator dot on each tab
 * - Task count badge for each category
 * - Horizontal scroll with hidden scrollbar (mobile-friendly)
 *
 * Usage:
 * <CategoryTabs />
 *
 * State management:
 * - Reads categories from useCategoriesStore
 * - Sets activeFilter via setActiveFilter(categoryId | null)
 * - Counts tasks per category from useTasksStore
 */
export const CategoryTabs: React.FC = () => {
  const {
    categories,
    activeFilter,
    setActiveFilter,
    fetchCategories,
    isLoading,
  } = useCategoriesStore()

  const { allTasks } = useTasksStore()

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Calculate task counts per category
  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {}

    // Count all incomplete tasks
    const incompleteTasks = allTasks.filter(t => t.status !== 'completed')

    incompleteTasks.forEach(task => {
      if (task.categoryId) {
        counts[task.categoryId] = (counts[task.categoryId] || 0) + 1
      }
    })

    return counts
  }, [allTasks])

  // Total task count for "All" tab
  const totalTaskCount = allTasks.filter(t => t.status !== 'completed').length

  // Handle tab click - toggle behavior if clicking active tab
  const handleTabClick = (categoryId: string | null) => {
    if (activeFilter === categoryId) {
      // Clicking active tab clears the filter
      setActiveFilter(null)
    } else {
      setActiveFilter(categoryId)
    }
  }

  // Show loading state briefly
  if (isLoading && categories.length === 0) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-pipboy-green-dim">
        <div className="w-2 h-2 rounded-full bg-pipboy-green-dim animate-pulse" />
        <span className="text-xs font-mono">Loading categories...</span>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Horizontal scroll container - hide scrollbar but keep functionality */}
      <div
        className="flex gap-2 overflow-x-auto overflow-y-hidden pb-1 px-2"
        style={{
          // Hide scrollbar for all browsers
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
        }}
      >
        {/* CSS to hide webkit scrollbar */}
        <style>{`
          .overflow-x-auto::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {/* "All" tab */}
        <button
          onClick={() => handleTabClick(null)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-sm
            font-mono text-xs whitespace-nowrap
            border transition-all duration-200
            flex-shrink-0
            ${activeFilter === null
              ? 'bg-pipboy-green/10 border-pipboy-green text-pipboy-green shadow-sm'
              : 'bg-pipboy-surface/50 border-pipboy-border text-pipboy-green-dim hover:border-pipboy-green/50 hover:text-pipboy-green'
            }
          `}
        >
          <span className="font-bold tracking-wide">ALL</span>
          {totalTaskCount > 0 && (
            <span className={`
              text-[10px] px-1.5 py-0.5 rounded-sm
              ${activeFilter === null
                ? 'bg-pipboy-green/20 text-pipboy-green'
                : 'bg-pipboy-surface text-pipboy-green-dim'
              }
            `}>
              {totalTaskCount}
            </span>
          )}
        </button>

        {/* Category tabs */}
        {categories.map(category => {
          const count = taskCounts[category.id] || 0
          const isActive = activeFilter === category.id

          return (
            <button
              key={category.id}
              onClick={() => handleTabClick(category.id)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-sm
                font-mono text-xs whitespace-nowrap
                border transition-all duration-200
                flex-shrink-0
                ${isActive
                  ? 'bg-pipboy-green/10 border-pipboy-green text-pipboy-green shadow-sm'
                  : 'bg-pipboy-surface/50 border-pipboy-border text-pipboy-green-dim hover:border-pipboy-green/50 hover:text-pipboy-green'
                }
              `}
              title={`${category.name}${count > 0 ? ` (${count} tasks)` : ''}`}
            >
              {/* Category color indicator */}
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: category.color }}
              />

              {/* Category name */}
              <span className="tracking-wide">{category.name}</span>

              {/* Task count badge */}
              {count > 0 && (
                <span className={`
                  text-[10px] px-1.5 py-0.5 rounded-sm
                  ${isActive
                    ? 'bg-pipboy-green/20 text-pipboy-green'
                    : 'bg-pipboy-surface text-pipboy-green-dim'
                  }
                `}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Subtle fade effect on right edge to indicate scrollability */}
      {categories.length > 0 && (
        <div
          className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none"
          style={{
            background: 'linear-gradient(to left, rgba(10, 10, 10, 0.8), transparent)'
          }}
        />
      )}
    </div>
  )
}
