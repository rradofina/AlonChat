import { createClient } from '@/lib/supabase/client'

export interface AIModel {
  id: string
  name: string
  display_name: string
  provider: string
  model_id: string
  description?: string
  context_window?: number
  max_tokens?: number
  supports_vision?: boolean
  supports_function_calling?: boolean
  supports_streaming?: boolean
  is_active: boolean
  sort_order: number
}

export interface PromptPreset {
  id: string
  name: string
  category?: string
  description?: string
  prompt_template: string
  is_public: boolean
  sort_order: number
}

export interface SystemSetting {
  id: string
  setting_key: string
  setting_value: any
  setting_type: string
  category?: string
  description?: string
  is_public: boolean
}

class ConfigService {
  private supabase = createClient()
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data as T
    }
    return null
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  async getAIModels(activeOnly = true): Promise<AIModel[]> {
    const cacheKey = `models_${activeOnly}`
    const cached = this.getCached<AIModel[]>(cacheKey)
    if (cached) return cached

    try {
      let query = this.supabase
        .from('ai_models')
        .select('*')
        .order('sort_order', { ascending: true })

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) throw error

      const models = data || []
      this.setCache(cacheKey, models)
      return models
    } catch (error) {
      console.error('Error fetching AI models:', error)
      // Return hardcoded fallback if database is not ready
      return this.getFallbackModels()
    }
  }

  async getPromptPresets(publicOnly = true): Promise<PromptPreset[]> {
    const cacheKey = `presets_${publicOnly}`
    const cached = this.getCached<PromptPreset[]>(cacheKey)
    if (cached) return cached

    try {
      let query = this.supabase
        .from('prompt_presets')
        .select('*')
        .order('sort_order', { ascending: true })

      if (publicOnly) {
        query = query.eq('is_public', true)
      }

      const { data, error } = await query

      if (error) throw error

      const presets = data || []
      this.setCache(cacheKey, presets)
      return presets
    } catch (error) {
      console.error('Error fetching prompt presets:', error)
      // Return hardcoded fallback if database is not ready
      return this.getFallbackPresets()
    }
  }

  async getSystemSettings(publicOnly = true): Promise<Record<string, any>> {
    const cacheKey = `settings_${publicOnly}`
    const cached = this.getCached<Record<string, any>>(cacheKey)
    if (cached) return cached

    try {
      let query = this.supabase
        .from('system_settings')
        .select('*')

      if (publicOnly) {
        query = query.eq('is_public', true)
      }

      const { data, error } = await query

      if (error) throw error

      const settings: Record<string, any> = {}
      data?.forEach(setting => {
        settings[setting.setting_key] = setting.setting_value
      })

      this.setCache(cacheKey, settings)
      return settings
    } catch (error) {
      console.error('Error fetching system settings:', error)
      return this.getFallbackSettings()
    }
  }

  async getSetting(key: string): Promise<any> {
    const settings = await this.getSystemSettings()
    return settings[key]
  }

  // Fallback methods for when database is not available
  private getFallbackModels(): AIModel[] {
    return [
      {
        id: '1',
        name: 'gpt-4o-mini',
        display_name: 'GPT-4o Mini',
        provider: 'openai',
        model_id: 'gpt-4o-mini',
        description: 'Affordable and intelligent small model',
        is_active: true,
        sort_order: 1
      },
      {
        id: '2',
        name: 'gpt-3.5-turbo',
        display_name: 'GPT-3.5 Turbo',
        provider: 'openai',
        model_id: 'gpt-3.5-turbo',
        description: 'Fast, inexpensive model for simple tasks',
        is_active: true,
        sort_order: 2
      }
    ]
  }

  private getFallbackPresets(): PromptPreset[] {
    return [
      {
        id: '1',
        name: 'AI Assistant',
        category: 'general',
        prompt_template: `### Role
You are an AI assistant who helps users with their inquiries, issues and requests. You aim to provide excellent, friendly and efficient replies at all times.`,
        is_public: true,
        sort_order: 1
      },
      {
        id: '2',
        name: 'Customer Support',
        category: 'support',
        prompt_template: 'You are a customer support agent. Help users with their inquiries professionally.',
        is_public: true,
        sort_order: 2
      }
    ]
  }

  private getFallbackSettings(): Record<string, any> {
    return {
      default_model: 'gpt-4o-mini',
      max_conversation_length: 100,
      enable_model_comparison: true,
      supported_file_types: ['pdf', 'txt', 'docx', 'csv', 'json'],
      max_file_size_mb: 10
    }
  }

  clearCache(): void {
    this.cache.clear()
  }
}

export const configService = new ConfigService()