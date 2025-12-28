import React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  glow?: boolean
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  glow = false,
  className,
  children,
  disabled,
  ...props
}) => {
  const baseStyles = `
    inline-flex items-center justify-center gap-2
    rounded-sm border font-medium
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-pipboy-background
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-95 disabled:active:scale-100
  `

  const variantStyles = {
    primary: `
      bg-pipboy-surface border-pipboy-green/50 text-pipboy-green
      hover:bg-pipboy-green/10 hover:border-pipboy-green
      focus:ring-pipboy-green
      ${glow ? 'shadow-glow-green' : 'hover:shadow-glow-green'}
    `,
    secondary: `
      bg-transparent border-pipboy-border text-pipboy-green-dim
      hover:bg-pipboy-surface hover:border-pipboy-green/30 hover:text-pipboy-green
      focus:ring-pipboy-green/50
    `,
    ghost: `
      bg-transparent border-transparent text-pipboy-green-dim
      hover:bg-pipboy-surface hover:text-pipboy-green
      focus:ring-pipboy-green/30
    `,
    danger: `
      bg-pipboy-surface border-pipboy-red/50 text-pipboy-red
      hover:bg-pipboy-red/10 hover:border-pipboy-red
      focus:ring-pipboy-red
      ${glow ? 'shadow-glow-red' : 'hover:shadow-glow-red'}
    `,
  }

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
