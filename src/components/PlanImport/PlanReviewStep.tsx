import React from 'react'
import { Target, CheckSquare, Trash2, Link, Unlink, ArrowLeft, Check, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { usePlanStore } from '@/stores'

export const PlanReviewStep: React.FC = () => {
  const {
    processedPlan,
    editedGoals,
    editedTasks,
    applyPlan,
    reset,
    removeGoal,
    removeTask,
    toggleTaskGoalLink,
    isApplying,
  } = usePlanStore()

  if (!processedPlan) return null

  const handleApply = async () => {
    await applyPlan()
  }

  const getTimeframeBadge = (timeframe: string) => {
    const colors: Record<string, 'success' | 'warning' | 'danger'> = {
      yearly: 'success',
      quarterly: 'success',
      monthly: 'warning',
      weekly: 'warning',
    }
    return <Badge variant={colors[timeframe] || 'success'}>{timeframe}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, 'success' | 'warning' | 'danger'> = {
      high: 'danger',
      medium: 'warning',
      low: 'success',
    }
    return <Badge variant={colors[priority] || 'success'}>{priority}</Badge>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Summary header */}
      <div className="p-3 bg-pipboy-surface/50 border-b border-pipboy-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-pipboy-green">{processedPlan.plan.title}</h3>
            <p className="text-xs text-pipboy-green-dim">{processedPlan.plan.summary}</p>
          </div>
          <Badge variant="success">{processedPlan.plan.source}</Badge>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Clarifications (if any) */}
        {processedPlan.clarifications.length > 0 && (
          <div className="bg-pipboy-amber/10 border border-pipboy-amber/30 rounded-sm p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-pipboy-amber" />
              <span className="text-xs font-bold text-pipboy-amber">Needs Clarification</span>
            </div>
            {processedPlan.clarifications.map((c, i) => (
              <div key={i} className="text-xs text-pipboy-green-dim mb-1">
                <strong>{c.item}:</strong> {c.question}
              </div>
            ))}
          </div>
        )}

        {/* Goals section */}
        {editedGoals.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target size={14} className="text-pipboy-green" />
              <span className="text-xs font-bold text-pipboy-green">
                Goals ({editedGoals.length})
              </span>
            </div>
            <div className="space-y-2">
              {editedGoals.map((goal, index) => (
                <div
                  key={index}
                  className="p-2 bg-pipboy-surface border border-pipboy-border rounded-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-pipboy-green font-medium">
                          {goal.title}
                        </span>
                        {getTimeframeBadge(goal.timeframe)}
                      </div>
                      {goal.description && (
                        <p className="text-xs text-pipboy-green-dim mt-1 line-clamp-2">
                          {goal.description}
                        </p>
                      )}
                      {goal.suggestedDeadline && (
                        <p className="text-[10px] text-pipboy-amber mt-1">
                          Target: {goal.suggestedDeadline}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeGoal(index)}
                      className="p-1 hover:bg-pipboy-red/20 rounded-sm transition-colors"
                      title="Remove goal"
                    >
                      <Trash2 size={14} className="text-pipboy-red" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tasks section */}
        {editedTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare size={14} className="text-pipboy-green" />
              <span className="text-xs font-bold text-pipboy-green">
                Tasks ({editedTasks.length})
              </span>
            </div>
            <div className="space-y-2">
              {editedTasks.map((task, index) => (
                <div
                  key={index}
                  className="p-2 bg-pipboy-surface border border-pipboy-border rounded-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-pipboy-green">{task.title}</span>
                        {getPriorityBadge(task.priority)}
                      </div>
                      {task.description && (
                        <p className="text-xs text-pipboy-green-dim mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {task.dueDate && (
                          <span className="text-[10px] text-pipboy-amber">
                            Due: {task.dueDate}
                          </span>
                        )}
                        {task.goalIndex !== null && editedGoals[task.goalIndex] && (
                          <span className="text-[10px] text-pipboy-green-dim flex items-center gap-1">
                            <Link size={10} />
                            {editedGoals[task.goalIndex].title}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Link/unlink goal button */}
                      {editedGoals.length > 0 && (
                        <button
                          onClick={() =>
                            toggleTaskGoalLink(
                              index,
                              task.goalIndex === null ? 0 : null
                            )
                          }
                          className="p-1 hover:bg-pipboy-surface/80 rounded-sm transition-colors"
                          title={task.goalIndex !== null ? 'Unlink from goal' : 'Link to goal'}
                        >
                          {task.goalIndex !== null ? (
                            <Unlink size={14} className="text-pipboy-green-dim" />
                          ) : (
                            <Link size={14} className="text-pipboy-green-dim" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => removeTask(index)}
                        className="p-1 hover:bg-pipboy-red/20 rounded-sm transition-colors"
                        title="Remove task"
                      >
                        <Trash2 size={14} className="text-pipboy-red" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unparsed text (if any) */}
        {processedPlan.unparsed && (
          <div className="bg-pipboy-surface/50 border border-pipboy-border rounded-sm p-3">
            <span className="text-xs font-bold text-pipboy-green-dim block mb-1">
              Could not parse:
            </span>
            <p className="text-xs text-pipboy-green-dim/70 font-mono whitespace-pre-wrap">
              {processedPlan.unparsed}
            </p>
          </div>
        )}
      </div>

      {/* Actions footer */}
      <div className="p-3 border-t border-pipboy-border flex justify-between">
        <Button onClick={reset} variant="ghost" className="flex items-center gap-2">
          <ArrowLeft size={14} />
          Start Over
        </Button>
        <Button
          onClick={handleApply}
          disabled={isApplying || (editedGoals.length === 0 && editedTasks.length === 0)}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Check size={14} />
          Apply Plan ({editedGoals.length} goals, {editedTasks.length} tasks)
        </Button>
      </div>
    </div>
  )
}
