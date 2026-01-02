import { useState, useCallback, useEffect, useRef } from 'react'

/**
 * Options for configuring the text-to-speech hook
 */
export interface UseTextToSpeechOptions {
  /** Selected voice URI (from SpeechSynthesisVoice.voiceURI) */
  voiceId?: string
  /** Speech rate: 0.5 to 2.0, default 1.0 */
  rate?: number
  /** Speech volume: 0 to 1, default 1.0 */
  volume?: number
  /** Callback fired when speech starts */
  onStart?: () => void
  /** Callback fired when speech ends */
  onEnd?: () => void
  /** Callback fired on speech error */
  onError?: (error: string) => void
}

/**
 * Return type for the text-to-speech hook
 */
export interface UseTextToSpeechReturn {
  /** Whether speech is currently playing */
  isSpeaking: boolean
  /** Whether SpeechSynthesis API is supported */
  isSupported: boolean
  /** Available speech synthesis voices */
  voices: SpeechSynthesisVoice[]
  /** Speak the provided text (cancels any ongoing speech) */
  speak: (text: string) => void
  /** Stop speech immediately */
  stop: () => void
  /** Pause speech */
  pause: () => void
  /** Resume paused speech */
  resume: () => void
}

/**
 * Hook for text-to-speech using Web SpeechSynthesis API
 * Works in Electron (Chromium-based) and modern browsers
 *
 * @param options - Configuration options for speech synthesis
 * @returns Object containing speech state and control functions
 *
 * @example
 * ```tsx
 * const { isSpeaking, voices, speak, stop } = useTextToSpeech({
 *   rate: 1.0,
 *   onEnd: () => console.log('Done speaking'),
 * })
 *
 * // Speak some text
 * speak('Hello, world!')
 *
 * // Stop speaking
 * stop()
 * ```
 */
export function useTextToSpeech(options: UseTextToSpeechOptions = {}): UseTextToSpeechReturn {
  const {
    voiceId,
    rate = 1.0,
    volume = 1.0,
    onStart,
    onEnd,
    onError,
  } = options

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const isSupported = typeof window !== 'undefined' && !!window.speechSynthesis

  // Load available voices
  useEffect(() => {
    if (!isSupported) return

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices()
      setVoices(availableVoices)
    }

    // Voices may be loaded asynchronously in some browsers
    loadVoices()

    // Chrome requires listening to voiceschanged event
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    }

    return () => {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      }
    }
  }, [isSupported])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel()
      }
    }
  }, [isSupported])

  /**
   * Speak the provided text
   * Cancels any ongoing speech before starting new speech
   */
  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)

    // Apply settings
    utterance.rate = Math.max(0.5, Math.min(2.0, rate))
    utterance.volume = Math.max(0, Math.min(1, volume))

    // Set voice if specified
    if (voiceId && voices.length > 0) {
      const selectedVoice = voices.find(v => v.voiceURI === voiceId)
      if (selectedVoice) {
        utterance.voice = selectedVoice
      }
    }

    // Event handlers
    utterance.onstart = () => {
      setIsSpeaking(true)
      onStart?.()
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      onEnd?.()
    }

    utterance.onerror = (event) => {
      setIsSpeaking(false)
      const errorMessage = getErrorMessage(event.error)
      onError?.(errorMessage)
    }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [isSupported, voiceId, voices, rate, volume, onStart, onEnd, onError])

  /**
   * Stop speech immediately
   */
  const stop = useCallback(() => {
    if (!isSupported) return

    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [isSupported])

  /**
   * Pause speech
   */
  const pause = useCallback(() => {
    if (!isSupported || !isSpeaking) return

    window.speechSynthesis.pause()
  }, [isSupported, isSpeaking])

  /**
   * Resume paused speech
   */
  const resume = useCallback(() => {
    if (!isSupported) return

    window.speechSynthesis.resume()
  }, [isSupported])

  return {
    isSpeaking,
    isSupported,
    voices,
    speak,
    stop,
    pause,
    resume,
  }
}

/**
 * Convert SpeechSynthesis error codes to human-readable messages
 */
function getErrorMessage(error: string): string {
  switch (error) {
    case 'canceled':
      return 'Speech was canceled.'
    case 'interrupted':
      return 'Speech was interrupted.'
    case 'audio-busy':
      return 'Audio device is busy.'
    case 'audio-hardware':
      return 'Audio hardware error. Check your speakers.'
    case 'network':
      return 'Network error during speech synthesis.'
    case 'synthesis-unavailable':
      return 'Speech synthesis service unavailable.'
    case 'synthesis-failed':
      return 'Speech synthesis failed.'
    case 'language-unavailable':
      return 'Selected language is not available.'
    case 'voice-unavailable':
      return 'Selected voice is not available.'
    case 'text-too-long':
      return 'Text is too long for speech synthesis.'
    case 'invalid-argument':
      return 'Invalid argument provided to speech synthesis.'
    case 'not-allowed':
      return 'Speech synthesis not allowed. Check permissions.'
    default:
      return `Speech synthesis error: ${error}`
  }
}
