import React, { useEffect, useRef, useState } from 'react'
import { WaveformMonitor } from '@/components/ui/WaveformMonitor'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'
import { useChatStore } from '@/stores/chatStore'
import { useSettingsStore } from '@/stores/settingsStore'

/**
 * Voice Assistant Button - Floating button for voice interaction with MILO
 *
 * States:
 * - Idle: Ready to listen
 * - Listening: Actively recording user speech
 * - Processing: Waiting for AI response
 * - Speaking: MILO is speaking the response
 *
 * Flow:
 * 1. User clicks button -> Start listening
 * 2. User speaks -> Transcript captured
 * 3. Speech ends -> Send to AI via chat
 * 4. AI responds -> Speak response via TTS
 * 5. TTS ends -> Return to idle
 */
export const VoiceAssistantButton: React.FC = () => {
  const { settings } = useSettingsStore()
  const { sendMessage, isGenerating, messages } = useChatStore()

  const [isProcessing, setIsProcessing] = useState(false)
  const lastMessageCountRef = useRef(messages.length)
  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // TTS hook - must be before speakRef initialization
  const { speak, isSpeaking, isSupported: ttsSupported } = useTextToSpeech({
    voiceId: settings.voiceId,
    rate: settings.voiceRate,
    onEnd: () => {
      // When TTS finishes, we're back to idle
      setIsProcessing(false)
    }
  })

  // Stable ref for speak function to avoid useEffect dependency issues
  const speakRef = useRef(speak)

  // Keep speak ref updated
  useEffect(() => {
    speakRef.current = speak
  }, [speak])

  // Voice input hook
  const {
    isListening,
    isSupported: voiceInputSupported,
    transcript,
    toggleListening,
    clearTranscript,
    error: voiceError,
  } = useVoiceInput({
    onTranscript: (text, isFinal) => {
      if (isFinal && text.trim()) {
        handleVoiceCommand(text.trim())
      }
    }
  })

  // Watch for new AI responses and speak them
  useEffect(() => {
    if (!settings.voiceEnabled || !isProcessing) return

    // Check if a new message was added
    if (messages.length > lastMessageCountRef.current) {
      const latestMessage = messages[messages.length - 1]

      // If it's an assistant message, speak it
      if (latestMessage.role === 'assistant') {
        // Clear timeout since we got a response
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current)
          processingTimeoutRef.current = null
        }
        speakRef.current(latestMessage.content)
      }
    }

    lastMessageCountRef.current = messages.length
  }, [messages, isProcessing, settings.voiceEnabled]) // speak removed - using ref

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop voice recognition
      window.speechSynthesis?.cancel()
      // Clear any pending timeout
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current)
      }
    }
  }, [])

  // Handle voice command
  const handleVoiceCommand = async (command: string) => {
    // Stop listening
    if (isListening) {
      toggleListening()
    }

    clearTranscript()
    setIsProcessing(true)

    // Fallback timeout - reset processing state if response never comes
    processingTimeoutRef.current = setTimeout(() => {
      setIsProcessing(false)
    }, 30000) // 30 second timeout

    try {
      // Send to AI via chat store
      await sendMessage(command)
      // Response will be spoken via useEffect when message arrives
    } catch (error) {
      console.error('Failed to process voice command:', error)
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current)
        processingTimeoutRef.current = null
      }
      setIsProcessing(false)
    }
  }

  // Handle button click
  const handleClick = () => {
    if (isGenerating || isProcessing) {
      // Don't allow new voice input while processing
      return
    }

    toggleListening()
  }

  // Determine current state for UI
  const getStatus = () => {
    if (isSpeaking) return { label: 'Speaking', color: 'text-accent' }
    if (isGenerating) return { label: 'Processing', color: 'text-accent' }
    if (isListening) return { label: 'Listening', color: 'text-primary' }
    if (voiceError) return { label: 'Error', color: 'text-danger' }
    return { label: 'Voice Assistant', color: 'text-gray-400' }
  }

  const status = getStatus()
  const isActive = isListening || isSpeaking || isGenerating
  const isDisabled = isGenerating || !voiceInputSupported || !ttsSupported || !settings.voiceEnabled

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-center gap-2">
      {/* Main Voice Button */}
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={`
          group relative
          transition-all duration-300
          ${isActive ? 'scale-110' : 'scale-100'}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}
        `}
        title={
          !voiceInputSupported
            ? 'Voice input not supported'
            : !ttsSupported
            ? 'Text-to-speech not supported'
            : !settings.voiceEnabled
            ? 'Voice disabled in settings'
            : 'Click to talk to MILO'
        }
      >
        {/* Waveform Monitor */}
        <WaveformMonitor isActive={isActive} size="lg" />

        {/* Pulse ring when listening */}
        {isListening && (
          <div className="absolute inset-0 rounded-full animate-ping-slow opacity-75 pointer-events-none">
            <div
              className="w-full h-full rounded-full border-2"
              style={{ borderColor: 'var(--color-primary)' }}
            />
          </div>
        )}
      </button>

      {/* Status Label */}
      <div className={`
        px-3 py-1 rounded-full
        bg-black/80 backdrop-blur-sm
        border border-gray-700
        text-xs font-mono
        transition-all duration-200
        ${status.color}
      `}>
        {status.label}
      </div>

      {/* Transcript Preview (while listening) */}
      {isListening && transcript && (
        <div className="
          max-w-[200px] px-3 py-2 rounded-lg
          bg-black/90 backdrop-blur-sm
          border border-primary/50
          text-xs font-mono text-primary
          shadow-lg shadow-primary/20
          animate-fade-in
        ">
          {transcript}
        </div>
      )}

      {/* Error Display */}
      {voiceError && (
        <div className="
          max-w-[200px] px-3 py-2 rounded-lg
          bg-black/90 backdrop-blur-sm
          border border-danger/50
          text-xs font-mono text-danger
          shadow-lg shadow-danger/20
        ">
          {voiceError}
        </div>
      )}
    </div>
  )
}
