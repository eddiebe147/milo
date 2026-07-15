import React, { useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'
import { useChatStore } from '@/stores/chatStore'
import { useSettingsStore } from '@/stores/settingsStore'

/**
 * VoiceGaugeDrawer - Submarine-style voice button with red pulsing backlight
 *
 * Design:
 * - Simple mic button in chat panel
 * - Pulses red like a backlit submarine button when active
 * - No sliding animation - just a button with glowing effect
 *
 * Dictation Mode:
 * - Transcribes speech in real-time to chat input
 * - Auto-sends after speech pause (1.5s delay)
 */

interface VoiceGaugeDrawerProps {
  className?: string
  /** Called with transcript updates (for dictation into chat input) */
  onTranscript?: (text: string, isFinal: boolean) => void
  /** Called when speech ends and message should be sent */
  onSend?: () => void
  /** Called when voice active state changes */
  onVoiceActiveChange?: (isActive: boolean) => void
}

export const VoiceGaugeDrawer: React.FC<VoiceGaugeDrawerProps> = ({
  className = '',
  onTranscript,
  onSend,
  onVoiceActiveChange,
}) => {
  const { settings, toggleVoiceMute } = useSettingsStore()
  const { sendMessage, isGenerating, messages } = useChatStore()

  const [isProcessing, setIsProcessing] = useState(false)
  const [pendingTranscript, setPendingTranscript] = useState('')
  const lastMessageCountRef = useRef(messages.length)
  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // TTS hook
  const { speak, isSpeaking, isSupported: ttsSupported } = useTextToSpeech({
    voiceId: settings.voiceId,
    rate: settings.voiceRate,
    onEnd: () => {
      setIsProcessing(false)
    }
  })

  const speakRef = useRef(speak)
  useEffect(() => {
    speakRef.current = speak
  }, [speak])

  // Voice input hook - dictation mode
  const {
    isListening,
    isSupported: voiceInputSupported,
    transcript: _transcript,
    toggleListening,
    clearTranscript,
    error: voiceError,
  } = useVoiceInput({
    continuous: true, // Keep listening until manually stopped
    onTranscript: (text, isFinal) => {
      // Clear any pending auto-send when new speech comes in
      if (autoSendTimeoutRef.current) {
        clearTimeout(autoSendTimeoutRef.current)
        autoSendTimeoutRef.current = null
      }

      if (isFinal && text.trim()) {
        // Final transcript - update pending and notify parent
        setPendingTranscript(prev => prev + (prev ? ' ' : '') + text.trim())
        const fullText = pendingTranscript + (pendingTranscript ? ' ' : '') + text.trim()
        onTranscript?.(fullText, true)

        // Auto-send after pause (1.5 seconds of silence)
        autoSendTimeoutRef.current = setTimeout(() => {
          handleAutoSend()
        }, 1500)
      } else {
        // Interim - show in real-time
        const currentFull = pendingTranscript + (pendingTranscript ? ' ' : '') + text
        onTranscript?.(currentFull, false)
      }
    }
  })

  // Notify parent of voice active state
  useEffect(() => {
    onVoiceActiveChange?.(isListening)
  }, [isListening, onVoiceActiveChange])

  // Watch for AI responses and speak them
  useEffect(() => {
    if (!settings.voiceEnabled || settings.voiceMuted || !isProcessing) return

    if (messages.length > lastMessageCountRef.current) {
      const latestMessage = messages[messages.length - 1]
      if (latestMessage.role === 'assistant') {
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current)
          processingTimeoutRef.current = null
        }
        speakRef.current(latestMessage.content)
      }
    }
    lastMessageCountRef.current = messages.length
  }, [messages, isProcessing, settings.voiceEnabled, settings.voiceMuted])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current)
      }
      if (autoSendTimeoutRef.current) {
        clearTimeout(autoSendTimeoutRef.current)
      }
    }
  }, [])

  // Handle auto-send after speech pause
  const handleAutoSend = () => {
    if (pendingTranscript.trim() && !isGenerating) {
      // Stop listening when sending
      if (isListening) {
        toggleListening()
      }

      // If parent provided onSend, use that; otherwise send directly
      if (onSend) {
        onSend()
      } else {
        sendMessage(pendingTranscript.trim())
      }
      setPendingTranscript('')
      clearTranscript()
      setIsProcessing(true)

      // Timeout for processing
      processingTimeoutRef.current = setTimeout(() => {
        setIsProcessing(false)
      }, 30000)
    }
  }

  const handleToggleVoice = () => {
    // If muted, first click unmutes
    if (settings.voiceMuted) {
      toggleVoiceMute()
      return
    }

    // Toggle listening directly - no drawer animation
    toggleListening()
  }

  // Long press to mute
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseDown = () => {
    longPressTimer.current = setTimeout(() => {
      toggleVoiceMute()
    }, 500)
  }

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const isDisabled = !voiceInputSupported || !ttsSupported || !settings.voiceEnabled

  if (isDisabled) return null

  return (
    <div className={`relative ${className}`}>
      {/* Submarine-style backlit button */}
      <button
        onClick={handleToggleVoice}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        disabled={isDisabled}
        className={`
          relative p-2 rounded-full transition-all duration-200
          ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={
          settings.voiceMuted
            ? 'Click to unmute (long-press to toggle mute)'
            : isListening
              ? 'Click to stop listening'
              : 'Click to speak to MILO (long-press to mute)'
        }
      >
        {/* Red backlight glow when active */}
        {isListening && (
          <>
            {/* Outer pulsing glow */}
            <div
              className="absolute inset-0 rounded-full animate-pulse"
              style={{
                background: 'radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, transparent 70%)',
                transform: 'scale(1.8)',
              }}
            />
            {/* Inner steady glow */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(239, 68, 68, 0.6) 0%, rgba(239, 68, 68, 0.2) 50%, transparent 70%)',
                boxShadow: '0 0 15px rgba(239, 68, 68, 0.5), inset 0 0 8px rgba(239, 68, 68, 0.3)',
              }}
            />
          </>
        )}

        {/* Processing/Speaking glow (yellow/amber) */}
        {(isProcessing || isSpeaking) && !isListening && (
          <div
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, transparent 70%)',
              boxShadow: '0 0 10px rgba(251, 191, 36, 0.4)',
            }}
          />
        )}

        {/* Mic icon */}
        <div className="relative z-10">
          {settings.voiceMuted ? (
            <MicOff
              size={18}
              className="text-red-400"
            />
          ) : isListening ? (
            <Mic
              size={18}
              className="text-red-400"
              style={{ filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.8))' }}
            />
          ) : (
            <Mic
              size={18}
              className={`
                ${isProcessing || isSpeaking ? 'text-amber-400' : 'text-pipboy-green-dim hover:text-pipboy-green'}
                transition-colors duration-200
              `}
            />
          )}
        </div>

        {/* Mute indicator - small red dot */}
        {settings.voiceMuted && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {/* Error tooltip */}
      {voiceError && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-red-900/90 text-red-200 text-xs whitespace-nowrap">
          {voiceError}
        </div>
      )}
    </div>
  )
}
