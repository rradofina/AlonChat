/**
 * Production-ready Model Service - SERVER SIDE ONLY
 * NO HARDCODED VALUES - Everything comes from database
 * Client should use model-service-client.ts instead
 */
export class ModelService {
  private static instance: ModelService

  static getInstance(): ModelService {
    if (!ModelService.instance) {
      ModelService.instance = new ModelService()
    }
    return ModelService.instance
  }

  /**
   * Get the system default model
   * Falls back to first active model if no default set
   * Returns null if no models available (should trigger error handling)
   */
  async getDefaultModel(isServer = true): Promise<string | null> {
    // For server-side only - client should use API endpoint
    if (!isServer) {
      throw new Error('Client should use model-service-client instead')
    }

    // Dynamic import for server-only code
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    try {
      // First try to get from system settings
      const { data: settings } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'default_ai_model')
        .single()

      if (settings?.setting_value) {
        // setting_value is stored as JSON, extract string
        const modelName = typeof settings.setting_value === 'string'
          ? settings.setting_value
          : settings.setting_value

        // Verify this model actually exists and is active
        const { data: model } = await supabase
          .from('ai_models')
          .select('name')
          .eq('name', modelName)
          .eq('is_active', true)
          .single()

        if (model) {
          return model.name
        }
      }

      // Fallback: Get model marked as default
      const { data: defaultModel } = await supabase
        .from('ai_models')
        .select('name')
        .eq('is_default', true)
        .eq('is_active', true)
        .single()

      if (defaultModel) {
        return defaultModel.name
      }

      // Last fallback: Get any active model, prefer fallback models
      const { data: fallbackModel } = await supabase
        .from('ai_models')
        .select('name')
        .eq('is_active', true)
        .eq('is_fallback', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (fallbackModel) {
        return fallbackModel.name
      }

      // Final fallback: ANY active model
      const { data: anyModel } = await supabase
        .from('ai_models')
        .select('name')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      return anyModel?.name || null

    } catch (error) {
      console.error('[ModelService] Error getting default model:', error)
      return null
    }
  }

  /**
   * Get all available models
   */
  async getAvailableModels(isServer = true) {
    // For server-side only - client should use API endpoint
    if (!isServer) {
      throw new Error('Client should use model-service-client instead')
    }

    // Dynamic import for server-only code
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data: models, error } = await supabase
      .from('ai_models')
      .select('*')
      .eq('is_active', true)
      .order('provider', { ascending: true })
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[ModelService] Error fetching models:', error)
      return []
    }

    return models || []
  }

  /**
   * Validate if a model exists and is active
   */
  async isModelValid(modelName: string, isServer = true): Promise<boolean> {
    // For server-side only - client should use API endpoint
    if (!isServer) {
      throw new Error('Client should use model-service-client instead')
    }

    // Dynamic import for server-only code
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data: model } = await supabase
      .from('ai_models')
      .select('id')
      .eq('name', modelName)
      .eq('is_active', true)
      .single()

    return !!model
  }

  /**
   * Get model configuration
   */
  async getModelConfig(modelName: string, isServer = true) {
    // For server-side only - client should use API endpoint
    if (!isServer) {
      throw new Error('Client should use model-service-client instead')
    }

    // Dynamic import for server-only code
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data: model } = await supabase
      .from('ai_models')
      .select('*')
      .eq('name', modelName)
      .eq('is_active', true)
      .single()

    return model
  }

  /**
   * Update system default model
   */
  async updateDefaultModel(modelName: string): Promise<boolean> {
    // Dynamic import for server-only code
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    try {
      // Verify model exists
      const isValid = await this.isModelValid(modelName)
      if (!isValid) {
        throw new Error(`Model ${modelName} is not valid or not active`)
      }

      // Update system setting
      const { error: settingsError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'default_ai_model',
          setting_value: JSON.stringify(modelName),
          setting_type: 'string',
          category: 'ai',
          description: 'Default AI model for new agents',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'setting_key'
        })

      if (settingsError) throw settingsError

      // Update is_default flag
      await supabase
        .from('ai_models')
        .update({ is_default: false })
        .neq('name', modelName)

      await supabase
        .from('ai_models')
        .update({ is_default: true })
        .eq('name', modelName)

      return true
    } catch (error) {
      console.error('[ModelService] Error updating default model:', error)
      return false
    }
  }
}

// Export singleton instance
export const modelService = ModelService.getInstance()