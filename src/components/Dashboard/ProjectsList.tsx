import React, { useState, useMemo } from 'react'
import { Folder } from 'lucide-react'
import { useProjectsStore, useTasksStore } from '@/stores'
import { ProjectCard } from './ProjectCard'

/**
 * ProjectsList - Collapsible list of project cards with their tasks
 *
 * Features:
 * - Shows all projects with their incomplete tasks
 * - Each project is a collapsible card
 * - Respects activeFilter from projectsStore
 * - Empty state when no projects
 * - Projects sorted by their sortOrder
 *
 * Layout:
 * ┌─────────────────────────────────────────────┐
 * │ 📁 PROJECTS                                 │
 * │ ┌─────────────────────────────────────────┐ │
 * │ │ 🟢 MILO Development           [5] [▼]  │ │  ← Expanded
 * │ │   ☐ Task 1                              │ │
 * │ │   ☐ Task 2                              │ │
 * │ └─────────────────────────────────────────┘ │
 * │ │ 🔵 ID8Labs                    [3] [▶]  │   ← Collapsed
 * │ │ 🟣 Personal                   [2] [▶]  │   ← Collapsed
 * └─────────────────────────────────────────────┘
 *
 * Usage:
 * <ProjectsList />
 */
export const ProjectsList: React.FC = () => {
  const { projects, activeFilter, isLoading } = useProjectsStore()
  const { allTasks } = useTasksStore()

  // Track which project is expanded (null = none, or project id)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filter projects based on activeFilter
  const visibleProjects = useMemo(() => {
    if (activeFilter) {
      // Only show the filtered project
      return projects.filter(p => p.id === activeFilter)
    }
    // Show all projects, sorted by sortOrder
    return [...projects].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  }, [projects, activeFilter])

  // Group incomplete tasks by project
  const tasksByProject = useMemo(() => {
    const grouped: Record<string, typeof allTasks> = {}

    allTasks.forEach(task => {
      if (task.categoryId) {
        if (!grouped[task.categoryId]) {
          grouped[task.categoryId] = []
        }
        grouped[task.categoryId].push(task)
      }
    })

    return grouped
  }, [allTasks])

  // Calculate total incomplete tasks across visible projects
  const totalIncompleteTasks = useMemo(() => {
    return visibleProjects.reduce((sum, project) => {
      const projectTasks = tasksByProject[project.id] || []
      const incomplete = projectTasks.filter(t => t.status !== 'completed').length
      return sum + incomplete
    }, 0)
  }, [visibleProjects, tasksByProject])

  // Handle project expand toggle
  const handleToggleExpand = (projectId: string) => {
    setExpandedId(current => current === projectId ? null : projectId)
  }

  // Auto-expand single project when filtered
  React.useEffect(() => {
    if (activeFilter && visibleProjects.length === 1) {
      setExpandedId(visibleProjects[0].id)
    }
  }, [activeFilter, visibleProjects])

  // Loading state
  if (isLoading && projects.length === 0) {
    return (
      <div className="flex items-center gap-2 p-4 text-pipboy-green-dim">
        <div className="w-2 h-2 rounded-full bg-pipboy-green-dim animate-pulse" />
        <span className="text-xs font-mono">Loading projects...</span>
      </div>
    )
  }

  // Empty state - no projects
  if (visibleProjects.length === 0) {
    return (
      <div className="bg-pipboy-surface/30 border border-pipboy-border rounded-sm p-6 text-center">
        <Folder className="w-8 h-8 text-pipboy-green-dim mx-auto mb-2 opacity-50" />
        <p className="text-pipboy-green-dim font-mono text-sm">
          {activeFilter ? 'Project not found' : 'No projects yet'}
        </p>
        <p className="text-pipboy-green-dim/60 font-mono text-xs mt-1">
          Create a project to organize your tasks
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-1">
        <Folder size={14} className="text-pipboy-green-dim" />
        <span className="text-pipboy-green-dim font-mono text-xs tracking-wide uppercase">
          Projects
        </span>
        <span className="text-pipboy-green-dim/60 font-mono text-[10px]">
          ({totalIncompleteTasks} task{totalIncompleteTasks !== 1 ? 's' : ''})
        </span>
      </div>

      {/* Project Cards */}
      <div className="space-y-2">
        {visibleProjects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            tasks={tasksByProject[project.id] || []}
            isExpanded={expandedId === project.id}
            onToggleExpand={() => handleToggleExpand(project.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default ProjectsList
