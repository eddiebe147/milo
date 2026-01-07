/**
 * AI Providers - Factory and exports for multi-provider support
 */

// Export types
export type {
  AIProvider,
  AIProviderType,
  MorningBriefingInput,
  MorningBriefingOutput,
  EveningReviewInput,
  EveningReviewOutput,
  ParsedTask,
  TaskParserOutput,
  ProcessedPlan,
  ChatMessage,
  ChatContext,
  ChatInput,
  ChatResponse,
  ToolCall,
  TaskActionType,
  TaskActionPlan,
} from './AIProvider'

// Export constants
export {
  PROVIDER_MODELS,
  DEFAULT_MODELS,
  API_KEY_PATTERNS,
} from './AIProvider'

// Export provider classes
export { ClaudeProvider } from './ClaudeProvider'
export { OpenAIProvider } from './OpenAIProvider'

// Import for factory
import type { AIProvider, AIProviderType } from './AIProvider'
import { ClaudeProvider } from './ClaudeProvider'
import { OpenAIProvider } from './OpenAIProvider'

/**
 * AIProviderFactory - Creates provider instances
 */
export class AIProviderFactory {
  private static providers: Map<AIProviderType, AIProvider> = new Map()

  /**
   * Create a new provider instance (or return cached)
   */
  static createProvider(type: AIProviderType): AIProvider {
    // Check cache first
    let provider = this.providers.get(type)
    if (provider) {
      return provider
    }

    // Create new instance
    switch (type) {
      case 'claude':
        provider = new ClaudeProvider()
        break
      case 'openai':
        provider = new OpenAIProvider()
        break
      default:
        throw new Error(`Unknown provider type: ${type}`)
    }

    this.providers.set(type, provider)
    return provider
  }

  /**
   * Get cached provider (returns undefined if not created)
   */
  static getProvider(type: AIProviderType): AIProvider | undefined {
    return this.providers.get(type)
  }

  /**
   * Clear all cached providers
   */
  static clearProviders(): void {
    this.providers.clear()
  }

  /**
   * Get all supported provider types
   */
  static getSupportedTypes(): AIProviderType[] {
    return ['claude', 'openai']
  }

  /**
   * Validate API key format for a provider
   */
  static validateApiKey(type: AIProviderType, apiKey: string): { valid: boolean; error?: string } {
    const { API_KEY_PATTERNS } = require('./AIProvider')
    const pattern = API_KEY_PATTERNS[type]

    if (!pattern) {
      return { valid: false, error: `Unknown provider: ${type}` }
    }

    if (!pattern.pattern.test(apiKey)) {
      return { valid: false, error: pattern.hint }
    }

    return { valid: true }
  }
}

/**
 * Active provider singleton - the currently configured provider
 */
let activeProvider: AIProvider | null = null

/**
 * Get the active AI provider
 */
export function getActiveProvider(): AIProvider | null {
  return activeProvider
}

/**
 * Set the active AI provider
 */
export function setActiveProvider(provider: AIProvider | null): void {
  activeProvider = provider
  if (provider) {
    console.log('[AIProviders] Active provider set to:', provider.type)
  } else {
    console.log('[AIProviders] Active provider cleared')
  }
}

/**
 * Initialize and set active provider
 */
export function initializeProvider(
  type: AIProviderType,
  apiKey: string,
  model?: string
): AIProvider {
  const provider = AIProviderFactory.createProvider(type)
  provider.initialize(apiKey, model)
  setActiveProvider(provider)
  return provider
}
