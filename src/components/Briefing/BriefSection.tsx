import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface BriefSectionProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
  defaultExpanded?: boolean
  collapsible?: boolean
  accentColor?: 'green' | 'amber' | 'red'
}

/**
 * BriefSection - Collapsible section container for briefing cards
 *
 * Used in both MorningBriefCard and EveningBriefCard for consistent
 * styling of briefing content sections.
 */
export const BriefSection: React.FC<BriefSectionProps> = ({
  title,
  icon,
  children,
  className,
  defaultExpanded = true,
  collapsible = true,
  accentColor = 'green',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const accentStyles = {
    green: 'border-pipboy-green/30 text-pipboy-green',
    amber: 'border-pipboy-amber/30 text-pipboy-amber',
    red: 'border-pipboy-red/30 text-pipboy-red',
  }

  const headerAccent = {
    green: 'text-pipboy-green',
    amber: 'text-pipboy-amber',
    red: 'text-pipboy-red',
  }

  return (
    <div
      className={cn(
        'border-l-2 pl-3 mb-4',
        accentStyles[accentColor],
        className
      )}
    >
      <button
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
        className={cn(
          'flex items-center gap-2 w-full text-left mb-2',
          collapsible && 'cursor-pointer hover:opacity-80',
          !collapsible && 'cursor-default'
        )}
        disabled={!collapsible}
      >
        {collapsible && (
          <span className={cn('opacity-50', headerAccent[accentColor])}>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
        )}
        {icon && (
          <span className={cn('opacity-70', headerAccent[accentColor])}>
            {icon}
          </span>
        )}
        <span
          className={cn(
            'text-sm font-medium uppercase tracking-wider',
            headerAccent[accentColor]
          )}
        >
          {title}
        </span>
      </button>

      {isExpanded && (
        <div className="text-pipboy-green-dim text-sm space-y-2">
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * BriefTaskItem - Individual task display for briefing lists
 */
interface BriefTaskItemProps {
  title: string
  priority?: number
  status?: string
  daysOverdue?: number
  linkedGoal?: string
  onStartTask?: () => void
  onDeferTask?: () => void
  className?: string
}

export const BriefTaskItem: React.FC<BriefTaskItemProps> = ({
  title,
  priority,
  status,
  daysOverdue,
  linkedGoal,
  onStartTask,
  onDeferTask,
  className,
}) => {
  const priorityLabel = priority ? `P${priority}` : null
  const priorityColor =
    priority === 1
      ? 'text-pipboy-red'
      : priority === 2
        ? 'text-pipboy-amber'
        : 'text-pipboy-green-dim'

  return (
    <div
      className={cn(
        'flex items-start gap-2 py-1 border-b border-pipboy-border/30 last:border-0',
        className
      )}
    >
      {priorityLabel && (
        <span className={cn('text-xs font-mono', priorityColor)}>
          [{priorityLabel}]
        </span>
      )}
      <div className="flex-1">
        <span className="text-pipboy-green">{title}</span>
        {linkedGoal && (
          <span className="text-xs text-pipboy-green-dim ml-2">
            → {linkedGoal}
          </span>
        )}
        {daysOverdue && daysOverdue > 0 && (
          <span className="text-xs text-pipboy-amber ml-2">
            ({daysOverdue}d overdue)
          </span>
        )}
      </div>
      {(onStartTask || onDeferTask) && (
        <div className="flex gap-1">
          {onStartTask && (
            <button
              onClick={onStartTask}
              className="text-xs text-pipboy-green hover:text-pipboy-green/80 px-1"
            >
              [START]
            </button>
          )}
          {onDeferTask && (
            <button
              onClick={onDeferTask}
              className="text-xs text-pipboy-amber hover:text-pipboy-amber/80 px-1"
            >
              [DEFER]
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * BriefStatBlock - Metric display for stats sections
 */
interface BriefStatBlockProps {
  label: string
  value: string | number
  subValue?: string
  color?: 'green' | 'amber' | 'red'
  className?: string
}

export const BriefStatBlock: React.FC<BriefStatBlockProps> = ({
  label,
  value,
  subValue,
  color = 'green',
  className,
}) => {
  const colorStyles = {
    green: 'text-pipboy-green',
    amber: 'text-pipboy-amber',
    red: 'text-pipboy-red',
  }

  return (
    <div className={cn('text-center', className)}>
      <div className={cn('text-2xl font-bold font-mono', colorStyles[color])}>
        {value}
      </div>
      <div className="text-xs text-pipboy-green-dim uppercase">{label}</div>
      {subValue && (
        <div className="text-xs text-pipboy-green-dim/70">{subValue}</div>
      )}
    </div>
  )
}

/**
 * BriefCalendarEvent - Calendar event display
 */
interface BriefCalendarEventProps {
  title: string
  startTime: string
  endTime: string
  isAllDay?: boolean
  meetingLink?: string
  className?: string
}

export const BriefCalendarEvent: React.FC<BriefCalendarEventProps> = ({
  title,
  startTime,
  endTime,
  isAllDay,
  meetingLink,
  className,
}) => {
  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 py-1 border-b border-pipboy-border/30 last:border-0',
        className
      )}
    >
      <span className="text-xs font-mono text-pipboy-amber w-24">
        {isAllDay ? 'ALL DAY' : `${formatTime(startTime)}-${formatTime(endTime)}`}
      </span>
      <span className="flex-1 text-pipboy-green truncate">{title}</span>
      {meetingLink && (
        <a
          href={meetingLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-pipboy-green hover:underline"
        >
          [JOIN]
        </a>
      )}
    </div>
  )
}
