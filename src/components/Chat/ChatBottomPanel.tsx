import React, { useEffect, useRef, useState } from 'react'
import { ChevronUp, ChevronDown, Trash2, MessageSquare, Loader2, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useChatStore } from '@/stores'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { ApiKeySettings } from '../Settings/ApiKeySettings'

/**
 * ChatBottomPanel - Bottom-docked collapsible chat panel
 *
 * Features:
 * - Always visible at bottom of screen
 * - Collapsed state: Just input bar + expand button (~56px)
 * - Expanded state: Full chat history + input (~350px or 50vh)
 * - Smooth height animation between states
 * - Auto-expands when receiving AI response
 * - Click outside or chevron to collapse
 * - Pip-Boy terminal aesthetic
 *
 * Layout:
 * - Collapsed: [💬 input...] [↑] [Send]
 * - Expanded: Header | Messages | Input
 */
export const ChatBottomPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
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
    if (isExpanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isExpanded])

  // Auto-expand when AI starts generating (user sent a message)
  useEffect(() => {
    if (isGenerating) {
      setIsExpanded(true)
    }
  }, [isGenerating])

  // Handle click outside to collapse
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isExpanded && panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsExpanded(false)
      }
    }

    if (isExpanded) {
      // Delay adding listener to avoid immediate trigger
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
      return () => {
        clearTimeout(timer)
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isExpanded])

  const handleSendMessage = (content: string) => {
    sendMessage(content)
    // Expand to show the response
    setIsExpanded(true)
  }

  const handleClearConversation = () => {
    if (window.confirm('Clear all messages? This cannot be undone.')) {
      clearConversation()
    }
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div
      ref={panelRef}
      className={`
        border-t border-pipboy-border bg-pipboy-background
        transition-all duration-300 ease-out
        ${isExpanded ? 'shadow-lg shadow-pipboy-green/10' : ''}
      `}
      style={{
        height: isExpanded ? 'min(350px, 50vh)' : 'auto',
      }}
    >
      {isExpanded ? (
        // EXPANDED STATE
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-pipboy-border bg-pipboy-surface/50">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-pipboy-green" />
              <span className="text-sm font-mono font-medium text-pipboy-green">
                MILO CHAT
              </span>
              {isGenerating && (
                <Loader2 size={12} className="animate-spin text-pipboy-green-dim" />
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                onClick={() => setIsSettingsOpen(true)}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title="API Key Settings"
              >
                <Settings size={14} />
              </Button>
              {messages.length > 0 && (
                <Button
                  onClick={handleClearConversation}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  title="Clear conversation"
                >
                  <Trash2 size={14} />
                </Button>
              )}
              <Button
                onClick={toggleExpanded}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title="Collapse chat"
              >
                <ChevronDown size={16} />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-hidden relative">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-pipboy-green-dim">
                <div className="text-center">
                  <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs opacity-70">Type below to chat with MILO</p>
                </div>
              </div>
            ) : (
              <ChatMessages messages={messages} />
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error display */}
          {error && (
            <div className="px-4 py-2 bg-red-900/20 border-t border-red-500/30">
              <p className="text-xs text-red-400 font-mono">[ERROR] {error}</p>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-pipboy-border bg-pipboy-surface/30">
            <ChatInput
              onSend={handleSendMessage}
              disabled={isGenerating}
              placeholder="Type message to MILO..."
            />
          </div>
        </div>
      ) : (
        // COLLAPSED STATE
        <div className="flex items-center gap-2 px-3 py-2">
          <MessageSquare size={16} className="text-pipboy-green-dim flex-shrink-0" />

          <div className="flex-1">
            <ChatInput
              onSend={handleSendMessage}
              disabled={isGenerating}
              placeholder="Chat with MILO..."
            />
          </div>

          <Button
            onClick={toggleExpanded}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 flex-shrink-0"
            title="Expand chat history"
          >
            {messages.length > 0 ? (
              <div className="relative">
                <ChevronUp size={16} />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-pipboy-green rounded-full text-[8px] text-pipboy-background flex items-center justify-center font-bold">
                  {messages.length > 9 ? '9+' : messages.length}
                </span>
              </div>
            ) : (
              <ChevronUp size={16} />
            )}
          </Button>
        </div>
      )}

      {/* API Key Settings Modal */}
      <ApiKeySettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  )
}
