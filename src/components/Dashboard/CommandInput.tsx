import React, { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Send, Loader2, AlertCircle } from 'lucide-react'
import { useChatStore } from '@/stores'
import { useVoiceInput } from '@/hooks/useVoiceInput'

export const CommandInput: React.FC = () => {
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

  // Get last 3 messages for display
  const recentMessages = messages.slice(-3)

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
      // Starting to listen - clear input if empty
      clearTranscript()
    }
    toggleListening()
  }

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="space-y-3">
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
                p-2.5 rounded-sm transition-all duration-200
                ${isListening
                  ? 'bg-pipboy-green/20 text-pipboy-green animate-pulse'
                  : 'text-pipboy-green-dim hover:text-pipboy-green hover:bg-pipboy-surface'
                }
                disabled:opacity-50
              `}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? (
                <Mic size={18} className="animate-pulse" />
              ) : (
                <MicOff size={18} />
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
            placeholder={isListening ? 'Listening...' : "What's on your mind?"}
            disabled={isGenerating}
            className={`
              flex-1 bg-transparent border-none outline-none
              text-pipboy-green placeholder-pipboy-green-dim/50
              text-sm py-2
              disabled:opacity-50
              ${isListening ? 'text-pipboy-green/70' : ''}
            `}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={!inputValue.trim() || isGenerating}
            className={`
              p-2.5 rounded-sm transition-all duration-200
              text-pipboy-green-dim
              hover:text-pipboy-green hover:bg-pipboy-green/10
              disabled:opacity-30 disabled:cursor-not-allowed
            `}
            title="Send message"
          >
            {isGenerating ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>

        {/* Voice error */}
        {voiceError && (
          <div className="absolute -bottom-6 left-0 text-xs text-pipboy-amber flex items-center gap-1">
            <AlertCircle size={12} />
            <span>{voiceError}</span>
          </div>
        )}
      </form>

      {/* Recent messages (last 3) */}
      {recentMessages.length > 0 && (
        <div className="space-y-2 max-h-[180px] overflow-y-auto">
          {recentMessages.map((message) => (
            <div
              key={message.id}
              className={`
                p-3 rounded-sm text-sm
                ${message.role === 'user'
                  ? 'bg-pipboy-surface/50 border border-pipboy-border/50 ml-8'
                  : 'bg-pipboy-green/5 border border-pipboy-green/20'
                }
              `}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`
                    text-[10px] uppercase tracking-wider font-bold
                    ${message.role === 'user' ? 'text-pipboy-green-dim' : 'text-pipboy-green'}
                  `}
                >
                  {message.role === 'user' ? 'You' : 'MILO'}
                </span>
                <span className="text-[10px] text-pipboy-green-dim/50">
                  {formatTime(message.timestamp)}
                </span>
              </div>
              <p className={`
                mt-1 leading-relaxed
                ${message.role === 'user' ? 'text-pipboy-green-dim' : 'text-pipboy-green'}
              `}>
                {message.content}
              </p>
            </div>
          ))}

          {/* Generating indicator */}
          {isGenerating && (
            <div className="p-3 rounded-sm bg-pipboy-green/5 border border-pipboy-green/20">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-pipboy-green">
                  MILO
                </span>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-pipboy-green rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-pipboy-green rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-pipboy-green rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-2 rounded-sm bg-pipboy-red/10 border border-pipboy-red/30 text-pipboy-red text-xs flex items-center gap-2">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Empty state - prompt */}
      {recentMessages.length === 0 && !isGenerating && (
        <div className="text-center py-2">
          <p className="text-xs text-pipboy-green-dim/70">
            Ask MILO anything, capture tasks, or get your daily briefing
          </p>
        </div>
      )}
    </div>
  )
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
