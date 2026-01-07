import { milo } from "@/lib/api"
import React, { useState, useEffect, useRef } from 'react'
import { X, Key, Loader2, Check, AlertCircle, ChevronDown } from 'lucide-react'

// Provider types matching backend
type AIProviderType = 'claude' | 'openai'

// Provider configuration
const PROVIDERS: { id: AIProviderType; name: string; keyHint: string; keyPattern: RegExp; docsUrl: string }[] = [
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    keyHint: 'sk-ant-...',
    keyPattern: /^sk-ant-/,
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    keyHint: 'sk-...',
    keyPattern: /^sk-/,
    docsUrl: 'https://platform.openai.com/api-keys',
  },
]

interface ApiKeySettingsProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * ApiKeySettings - Modal for configuring AI provider, model, and API key
 *
 * Features:
 * - Provider dropdown (Claude, OpenAI)
 * - Model dropdown (per provider)
 * - API key input with provider-specific validation
 * - Connection status indicator
 */
export const ApiKeySettings: React.FC<ApiKeySettingsProps> = ({
  isOpen,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const [provider, setProvider] = useState<AIProviderType>('claude')
  const [model, setModel] = useState<string>('')
  const [apiKey, setApiKey] = useState('')
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([])
  const [hasExistingKey, setHasExistingKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load current settings and models on open
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      setError(null)
      setSuccess(false)

      // Load current AI settings
      Promise.all([
        milo?.settings.getAiSettings(),
        milo?.ai.isInitialized(),
      ])
        .then(async ([settings, initialized]) => {
          const currentProvider = settings?.apiProvider || 'claude'
          setProvider(currentProvider)
          setHasExistingKey(!!settings?.apiKey)
          setIsInitialized(initialized)
          setApiKey('') // Don't show the actual key for security

          // Load models for the current provider
          const models = await milo?.ai.getProviderModels(currentProvider) || []
          setAvailableModels(models)

          // Set current model or default
          const currentModel = settings?.apiModel
          if (currentModel && models.some(m => m.id === currentModel)) {
            setModel(currentModel)
          } else if (models.length > 0) {
            const defaultModel = await milo?.ai.getDefaultModel(currentProvider)
            setModel(defaultModel || models[0].id)
          }

          setIsLoading(false)
          setTimeout(() => inputRef.current?.focus(), 100)
        })
        .catch((err) => {
          setError((err as Error).message)
          setIsLoading(false)
        })
    }
  }, [isOpen])

  // Load models when provider changes
  useEffect(() => {
    if (isOpen && provider) {
      milo?.ai.getProviderModels(provider)
        .then(async (models) => {
          setAvailableModels(models)
          // Set default model for this provider
          const defaultModel = await milo?.ai.getDefaultModel(provider)
          setModel(defaultModel || (models.length > 0 ? models[0].id : ''))
        })
        .catch(console.error)
    }
  }, [provider, isOpen])

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

  const getProviderConfig = () => PROVIDERS.find(p => p.id === provider) || PROVIDERS[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const config = getProviderConfig()

    // Validate API key format
    if (!apiKey.trim()) {
      if (hasExistingKey) {
        // User didn't enter a new key, just update provider/model
        setIsSaving(true)
        try {
          await milo?.settings.saveAiSettings({
            apiProvider: provider,
            apiModel: model,
          })
          setSuccess(true)
          setTimeout(() => onClose(), 1000)
        } catch (err) {
          setError((err as Error).message || 'Failed to update settings')
        } finally {
          setIsSaving(false)
        }
        return
      }
      setError('Please enter an API key')
      return
    }

    if (!config.keyPattern.test(apiKey)) {
      setError(`Invalid API key format. ${config.name} API keys start with "${config.keyHint.replace('...', '')}"`)
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // Save all AI settings at once
      await milo?.settings.saveAiSettings({
        apiKey: apiKey.trim(),
        apiProvider: provider,
        apiModel: model,
      })

      // Verify it's initialized
      const initialized = await milo?.ai.isInitialized()
      setIsInitialized(initialized)

      if (initialized) {
        setSuccess(true)
        setHasExistingKey(true)
        setTimeout(() => {
          onClose()
        }, 1000)
      } else {
        setError('Failed to initialize AI provider. Please check your API key.')
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearKey = async () => {
    setIsSaving(true)
    try {
      await milo?.settings.saveAiSettings({ apiKey: null })
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

  const providerConfig = getProviderConfig()

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
              AI SETTINGS
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
              {isInitialized ? 'Connected' : 'Not connected'}
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
              {/* Provider Dropdown */}
              <div>
                <label className="block text-[10px] text-pipboy-green-dim mb-1 uppercase tracking-wide">
                  Provider
                </label>
                <div className="relative">
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as AIProviderType)}
                    className="
                      w-full px-3 py-2 rounded-sm appearance-none
                      bg-pipboy-surface border border-pipboy-border
                      text-pipboy-green
                      focus:outline-none focus:border-pipboy-green/50
                      font-mono text-sm cursor-pointer
                    "
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-pipboy-green-dim pointer-events-none"
                  />
                </div>
              </div>

              {/* Model Dropdown */}
              <div>
                <label className="block text-[10px] text-pipboy-green-dim mb-1 uppercase tracking-wide">
                  Model
                </label>
                <div className="relative">
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="
                      w-full px-3 py-2 rounded-sm appearance-none
                      bg-pipboy-surface border border-pipboy-border
                      text-pipboy-green
                      focus:outline-none focus:border-pipboy-green/50
                      font-mono text-sm cursor-pointer
                    "
                  >
                    {availableModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-pipboy-green-dim pointer-events-none"
                  />
                </div>
              </div>

              {/* API Key Input */}
              <div>
                <label className="block text-[10px] text-pipboy-green-dim mb-1 uppercase tracking-wide">
                  API Key
                </label>
                <input
                  ref={inputRef}
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasExistingKey ? '••••••••••••••••' : providerConfig.keyHint}
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
                    href={providerConfig.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-pipboy-green"
                  >
                    {providerConfig.docsUrl.replace('https://', '').split('/')[0]}
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
                  <span>Settings saved and connected!</span>
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
