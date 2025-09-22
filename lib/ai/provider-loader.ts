import { createClient } from '@/lib/supabase/client'
import { AIProvider } from './providers/base'

// Dynamic provider loading system
export class ProviderLoader {
  private providers = new Map<string, AIProvider>()
  private supabase = createClient()

  async loadProviders(): Promise<Map<string, AIProvider>> {
    try {
      // Load provider configurations from database
      const { data: providerConfigs, error } = await this.supabase
        .from('ai_providers')
        .select('*')
        .eq('is_active', true)

      if (error) throw error

      for (const config of providerConfigs || []) {
        await this.loadProvider(config)
      }

      return this.providers
    } catch (error) {
      console.error('Failed to load providers from database:', error)
      // Return empty map if database not ready
      return new Map()
    }
  }

  private async loadProvider(config: any): Promise<void> {
    try {
      let provider: AIProvider | null = null

      // Try to load built-in provider classes
      if (config.is_builtin) {
        provider = await this.loadBuiltinProvider(config.provider_class)
      } else if (config.npm_package) {
        // Load from npm package (future feature)
        provider = await this.loadNpmProvider(config.npm_package, config.provider_class)
      } else {
        // Use generic custom provider
        provider = await this.createCustomProvider(config)
      }

      if (provider) {
        // Initialize with config from database
        await provider.initialize({
          apiBaseUrl: config.api_base_url,
          authHeaderName: config.auth_header_name,
          authHeaderPrefix: config.auth_header_prefix,
          features: config.features,
          pricing: config.pricing,
          ...config.config_schema
        })

        this.providers.set(config.name, provider)
      }
    } catch (error) {
      console.error(`Failed to load provider ${config.name}:`, error)
    }
  }

  private async loadBuiltinProvider(className: string): Promise<AIProvider | null> {
    try {
      // Dynamically import built-in providers
      switch (className) {
        case 'OpenAIProvider':
          const { OpenAIProvider } = await import('./providers/openai')
          return new OpenAIProvider()

        case 'GoogleProvider':
          const { GoogleProvider } = await import('./providers/google')
          return new GoogleProvider()

        case 'AnthropicProvider':
          // Only load if file exists
          try {
            const { AnthropicProvider } = await import('./providers/anthropic')
            return new AnthropicProvider()
          } catch {
            return null
          }

        case 'CustomProvider':
          const { CustomProvider } = await import('./providers/custom')
          return new CustomProvider()

        default:
          return null
      }
    } catch (error) {
      console.error(`Failed to load built-in provider ${className}:`, error)
      return null
    }
  }

  private async loadNpmProvider(packageName: string, className: string): Promise<AIProvider | null> {
    try {
      // Future: Dynamic npm package loading
      // This would require a build step or runtime module loading
      const module = await import(packageName)
      const ProviderClass = module[className]
      return new ProviderClass()
    } catch (error) {
      console.error(`Failed to load npm provider ${packageName}:`, error)
      return null
    }
  }

  private async createCustomProvider(config: any): Promise<AIProvider> {
    const { CustomProvider } = await import('./providers/custom')
    return new CustomProvider()
  }
}

export const providerLoader = new ProviderLoader()