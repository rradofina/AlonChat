import { createClient } from '@/lib/supabase/client'

export interface AIModel {
  id: string
  name: string
  display_name: string
  provider: string
  provider_logo?: string
  model_id: string
  description?: string
  context_window?: number
  max_tokens?: number
  supports_vision?: boolean
  supports_functions?: boolean
  supports_streaming?: boolean
  is_active: boolean
  sort_order: number
  message_credits?: number
  input_price_per_million?: number
  output_price_per_million?: number
  speed?: 'fast' | 'medium' | 'slow'
  request_template?: any
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
      // First get the models
      let query = this.supabase
        .from('ai_models')
        .select('*')
        .order('sort_order', { ascending: true })

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data: modelsData, error: modelsError } = await query

      if (modelsError) throw modelsError

      // Then get the providers
      const { data: providersData, error: providersError } = await this.supabase
        .from('ai_providers')
        .select('id, logo_url')

      if (providersError) throw providersError

      // Map provider logos to models
      const providerLogoMap: Record<string, string> = {}
      providersData?.forEach(provider => {
        if (provider.logo_url) {
          providerLogoMap[provider.id] = provider.logo_url
        }
      })

      const models = (modelsData || []).map(model => ({
        ...model,
        provider_logo: model.provider_id ? providerLogoMap[model.provider_id] || null : null
      }))

      this.setCache(cacheKey, models)
      return models
    } catch (error) {
      console.error('Error fetching AI models:', error)
      // Production SaaS - no hardcoded fallbacks, return empty array
      return []
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
      // Production SaaS - no hardcoded fallbacks
      return []
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
      // Production SaaS - no hardcoded fallbacks
      return {}
    }
  }

  async getSetting(key: string): Promise<any> {
    const settings = await this.getSystemSettings()
    return settings[key]
  }

  clearCache(): void {
    this.cache.clear()
  }
}

export const configService = new ConfigService()