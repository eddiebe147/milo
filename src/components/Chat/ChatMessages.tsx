import React, { useState, useEffect, useRef } from 'react'
import { GlowText } from '@/components/ui/GlowText'
import type { ChatMessage } from '@/stores'

interface ChatMessagesProps {
  messages: ChatMessage[]
}

/**
 * ChatMessages - Terminal-style message list with typewriter effect
 *
 * Features:
 * - Retro terminal aesthetic (no boxes/bubbles)
 * - Typewriter animation for MILO responses
 * - Command prompt style (> for user, MILO: for assistant)
 * - Blinking cursor during typing
 * - Monospace font throughout
 */
export const ChatMessages: React.FC<ChatMessagesProps> = ({ messages }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <GlowText intensity="low" className="text-sm font-mono">
            AWAITING INPUT...
          </GlowText>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto p-4 font-mono text-sm custom-scrollbar"
    >
      {messages.map((message, index) => (
        <TerminalMessage
          key={message.id}
          message={message}
          isLatest={index === messages.length - 1}
        />
      ))}
    </div>
  )
}

/**
 * TerminalMessage - Individual message with typewriter effect
 */
const TerminalMessage: React.FC<{
  message: ChatMessage
  isLatest: boolean
}> = ({ message, isLatest }) => {
  const isUser = message.role === 'user'
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [hasTyped, setHasTyped] = useState(false)

  // Typewriter effect for MILO messages
  useEffect(() => {
    // Only animate the latest MILO message that hasn't been typed yet
    if (!isUser && isLatest && !hasTyped) {
      setIsTyping(true)
      setDisplayedText('')

      const text = message.content
      let currentIndex = 0

      // Variable speed for more natural feel
      const getDelay = () => {
        const char = text[currentIndex]
        if (char === '.' || char === '!' || char === '?') return 80
        if (char === ',') return 40
        if (char === '\n') return 60
        return 15 + Math.random() * 15 // 15-30ms base
      }

      const typeNextChar = () => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1))
          currentIndex++
          setTimeout(typeNextChar, getDelay())
        } else {
          setIsTyping(false)
          setHasTyped(true)
        }
      }

      // Small initial delay before starting
      setTimeout(typeNextChar, 100)
    } else if (!isUser && !isLatest) {
      // Show full text for older messages
      setDisplayedText(message.content)
      setHasTyped(true)
    } else if (isUser) {
      setDisplayedText(message.content)
    }
  }, [message.content, isUser, isLatest, hasTyped])

  // Reset hasTyped when message changes
  useEffect(() => {
    if (isLatest && !isUser) {
      setHasTyped(false)
    }
  }, [message.id, isLatest, isUser])

  return (
    <div className="mb-3">
      {isUser ? (
        // User input - command prompt style (uses --chat-user-color)
        <div className="flex">
          <span
            className="mr-2 select-none opacity-70"
            style={{ color: 'var(--chat-user-color)' }}
          >
            &gt;
          </span>
          <span style={{ color: 'var(--chat-user-color)' }}>
            {displayedText}
          </span>
        </div>
      ) : (
        // MILO response - labeled with typewriter (uses --chat-ai-color)
        <div>
          <span
            className="text-xs mb-1 block opacity-70"
            style={{ color: 'var(--chat-ai-color)' }}
          >
            [MILO]
          </span>
          <div
            className="pl-2 border-l"
            style={{ borderColor: 'color-mix(in srgb, var(--chat-ai-color) 30%, transparent)' }}
          >
            <span
              className="whitespace-pre-wrap"
              style={{ color: 'var(--chat-ai-color)' }}
            >
              {displayedText}
            </span>
            {/* Blinking cursor while typing */}
            {isTyping && (
              <span
                className="animate-blink"
                style={{ color: 'var(--chat-ai-color)' }}
              >
                ▌
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Add blink animation to global styles or inline
const style = document.createElement('style')
style.textContent = `
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
  .animate-blink {
    animation: blink 0.8s infinite;
  }
`
if (!document.querySelector('style[data-milo-blink]')) {
  style.setAttribute('data-milo-blink', 'true')
  document.head.appendChild(style)
}
