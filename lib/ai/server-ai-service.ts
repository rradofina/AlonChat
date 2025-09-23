import { serverProviderLoader } from './server-provider-loader'
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

export class ServerAIService {
  private providersCache = new Map<string, Map<string, any>>()

  async chatWithProject(
    projectId: string,
    modelName: string,
    messages: ChatMessage[],
    options?: Partial<ChatCompletionOptions>
  ) {
    // Load providers for this project (with caching)
    let providers = this.providersCache.get(projectId)
    if (!providers) {
      providers = await serverProviderLoader.loadProvidersForProject(projectId)
      this.providersCache.set(projectId, providers)
    }

    // Get model configuration from database or fallback
    const models = await configService.getAIModels()
    const modelConfig = models.find(m => m.name === modelName)

    if (!modelConfig) {
      throw new Error(`Model ${modelName} not found in configuration`)
    }

    // Get the appropriate provider
    const provider = providers.get(modelConfig.provider)
    if (!provider) {
      throw new Error(`Provider ${modelConfig.provider} not registered for project ${projectId}`)
    }

    if (!provider.isConfigured()) {
      throw new Error(`Provider ${modelConfig.provider} is not configured for project ${projectId}. Please add your API key in the dashboard.`)
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

  // Clear cache for a specific project (useful when credentials are updated)
  clearProjectCache(projectId: string) {
    this.providersCache.delete(projectId)
  }

  // Clear all cached providers
  clearAllCache() {
    this.providersCache.clear()
  }
}

export const serverAIService = new ServerAIService()