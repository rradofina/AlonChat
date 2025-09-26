import { createClient } from '@/lib/supabase/server'
import { AIProvider } from './providers/base'

// Server-side provider loading system using environment variables
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

      // Initialize providers using environment variables
      for (const config of providerConfigs || []) {
        const provider = await this.initializeProvider(config.name, config.provider_class)
        if (provider) {
          this.providers.set(config.name, provider)
        }
      }

      return this.providers
    } catch (error) {
      console.error('Error loading providers:', error)
      return new Map()
    }
  }

  private async initializeProvider(
    providerName: string,
    providerClass: string
  ): Promise<AIProvider | null> {
    try {
      // Dynamically import and initialize provider using environment variables
      switch (providerName) {
        case 'openai':
          const { OpenAIProvider } = await import('./providers/openai')
          const openaiProvider = new OpenAIProvider()
          await openaiProvider.initialize({}) // Uses OPENAI_API_KEY from env
          return openaiProvider.isConfigured() ? openaiProvider : null

        case 'google':
          const { GoogleProvider } = await import('./providers/google')
          const googleProvider = new GoogleProvider()
          await googleProvider.initialize({}) // Uses GEMINI_API_KEY from env
          return googleProvider.isConfigured() ? googleProvider : null

        default:
          console.warn(`Unknown provider: ${providerName}`)
          return null
      }
    } catch (error) {
      console.error(`Error initializing ${providerName}:`, error)
      return null
    }
  }

  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name)
  }

  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values())
  }
}