import { OpenAI } from 'openai'
import { AIProvider, ChatCompletionOptions, ChatCompletionResult } from './base'

export class OpenAIProvider implements AIProvider {
  name = 'openai'
  private client: OpenAI | null = null
  private apiKey: string = ''

  async initialize(config: Record<string, any>): Promise<void> {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || ''
    if (this.apiKey) {
      this.client = new OpenAI({ apiKey: this.apiKey })
    }
  }

  isConfigured(): boolean {
    return !!this.client && !!this.apiKey
  }

  getRequiredEnvVars(): string[] {
    return ['OPENAI_API_KEY']
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    if (!this.client) {
      throw new Error('OpenAI provider not configured')
    }

    const completion = await this.client.chat.completions.create({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stream: false
    })

    return {
      content: completion.choices[0]?.message?.content || '',
      model: completion.model,
      usage: completion.usage ? {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens
      } : undefined,
      finishReason: completion.choices[0]?.finish_reason
    }
  }

  estimateCost(tokens: number, model: string): number {
    const pricing: Record<string, number> = {
      'gpt-4o': 0.005,
      'gpt-4o-mini': 0.00015,
      'gpt-4-turbo': 0.01,
      'gpt-3.5-turbo': 0.0005
    }
    const pricePerToken = pricing[model] || 0.0005
    return (tokens * pricePerToken) / 1000
  }
}