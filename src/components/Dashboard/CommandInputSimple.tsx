import React, { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Send, Loader2, AlertCircle, MessageSquare } from 'lucide-react'
import { useChatStore } from '@/stores'
import { useVoiceInput } from '@/hooks/useVoiceInput'

interface CommandInputSimpleProps {
  onOpenChat: () => void
}

/**
 * Simplified command input for DashboardV3.
 * - Text/voice input for quick commands
 * - Chat button to open slide-out panel (no inline chat history)
 * - Compact design
 */
export const CommandInputSimple: React.FC<CommandInputSimpleProps> = ({ onOpenChat }) => {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, isGenerating, error, sendMessage } = useChatStore()

  // Voice input hook
  const {
    isListening,
    isSupported: isVoiceSupported,
    interimTranscript,
    error: voiceError,
    toggleListening,
    clearTranscript,
  } = useVoiceInput({
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        setInputValue(prev => prev + text)
      }
    },
  })

  // Show interim transcript while listening
  const displayValue = isListening && interimTranscript
    ? inputValue + interimTranscript
    : inputValue

  // Unread indicator - show badge if there are messages and chat isn't open
  const hasMessages = messages.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const message = inputValue.trim()
    if (!message || isGenerating) return

    // Stop listening if active
    if (isListening) {
      toggleListening()
    }

    setInputValue('')
    clearTranscript()
    await sendMessage(message)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleVoiceToggle = () => {
    if (!isListening) {
      clearTranscript()
    }
    toggleListening()
  }

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="space-y-2">
      {/* Input area */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-2 p-1 bg-pipboy-surface border border-pipboy-border rounded-sm">
          {/* Voice button */}
          {isVoiceSupported && (
            <button
              type="button"
              onClick={handleVoiceToggle}
              disabled={isGenerating}
              className={`
                p-2 rounded-sm transition-all duration-200
                ${isListening
                  ? 'bg-pipboy-green/20 text-pipboy-green animate-pulse'
                  : 'text-pipboy-green-dim hover:text-pipboy-green hover:bg-pipboy-surface'
                }
                disabled:opacity-50
              `}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? (
                <Mic size={16} className="animate-pulse" />
              ) : (
                <MicOff size={16} />
              )}
            </button>
          )}

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Listening...' : 'Tell MILO what you need...'}
            disabled={isGenerating}
            className={`
              flex-1 bg-transparent border-none outline-none
              text-pipboy-green placeholder-pipboy-green-dim/50
              text-sm py-1.5
              disabled:opacity-50
              ${isListening ? 'text-pipboy-green/70' : ''}
            `}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={!inputValue.trim() || isGenerating}
            className={`
              p-2 rounded-sm transition-all duration-200
              text-pipboy-green-dim
              hover:text-pipboy-green hover:bg-pipboy-green/10
              disabled:opacity-30 disabled:cursor-not-allowed
            `}
            title="Send message"
          >
            {isGenerating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>

          {/* Chat panel toggle */}
          <button
            type="button"
            onClick={onOpenChat}
            className={`
              p-2 rounded-sm transition-all duration-200 relative
              text-pipboy-green-dim
              hover:text-pipboy-green hover:bg-pipboy-green/10
            `}
            title="Open chat history"
          >
            <MessageSquare size={16} />
            {hasMessages && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-pipboy-green rounded-full" />
            )}
          </button>
        </div>

        {/* Voice error */}
        {voiceError && (
          <div className="absolute -bottom-5 left-0 text-xs text-pipboy-amber flex items-center gap-1">
            <AlertCircle size={12} />
            <span>{voiceError}</span>
          </div>
        )}
      </form>

      {/* Error display */}
      {error && (
        <div className="p-2 rounded-sm bg-pipboy-red/10 border border-pipboy-red/30 text-pipboy-red text-xs flex items-center gap-2">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Generating indicator - compact */}
      {isGenerating && (
        <div className="flex items-center gap-2 text-xs text-pipboy-green-dim">
          <Loader2 size={12} className="animate-spin" />
          <span>MILO is thinking...</span>
        </div>
      )}
    </div>
  )
}
