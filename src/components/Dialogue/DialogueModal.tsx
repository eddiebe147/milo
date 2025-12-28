import React, { useEffect, useRef } from 'react'
import { X, Radio } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { GlowText } from '@/components/ui/GlowText'
import type { DialogueMessage } from '@/stores/aiStore'

interface DialogueModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  messages: DialogueMessage[]
  isGenerating: boolean
  children?: React.ReactNode
  footer?: React.ReactNode
}

export const DialogueModal: React.FC<DialogueModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  messages,
  isGenerating,
  children,
  footer,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card
        variant="elevated"
        padding="none"
        className="relative w-full max-w-md mx-4 max-h-[80vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-pipboy-border">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Radio
                size={20}
                className={`text-pipboy-green ${isGenerating ? 'animate-pulse' : ''}`}
              />
              {isGenerating && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-pipboy-green rounded-full animate-ping" />
              )}
            </div>
            <div>
              <GlowText intensity="high" className="font-bold">
                {title}
              </GlowText>
              {subtitle && (
                <p className="text-xs text-pipboy-green-dim">{subtitle}</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[400px]">
          {messages.length === 0 && !isGenerating && (
            <div className="text-center text-pipboy-green-dim py-8">
              <Radio size={32} className="mx-auto mb-2 opacity-50" />
              <p>Awaiting transmission...</p>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isGenerating && (
            <div className="flex items-center gap-2 text-pipboy-green-dim">
              <span className="inline-block w-2 h-2 bg-pipboy-green rounded-full animate-pulse" />
              <span className="inline-block w-2 h-2 bg-pipboy-green rounded-full animate-pulse delay-100" />
              <span className="inline-block w-2 h-2 bg-pipboy-green rounded-full animate-pulse delay-200" />
              <span className="text-xs ml-2">MILO transmitting...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Custom content */}
        {children && (
          <div className="p-4 border-t border-pipboy-border">{children}</div>
        )}

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-pipboy-border bg-pipboy-background/50">
            {footer}
          </div>
        )}
      </Card>
    </div>
  )
}

// Individual message bubble
const MessageBubble: React.FC<{ message: DialogueMessage }> = ({ message }) => {
  const isUser = message.role === 'user'
  const timestamp = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[85%] rounded-sm p-3
          ${isUser
            ? 'bg-pipboy-green/10 border border-pipboy-green/30'
            : 'bg-pipboy-surface border border-pipboy-border'
          }
        `}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-pipboy-green-dim">
            [{timestamp}]
          </span>
          <span className="text-xs font-bold text-pipboy-green">
            {isUser ? 'OPERATOR' : 'MILO'}
          </span>
        </div>
        <p className="text-sm text-pipboy-green whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
    </div>
  )
}
