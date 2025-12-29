import React, { useEffect, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useProjectsStore, useTasksStore } from '@/stores'

/**
 * ProjectTabs - Horizontal scrollable filter tabs for task projects
 *
 * Features:
 * - "All" tab + one tab per active project
 * - Active tab highlighted with pipboy-green border/background
 * - Click active tab again to clear filter (toggle behavior)
 * - Project color indicator dot on each tab
 * - Task count badge for each project
 * - Horizontal scroll with hidden scrollbar (mobile-friendly)
 * - Add project button (future)
 *
 * Usage:
 * <ProjectTabs />
 *
 * State management:
 * - Reads projects from useProjectsStore
 * - Sets activeFilter via setActiveFilter(projectId | null)
 * - Counts tasks per project from useTasksStore
 */
export const ProjectTabs: React.FC = () => {
  const {
    projects,
    activeFilter,
    setActiveFilter,
    fetchProjects,
    isLoading,
  } = useProjectsStore()

  const { allTasks } = useTasksStore()

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Calculate task counts per project
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
  const handleTabClick = (projectId: string | null) => {
    if (activeFilter === projectId) {
      // Clicking active tab clears the filter
      setActiveFilter(null)
    } else {
      setActiveFilter(projectId)
    }
  }

  // Show loading state briefly
  if (isLoading && projects.length === 0) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-pipboy-green-dim">
        <div className="w-2 h-2 rounded-full bg-pipboy-green-dim animate-pulse" />
        <span className="text-xs font-mono">Loading projects...</span>
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

        {/* Project tabs */}
        {projects.map(project => {
          const count = taskCounts[project.id] || 0
          const isActive = activeFilter === project.id

          return (
            <button
              key={project.id}
              onClick={() => handleTabClick(project.id)}
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
              title={`${project.name}${count > 0 ? ` (${count} tasks)` : ''}`}
            >
              {/* Project color indicator */}
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color }}
              />

              {/* Project name */}
              <span className="tracking-wide">{project.name}</span>

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

        {/* Add project button */}
        <button
          onClick={() => {
            document.dispatchEvent(new CustomEvent('milo:openProjectModal'))
          }}
          className={`
            flex items-center justify-center w-8 h-8 rounded-sm
            border border-dashed border-pipboy-border
            text-pipboy-green-dim hover:text-pipboy-green
            hover:border-pipboy-green/50 hover:bg-pipboy-surface/50
            transition-all duration-200 flex-shrink-0
          `}
          title="Add new project"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Subtle fade effect on right edge to indicate scrollability */}
      {projects.length > 0 && (
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
