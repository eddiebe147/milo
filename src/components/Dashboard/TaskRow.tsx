import React, { useState } from 'react'
import {
    Circle,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    Play,
    Loader2,
    Zap,
    Globe,
    Search,
    Hand,
    Plus,
    X,
    Trash2
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

// Action types that MILO can take on a task
export type TaskActionType = 'claude_code' | 'claude_web' | 'research' | 'manual'

export interface TaskActionPlan {
    actionType: TaskActionType
    prompt: string
    projectPath?: string
    searchQueries?: string[]
    reasoning: string
}

interface TaskRowProps {
    task: Task
    isActive: boolean
    isExpanded: boolean
    relatedTasks: Task[]
    isExecuting?: boolean
    actionPlan?: TaskActionPlan | null
    projectColor?: string // hex color from project/category
    projectName?: string // project name for tooltip
    onToggleComplete: () => void
    onStart: () => void
    onExpand: () => void
    onDelete?: () => void
}

// Icon for each action type
const ActionIcon: React.FC<{ type: TaskActionType; className?: string }> = ({ type, className }) => {
    const icons = {
        claude_code: Zap,
        claude_web: Globe,
        research: Search,
        manual: Hand,
    }
    const Icon = icons[type]
    return <Icon size={12} className={className} />
}

// Label for each action type
const actionLabels: Record<TaskActionType, string> = {
    claude_code: 'Claude Code',
    claude_web: 'Claude Web',
    research: 'Research',
    manual: 'Manual',
}

export const TaskRow: React.FC<TaskRowProps> = ({
    task,
    isActive,
    isExpanded,
    relatedTasks,
    isExecuting = false,
    actionPlan,
    projectColor,
    projectName,
    onToggleComplete,
    onStart,
    onExpand,
    onDelete,
}) => {
    const isCompleted = task.status === 'completed'
    const isInProgress = task.status === 'in_progress' || isActive
    const [isHovering, setIsHovering] = useState(false)
    const [justCompleted, setJustCompleted] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    // Priority color mapping
    const getPriorityBadge = (priority: number) => {
        if (priority >= 4) return { variant: 'danger' as const, label: 'P' + priority }
        if (priority >= 3) return { variant: 'warning' as const, label: 'P' + priority }
        return { variant: 'default' as const, label: 'P' + priority }
    }

    const priorityBadge = getPriorityBadge(task.priority)

    // Handle task completion with animation
    const handleToggleComplete = () => {
        if (!isCompleted) {
            setJustCompleted(true)
            // Reset animation state after animation completes
            setTimeout(() => setJustCompleted(false), 500)
        }
        onToggleComplete()
    }

    return (
        <div
            className={cn(
                'transition-all duration-200 border-l-2',
                isInProgress && !isCompleted
                    ? 'border-l-pipboy-green bg-pipboy-green/5'
                    : 'border-l-transparent',
                isCompleted && 'opacity-60',
                justCompleted && 'task-complete-animation'
            )}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {/* Main row */}
            <div className="p-3 flex items-center gap-3 min-w-0">
                {/* Completion circle */}
                <button
                    onClick={handleToggleComplete}
                    disabled={isCompleted}
                    className={cn(
                        'flex-shrink-0 transition-all duration-300',
                        isCompleted
                            ? 'text-pipboy-green cursor-default'
                            : 'text-pipboy-green-dim hover:text-pipboy-green hover:scale-110'
                    )}
                    title={isCompleted ? 'Completed' : 'Mark as complete'}
                >
                    {isCompleted ? (
                        <CheckCircle
                            size={20}
                            className="fill-pipboy-green/30 animate-[pulse_0.3s_ease-in-out]"
                        />
                    ) : (
                        <Circle
                            size={20}
                            className={cn(
                                'transition-all duration-200',
                                isHovering && 'stroke-pipboy-green'
                            )}
                        />
                    )}
                </button>

                {/* Project color indicator */}
                {projectColor && (
                    <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                            backgroundColor: projectColor,
                            boxShadow: `0 0 4px ${projectColor}60`,
                        }}
                        title={projectName || 'Project'}
                    />
                )}

                {/* Task title */}
                <span
                    className={cn(
                        'flex-1 min-w-0 text-sm truncate transition-all duration-200',
                        isCompleted
                            ? 'line-through text-pipboy-green-dim'
                            : 'text-pipboy-green'
                    )}
                    title={task.title}
                >
                    {task.title}
                </span>

                {/* Active badge */}
                {isInProgress && !isCompleted && (
                    <Badge variant="success" size="sm">
                        Active
                    </Badge>
                )}

                {/* Expand/collapse button */}
                <button
                    onClick={onExpand}
                    className={cn(
                        'flex-shrink-0 p-1 rounded transition-all duration-200',
                        'text-pipboy-green-dim hover:text-pipboy-green hover:bg-pipboy-surface'
                    )}
                    title={isExpanded ? 'Collapse' : 'Expand'}
                >
                    {isExpanded ? (
                        <ChevronDown size={16} />
                    ) : (
                        <ChevronRight size={16} />
                    )}
                </button>

                {/* Start button */}
                {!isCompleted && (
                    <button
                        onClick={onStart}
                        disabled={isExecuting}
                        className={cn(
                            'flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1',
                            'text-xs font-medium rounded-sm border transition-all duration-200',
                            isExecuting
                                ? 'border-pipboy-green/30 text-pipboy-green-dim cursor-wait'
                                : isInProgress
                                    ? 'border-pipboy-green bg-pipboy-green/10 text-pipboy-green'
                                    : 'border-pipboy-border text-pipboy-green-dim hover:text-pipboy-green hover:border-pipboy-green/50'
                        )}
                        title={isInProgress ? 'Execute with MILO' : 'Start task'}
                    >
                        {isExecuting ? (
                            <>
                                <Loader2 size={12} className="animate-spin" />
                                <span>Analyzing...</span>
                            </>
                        ) : (
                            <>
                                <Play size={12} />
                                <span>{isInProgress ? 'Execute' : 'Start'}</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Expanded details */}
            <div
                className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                )}
            >
                <div className="px-3 pb-3 pl-11 space-y-3">
                    {/* Rationale */}
                    {task.rationale && (
                        <p className="text-xs text-pipboy-green-dim leading-relaxed">
                            → {task.rationale}
                        </p>
                    )}

                    {/* Metadata row */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={priorityBadge.variant} size="sm">
                            {priorityBadge.label}
                        </Badge>

                        {task.estimatedDays && task.estimatedDays > 0 && (
                            <Badge variant="info" size="sm">
                                ~{task.estimatedDays} day{task.estimatedDays > 1 ? 's' : ''}
                            </Badge>
                        )}

                        {task.daysWorked && task.daysWorked > 0 && (
                            <Badge variant="default" size="sm">
                                {task.daysWorked} day{task.daysWorked > 1 ? 's' : ''} worked
                            </Badge>
                        )}

                        {/* Action plan indicator */}
                        {actionPlan && (
                            <Badge
                                variant={actionPlan.actionType === 'manual' ? 'default' : 'success'}
                                size="sm"
                                className="flex items-center gap-1"
                            >
                                <ActionIcon type={actionPlan.actionType} />
                                <span>{actionLabels[actionPlan.actionType]}</span>
                            </Badge>
                        )}
                    </div>

                    {/* Action plan reasoning */}
                    {actionPlan && actionPlan.reasoning && (
                        <p className="text-[11px] text-pipboy-green-dim/70 italic">
                            {actionPlan.reasoning}
                        </p>
                    )}

                    {/* Related/Sequential tasks */}
                    {relatedTasks.length > 0 && (
                        <div className="pt-2 border-t border-pipboy-border/30">
                            <p className="text-[10px] uppercase tracking-wider text-pipboy-green-dim/70 mb-2">
                                Related Tasks
                            </p>
                            <ul className="space-y-1">
                                {relatedTasks.slice(0, 3).map((relatedTask) => (
                                    <li
                                        key={relatedTask.id}
                                        className="flex items-center gap-2 text-xs text-pipboy-green-dim"
                                    >
                                        <Circle size={10} className="flex-shrink-0" />
                                        <span className="truncate">{relatedTask.title}</span>
                                    </li>
                                ))}
                                {relatedTasks.length > 3 && (
                                    <li className="text-[10px] text-pipboy-green-dim/50 pl-5">
                                        +{relatedTasks.length - 3} more
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}

                    {/* Delete action - +/X pattern */}
                    {onDelete && (
                        <div className="pt-2 border-t border-pipboy-border/30 flex items-center gap-2">
                            {!showDeleteConfirm ? (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="flex items-center gap-1 text-[10px] text-pipboy-green-dim hover:text-red-400 transition-colors"
                                    title="Delete task"
                                >
                                    <Plus size={12} className="rotate-45" />
                                    <span>Delete</span>
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-red-400">Delete this task?</span>
                                    <button
                                        onClick={() => {
                                            onDelete()
                                            setShowDeleteConfirm(false)
                                        }}
                                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-red-500/20 text-red-400 border border-red-500/50 rounded-sm hover:bg-red-500/30 transition-colors"
                                    >
                                        <Trash2 size={10} />
                                        <span>Yes</span>
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-pipboy-green-dim border border-pipboy-border rounded-sm hover:border-pipboy-green/50 transition-colors"
                                    >
                                        <X size={10} />
                                        <span>No</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default TaskRow
