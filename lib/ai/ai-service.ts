import { providerRegistry } from './provider-registry'
import { ChatMessage, ChatCompletionOptions } from './providers/base'
import { configService } from '@/lib/api/config'

export interface ModelConfig {
  id: string
  name: string
  provider: string
  modelId: string
  temperature?: number
  maxTokens?: number
  contextWindow?: number
}

export class AIService {
  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) return
    await providerRegistry.initialize()
    this.initialized = true
  }

  async chat(
    modelName: string,
    messages: ChatMessage[],
    options?: Partial<ChatCompletionOptions>
  ) {
    await this.initialize()

    // Get model configuration from database or fallback
    const models = await configService.getAIModels()
    const modelConfig = models.find(m => m.name === modelName)

    if (!modelConfig) {
      throw new Error(`Model ${modelName} not found in configuration`)
    }

    // Get the appropriate provider
    const provider = providerRegistry.getProvider(modelConfig.provider)
    if (!provider) {
      throw new Error(`Provider ${modelConfig.provider} not registered`)
    }

    if (!provider.isConfigured()) {
      throw new Error(`Provider ${modelConfig.provider} is not configured. Required environment variables: ${provider.getRequiredEnvVars().join(', ')}`)
    }

    // Execute chat with the provider
    const result = await provider.chat({
      model: modelConfig.model_id,
      messages,
      temperature: options?.temperature ?? modelConfig.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? modelConfig.max_tokens ?? 500,
      topP: options?.topP,
      frequencyPenalty: options?.frequencyPenalty,
      presencePenalty: options?.presencePenalty,
      stream: options?.stream
    })

    // Calculate cost
    const cost = provider.estimateCost(result.usage?.totalTokens || 0, modelConfig.model_id)

    return {
      ...result,
      estimatedCost: cost,
      provider: modelConfig.provider,
      modelName: modelConfig.name
    }
  }

  async listAvailableModels() {
    await this.initialize()

    const models = await configService.getAIModels()
    const availableModels = []

    for (const model of models) {
      const provider = providerRegistry.getProvider(model.provider)
      if (provider?.isConfigured()) {
        availableModels.push({
          ...model,
          available: true,
          configured: true
        })
      } else {
        availableModels.push({
          ...model,
          available: false,
          configured: false,
          missingRequirements: provider?.getRequiredEnvVars() || []
        })
      }
    }

    return availableModels
  }

  async getProviderStatus() {
    await this.initialize()

    const status: Record<string, any> = {}
    const providers = providerRegistry.getAllProviders()

    providers.forEach((provider, name) => {
      status[name] = {
        configured: provider.isConfigured(),
        requirements: provider.getRequiredEnvVars()
      }
    })

    return status
  }
}

export const aiService = new AIService()