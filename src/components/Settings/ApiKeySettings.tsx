import React, { useState, useEffect, useRef } from 'react'
import { X, Key, Loader2, Check, AlertCircle } from 'lucide-react'

interface ApiKeySettingsProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * ApiKeySettings - Modal for entering the Claude API key
 *
 * Features:
 * - Loads existing API key (masked) on open
 * - Validates API key format (starts with sk-ant-)
 * - Saves to database and initializes Claude client
 * - Shows connection status
 */
export const ApiKeySettings: React.FC<ApiKeySettingsProps> = ({
  isOpen,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const [apiKey, setApiKey] = useState('')
  const [hasExistingKey, setHasExistingKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Check if API key exists and Claude is initialized
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      setError(null)
      setSuccess(false)

      Promise.all([
        window.milo?.settings.getApiKey(),
        window.milo?.ai.isInitialized(),
      ])
        .then(([existingKey, initialized]) => {
          setHasExistingKey(!!existingKey)
          setIsInitialized(initialized)
          setApiKey('') // Don't show the actual key for security
          setIsLoading(false)
          setTimeout(() => inputRef.current?.focus(), 100)
        })
        .catch((err) => {
          setError((err as Error).message)
          setIsLoading(false)
        })
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate API key format
    if (!apiKey.trim()) {
      if (hasExistingKey) {
        // User didn't enter a new key, just close
        onClose()
        return
      }
      setError('Please enter an API key')
      return
    }

    if (!apiKey.startsWith('sk-ant-')) {
      setError('Invalid API key format. Claude API keys start with "sk-ant-"')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // Save the API key (this also initializes Claude)
      await window.milo?.settings.saveApiKey(apiKey.trim())

      // Verify it's initialized
      const initialized = await window.milo?.ai.isInitialized()
      setIsInitialized(initialized)

      if (initialized) {
        setSuccess(true)
        setHasExistingKey(true)
        setTimeout(() => {
          onClose()
        }, 1000)
      } else {
        setError('Failed to initialize Claude client. Please check your API key.')
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to save API key')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearKey = async () => {
    setIsSaving(true)
    try {
      await window.milo?.settings.saveApiKey(null)
      setHasExistingKey(false)
      setIsInitialized(false)
      setApiKey('')
      setSuccess(false)
    } catch (err) {
      setError((err as Error).message || 'Failed to clear API key')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-pipboy-background border border-pipboy-border rounded-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-pipboy-border">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-pipboy-green" />
            <h2 className="text-sm font-bold text-pipboy-green tracking-wide">
              API KEY SETTINGS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-pipboy-green-dim hover:text-pipboy-green transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Status indicator */}
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isInitialized ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-pipboy-green-dim">
              Claude: {isInitialized ? 'Connected' : 'Not connected'}
            </span>
            {hasExistingKey && (
              <span className="text-pipboy-green-dim ml-auto">
                (API key saved)
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-pipboy-green" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* API Key Input */}
              <div>
                <label className="block text-[10px] text-pipboy-green-dim mb-1 uppercase tracking-wide">
                  Claude API Key
                </label>
                <input
                  ref={inputRef}
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasExistingKey ? '••••••••••••••••' : 'sk-ant-...'}
                  className="
                    w-full px-3 py-2 rounded-sm
                    bg-pipboy-surface border border-pipboy-border
                    text-pipboy-green placeholder-pipboy-green-dim/50
                    focus:outline-none focus:border-pipboy-green/50
                    font-mono text-sm
                  "
                />
                <p className="text-[10px] text-pipboy-green-dim/60 mt-1">
                  Get your API key from{' '}
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-pipboy-green"
                  >
                    console.anthropic.com
                  </a>
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/30 rounded-sm px-3 py-2">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="flex items-center gap-2 text-xs text-green-400 bg-green-400/10 border border-green-400/30 rounded-sm px-3 py-2">
                  <Check size={14} />
                  <span>API key saved and Claude connected!</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {hasExistingKey && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    disabled={isSaving}
                    className="
                      px-3 py-2 rounded-sm
                      border border-red-400/50 text-red-400
                      hover:border-red-400 hover:bg-red-400/10
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all text-sm font-mono
                    "
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="
                    flex-1 py-2 rounded-sm
                    border border-pipboy-border text-pipboy-green-dim
                    hover:border-pipboy-green/50 hover:text-pipboy-green
                    transition-all text-sm font-mono
                  "
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="
                    flex-1 py-2 rounded-sm
                    bg-pipboy-green/20 border border-pipboy-green text-pipboy-green
                    hover:bg-pipboy-green/30
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all text-sm font-mono
                    flex items-center justify-center gap-2
                  "
                >
                  {isSaving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Key size={14} />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ApiKeySettings
