import { useState, useCallback, useEffect, useRef } from 'react'

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognition
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

export interface UseVoiceInputOptions {
  onTranscript?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
  language?: string
  continuous?: boolean
}

export interface UseVoiceInputReturn {
  isListening: boolean
  isSupported: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  startListening: () => void
  stopListening: () => void
  toggleListening: () => void
  clearTranscript: () => void
}

/**
 * Hook for speech-to-text using Web Speech API
 * Works in Electron (Chromium-based) and modern browsers
 */
export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const {
    onTranscript,
    onError,
    language = 'en-US',
    continuous = false,
  } = options

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  // Ref to track if recognition is actively running (avoids async state race condition)
  const isListeningRef = useRef(false)
  const isSupported = typeof window !== 'undefined' &&
    (!!window.SpeechRecognition || !!window.webkitSpeechRecognition)

  // Initialize speech recognition
  useEffect(() => {
    console.log('[VoiceInput] Initializing, isSupported:', isSupported)
    if (!isSupported) {
      console.log('[VoiceInput] Speech recognition not supported')
      return
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      console.log('[VoiceInput] No SpeechRecognition API found')
      return
    }

    console.log('[VoiceInput] Creating speech recognition instance')
    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = continuous
    recognition.interimResults = true
    recognition.lang = language

    recognition.onstart = () => {
      console.log('[VoiceInput] Speech recognition started')
      isListeningRef.current = true
      setIsListening(true)
      setError(null)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log('[VoiceInput] Got result event', event.results.length, 'results')
      let finalTranscript = ''
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript)
        setInterimTranscript('')
        onTranscript?.(finalTranscript, true)
      } else {
        setInterimTranscript(interim)
        onTranscript?.(interim, false)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.log('[VoiceInput] Error:', event.error)
      const errorMessage = getErrorMessage(event.error)
      setError(errorMessage)
      setIsListening(false)
      onError?.(errorMessage)
    }

    recognition.onend = () => {
      console.log('[VoiceInput] Speech recognition ended')
      isListeningRef.current = false
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [isSupported, language, continuous, onTranscript, onError])

  const startListening = useCallback(() => {
    console.log('[VoiceInput] startListening called, recognitionRef:', !!recognitionRef.current, 'isListeningRef:', isListeningRef.current)
    // Use ref for synchronous check to prevent race condition
    if (!recognitionRef.current || isListeningRef.current) {
      console.log('[VoiceInput] Skipping start - already listening or no recognition')
      return
    }

    // Mark as listening immediately (before async start completes)
    isListeningRef.current = true
    setTranscript('')
    setInterimTranscript('')
    setError(null)

    try {
      console.log('[VoiceInput] Calling recognition.start()')
      recognitionRef.current.start()
    } catch (err) {
      // Reset ref if start fails
      isListeningRef.current = false
      console.error('[VoiceInput] Failed to start speech recognition:', err)
    }
  }, [])  // No dependencies needed since we use refs

  const stopListening = useCallback(() => {
    // Use ref for synchronous check
    if (!recognitionRef.current || !isListeningRef.current) return

    try {
      recognitionRef.current.stop()
    } catch (err) {
      console.error('Failed to stop speech recognition:', err)
    }
  }, [])  // No dependencies needed since we use refs

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  const clearTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
  }, [])

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
  }
}

function getErrorMessage(error: string): string {
  switch (error) {
    case 'not-allowed':
      return 'Microphone access denied. Please enable microphone permissions.'
    case 'no-speech':
      return 'No speech detected. Try again.'
    case 'audio-capture':
      return 'No microphone found. Please connect a microphone.'
    case 'network':
      return 'Network error. Check your connection.'
    case 'aborted':
      return 'Speech recognition was aborted.'
    case 'service-not-allowed':
      return 'Speech recognition service not allowed.'
    default:
      return `Speech recognition error: ${error}`
  }
}
