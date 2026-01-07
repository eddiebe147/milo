import React, { useState, useEffect, useRef, useCallback } from 'react'
import { GlowText } from '@/components/ui/GlowText'
import { useTextToSpeech } from '@/hooks'
import { useSettingsStore } from '@/stores/settingsStore'
import type { ChatMessage } from '@/stores'

interface ChatMessagesProps {
  messages: ChatMessage[]
  /** Called during typing animation so parent can auto-scroll */
  onTypingProgress?: () => void
}

// Track which message IDs have already been animated (persists across re-renders)
const animatedMessageIds = new Set<string>()

// Track which message IDs have already been spoken (with size limit to prevent memory leak)
const MAX_SPOKEN_MESSAGES = 100
const spokenMessageIds = new Set<string>()

function addSpokenMessage(id: string) {
  if (spokenMessageIds.size >= MAX_SPOKEN_MESSAGES) {
    const firstId = spokenMessageIds.values().next().value
    if (firstId) spokenMessageIds.delete(firstId)
  }
  spokenMessageIds.add(id)
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
export const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, onTypingProgress }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Get voice settings from store
  const { settings } = useSettingsStore()
  const { voiceEnabled, voiceId, voiceRate } = settings

  // Initialize TTS hook with settings
  const { speak } = useTextToSpeech({
    voiceId: voiceId || undefined,
    rate: voiceRate,
  })

  // Speak new assistant messages
  useEffect(() => {
    if (!voiceEnabled) return

    // Find the latest assistant message that hasn't been spoken yet
    const latestAssistantMessage = [...messages]
      .reverse()
      .find(msg => msg.role === 'assistant' && !spokenMessageIds.has(msg.id))

    if (latestAssistantMessage) {
      addSpokenMessage(latestAssistantMessage.id)
      speak(latestAssistantMessage.content)
    }
  }, [messages, voiceEnabled, speak])

  // Stop speech on unmount - use direct API call to avoid dependency issues
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
    }
  }, [])

  // Scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Handle typing progress - scroll during animation
  const handleTypingProgress = useCallback(() => {
    scrollToBottom()
    onTypingProgress?.()
  }, [scrollToBottom, onTypingProgress])

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
          onTypingProgress={handleTypingProgress}
        />
      ))}
    </div>
  )
}

/**
 * TerminalMessage - Individual message with typewriter effect
 *
 * Key behavior:
 * - User messages show immediately (no animation)
 * - MILO messages animate ONLY ONCE, ever - tracked by message ID
 * - Previously animated messages show full text immediately
 * - Calls onTypingProgress during animation for scroll sync
 */
const TerminalMessage: React.FC<{
  message: ChatMessage
  isLatest: boolean
  onTypingProgress?: () => void
}> = ({ message, isLatest, onTypingProgress }) => {
  const isUser = message.role === 'user'

  // Check if this message has already been animated (persists across component lifecycle)
  const alreadyAnimated = animatedMessageIds.has(message.id)

  const [displayedText, setDisplayedText] = useState(() => {
    // Initialize with full text if already animated or is user message
    if (isUser || alreadyAnimated) return message.content
    return ''
  })
  const [isTyping, setIsTyping] = useState(false)

  // Typewriter effect for MILO messages - runs ONLY ONCE per message ID
  useEffect(() => {
    // User messages: show immediately
    if (isUser) {
      setDisplayedText(message.content)
      return
    }

    // Already animated: show full text immediately
    if (alreadyAnimated) {
      setDisplayedText(message.content)
      return
    }

    // Only animate the latest MILO message that hasn't been animated yet
    if (!isLatest) {
      // Not the latest - mark as animated and show full text
      animatedMessageIds.add(message.id)
      setDisplayedText(message.content)
      return
    }

    // This is the latest, not animated yet - start typewriter
    setIsTyping(true)
    setDisplayedText('')

    const text = message.content
    let currentIndex = 0
    let animationActive = true

    // Variable speed for more natural feel
    const getDelay = () => {
      const char = text[currentIndex]
      if (char === '.' || char === '!' || char === '?') return 80
      if (char === ',') return 40
      if (char === '\n') return 60
      return 15 + Math.random() * 15 // 15-30ms base
    }

    const typeNextChar = () => {
      if (!animationActive) return

      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1))
        currentIndex++

        // Notify parent for scroll sync every few characters
        if (currentIndex % 5 === 0) {
          onTypingProgress?.()
        }

        setTimeout(typeNextChar, getDelay())
      } else {
        // Animation complete - mark as animated permanently
        animatedMessageIds.add(message.id)
        setIsTyping(false)
        onTypingProgress?.() // Final scroll
      }
    }

    // Small initial delay before starting
    const timer = setTimeout(typeNextChar, 100)

    // Cleanup if component unmounts during animation
    return () => {
      animationActive = false
      clearTimeout(timer)
      // If we started animating but didn't finish, mark as animated anyway
      if (!animatedMessageIds.has(message.id)) {
        animatedMessageIds.add(message.id)
      }
    }
  }, [message.id, message.content, isUser, isLatest, alreadyAnimated, onTypingProgress])

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
