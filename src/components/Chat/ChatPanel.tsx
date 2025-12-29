import React, { useEffect, useRef } from 'react'
import { MessageSquare, ChevronDown, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { GlowText } from '@/components/ui/GlowText'
import { useChatStore } from '@/stores'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'

/**
 * ChatPanel - Main collapsible chat interface
 *
 * Features:
 * - Collapsible bottom panel with smooth transitions
 * - Auto-scroll to latest messages
 * - Pip-Boy green terminal aesthetic
 * - Uses chatStore for message state and API calls
 *
 * Usage:
 * <ChatPanel />
 */
export const ChatPanel: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    isOpen,
    messages,
    isGenerating,
    error,
    togglePanel,
    sendMessage,
    clearConversation,
  } = useChatStore()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSendMessage = (content: string) => {
    sendMessage(content)
  }

  // Closed state - just show button
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={togglePanel}
          variant="primary"
          glow
          size="lg"
          className="shadow-lg"
        >
          <MessageSquare className="w-5 h-5" />
          Talk to MILO
        </Button>
      </div>
    )
  }

  // Open state - full chat panel
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <Card
        variant="elevated"
        padding="none"
        className="max-w-4xl mx-auto h-80 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-pipboy-border bg-pipboy-surface/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-pipboy-green" />
            <GlowText intensity="high" className="font-bold text-lg">
              MILO CHAT
            </GlowText>
          </div>

          <div className="flex items-center gap-2">
            {isGenerating && (
              <span className="text-xs text-pipboy-green-dim animate-pulse">
                Thinking...
              </span>
            )}
            {messages.length > 0 && (
              <Button
                onClick={clearConversation}
                variant="ghost"
                size="sm"
                className="hover:bg-pipboy-green/10"
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button
              onClick={togglePanel}
              variant="ghost"
              size="sm"
              className="hover:bg-pipboy-green/10"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <ChatMessages messages={messages} />
          <div ref={messagesEndRef} />
        </div>

        {/* Error display */}
        {error && (
          <div className="px-4 py-2 bg-red-900/20 border-t border-red-500/30">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-pipboy-border bg-pipboy-surface/50 backdrop-blur-sm">
          <ChatInput
            onSend={handleSendMessage}
            disabled={isGenerating}
          />
        </div>
      </Card>
    </div>
  )
}
