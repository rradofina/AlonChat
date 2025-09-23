import { createClient } from '@/lib/supabase/server'
import { AIProvider } from './providers/base'

// Server-side provider loading system with project-specific credentials
export class ServerProviderLoader {
  private providers = new Map<string, AIProvider>()

  async loadProvidersForProject(projectId: string): Promise<Map<string, AIProvider>> {
    try {
      const supabase = await createClient()

      // Load provider configurations from database
      const { data: providerConfigs, error } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('is_active', true)

      if (error) throw error

      // Get credentials for this specific project - join with providers to get provider names
      const { data: apiCredentials, error: credError } = await supabase
        .from('ai_provider_credentials')
        .select(`
          credentials,
          ai_providers!inner(name)
        `)
        .eq('project_id', projectId)
        .eq('is_active', true)

      console.log('Loading API keys for project:', projectId)
      console.log('Found credentials:', apiCredentials)

      const credentials: Record<string, string> = {}
      if (apiCredentials) {
        apiCredentials.forEach(cred => {
          // Extract API key from credentials JSONB
          const providerName = cred.ai_providers?.name

          // The credentials object stores keys like OPENAI_API_KEY, GOOGLE_AI_API_KEY, etc.
          let apiKey = null
          if (cred.credentials) {
            if (providerName === 'openai') {
              apiKey = cred.credentials.OPENAI_API_KEY
            } else if (providerName === 'google') {
              apiKey = cred.credentials.GOOGLE_AI_API_KEY || cred.credentials.GEMINI_API_KEY
            } else if (providerName === 'anthropic') {
              apiKey = cred.credentials.ANTHROPIC_API_KEY
            } else {
              // Generic fallback - look for common patterns
              apiKey = cred.credentials.api_key || cred.credentials.apiKey || cred.credentials.API_KEY
            }
          }

          if (providerName && apiKey) {
            credentials[providerName] = apiKey
            console.log(`Loaded API key for ${providerName}: ${apiKey.substring(0, 10)}...`)
          }
        })
      }

      // Load providers with their credentials
      for (const config of providerConfigs || []) {
        await this.loadProvider(config, credentials[config.name])
      }

      return this.providers
    } catch (error) {
      console.error('Failed to load providers from database:', error)
      // Load default providers with environment variables as fallback
      await this.loadDefaultProviders()
      return this.providers
    }
  }

  private async loadProvider(config: any, apiKey?: string): Promise<void> {
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
        // Initialize with config from database and API key
        await provider.initialize({
          apiKey: apiKey,  // Pass the API key from database
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
          // Anthropic provider not implemented yet
          console.log('Anthropic provider not implemented, skipping...')
          return null

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

  private async loadDefaultProviders(): Promise<void> {
    // Load default providers with environment variables as fallback
    try {
      const { GoogleProvider } = await import('./providers/google')
      const googleProvider = new GoogleProvider()
      await googleProvider.initialize({
        apiKey: process.env.GOOGLE_AI_API_KEY
      })
      if (googleProvider.isConfigured()) {
        this.providers.set('google', googleProvider)
      }
    } catch (error) {
      console.error('Failed to load Google provider:', error)
    }

    try {
      const { OpenAIProvider } = await import('./providers/openai')
      const openaiProvider = new OpenAIProvider()
      await openaiProvider.initialize({
        apiKey: process.env.OPENAI_API_KEY
      })
      if (openaiProvider.isConfigured()) {
        this.providers.set('openai', openaiProvider)
      }
    } catch (error) {
      console.error('Failed to load OpenAI provider:', error)
    }
  }
}

export const serverProviderLoader = new ServerProviderLoader()