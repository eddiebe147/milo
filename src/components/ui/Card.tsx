import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'elevated' | 'inset' | 'state-green' | 'state-amber' | 'state-red'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
  hoverable?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  padding = 'md',
  onClick,
  hoverable = false,
}) => {
  const variantStyles = {
    default: 'bg-pipboy-surface border-pipboy-border',
    elevated: 'bg-pipboy-surface border-pipboy-green/30 shadow-glow-green',
    inset: 'bg-pipboy-background border-pipboy-border/50',
    'state-green': 'bg-pipboy-surface border-pipboy-green/50 shadow-glow-green',
    'state-amber': 'bg-pipboy-surface border-pipboy-amber/50 shadow-glow-amber',
    'state-red': 'bg-pipboy-surface border-pipboy-red/50 shadow-glow-red',
  }

  const paddingStyles = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
  }

  const hoverStyles = hoverable
    ? 'cursor-pointer hover:border-pipboy-green/50 transition-all duration-200'
    : ''

  return (
    <div
      className={cn(
        'rounded-sm border',
        variantStyles[variant],
        paddingStyles[padding],
        hoverStyles,
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  )
}

// Card subcomponents
interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => (
  <div className={cn('mb-3', className)}>{children}</div>
)

interface CardTitleProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
}

export const CardTitle: React.FC<CardTitleProps> = ({
  children,
  className,
  glow = true,
}) => (
  <h3
    className={cn(
      'text-lg font-bold text-pipboy-green',
      glow && 'glow-medium',
      className
    )}
  >
    {children}
  </h3>
)

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export const CardContent: React.FC<CardContentProps> = ({ children, className }) => (
  <div className={cn('text-pipboy-green-dim', className)}>{children}</div>
)

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className }) => (
  <div className={cn('mt-4 pt-3 border-t border-pipboy-border', className)}>
    {children}
  </div>
)
