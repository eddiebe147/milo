import React, { useState } from 'react'
import { Minus, X, Pin } from 'lucide-react'
import { MiloLogo } from './MiloLogo'

export const TitleBar: React.FC = () => {
  const [isPinned, setIsPinned] = useState(false)
  const [isVoiceMode, setIsVoiceMode] = useState(false)

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
    <div className="drag-region h-10 flex items-center justify-center px-3 bg-pipboy-surface/80 border-b border-pipboy-border relative">
      {/* Logo / Title - Centered */}
      <div className="flex items-center justify-center cursor-pointer" onClick={() => setIsVoiceMode(!isVoiceMode)}>
        <MiloLogo mode={isVoiceMode ? 'voice' : 'logo'} size="sm" />
      </div>

      {/* Window Controls - Positioned right */}
      <div className="no-drag flex items-center gap-1 absolute right-3">
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
