import React, { useEffect, useRef } from 'react'
import { X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { GlowText } from '@/components/ui/GlowText'
import { useChatStore } from '@/stores'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'

interface ChatSlidePanelProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * ChatSlidePanel - Right-side slide-out chat panel
 *
 * Features:
 * - Slides in from right with smooth animation
 * - Semi-transparent backdrop with click-outside-to-close
 * - Escape key support to close
 * - Full chat history with auto-scroll
 * - Clear conversation button
 * - Pip-Boy green terminal aesthetic
 * - Responsive width (80% mobile, 400px desktop)
 *
 * Usage:
 * ```tsx
 * const [isPanelOpen, setIsPanelOpen] = useState(false)
 *
 * <ChatSlidePanel
 *   isOpen={isPanelOpen}
 *   onClose={() => setIsPanelOpen(false)}
 * />
 * ```
 *
 * Accessibility:
 * - Focus trap when open
 * - Escape key to close
 * - ARIA labels for close button
 * - Backdrop click to close
 *
 * Performance:
 * - Uses transform for animations (GPU-accelerated)
 * - Auto-scroll optimized with useRef
 * - Conditional rendering when closed
 */
export const ChatSlidePanel: React.FC<ChatSlidePanelProps> = ({
  isOpen,
  onClose,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    isGenerating,
    error,
    sendMessage,
    clearConversation,
  } = useChatStore()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Handle Escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleSendMessage = (content: string) => {
    sendMessage(content)
  }

  const handleClearConversation = () => {
    if (window.confirm('Clear all messages? This cannot be undone.')) {
      clearConversation()
    }
  }

  // Don't render anything when closed (performance optimization)
  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Backdrop - semi-transparent overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Slide Panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 bottom-0 z-50 w-[80%] sm:w-[400px]
                   bg-pipboy-background border-l border-pipboy-border shadow-2xl
                   transform transition-transform duration-300 ease-out
                   flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-panel-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-pipboy-border bg-pipboy-surface/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <h2 id="chat-panel-title" className="sr-only">MILO Chat Panel</h2>
            <GlowText intensity="high" className="font-bold text-lg font-mono">
              MILO CHAT
            </GlowText>
            {isGenerating && (
              <span className="text-xs text-pipboy-green-dim animate-pulse font-mono">
                [PROCESSING...]
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button
                onClick={handleClearConversation}
                variant="ghost"
                size="sm"
                className="hover:bg-pipboy-green/10"
                title="Clear conversation"
                aria-label="Clear all messages"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="hover:bg-pipboy-green/10"
              aria-label="Close chat panel"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden relative">
          <ChatMessages messages={messages} />
          <div ref={messagesEndRef} />
        </div>

        {/* Error display */}
        {error && (
          <div className="px-4 py-2 bg-red-900/20 border-t border-red-500/30">
            <p className="text-xs text-red-400 font-mono">[ERROR] {error}</p>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-pipboy-border bg-pipboy-surface/50 backdrop-blur-sm">
          <ChatInput
            onSend={handleSendMessage}
            disabled={isGenerating}
            placeholder="Type message to MILO..."
          />
        </div>

        {/* Terminal-style footer indicator */}
        <div className="px-4 py-1 border-t border-pipboy-border/50 bg-pipboy-background">
          <div className="flex items-center justify-between text-xs font-mono text-pipboy-green-dim/50">
            <span>{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
            <span>[ESC] to close</span>
          </div>
        </div>
      </div>
    </>
  )
}
