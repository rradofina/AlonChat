import { AIProvider, ChatCompletionOptions, ChatCompletionResult } from './base'

/**
 * Generic custom provider for any OpenAI-compatible API
 * Can be configured entirely through database without code changes
 */
export class CustomProvider implements AIProvider {
  name = 'custom'
  private apiKey: string = ''
  private apiBaseUrl: string = ''
  private authHeaderName: string = 'Authorization'
  private authHeaderPrefix: string = 'Bearer'
  private requestTemplate: any = {}
  private responseParser?: Function

  async initialize(config: Record<string, any>): Promise<void> {
    // Get API key from environment or config
    const envVarName = config.apiKeyEnvVar || 'CUSTOM_API_KEY'
    this.apiKey = config.apiKey || process.env[envVarName] || ''

    // Set API configuration
    this.apiBaseUrl = config.apiBaseUrl || ''
    this.authHeaderName = config.authHeaderName || 'Authorization'
    this.authHeaderPrefix = config.authHeaderPrefix || 'Bearer'
    this.requestTemplate = config.requestTemplate || {}

    // Parse response parser function if provided
    if (config.responseParser) {
      try {
        this.responseParser = new Function('response', config.responseParser)
      } catch (error) {
        console.error('Invalid response parser function:', error)
      }
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey && !!this.apiBaseUrl
  }

  getRequiredEnvVars(): string[] {
    return [] // Configured per instance
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    if (!this.isConfigured()) {
      throw new Error('Custom provider not configured')
    }

    // Build request body using template or default OpenAI format
    const requestBody = this.requestTemplate.body || {
      model: options.model,
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stream: false
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      [this.authHeaderName]: `${this.authHeaderPrefix} ${this.apiKey}`.trim()
    }

    // Make API request
    const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Custom API error: ${response.status} - ${error}`)
    }

    const data = await response.json()

    // Parse response using custom parser or default OpenAI format
    if (this.responseParser) {
      return this.responseParser(data)
    }

    // Default OpenAI-compatible response parsing
    return {
      content: data.choices?.[0]?.message?.content || '',
      model: data.model || options.model,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined,
      finishReason: data.choices?.[0]?.finish_reason
    }
  }

  estimateCost(tokens: number, model: string): number {
    // Cost would be configured in database per model
    return 0
  }
}