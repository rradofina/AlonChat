import { AIProvider, ChatCompletionOptions, ChatCompletionResult, HealthCheckResult } from './providers/base'
import { OpenAIProvider } from './providers/openai'
import { GoogleProvider } from './providers/google'
import { retryAICall } from '@/lib/utils/retry'

interface ProviderHealth {
  provider: string
  status: HealthCheckResult
}

export class ProviderManager {
  private providers: Map<string, AIProvider> = new Map()
  private healthCache: Map<string, HealthCheckResult> = new Map()
  private healthCheckInterval = 60000 // Check every minute
  private lastHealthCheck = 0

  constructor() {
    this.initializeProviders()
  }

  private async initializeProviders() {
    // Initialize OpenAI
    const openai = new OpenAIProvider()
    await openai.initialize({})
    if (openai.isConfigured()) {
      this.providers.set('openai', openai)
    }

    // Initialize Google
    const google = new GoogleProvider()
    await google.initialize({})
    if (google.isConfigured()) {
      this.providers.set('google', google)
    }
  }

  async getHealthStatus(): Promise<ProviderHealth[]> {
    const now = Date.now()

    // Only check if cache is stale
    if (now - this.lastHealthCheck > this.healthCheckInterval) {
      await this.checkAllProviders()
      this.lastHealthCheck = now
    }

    const results: ProviderHealth[] = []
    for (const [name, provider] of this.providers) {
      const cachedHealth = this.healthCache.get(name)
      if (cachedHealth) {
        results.push({ provider: name, status: cachedHealth })
      }
    }

    return results
  }

  private async checkAllProviders() {
    const checks = Array.from(this.providers.entries()).map(async ([name, provider]) => {
      if (provider.healthCheck) {
        const health = await provider.healthCheck()
        this.healthCache.set(name, health)
      }
    })

    await Promise.all(checks)
  }

  async chatWithFallback(options: ChatCompletionOptions, preferredProvider?: string): Promise<ChatCompletionResult & { provider: string }> {
    // Try preferred provider first if specified
    if (preferredProvider && this.providers.has(preferredProvider)) {
      const provider = this.providers.get(preferredProvider)!
      try {
        const result = await retryAICall(
          () => provider.chat(options),
          preferredProvider
        )
        return { ...result, provider: preferredProvider }
      } catch (error: any) {
        console.error(`Failed to use ${preferredProvider} after retries:`, error.message)
      }
    }

    // Try all available providers in order
    const providerOrder = preferredProvider
      ? [preferredProvider, ...Array.from(this.providers.keys()).filter(p => p !== preferredProvider)]
      : Array.from(this.providers.keys())

    for (const providerName of providerOrder) {
      const provider = this.providers.get(providerName)
      if (!provider || providerName === preferredProvider) continue // Skip if already tried

      try {
        console.log(`Attempting to use ${providerName} provider...`)
        const result = await retryAICall(
          () => provider.chat(options),
          providerName
        )
        return { ...result, provider: providerName }
      } catch (error: any) {
        console.error(`Failed to use ${providerName} after retries:`, error.message)
        continue
      }
    }

    throw new Error('All AI providers are currently unavailable. Please try again later.')
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  hasProvider(name: string): boolean {
    return this.providers.has(name)
  }
}

// Singleton instance
let managerInstance: ProviderManager | null = null

export function getProviderManager(): ProviderManager {
  if (!managerInstance) {
    managerInstance = new ProviderManager()
  }
  return managerInstance
}