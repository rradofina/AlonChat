import { createClient } from '@/lib/supabase/server'

interface ModelDefinition {
  name: string
  display_name: string
  model_id: string
  provider: string
  context_window: number
  max_tokens: number
  description: string
  capabilities?: {
    vision?: boolean
    function_calling?: boolean
    json_mode?: boolean
    streaming?: boolean
  }
  pricing?: {
    input_per_million?: number
    output_per_million?: number
  }
  deprecation_date?: string
  is_active?: boolean
}

// Production-ready model definitions with latest models
const MODEL_REGISTRY: ModelDefinition[] = [
  // OpenAI Models
  {
    name: 'gpt-4o',
    display_name: 'GPT-4o',
    model_id: 'gpt-4o-2024-11-20',
    provider: 'openai',
    context_window: 128000,
    max_tokens: 16384,
    description: 'Latest flagship model with vision, function calling, and JSON mode',
    capabilities: {
      vision: true,
      function_calling: true,
      json_mode: true,
      streaming: true
    },
    pricing: {
      input_per_million: 2.5,
      output_per_million: 10
    }
  },
  {
    name: 'gpt-4o-mini',
    display_name: 'GPT-4o Mini',
    model_id: 'gpt-4o-mini-2024-07-18',
    provider: 'openai',
    context_window: 128000,
    max_tokens: 16384,
    description: 'Affordable small model with GPT-4o capabilities',
    capabilities: {
      vision: true,
      function_calling: true,
      json_mode: true,
      streaming: true
    },
    pricing: {
      input_per_million: 0.15,
      output_per_million: 0.6
    }
  },
  {
    name: 'gpt-4-turbo',
    display_name: 'GPT-4 Turbo',
    model_id: 'gpt-4-turbo-2024-04-09',
    provider: 'openai',
    context_window: 128000,
    max_tokens: 4096,
    description: 'Latest GPT-4 Turbo with vision capabilities',
    capabilities: {
      vision: true,
      function_calling: true,
      json_mode: true,
      streaming: true
    },
    pricing: {
      input_per_million: 10,
      output_per_million: 30
    }
  },
  {
    name: 'gpt-3.5-turbo',
    display_name: 'GPT-3.5 Turbo',
    model_id: 'gpt-3.5-turbo-0125',
    provider: 'openai',
    context_window: 16385,
    max_tokens: 4096,
    description: 'Fast and efficient model for simple tasks',
    capabilities: {
      function_calling: true,
      json_mode: true,
      streaming: true
    },
    pricing: {
      input_per_million: 0.5,
      output_per_million: 1.5
    }
  },

  // Google Models
  {
    name: 'gemini-2.0-flash-exp',
    display_name: 'Gemini 2.0 Flash (Experimental)',
    model_id: 'gemini-2.0-flash-exp',
    provider: 'google',
    context_window: 1048576,
    max_tokens: 8192,
    description: 'Latest experimental Gemini 2.0 with multimodal native capabilities',
    capabilities: {
      vision: true,
      function_calling: true,
      json_mode: true,
      streaming: true
    },
    pricing: {
      input_per_million: 0,  // Free during experimental phase
      output_per_million: 0
    }
  },
  {
    name: 'gemini-1.5-pro',
    display_name: 'Gemini 1.5 Pro',
    model_id: 'gemini-1.5-pro-002',
    provider: 'google',
    context_window: 2097152,
    max_tokens: 8192,
    description: 'Advanced reasoning with massive 2M context window',
    capabilities: {
      vision: true,
      function_calling: true,
      json_mode: true,
      streaming: true
    },
    pricing: {
      input_per_million: 1.25,
      output_per_million: 5
    }
  },
  {
    name: 'gemini-1.5-flash',
    display_name: 'Gemini 1.5 Flash',
    model_id: 'gemini-1.5-flash-002',
    provider: 'google',
    context_window: 1048576,
    max_tokens: 8192,
    description: 'Fast multimodal model with 1M context',
    capabilities: {
      vision: true,
      function_calling: true,
      json_mode: true,
      streaming: true
    },
    pricing: {
      input_per_million: 0.075,
      output_per_million: 0.3
    }
  },

  // Anthropic Models
  {
    name: 'claude-3-5-sonnet',
    display_name: 'Claude 3.5 Sonnet',
    model_id: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    context_window: 200000,
    max_tokens: 8192,
    description: 'Most intelligent Claude model, outperforms Opus',
    capabilities: {
      vision: true,
      function_calling: true,
      json_mode: false,
      streaming: true
    },
    pricing: {
      input_per_million: 3,
      output_per_million: 15
    }
  },
  {
    name: 'claude-3-opus',
    display_name: 'Claude 3 Opus',
    model_id: 'claude-3-opus-20240229',
    provider: 'anthropic',
    context_window: 200000,
    max_tokens: 4096,
    description: 'Powerful model for complex tasks',
    capabilities: {
      vision: true,
      function_calling: true,
      json_mode: false,
      streaming: true
    },
    pricing: {
      input_per_million: 15,
      output_per_million: 75
    }
  },
  {
    name: 'claude-3-haiku',
    display_name: 'Claude 3 Haiku',
    model_id: 'claude-3-haiku-20240307',
    provider: 'anthropic',
    context_window: 200000,
    max_tokens: 4096,
    description: 'Fast and affordable Claude model',
    capabilities: {
      vision: true,
      function_calling: true,
      json_mode: false,
      streaming: true
    },
    pricing: {
      input_per_million: 0.25,
      output_per_million: 1.25
    }
  },

  // Meta Llama Models (via custom endpoints)
  {
    name: 'llama-3.2-90b',
    display_name: 'Llama 3.2 90B',
    model_id: 'meta-llama/Llama-3.2-90B-Vision-Instruct',
    provider: 'custom',
    context_window: 128000,
    max_tokens: 4096,
    description: 'Open-source multimodal model with vision',
    capabilities: {
      vision: true,
      function_calling: false,
      json_mode: true,
      streaming: true
    }
  },
  {
    name: 'llama-3.1-70b',
    display_name: 'Llama 3.1 70B',
    model_id: 'meta-llama/Llama-3.1-70B-Instruct',
    provider: 'custom',
    context_window: 128000,
    max_tokens: 4096,
    description: 'Powerful open-source model',
    capabilities: {
      function_calling: false,
      json_mode: true,
      streaming: true
    }
  },
  {
    name: 'llama-3.1-8b',
    display_name: 'Llama 3.1 8B',
    model_id: 'meta-llama/Llama-3.1-8B-Instruct',
    provider: 'custom',
    context_window: 128000,
    max_tokens: 4096,
    description: 'Efficient open-source model',
    capabilities: {
      function_calling: false,
      json_mode: true,
      streaming: true
    }
  },

  // Mistral Models
  {
    name: 'mistral-large',
    display_name: 'Mistral Large',
    model_id: 'mistral-large-latest',
    provider: 'custom',
    context_window: 128000,
    max_tokens: 4096,
    description: 'Top-tier reasoning model',
    capabilities: {
      function_calling: true,
      json_mode: true,
      streaming: true
    }
  },
  {
    name: 'mixtral-8x7b',
    display_name: 'Mixtral 8x7B',
    model_id: 'open-mixtral-8x7b',
    provider: 'custom',
    context_window: 32000,
    max_tokens: 4096,
    description: 'Sparse MoE model with strong performance',
    capabilities: {
      function_calling: true,
      json_mode: true,
      streaming: true
    }
  },

  // Perplexity Models
  {
    name: 'sonar-pro',
    display_name: 'Perplexity Sonar Pro',
    model_id: 'sonar-pro',
    provider: 'custom',
    context_window: 200000,
    max_tokens: 4096,
    description: 'Advanced search-augmented model',
    capabilities: {
      function_calling: false,
      json_mode: true,
      streaming: true
    }
  }
]

export async function syncModelsToDatabase() {
  const supabase = await createClient()

  let syncedCount = 0
  let errors: string[] = []

  for (const model of MODEL_REGISTRY) {
    try {
      // Check if model exists
      const { data: existing } = await supabase
        .from('ai_models')
        .select('id')
        .eq('name', model.name)
        .eq('provider', model.provider)
        .single()

      if (existing) {
        // Update existing model
        const { error } = await supabase
          .from('ai_models')
          .update({
            display_name: model.display_name,
            model_id: model.model_id,
            context_window: model.context_window,
            max_tokens: model.max_tokens,
            description: model.description,
            is_active: model.is_active !== false,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (!error) syncedCount++
        else errors.push(`Failed to update ${model.name}: ${error.message}`)
      } else {
        // Insert new model
        const { error } = await supabase
          .from('ai_models')
          .insert({
            name: model.name,
            display_name: model.display_name,
            provider: model.provider,
            model_id: model.model_id,
            context_window: model.context_window,
            max_tokens: model.max_tokens,
            description: model.description,
            is_active: model.is_active !== false,
            sort_order: MODEL_REGISTRY.indexOf(model)
          })

        if (!error) syncedCount++
        else errors.push(`Failed to insert ${model.name}: ${error.message}`)
      }

      // Store capabilities and pricing in a separate metadata table if needed
      if (model.capabilities || model.pricing) {
        const { data: modelRecord } = await supabase
          .from('ai_models')
          .select('id')
          .eq('name', model.name)
          .eq('provider', model.provider)
          .single()

        if (modelRecord) {
          // Store metadata as JSON in request_template column (repurpose it)
          await supabase
            .from('ai_models')
            .update({
              request_template: {
                capabilities: model.capabilities,
                pricing: model.pricing,
                deprecation_date: model.deprecation_date
              }
            })
            .eq('id', modelRecord.id)
        }
      }
    } catch (error) {
      errors.push(`Failed to sync ${model.name}: ${error}`)
    }
  }

  return {
    success: errors.length === 0,
    syncedCount,
    totalModels: MODEL_REGISTRY.length,
    errors
  }
}

export async function getAvailableModels(projectId: string) {
  const supabase = await createClient()

  // Get models with provider credentials configured
  const { data: models } = await supabase
    .from('ai_models')
    .select(`
      *,
      ai_providers!inner(
        id,
        name,
        ai_provider_credentials!inner(
          id
        )
      )
    `)
    .eq('is_active', true)
    .eq('ai_providers.ai_provider_credentials.project_id', projectId)
    .order('provider')
    .order('sort_order')

  return models || []
}

export async function getModelCapabilities(modelName: string) {
  const model = MODEL_REGISTRY.find(m => m.name === modelName)
  return model?.capabilities || {}
}

export async function getModelPricing(modelName: string) {
  const model = MODEL_REGISTRY.find(m => m.name === modelName)
  return model?.pricing || null
}