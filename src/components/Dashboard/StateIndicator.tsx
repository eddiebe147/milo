import React, { useState, useEffect } from 'react'
import { Activity, Play } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { GlowText } from '@/components/ui/GlowText'

type ActivityState = 'green' | 'amber' | 'red'

export const StateIndicator: React.FC = () => {
  const [currentState, setCurrentState] = useState<ActivityState>('amber')
  const [stateSince, setStateSince] = useState<Date>(new Date())
  const [currentApp, setCurrentApp] = useState<string>('Unknown')
  const [isPaused, setIsPaused] = useState(false)

  // Calculate duration since state change
  const [duration, setDuration] = useState('0m')

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - stateSince.getTime()) / 1000)
      const minutes = Math.floor(diff / 60)
      const hours = Math.floor(minutes / 60)

      if (hours > 0) {
        setDuration(`${hours}h ${minutes % 60}m`)
      } else {
        setDuration(`${minutes}m`)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [stateSince])

  // Listen for state changes from main process
  useEffect(() => {
    const unsubscribe = window.milo?.events.onActivityStateChanged((state) => {
      setCurrentState(state.state)
      setCurrentApp(state.appName)
      if (state.stateChanged) {
        setStateSince(new Date())
      }
    })

    return () => unsubscribe?.()
  }, [])

  const stateConfig = {
    green: {
      label: 'ON MISSION',
      description: 'You\'re focused on signal work',
      color: 'green' as const,
      bgClass: 'bg-pipboy-green/10',
      borderClass: 'border-pipboy-green/50',
    },
    amber: {
      label: 'ADJACENT',
      description: 'Related activity, not exact task',
      color: 'amber' as const,
      bgClass: 'bg-pipboy-amber/10',
      borderClass: 'border-pipboy-amber/50',
    },
    red: {
      label: 'DRIFTED',
      description: 'Off-mission activity detected',
      color: 'red' as const,
      bgClass: 'bg-pipboy-red/10',
      borderClass: 'border-pipboy-red/50',
    },
  }

  const config = stateConfig[currentState]

  const togglePause = () => {
    setIsPaused(!isPaused)
    // TODO: Implement actual pause/resume via IPC
  }

  return (
    <Card
      variant={`state-${currentState}` as any}
      padding="md"
      className="relative overflow-hidden"
    >
      {/* Animated background pulse for active states */}
      {!isPaused && (
        <div
          className={`
            absolute inset-0 opacity-20 animate-pulse-slow
            ${config.bgClass}
          `}
        />
      )}

      <div className="relative flex items-center gap-4">
        {/* State indicator light */}
        <div className="relative">
          <div
            className={`
              w-4 h-4 rounded-full
              ${currentState === 'green' ? 'bg-pipboy-green shadow-glow-green' : ''}
              ${currentState === 'amber' ? 'bg-pipboy-amber shadow-glow-amber' : ''}
              ${currentState === 'red' ? 'bg-pipboy-red shadow-glow-red' : ''}
              ${!isPaused ? 'animate-pulse' : 'opacity-50'}
            `}
          />
        </div>

        {/* State info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <GlowText color={config.color} intensity="high" className="font-bold">
              {isPaused ? 'PAUSED' : config.label}
            </GlowText>
            <span className="text-xs text-pipboy-green-dim">
              {duration}
            </span>
          </div>
          <div className="text-xs text-pipboy-green-dim truncate mt-0.5">
            {isPaused ? 'Monitoring paused' : currentApp}
          </div>
        </div>

        {/* Activity icon / Pause button */}
        <button
          onClick={togglePause}
          className={`
            p-2 rounded-sm transition-all duration-200
            hover:bg-pipboy-surface
            ${isPaused ? 'text-pipboy-green-dim' : `text-pipboy-${config.color}`}
          `}
          title={isPaused ? 'Resume monitoring' : 'Pause monitoring'}
        >
          {isPaused ? (
            <Play size={18} />
          ) : (
            <Activity size={18} className="animate-pulse" />
          )}
        </button>
      </div>

      {/* Description */}
      {!isPaused && (
        <p className="text-xs text-pipboy-green-dim mt-2 relative">
          {config.description}
        </p>
      )}
    </Card>
  )
}
