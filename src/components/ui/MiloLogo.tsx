import React from 'react'
import { WaveformMonitor } from './WaveformMonitor'

interface MiloLogoProps {
    mode?: 'logo' | 'voice'
    className?: string
    showText?: boolean
    size?: 'sm' | 'md' | 'lg' | 'xl'
}

export const MiloLogo: React.FC<MiloLogoProps> = ({
    mode = 'logo',
    className = '',
    showText = false,
    size = 'md'
}) => {

    if (mode === 'voice') {
        // Large monitor mode - full waveform display
        return (
            <div className={`flex flex-col items-center justify-center gap-6 ${className}`}>
                <WaveformMonitor isActive={true} size="xl" />
                <div className="text-pipboy-orange font-mono text-xs tracking-[0.3em] animate-pulse font-bold uppercase">
                    Listening...
                </div>
            </div>
        )
    }

    // Logo Mode - compact for TitleBar or Landing Page
    return (
        <div className={`flex items-center gap-4 ${className}`}>
            {/* The actual waveform gauge asset */}
            <WaveformMonitor isActive={false} size={size === 'xl' ? 'lg' : size} />

            {showText && (
                <div className="flex flex-col select-none">
                    {/* MILO text - distressed military stencil feel */}
                    <h1 className="text-5xl md:text-6xl font-black font-mono tracking-[0.2em] text-pipboy-green leading-none"
                        style={{
                            textShadow: '0 0 20px rgba(0, 255, 65, 0.5), 0 0 40px rgba(0, 255, 65, 0.3)',
                            filter: 'url(#distress)'
                        }}
                    >
                        MILO
                    </h1>

                    {/* Status indicators */}
                    <div className="flex justify-between w-full px-1 mt-2">
                        <span className="text-[10px] text-pipboy-green/60 font-mono tracking-[0.15em] uppercase">
                            v0.4.0
                        </span>
                        <span className="text-[10px] text-pipboy-orange font-mono tracking-[0.15em] uppercase font-bold animate-pulse">
                            Active
                        </span>
                    </div>

                    {/* SVG filter for distressed text effect */}
                    <svg className="absolute w-0 h-0">
                        <defs>
                            <filter id="distress">
                                <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" />
                                <feDisplacementMap in="SourceGraphic" in2="noise" scale="1" xChannelSelector="R" yChannelSelector="G" />
                            </filter>
                        </defs>
                    </svg>
                </div>
            )}
        </div>
    )
}
