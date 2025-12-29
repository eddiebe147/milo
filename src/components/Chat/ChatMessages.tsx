import React from 'react'
import { cn } from '@/lib/utils'
import { GlowText } from '@/components/ui/GlowText'
import type { ChatMessage } from '@/stores'

interface ChatMessagesProps {
  messages: ChatMessage[]
}

/**
 * ChatMessages - Scrollable message list component
 *
 * Features:
 * - User messages: right-aligned with green border
 * - MILO messages: left-aligned with label
 * - Empty state for no messages
 * - Smooth scrolling
 * - Timestamp display
 *
 * Usage:
 * <ChatMessages messages={dialogueMessages} />
 */
export const ChatMessages: React.FC<ChatMessagesProps> = ({ messages }) => {
  // Empty state
  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <GlowText intensity="low" className="text-sm">
            No messages yet. Start a conversation with MILO.
          </GlowText>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 custom-scrollbar">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  )
}

/**
 * MessageBubble - Individual message component
 */
const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user'
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      className={cn(
        'flex flex-col gap-1',
        isUser ? 'items-end' : 'items-start'
      )}
    >
      {/* Message header with role and timestamp */}
      <div className="flex items-center gap-2 px-1">
        {!isUser && (
          <span className="text-xs font-bold text-pipboy-green glow-low">
            MILO
          </span>
        )}
        <span className="text-xs text-pipboy-green-dim/70">
          {timestamp}
        </span>
        {isUser && (
          <span className="text-xs font-bold text-pipboy-green glow-low">
            YOU
          </span>
        )}
      </div>

      {/* Message bubble */}
      <div
        className={cn(
          'max-w-[80%] px-4 py-2.5 rounded-sm border',
          'transition-all duration-200',
          isUser
            ? 'bg-pipboy-surface border-pipboy-green/50 shadow-glow-green/20'
            : 'bg-pipboy-background border-pipboy-border'
        )}
      >
        <p className="text-sm text-pipboy-green leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
    </div>
  )
}
