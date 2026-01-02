import React, { useEffect, useState } from 'react'
import waveformImage from '@/assets/milo-waveform.png'

interface WaveformMonitorProps {
    isActive?: boolean
    size?: 'sm' | 'md' | 'lg' | 'xl'
    className?: string
}

export const WaveformMonitor: React.FC<WaveformMonitorProps> = ({
    isActive = false,
    size = 'md',
    className = ''
}) => {
    // Size mapping
    const sizeMap = {
        sm: 'w-8 h-8',
        md: 'w-16 h-16',
        lg: 'w-32 h-32',
        xl: 'w-64 h-64'
    }

    // Animated waveform bars state
    const BAR_COUNT = 24
    const [bars, setBars] = useState<number[]>(new Array(BAR_COUNT).fill(10))

    useEffect(() => {
        let animationFrame: number
        let timeout: ReturnType<typeof setTimeout>

        const animate = () => {
            setBars(currentBars => currentBars.map((_, i) => {
                // Create a more natural waveform shape - higher in center
                const centerDist = Math.abs(i - BAR_COUNT / 2) / (BAR_COUNT / 2)
                const base = isActive ? 40 - centerDist * 20 : 8 - centerDist * 5
                const variance = isActive ? 50 : 8
                return Math.max(3, Math.min(95, base + Math.random() * variance))
            }))

            timeout = setTimeout(() => {
                animationFrame = requestAnimationFrame(animate)
            }, isActive ? 80 : 150)
        }

        animate()

        return () => {
            if (animationFrame) cancelAnimationFrame(animationFrame)
            if (timeout) clearTimeout(timeout)
        }
    }, [isActive])

    return (
        <div className={`relative ${sizeMap[size]} ${className}`}>
            {/* Base Image - The actual asset with all the industrial detail */}
            <img
                src={waveformImage}
                alt="MILO Waveform Monitor"
                className={`absolute inset-0 w-full h-full object-cover rounded-full ${!isActive ? 'opacity-80' : 'opacity-100'} transition-opacity duration-300`}
                draggable={false}
            />

            {/* Animated Waveform Overlay - positioned in center of gauge */}
            <div className="absolute inset-[18%] flex items-center justify-center overflow-hidden rounded-full">
                <div className="flex items-center justify-center gap-[2px] h-full w-full">
                    {bars.map((height, i) => (
                        <div
                            key={i}
                            className="flex-1 max-w-[3%] rounded-sm transition-all duration-75 ease-out"
                            style={{
                                height: `${height}%`,
                                backgroundColor: isActive
                                    ? `rgba(0, 255, 65, ${0.7 + Math.random() * 0.3})`
                                    : 'rgba(0, 255, 65, 0.4)',
                                boxShadow: isActive
                                    ? `0 0 ${4 + height/20}px rgba(0, 255, 65, 0.6)`
                                    : '0 0 2px rgba(0, 255, 65, 0.3)'
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Pulsing glow when active */}
            {isActive && (
                <div className="absolute inset-0 rounded-full animate-pulse-slow pointer-events-none"
                    style={{
                        boxShadow: '0 0 30px rgba(0, 255, 65, 0.4), inset 0 0 20px rgba(0, 255, 65, 0.1)'
                    }}
                />
            )}

            {/* Breathing effect when idle */}
            {!isActive && (
                <div className="absolute inset-0 rounded-full animate-breathe pointer-events-none"
                    style={{
                        boxShadow: '0 0 15px rgba(0, 255, 65, 0.2)'
                    }}
                />
            )}

            {/* Scanline sweep animation */}
            <div
                className="absolute inset-[10%] rounded-full overflow-hidden pointer-events-none"
                style={{ mixBlendMode: 'overlay' }}
            >
                <div
                    className="absolute inset-0 animate-[scanline_4s_linear_infinite]"
                    style={{
                        background: 'linear-gradient(180deg, transparent 0%, rgba(0, 255, 65, 0.1) 50%, transparent 100%)',
                        height: '200%'
                    }}
                />
            </div>

            {/* Noise/grain texture overlay */}
            <div
                className="absolute inset-0 rounded-full pointer-events-none opacity-20"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                    mixBlendMode: 'overlay'
                }}
            />
        </div>
    )
}
