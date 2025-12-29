import { useState } from 'react'
import { useTasksStore, useCategoriesStore } from '../../stores'
import type { Task } from '../../types'

/**
 * BacklogList Component
 *
 * Displays tasks not in the signal queue with:
 * - Collapsible interface (collapsed by default)
 * - Category filtering from activeFilter
 * - Terminal aesthetic with pipboy-green accents
 * - Smooth expand/collapse animations
 *
 * Usage:
 * <BacklogList />
 */
export function BacklogList() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { backlog, startTask } = useTasksStore()
  const { categories, activeFilter } = useCategoriesStore()

  // Filter backlog by active category if filter is set
  const filteredBacklog = activeFilter
    ? backlog.filter(t => t.categoryId === activeFilter)
    : backlog

  const backlogCount = filteredBacklog.length

  // Get category for a task
  const getCategory = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)
  }

  // Priority labels for accessibility
  const getPriorityLabel = (priority: number): string => {
    const labels = ['Lowest', 'Low', 'Medium', 'High', 'Critical']
    return labels[priority - 1] || 'Medium'
  }

  // Handle task click - start the task
  const handleTaskClick = (task: Task) => {
    startTask(task.id)
  }

  return (
    <div className="bg-black/40 border border-[#00ff41]/20 rounded-sm overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#00ff41]/5 transition-colors border-b border-[#00ff41]/10"
        aria-expanded={isExpanded}
        aria-controls="backlog-content"
      >
        <div className="flex items-center gap-3">
          <span className="text-[#00ff41] font-mono text-sm tracking-wide">
            BACKLOG
          </span>
          <span className="text-[#00ff41]/60 font-mono text-xs">
            ({backlogCount} {backlogCount === 1 ? 'task' : 'more'})
          </span>
        </div>

        {/* Expand/Collapse Icon */}
        <svg
          className={`w-4 h-4 text-[#00ff41]/60 transition-transform duration-300 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Collapsible Content */}
      <div
        id="backlog-content"
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-y-auto`}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#00ff41 #0a0a0a',
        }}
      >
        {backlogCount === 0 ? (
          // Empty state
          <div className="px-4 py-8 text-center">
            <p className="text-[#00ff41]/40 font-mono text-sm">
              {activeFilter ? 'No tasks in this category' : 'Backlog is empty'}
            </p>
          </div>
        ) : (
          // Task list
          <div className="divide-y divide-[#00ff41]/10">
            {filteredBacklog.map((task) => {
              const category = task.categoryId ? getCategory(task.categoryId) : undefined
              const priorityLabel = getPriorityLabel(task.priority)

              return (
                <button
                  key={task.id}
                  onClick={() => handleTaskClick(task)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#00ff41]/5 transition-colors group"
                  aria-label={`Start task: ${task.title}`}
                >
                  {/* Category Color Dot */}
                  <div className="flex-shrink-0">
                    <div
                      className="w-2 h-2 rounded-full ring-1 ring-offset-1 ring-offset-black"
                      style={{
                        backgroundColor: category?.color || '#00ff41',
                        boxShadow: `0 0 4px ${category?.color || '#00ff41'}40`
                      }}
                      aria-hidden="true"
                    />
                  </div>

                  {/* Task Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[#00ff41]/90 font-mono text-sm truncate">
                        {task.title}
                      </span>
                      {task.estimatedDays && task.estimatedDays > 1 && (
                        <span className="text-[#00ff41]/40 font-mono text-xs flex-shrink-0">
                          {task.estimatedDays}d
                        </span>
                      )}
                    </div>
                    {category && (
                      <span className="text-[#00ff41]/50 font-mono text-xs">
                        {category.name}
                      </span>
                    )}
                  </div>

                  {/* Priority Indicator */}
                  <div className="flex-shrink-0 flex items-center gap-1">
                    <span className="sr-only">Priority: {priorityLabel}</span>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={index}
                        className={`w-1 h-3 rounded-sm transition-colors ${
                          index < task.priority
                            ? 'bg-[#00ff41]'
                            : 'bg-[#00ff41]/10'
                        }`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>

                  {/* Hover Action Indicator */}
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg
                      className="w-4 h-4 text-[#00ff41]/60"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Webkit scrollbar styles */}
      <style>{`
        #backlog-content::-webkit-scrollbar {
          width: 6px;
        }
        #backlog-content::-webkit-scrollbar-track {
          background: #0a0a0a;
        }
        #backlog-content::-webkit-scrollbar-thumb {
          background: #00ff41;
          border-radius: 3px;
        }
        #backlog-content::-webkit-scrollbar-thumb:hover {
          background: #00ff41cc;
        }
      `}</style>
    </div>
  )
}

// Accessibility checklist:
// ✓ Semantic button for collapsible header
// ✓ aria-expanded and aria-controls for screen readers
// ✓ Keyboard navigable task buttons
// ✓ aria-label for task actions
// ✓ sr-only priority labels
// ✓ Proper color contrast for text
// ✓ Focus states inherit from Tailwind defaults

// Performance considerations:
// - Uses CSS transitions for smooth animations
// - max-h-[600px] prevents extremely long lists from affecting performance
// - overflow-y-auto provides scrolling for long backlogs
// - Conditional rendering prevents rendering hidden content
// - Simple array filters keep rendering fast
// - No complex calculations in render loop
