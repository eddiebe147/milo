import React from 'react'
import { cn } from '@/lib/utils'

interface GlowTextProps {
  children: React.ReactNode
  color?: 'green' | 'amber' | 'red'
  intensity?: 'low' | 'medium' | 'high'
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4'
  className?: string
}

export const GlowText: React.FC<GlowTextProps> = ({
  children,
  color = 'green',
  intensity = 'medium',
  as: Component = 'span',
  className,
}) => {
  const colorClasses = {
    green: 'text-pipboy-green',
    amber: 'text-pipboy-amber',
    red: 'text-pipboy-red',
  }

  const intensityClasses = {
    low: 'glow-low',
    medium: 'glow-medium',
    high: 'glow-high',
  }

  return (
    <Component
      className={cn(
        colorClasses[color],
        intensityClasses[intensity],
        className
      )}
    >
      {children}
    </Component>
  )
}
