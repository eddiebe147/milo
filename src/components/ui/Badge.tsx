import React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
  glow?: boolean
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  glow = false,
  className,
}) => {
  const variantStyles = {
    default: 'bg-pipboy-surface border-pipboy-border text-pipboy-green-dim',
    success: `bg-pipboy-green/10 border-pipboy-green/50 text-pipboy-green ${glow ? 'shadow-glow-green' : ''}`,
    warning: `bg-pipboy-amber/10 border-pipboy-amber/50 text-pipboy-amber ${glow ? 'shadow-glow-amber' : ''}`,
    danger: `bg-pipboy-red/10 border-pipboy-red/50 text-pipboy-red ${glow ? 'shadow-glow-red' : ''}`,
    info: 'bg-pipboy-surface border-pipboy-green/30 text-pipboy-green',
  }

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border font-medium',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  )
}
