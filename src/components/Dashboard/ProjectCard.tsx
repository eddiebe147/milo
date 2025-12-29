import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Play, Plus } from 'lucide-react'
import { useTasksStore } from '@/stores'
import type { Project } from '@/stores'
import type { Task } from '@/types'

interface ProjectCardProps {
  project: Project
  tasks: Task[]
  isExpanded?: boolean
  onToggleExpand?: () => void
  onAddTask?: (projectId: string) => void
}

/**
 * ProjectCard - Collapsible card showing a project and its tasks
 *
 * Features:
 * - Collapsible task list
 * - Project color indicator
 * - Progress badge [completed/total]
 * - Click task to start it (move to SignalQueue)
 * - Priority bars on each task
 *
 * Usage:
 * <ProjectCard
 *   project={project}
 *   tasks={projectTasks}
 *   isExpanded={expandedId === project.id}
 *   onToggleExpand={() => setExpandedId(project.id)}
 * />
 */
export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  tasks,
  isExpanded = false,
  onToggleExpand,
  onAddTask,
}) => {
  const { startTask } = useTasksStore()
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null)

  // Calculate task stats
  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'completed').length
    const total = tasks.length
    const incomplete = tasks.filter(t => t.status !== 'completed')
    return { completed, total, incomplete }
  }, [tasks])

  // Sort incomplete tasks by priority (highest first)
  const sortedTasks = useMemo(() => {
    return [...stats.incomplete].sort((a, b) => b.priority - a.priority)
  }, [stats.incomplete])

  // Handle clicking a task - start it
  const handleTaskClick = async (task: Task) => {
    await startTask(task.id)
  }

  // Priority label for accessibility
  const getPriorityLabel = (priority: number): string => {
    const labels = ['Lowest', 'Low', 'Medium', 'High', 'Critical']
    return labels[priority - 1] || 'Medium'
  }

  return (
    <div className="bg-pipboy-surface/50 border border-pipboy-border rounded-sm overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={onToggleExpand}
        className={`
          w-full px-3 py-2.5 flex items-center gap-3
          hover:bg-pipboy-green/5 transition-colors
          border-b ${isExpanded ? 'border-pipboy-border' : 'border-transparent'}
        `}
        aria-expanded={isExpanded}
        aria-controls={`project-content-${project.id}`}
      >
        {/* Expand/Collapse Icon */}
        <span className="text-pipboy-green-dim flex-shrink-0">
          {isExpanded ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
        </span>

        {/* Project Color Dot */}
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-offset-1 ring-offset-pipboy-background"
          style={{
            backgroundColor: project.color,
            boxShadow: `0 0 6px ${project.color}60`,
          }}
        />

        {/* Project Name */}
        <span className="flex-1 text-left font-mono text-sm text-pipboy-green tracking-wide truncate">
          {project.name}
        </span>

        {/* Progress Badge + Add Button */}
        <div className="flex-shrink-0 flex items-center gap-1">
          <span className="px-2 py-0.5 rounded-sm bg-pipboy-surface text-[10px] font-mono text-pipboy-green-dim">
            {stats.incomplete.length} task{stats.incomplete.length !== 1 ? 's' : ''}
          </span>

          {/* Add Task Button */}
          {onAddTask && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddTask(project.id)
              }}
              className="
                p-1 rounded-sm
                text-pipboy-green-dim hover:text-pipboy-green
                hover:bg-pipboy-green/10 transition-colors
              "
              title={`Add task to ${project.name}`}
              aria-label={`Add task to ${project.name}`}
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      </button>

      {/* Collapsible Task List */}
      <div
        id={`project-content-${project.id}`}
        className={`
          transition-all duration-300 ease-in-out overflow-hidden
          ${isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        {sortedTasks.length === 0 ? (
          // Empty state
          <div className="px-4 py-6 text-center">
            <p className="text-pipboy-green-dim font-mono text-xs">
              No tasks in this project
            </p>
          </div>
        ) : (
          // Task list
          <div className="divide-y divide-pipboy-border/50 max-h-[350px] overflow-y-auto scrollbar-thin">
            {sortedTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => handleTaskClick(task)}
                onMouseEnter={() => setHoveredTaskId(task.id)}
                onMouseLeave={() => setHoveredTaskId(null)}
                className={`
                  w-full px-4 py-2.5 flex items-center gap-3
                  hover:bg-pipboy-green/5 transition-colors
                  text-left
                `}
                aria-label={`Start task: ${task.title}`}
              >
                {/* Task checkbox placeholder */}
                <span className="w-4 h-4 rounded-sm border border-pipboy-border flex-shrink-0" />

                {/* Task Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-pipboy-green/90 font-mono text-xs truncate">
                      {task.title}
                    </span>
                    {task.estimatedDays && task.estimatedDays > 1 && (
                      <span className="text-pipboy-green-dim font-mono text-[10px] flex-shrink-0">
                        {task.estimatedDays}d
                      </span>
                    )}
                  </div>
                </div>

                {/* Priority bars */}
                <div className="flex-shrink-0 flex items-center gap-0.5">
                  <span className="sr-only">Priority: {getPriorityLabel(task.priority)}</span>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className={`w-0.5 h-2.5 rounded-sm transition-colors ${
                        index < task.priority
                          ? 'bg-pipboy-green'
                          : 'bg-pipboy-green/10'
                      }`}
                      aria-hidden="true"
                    />
                  ))}
                </div>

                {/* Start action indicator on hover */}
                <span
                  className={`
                    flex-shrink-0 transition-opacity
                    ${hoveredTaskId === task.id ? 'opacity-100' : 'opacity-0'}
                  `}
                >
                  <Play size={12} className="text-pipboy-green" fill="currentColor" />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollbar styles */}
      <style>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #00ff4140;
          border-radius: 2px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #00ff4180;
        }
      `}</style>
    </div>
  )
}

export default ProjectCard
