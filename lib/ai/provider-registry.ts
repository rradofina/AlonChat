import { AIProvider } from './providers/base'
import { providerLoader } from './provider-loader'

export class ProviderRegistry {
  private providers = new Map<string, AIProvider>()
  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) return

    // Load all providers from database
    this.providers = await providerLoader.loadProviders()

    this.initialized = true
  }

  async registerProvider(name: string, provider: AIProvider): Promise<void> {
    this.providers.set(name, provider)
  }

  async reloadProviders(): Promise<void> {
    this.initialized = false
    this.providers.clear()
    await this.initialize()
  }

  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name)
  }

  getAllProviders(): Map<string, AIProvider> {
    return this.providers
  }

  isProviderConfigured(name: string): boolean {
    const provider = this.providers.get(name)
    return provider?.isConfigured() || false
  }

  getProviderRequirements(name: string): string[] {
    const provider = this.providers.get(name)
    return provider?.getRequiredEnvVars() || []
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry()