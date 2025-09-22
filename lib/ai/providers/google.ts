import { GoogleGenerativeAI } from '@google/generative-ai'
import { AIProvider, ChatCompletionOptions, ChatCompletionResult } from './base'

export class GoogleProvider implements AIProvider {
  name = 'google'
  private client: GoogleGenerativeAI | null = null
  private apiKey: string = ''

  async initialize(config: Record<string, any>): Promise<void> {
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || ''
    if (this.apiKey) {
      this.client = new GoogleGenerativeAI(this.apiKey)
    }
  }

  isConfigured(): boolean {
    return !!this.client && !!this.apiKey
  }

  getRequiredEnvVars(): string[] {
    return ['GEMINI_API_KEY']
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    if (!this.client) {
      throw new Error('Google provider not configured')
    }

    const model = this.client.getGenerativeModel({
      model: options.model
    })

    // Convert messages to Gemini format
    const history = options.messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role === 'system' ? 'user' : msg.role,
      parts: [{ text: msg.content }]
    }))

    const lastMessage = options.messages[options.messages.length - 1]

    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
        topP: options.topP,
      }
    })

    const result = await chat.sendMessage(lastMessage.content)
    const response = result.response.text()

    // Estimate tokens (rough estimate for Gemini)
    const estimatedInputTokens = options.messages.reduce((acc, msg) => acc + Math.ceil(msg.content.length / 4), 0)
    const estimatedOutputTokens = Math.ceil(response.length / 4)

    return {
      content: response,
      model: options.model,
      usage: {
        promptTokens: estimatedInputTokens,
        completionTokens: estimatedOutputTokens,
        totalTokens: estimatedInputTokens + estimatedOutputTokens
      }
    }
  }

  estimateCost(tokens: number, model: string): number {
    const pricing: Record<string, number> = {
      'gemini-1.5-flash': 0, // Free tier
      'gemini-1.5-flash-8b': 0, // Free tier
      'gemini-1.5-pro': 0.00125,
      'gemini-1.0-pro': 0.0005
    }
    const pricePerToken = pricing[model] || 0
    return (tokens * pricePerToken) / 1000
  }
}