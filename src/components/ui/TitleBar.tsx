import { milo } from "@/lib/api"
import React, { useState } from 'react'
import { Minus, X, Pin } from 'lucide-react'
import { MiloLogo } from './MiloLogo'

export const TitleBar: React.FC = () => {
  const [isPinned, setIsPinned] = useState(false)
  const [isVoiceMode, setIsVoiceMode] = useState(false)

  const isElectron = milo.platform === 'electron'

  const handleMinimize = () => {
    milo?.window.minimize()
  }

  const handleClose = () => {
    milo?.window.close()
  }

  const handleTogglePin = async () => {
    const newPinState = await milo?.window.toggleAlwaysOnTop()
    setIsPinned(newPinState ?? false)
  }

  return (
    <div className={`drag-region h-10 flex items-center justify-center px-3 bg-pipboy-surface/80 border-b border-pipboy-border relative ${!isElectron ? 'justify-between' : ''}`}>
      {/* Logo / Title - Centered on Desktop, Left on Web */}
      <div className={`flex items-center justify-center cursor-pointer ${!isElectron ? 'mx-0' : 'mx-auto'}`} onClick={() => setIsVoiceMode(!isVoiceMode)}>
        <MiloLogo mode={isVoiceMode ? 'voice' : 'logo'} size="sm" />
      </div>

      {/* Window Controls - Only on Electron */}
      {isElectron && (
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
      )}

      {/* Platform Indicator for Web */}
      {!isElectron && (
        <div className="text-[10px] text-pipboy-green-dim uppercase font-mono tracking-wider ml-auto">
          Web Mode
        </div>
      )}
    </div>
  )
}
