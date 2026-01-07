import React, { useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { WaveformMonitor } from '@/components/ui/WaveformMonitor'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'
import { useChatStore } from '@/stores/chatStore'
import { useSettingsStore } from '@/stores/settingsStore'

/**
 * VoiceGaugeDrawer - Submarine-style slide-out voice gauge
 *
 * Design:
 * - Round gauge embedded in panel edge (like a bulkhead instrument)
 * - Slides out 3/4 visible when active
 * - Industrial bezel with rivets
 * - Waveform responds to voice amplitude
 *
 * Inspired by: 90s Winamp skins, submarine control panels, car dashboard gauges
 */

interface VoiceGaugeDrawerProps {
  className?: string
}

export const VoiceGaugeDrawer: React.FC<VoiceGaugeDrawerProps> = ({ className = '' }) => {
  const { settings, toggleVoiceMute } = useSettingsStore()
  const { sendMessage, isGenerating, messages } = useChatStore()

  const [isOpen, setIsOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const lastMessageCountRef = useRef(messages.length)
  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // TTS hook
  const { speak, isSpeaking, isSupported: ttsSupported } = useTextToSpeech({
    voiceId: settings.voiceId,
    rate: settings.voiceRate,
    onEnd: () => {
      setIsProcessing(false)
      // Auto-close after speaking (with delay)
      setTimeout(() => {
        if (!isListening) setIsOpen(false)
      }, 1500)
    }
  })

  const speakRef = useRef(speak)
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

  // Watch for AI responses
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

  // Cleanup
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current)
      }
    }
  }, [])

  const handleVoiceCommand = async (command: string) => {
    if (isListening) toggleListening()
    clearTranscript()
    setIsProcessing(true)

    processingTimeoutRef.current = setTimeout(() => {
      setIsProcessing(false)
    }, 30000)

    try {
      await sendMessage(command)
    } catch (error) {
      console.error('Voice command failed:', error)
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current)
      }
      setIsProcessing(false)
    }
  }

  const handleToggleVoice = () => {
    // If muted, first click unmutes
    if (settings.voiceMuted) {
      toggleVoiceMute()
      return
    }

    if (!isOpen) {
      setIsOpen(true)
      // Start listening after drawer opens
      setTimeout(() => toggleListening(), 300)
    } else if (isListening) {
      toggleListening()
    } else if (!isProcessing && !isSpeaking) {
      toggleListening()
    }
  }

  // Long press to mute
  const handleLongPress = () => {
    toggleVoiceMute()
  }

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseDown = () => {
    longPressTimer.current = setTimeout(handleLongPress, 500)
  }

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleClose = () => {
    if (isListening) toggleListening()
    window.speechSynthesis?.cancel()
    setIsOpen(false)
    setIsProcessing(false)
  }

  // Status for LCD display
  const getStatus = () => {
    if (isSpeaking) return { text: 'TRANSMITTING', color: 'text-accent' }
    if (isGenerating || isProcessing) return { text: 'PROCESSING', color: 'text-yellow-400' }
    if (isListening) return { text: 'RECEIVING', color: 'text-primary' }
    if (voiceError) return { text: 'ERROR', color: 'text-red-500' }
    return { text: 'STANDBY', color: 'text-gray-500' }
  }

  const status = getStatus()
  const isActive = isListening || isSpeaking || isGenerating || isProcessing
  const isDisabled = !voiceInputSupported || !ttsSupported || !settings.voiceEnabled

  if (isDisabled) return null

  return (
    <div className={`relative ${className}`}>
      {/* Single Mic Button - shows mute state, long-press to mute */}
      <button
        onClick={handleToggleVoice}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        disabled={isDisabled}
        className={`
          relative p-2 rounded transition-all duration-200
          ${settings.voiceMuted
            ? 'text-red-400 hover:text-red-300'
            : isOpen
              ? 'text-primary'
              : 'text-pipboy-green-dim hover:text-pipboy-green'}
          ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={
          settings.voiceMuted
            ? 'Click to unmute (long-press to toggle mute)'
            : isOpen
              ? 'Voice active (long-press to mute)'
              : 'Activate voice (long-press to mute)'
        }
      >
        {isListening ? (
          <Mic size={18} className="animate-pulse" />
        ) : (
          <MicOff size={18} />
        )}

        {/* Mute indicator - small red dot */}
        {settings.voiceMuted && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {/* Slide-out Gauge - Round, breaks out of the chat panel box */}
      <div
        className={`
          absolute z-50
          transition-all duration-300 ease-out
          ${isOpen ? 'translate-x-[25%] opacity-100' : 'translate-x-[100%] opacity-0'}
        `}
        style={{
          right: '-20px', // Starts from the edge of parent
          top: '50%',
          transform: `translateY(-50%) ${isOpen ? 'translateX(25%)' : 'translateX(100%)'}`,
        }}
      >
        {/* Industrial Bezel Frame */}
        <div className="relative">
          {/* Outer bezel - brushed metal effect */}
          <div
            className="
              w-40 h-40 rounded-full
              bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900
              p-1
              shadow-2xl
            "
            style={{
              boxShadow: `
                inset 2px 2px 4px rgba(255,255,255,0.1),
                inset -2px -2px 4px rgba(0,0,0,0.5),
                0 0 30px rgba(0,0,0,0.8),
                0 0 60px rgba(0,255,65,0.1)
              `,
            }}
          >
            {/* Inner ring - industrial groove */}
            <div
              className="
                w-full h-full rounded-full
                bg-gradient-to-br from-gray-800 to-gray-900
                p-1
              "
              style={{
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)',
              }}
            >
              {/* Waveform Display Area */}
              <div className="w-full h-full rounded-full overflow-hidden relative bg-black">
                <WaveformMonitor isActive={isActive} size="xl" className="scale-90" />

                {/* LCD Status Display Overlay */}
                <div
                  className="
                    absolute bottom-4 left-1/2 -translate-x-1/2
                    px-3 py-1 rounded
                    bg-black/80 border border-gray-700
                    font-mono text-[10px] tracking-wider
                    backdrop-blur-sm
                  "
                >
                  <span className={`${status.color} animate-pulse`}>
                    {status.text}
                  </span>
                </div>

                {/* Transcript overlay when listening */}
                {isListening && transcript && (
                  <div
                    className="
                      absolute top-4 left-1/2 -translate-x-1/2
                      max-w-[80%] px-2 py-1 rounded
                      bg-black/90 border border-primary/50
                      font-mono text-[9px] text-primary
                      truncate
                    "
                  >
                    {transcript}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rivets - Industrial detail */}
          {[0, 90, 180, 270].map((angle) => (
            <div
              key={angle}
              className="
                absolute w-3 h-3 rounded-full
                bg-gradient-to-br from-gray-600 to-gray-800
                border border-gray-500
              "
              style={{
                top: '50%',
                left: '50%',
                transform: `
                  translate(-50%, -50%)
                  rotate(${angle}deg)
                  translateY(-72px)
                `,
                boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.2), inset -1px -1px 2px rgba(0,0,0,0.5)',
              }}
            />
          ))}

          {/* Close button - small, industrial */}
          {isOpen && (
            <button
              onClick={handleClose}
              className="
                absolute -left-2 top-1/2 -translate-y-1/2
                w-6 h-12 rounded-l
                bg-gradient-to-r from-gray-700 to-gray-800
                border border-gray-600 border-r-0
                flex items-center justify-center
                text-gray-400 hover:text-white
                transition-colors
              "
              style={{
                boxShadow: 'inset 1px 0 3px rgba(255,255,255,0.1)',
              }}
            >
              <span className="text-xs">×</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
