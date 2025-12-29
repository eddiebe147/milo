import React, { useState, useEffect } from 'react'
import { Pause, Play, Loader2 } from 'lucide-react'
import { useActivityStore } from '@/stores'

type ActivityState = 'green' | 'amber' | 'red'

export const HeroState: React.FC = () => {
  const {
    currentState: storeState,
    currentAppName,
    isPaused,
    isLoading,
    toggleMonitoring,
    getMonitoringStatus,
  } = useActivityStore()

  const [currentState, setCurrentState] = useState<ActivityState>(storeState)
  const [stateSince, setStateSince] = useState<Date>(new Date())
  const [currentApp, setCurrentApp] = useState<string>(currentAppName || 'Unknown')
  const [duration, setDuration] = useState('0m')

  // Fetch initial status
  useEffect(() => {
    getMonitoringStatus()
  }, [getMonitoringStatus])

  // Update local state from store
  useEffect(() => {
    setCurrentState(storeState)
    setCurrentApp(currentAppName || 'Unknown')
  }, [storeState, currentAppName])

  // Duration timer
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
      color: 'pipboy-green',
      bgGlow: 'shadow-glow-green',
      barClass: 'bg-pipboy-green',
    },
    amber: {
      label: 'ADJACENT',
      color: 'pipboy-amber',
      bgGlow: 'shadow-glow-amber',
      barClass: 'bg-pipboy-amber',
    },
    red: {
      label: 'DRIFTED',
      color: 'pipboy-red',
      bgGlow: 'shadow-glow-red',
      barClass: 'bg-pipboy-red',
    },
  }

  const config = stateConfig[currentState]

  const handleToggle = async () => {
    try {
      await toggleMonitoring()
    } catch (error) {
      console.error('Failed to toggle monitoring:', error)
    }
  }

  return (
    <div className="relative py-6 px-4">
      {/* Background glow effect */}
      {!isPaused && (
        <div
          className={`
            absolute inset-0 opacity-10 animate-pulse-slow rounded-lg
            bg-${config.color}
          `}
        />
      )}

      {/* Main content */}
      <div className="relative flex flex-col items-center text-center">
        {/* State bars - decorative */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`h-1 w-8 rounded ${isPaused ? 'bg-pipboy-border' : config.barClass} opacity-60`} />
          <div className={`h-1 w-4 rounded ${isPaused ? 'bg-pipboy-border' : config.barClass} opacity-40`} />
        </div>

        {/* State label - HERO */}
        <h1
          className={`
            text-2xl font-bold tracking-widest
            ${isPaused ? 'text-pipboy-green-dim' : `text-${config.color}`}
            ${!isPaused ? 'glow-high' : ''}
          `}
        >
          {isPaused ? 'PAUSED' : config.label}
        </h1>

        {/* State bars - decorative */}
        <div className="flex items-center gap-2 mt-3 mb-4">
          <div className={`h-1 w-4 rounded ${isPaused ? 'bg-pipboy-border' : config.barClass} opacity-40`} />
          <div className={`h-1 w-8 rounded ${isPaused ? 'bg-pipboy-border' : config.barClass} opacity-60`} />
        </div>

        {/* App name and duration */}
        <div className="flex items-center gap-3 text-sm text-pipboy-green-dim">
          {!isPaused && (
            <>
              <span className="truncate max-w-[200px]">{currentApp}</span>
              <span className="text-pipboy-border">•</span>
            </>
          )}
          <span>{duration}</span>
        </div>

        {/* Pause/Resume button */}
        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={`
            mt-4 flex items-center gap-2 px-4 py-2 rounded-sm
            border border-pipboy-border
            text-xs text-pipboy-green-dim
            hover:text-pipboy-green hover:border-pipboy-green/50
            hover:bg-pipboy-surface/50
            transition-all duration-200
            disabled:opacity-50
          `}
        >
          {isLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : isPaused ? (
            <Play size={14} />
          ) : (
            <Pause size={14} />
          )}
          <span>{isPaused ? 'Resume' : 'Pause'}</span>
        </button>
      </div>
    </div>
  )
}
