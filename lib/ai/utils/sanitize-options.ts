import { ChatCompletionOptions } from '../providers/base'

interface SanitizedOptions {
  temperature: number
  maxTokens: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
}

/**
 * Sanitizes and validates LLM parameters to prevent API errors
 * and protect against excessive usage
 */
export function sanitizeLLMOptions(
  options: Partial<ChatCompletionOptions>,
  provider: 'openai' | 'google' | 'anthropic'
): SanitizedOptions {
  // Temperature limits by provider
  const tempLimits = {
    openai: { min: 0, max: 2 },
    google: { min: 0, max: 1 },
    anthropic: { min: 0, max: 1 }
  }

  // Max token limits by provider (conservative defaults)
  const tokenLimits = {
    openai: 4096,    // GPT-3.5 limit, GPT-4 can go higher
    google: 8192,    // Gemini limit
    anthropic: 4096  // Claude default
  }

  const providerLimits = tempLimits[provider] || tempLimits.openai
  const maxTokenLimit = tokenLimits[provider] || 4096

  return {
    // Clamp temperature to provider limits
    temperature: Math.min(
      Math.max(options.temperature ?? 0.7, providerLimits.min),
      providerLimits.max
    ),

    // Clamp max tokens to prevent excessive usage
    maxTokens: Math.min(
      Math.max(options.maxTokens ?? 500, 1),
      maxTokenLimit
    ),

    // TopP clamped between 0 and 1
    topP: options.topP !== undefined
      ? Math.min(Math.max(options.topP, 0), 1)
      : undefined,

    // Frequency penalty clamped between -2 and 2 (OpenAI limits)
    frequencyPenalty: options.frequencyPenalty !== undefined
      ? Math.min(Math.max(options.frequencyPenalty, -2), 2)
      : undefined,

    // Presence penalty clamped between -2 and 2 (OpenAI limits)
    presencePenalty: options.presencePenalty !== undefined
      ? Math.min(Math.max(options.presencePenalty, -2), 2)
      : undefined
  }
}

/**
 * Validates if a model name is supported
 */
export function isValidModel(model: string, provider: string): boolean {
  const validModels: Record<string, string[]> = {
    openai: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'],
    google: ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-2.1']
  }

  return validModels[provider]?.includes(model) ?? false
}