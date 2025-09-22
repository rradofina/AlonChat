export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionOptions {
  model: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stream?: boolean
}

export interface ChatCompletionResult {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason?: string
}

export interface AIProvider {
  name: string
  initialize(config: Record<string, any>): Promise<void>
  chat(options: ChatCompletionOptions): Promise<ChatCompletionResult>
  isConfigured(): boolean
  getRequiredEnvVars(): string[]
  estimateCost(tokens: number, model: string): number
}