import React from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number // 0-100
  max?: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  glow?: boolean
  className?: string
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  showLabel = false,
  glow = true,
  className,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  // Determine variant based on percentage if default
  const effectiveVariant = variant === 'default'
    ? percentage >= 75
      ? 'success'
      : percentage >= 50
        ? 'warning'
        : 'danger'
    : variant

  const variantStyles = {
    success: 'bg-pipboy-green',
    warning: 'bg-pipboy-amber',
    danger: 'bg-pipboy-red',
    default: 'bg-pipboy-green',
  }

  const glowStyles = {
    success: 'shadow-glow-green',
    warning: 'shadow-glow-amber',
    danger: 'shadow-glow-red',
    default: 'shadow-glow-green',
  }

  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'w-full bg-pipboy-background border border-pipboy-border rounded-sm overflow-hidden',
          sizeStyles[size]
        )}
      >
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out',
            variantStyles[effectiveVariant],
            glow && glowStyles[effectiveVariant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs">
          <span className="text-pipboy-green-dim">{value}</span>
          <span className="text-pipboy-green-dim">{max}</span>
        </div>
      )}
    </div>
  )
}

// Circular progress variant
interface CircularProgressProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
  showValue?: boolean
  className?: string
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 60,
  strokeWidth = 4,
  variant = 'default',
  showValue = true,
  className,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  const effectiveVariant = variant === 'default'
    ? percentage >= 75
      ? 'success'
      : percentage >= 50
        ? 'warning'
        : 'danger'
    : variant

  const colorStyles = {
    success: 'stroke-pipboy-green',
    warning: 'stroke-pipboy-amber',
    danger: 'stroke-pipboy-red',
    default: 'stroke-pipboy-green',
  }

  const textColorStyles = {
    success: 'text-pipboy-green',
    warning: 'text-pipboy-amber',
    danger: 'text-pipboy-red',
    default: 'text-pipboy-green',
  }

  return (
    <div className={cn('relative inline-flex', className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-pipboy-border"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            colorStyles[effectiveVariant],
            'transition-all duration-500 ease-out'
          )}
          style={{
            filter: `drop-shadow(0 0 4px currentColor)`,
          }}
        />
      </svg>
      {showValue && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center text-sm font-bold',
            textColorStyles[effectiveVariant]
          )}
        >
          {Math.round(percentage)}
        </div>
      )}
    </div>
  )
}
