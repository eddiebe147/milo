import React, { useEffect, useState } from 'react'
import { X, AlertTriangle, Zap } from 'lucide-react'
import { Card } from './Card'
import { Button } from './Button'
import { GlowText } from './GlowText'
import type { NudgeEvent } from '@/types/milo-api'

interface NudgeToastProps {
  nudge: NudgeEvent
  onDismiss: () => void
  onSnooze?: (minutes: number) => void
}

export const NudgeToast: React.FC<NudgeToastProps> = ({
  nudge,
  onDismiss,
  onSnooze,
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  // Handle dismiss with animation
  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => onDismiss(), 300)
  }

  // Handle snooze
  const handleSnooze = (minutes: number) => {
    setIsExiting(true)
    setTimeout(() => {
      onSnooze?.(minutes)
      onDismiss()
    }, 300)
  }

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50 max-w-sm
        transform transition-all duration-300 ease-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <Card
        variant="elevated"
        padding="md"
        className="border-pipboy-amber/50 bg-pipboy-background/95 backdrop-blur-sm shadow-lg shadow-pipboy-amber/20"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-sm bg-pipboy-amber/20">
              <AlertTriangle size={16} className="text-pipboy-amber" />
            </div>
            <div>
              <GlowText intensity="medium" className="text-sm font-bold text-pipboy-amber">
                DRIFT ALERT
              </GlowText>
              <p className="text-xs text-pipboy-green-dim">
                {nudge.driftMinutes}m in {nudge.currentApp}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDismiss} className="p-1">
            <X size={14} />
          </Button>
        </div>

        {/* Message */}
        <p className="text-sm text-pipboy-green mb-4 leading-relaxed">
          {nudge.message}
        </p>

        {/* AI badge */}
        {nudge.isAiGenerated && (
          <div className="flex items-center gap-1 mb-3 text-xs text-pipboy-green-dim">
            <Zap size={10} className="text-pipboy-amber" />
            <span>AI-generated nudge</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleDismiss}
            className="flex-1"
          >
            Got it
          </Button>
          {onSnooze && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSnooze(5)}
              className="flex-1"
            >
              Snooze 5m
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

// Container for managing multiple nudge toasts
interface NudgeToastContainerProps {
  nudges: NudgeEvent[]
  onDismiss: (index: number) => void
  onSnooze?: (index: number, minutes: number) => void
}

export const NudgeToastContainer: React.FC<NudgeToastContainerProps> = ({
  nudges,
  onDismiss,
  onSnooze,
}) => {
  // Only show the most recent nudge to avoid stacking
  const latestNudge = nudges[nudges.length - 1]

  if (!latestNudge) return null

  return (
    <NudgeToast
      nudge={latestNudge}
      onDismiss={() => onDismiss(nudges.length - 1)}
      onSnooze={onSnooze ? (minutes) => onSnooze(nudges.length - 1, minutes) : undefined}
    />
  )
}
