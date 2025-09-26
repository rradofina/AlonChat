import { createClient } from '@/lib/supabase/server'
import { OpenAIProvider } from './providers/openai'
import { GoogleProvider } from './providers/google'
import { AIProvider, ChatMessage, ChatCompletionOptions } from './providers/base'

export async function getConfiguredProvider(projectId: string, providerName: string): Promise<AIProvider | null> {
  // Simply create provider using environment variables
  let provider: AIProvider | null = null

  switch (providerName) {
    case 'openai':
      provider = new OpenAIProvider()
      await provider.initialize({}) // Will use OPENAI_API_KEY from env
      break
    case 'google':
      provider = new GoogleProvider()
      await provider.initialize({}) // Will use GEMINI_API_KEY from env
      break
    default:
      return null
  }

  // Check if provider was successfully configured
  if (!provider.isConfigured()) {
    return null
  }

  return provider
}

export async function chatWithProjectCredentials(
  projectId: string,
  modelName: string,
  messages: ChatMessage[],
  options?: Partial<ChatCompletionOptions>
) {
  const supabase = await createClient()

  const { data: models } = await supabase
    .from('ai_models')
    .select('*')
    .eq('name', modelName)
    .single()

  if (!models) {
    throw new Error(`Model ${modelName} not found`)
  }

  const provider = await getConfiguredProvider(projectId, models.provider)

  if (!provider || !provider.isConfigured()) {
    throw new Error(`Provider ${models.provider} not configured. Please ensure API keys are set in environment variables.`)
  }

  const result = await provider.chat({
    model: models.model_id,
    messages,
    temperature: options?.temperature ?? 0.7,
    maxTokens: options?.maxTokens ?? 500,
    ...options
  })

  const cost = provider.estimateCost(result.usage?.totalTokens || 0, models.model_id)

  return {
    ...result,
    estimatedCost: cost,
    provider: models.provider,
    modelName: models.name
  }
}