import { createClient } from '@/lib/supabase/server'
import { OpenAIProvider } from './providers/openai'
import { GoogleProvider } from './providers/google'
import { AIProvider, ChatMessage, ChatCompletionOptions } from './providers/base'

export async function getConfiguredProvider(projectId: string, providerName: string): Promise<AIProvider | null> {
  const supabase = await createClient()

  const { data: credential } = await supabase
    .from('ai_provider_credentials')
    .select(`
      credentials,
      ai_providers!inner(name, provider_class)
    `)
    .eq('project_id', projectId)
    .eq('ai_providers.name', providerName)
    .single()

  if (!credential || !credential.credentials) {
    return null
  }

  const apiKey = credential.credentials.api_key
  if (!apiKey) {
    return null
  }

  let provider: AIProvider | null = null

  switch (providerName) {
    case 'openai':
      provider = new OpenAIProvider()
      await provider.initialize({ apiKey })
      break
    case 'google':
      provider = new GoogleProvider()
      await provider.initialize({ apiKey })
      break
    default:
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
    const { data: hasCredentials } = await supabase
      .from('ai_provider_credentials')
      .select('id')
      .eq('project_id', projectId)
      .eq('ai_providers.name', models.provider)
      .inner('ai_providers')
      .single()

    if (!hasCredentials) {
      throw new Error(`No API key configured for ${models.provider}. Please add your API key in Settings > API Keys.`)
    }
    throw new Error(`Provider ${models.provider} failed to initialize. Please check your API key.`)
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