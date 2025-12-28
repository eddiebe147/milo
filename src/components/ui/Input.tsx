import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm text-pipboy-green mb-1.5 glow-low"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 rounded-sm',
            'bg-pipboy-background border',
            'text-pipboy-green placeholder-pipboy-green-dim/50',
            'focus:outline-none focus:shadow-glow-green',
            'transition-all duration-200',
            error
              ? 'border-pipboy-red focus:border-pipboy-red'
              : 'border-pipboy-border focus:border-pipboy-green',
            className
          )}
          {...props}
        />
        {(error || helperText) && (
          <p
            className={cn(
              'mt-1.5 text-xs',
              error ? 'text-pipboy-red' : 'text-pipboy-green-dim'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Textarea variant
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm text-pipboy-green mb-1.5 glow-low"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 rounded-sm resize-none',
            'bg-pipboy-background border',
            'text-pipboy-green placeholder-pipboy-green-dim/50',
            'focus:outline-none focus:shadow-glow-green',
            'transition-all duration-200',
            error
              ? 'border-pipboy-red focus:border-pipboy-red'
              : 'border-pipboy-border focus:border-pipboy-green',
            className
          )}
          {...props}
        />
        {(error || helperText) && (
          <p
            className={cn(
              'mt-1.5 text-xs',
              error ? 'text-pipboy-red' : 'text-pipboy-green-dim'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
