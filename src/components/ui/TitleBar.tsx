import React, { useState } from 'react'
import { Minus, X, Pin } from 'lucide-react'

export const TitleBar: React.FC = () => {
  const [isPinned, setIsPinned] = useState(false)

  const handleMinimize = () => {
    window.milo?.window.minimize()
  }

  const handleClose = () => {
    window.milo?.window.close()
  }

  const handleTogglePin = async () => {
    const newPinState = await window.milo?.window.toggleAlwaysOnTop()
    setIsPinned(newPinState ?? false)
  }

  return (
    <div className="drag-region h-10 flex items-center justify-between px-3 bg-pipboy-surface/80 border-b border-pipboy-border">
      {/* Logo / Title */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-pipboy-green shadow-glow-green animate-pulse" />
        <span className="text-sm text-pipboy-green glow-low font-bold tracking-wider">
          MILO
        </span>
        <span className="text-xs text-pipboy-green-dim">
          v0.3.0
        </span>
      </div>

      {/* Window Controls */}
      <div className="no-drag flex items-center gap-1">
        <button
          onClick={handleTogglePin}
          className={`
            p-1.5 rounded-sm transition-all duration-200
            hover:bg-pipboy-green/10
            ${isPinned ? 'text-pipboy-green' : 'text-pipboy-green-dim'}
          `}
          title={isPinned ? 'Unpin window' : 'Pin window on top'}
        >
          <Pin size={14} className={isPinned ? 'fill-current' : ''} />
        </button>
        <button
          onClick={handleMinimize}
          className="p-1.5 rounded-sm text-pipboy-green-dim hover:text-pipboy-green hover:bg-pipboy-green/10 transition-all duration-200"
          title="Minimize"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={handleClose}
          className="p-1.5 rounded-sm text-pipboy-green-dim hover:text-pipboy-red hover:bg-pipboy-red/10 transition-all duration-200"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
