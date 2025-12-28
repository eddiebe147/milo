import React, { useState } from 'react'
import { Target, CheckCircle, Circle, ChevronRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface Task {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed'
  rationale?: string
  linkedGoal?: string
}

export const MissionPanel: React.FC = () => {
  // Mock data - will be replaced with actual store data
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Complete MILO foundation setup',
      status: 'in_progress',
      rationale: 'Directly advances Q1 product launch',
      linkedGoal: 'Ship MILO V1.0',
    },
    {
      id: '2',
      title: 'Review PRD with stakeholders',
      status: 'pending',
      rationale: 'Unblocks development decisions',
      linkedGoal: 'Ship MILO V1.0',
    },
    {
      id: '3',
      title: 'Set up CI/CD pipeline',
      status: 'pending',
      rationale: 'Enables automated testing',
    },
  ])

  const completedCount = tasks.filter(t => t.status === 'completed').length
  const totalCount = tasks.length

  const toggleTask = (taskId: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? {
              ...task,
              status: task.status === 'completed' ? 'pending' : 'completed',
            }
          : task
      )
    )
  }

  const setInProgress = (taskId: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? { ...task, status: 'in_progress' }
          : task.status === 'in_progress'
            ? { ...task, status: 'pending' }
            : task
      )
    )
  }

  return (
    <Card variant="default" padding="none" className="flex-1">
      <CardHeader className="p-4 pb-2 border-b border-pipboy-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-pipboy-green" />
            <CardTitle>Today's Mission</CardTitle>
          </div>
          <Badge variant={completedCount === totalCount ? 'success' : 'info'} glow>
            {completedCount}/{totalCount}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {tasks.length === 0 ? (
          <div className="p-4 text-center text-pipboy-green-dim">
            <p>No signal tasks for today.</p>
            <p className="text-xs mt-1">Run morning briefing to set your mission.</p>
          </div>
        ) : (
          <ul className="divide-y divide-pipboy-border">
            {tasks.map(task => (
              <li
                key={task.id}
                className={`
                  p-3 transition-all duration-200
                  hover:bg-pipboy-surface/50
                  ${task.status === 'in_progress' ? 'bg-pipboy-green/5' : ''}
                  ${task.status === 'completed' ? 'opacity-60' : ''}
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`
                      mt-0.5 transition-all duration-200
                      ${task.status === 'completed'
                        ? 'text-pipboy-green'
                        : 'text-pipboy-green-dim hover:text-pipboy-green'
                      }
                    `}
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle size={18} className="fill-pipboy-green/20" />
                    ) : (
                      <Circle size={18} />
                    )}
                  </button>

                  {/* Task content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`
                          text-sm
                          ${task.status === 'completed'
                            ? 'line-through text-pipboy-green-dim'
                            : 'text-pipboy-green'
                          }
                        `}
                      >
                        {task.title}
                      </span>
                      {task.status === 'in_progress' && (
                        <Badge variant="success" size="sm">
                          Active
                        </Badge>
                      )}
                    </div>

                    {/* Rationale */}
                    {task.rationale && task.status !== 'completed' && (
                      <p className="text-xs text-pipboy-green-dim mt-1">
                        → {task.rationale}
                      </p>
                    )}

                    {/* Linked goal */}
                    {task.linkedGoal && task.status !== 'completed' && (
                      <div className="flex items-center gap-1 mt-1">
                        <ChevronRight size={12} className="text-pipboy-green-dim" />
                        <span className="text-xs text-pipboy-green-dim/70">
                          {task.linkedGoal}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Set as active button */}
                  {task.status === 'pending' && (
                    <button
                      onClick={() => setInProgress(task.id)}
                      className="text-xs text-pipboy-green-dim hover:text-pipboy-green transition-colors"
                      title="Set as current task"
                    >
                      Start
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
