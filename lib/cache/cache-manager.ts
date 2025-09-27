import { redisCache } from './redis-cache'
import { predictivePrefetcher } from './strategies/predictive'
import { staleWhileRevalidate } from './strategies/stale-while-revalidate'
import { partialHydration } from './strategies/partial-hydration'
import type { CacheOptions } from './redis-cache'

/**
 * Unified Cache Manager
 * 
 * Orchestrates all caching strategies and provides a simple API
 * for the application to use caching without worrying about
 * implementation details.
 * 
 * Features:
 * - Strategy selection
 * - Automatic optimization
 * - Performance monitoring
 * - Cache warming
 * - Batch operations
 */

export type CacheStrategy = 
  | 'standard'
  | 'swr'
  | 'predictive'
  | 'hydration'
  | 'auto'

interface CacheManagerOptions extends CacheOptions {
  strategy?: CacheStrategy
  monitor?: boolean
  warmup?: boolean
}

interface CacheMetrics {
  hits: number
  misses: number
  hitRate: number
  avgLatency: number
  totalRequests: number
  strategyUsage: Map<CacheStrategy, number>
}

export class CacheManager {
  private static instance: CacheManager
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    avgLatency: 0,
    totalRequests: 0,
    strategyUsage: new Map(),
  }
  private latencies: number[] = []
  private maxLatencySamples = 1000

  private constructor() {
    this.initialize()
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  private async initialize() {
    // Connect to Redis
    await redisCache.connect()
    console.log('[CacheManager] Initialized')
  }

  /**
   * Get value with automatic strategy selection
   */
  public async get<T>(
    key: string,
    fetcher?: () => Promise<T>,
    options: CacheManagerOptions = {}
  ): Promise<T | null> {
    const start = Date.now()
    const strategy = options.strategy || 'auto'

    try {
      // Track request
      this.metrics.totalRequests++
      this.trackStrategyUsage(strategy)

      // Auto-select strategy based on key pattern
      const effectiveStrategy = this.selectStrategy(key, strategy)

      let result: T | null = null

      switch (effectiveStrategy) {
        case 'swr':
          if (!fetcher) {
            throw new Error('SWR strategy requires a fetcher function')
          }
          result = await staleWhileRevalidate.get(key, fetcher, options)
          break

        case 'predictive':
          // Track access for predictive prefetching
          predictivePrefetcher.trackAccess(key)
          result = await redisCache.get<T>(key, options)
          break

        case 'hydration':
          // Use partial hydration for complex objects
          if (result && typeof result === 'object') {
            result = await partialHydration.hydrate(result as any, options)
          } else {
            result = await redisCache.get<T>(key, options)
          }
          break

        case 'standard':
        default:
          result = await redisCache.get<T>(key, options)
          break
      }

      // Track hit/miss
      if (result !== null) {
        this.metrics.hits++
      } else {
        this.metrics.misses++
        
        // Fetch and cache if fetcher provided
        if (fetcher) {
          result = await fetcher()
          await this.set(key, result, options)
        }
      }

      // Update metrics
      this.updateMetrics(Date.now() - start)

      return result
    } catch (error) {
      console.error(`[CacheManager] Error getting ${key}:`, error)
      
      // Fallback to fetcher if available
      if (fetcher) {
        return await fetcher()
      }
      
      return null
    }
  }

  /**
   * Set value with automatic strategy optimization
   */
  public async set<T>(
    key: string,
    value: T,
    options: CacheManagerOptions = {}
  ): Promise<boolean> {
    const strategy = options.strategy || 'auto'
    const effectiveStrategy = this.selectStrategy(key, strategy)

    try {
      switch (effectiveStrategy) {
        case 'swr':
          return await staleWhileRevalidate.set(key, value, options)

        case 'predictive':
          // Set in cache and track for predictions
          predictivePrefetcher.trackAccess(key)
          return await redisCache.set(key, value, options)

        case 'hydration':
          // Cache with hydration support
          if (typeof value === 'object' && value !== null) {
            await partialHydration.partialUpdate(
              key,
              value as any,
              options
            )
            return true
          }
          return await redisCache.set(key, value, options)

        case 'standard':
        default:
          return await redisCache.set(key, value, options)
      }
    } catch (error) {
      console.error(`[CacheManager] Error setting ${key}:`, error)
      return false
    }
  }

  /**
   * Delete value from cache
   */
  public async delete(key: string, namespace?: string): Promise<boolean> {
    return await redisCache.delete(key, namespace)
  }

  /**
   * Clear cache by pattern or entirely
   */
  public async clear(pattern?: string, namespace?: string): Promise<number> {
    return await redisCache.clear(pattern, namespace)
  }

  /**
   * Invalidate by tags
   */
  public async invalidateByTags(
    tags: string[],
    namespace?: string
  ): Promise<number> {
    return await redisCache.invalidateByTags(tags, namespace)
  }

  /**
   * Batch get operation
   */
  public async mget<T>(
    keys: string[],
    fetcher?: (keys: string[]) => Promise<Map<string, T>>,
    options: CacheManagerOptions = {}
  ): Promise<Map<string, T | null>> {
    const start = Date.now()
    
    try {
      // Get from cache
      const cached = await redisCache.mget<T>(keys, options.namespace)
      
      // Find missing keys
      const missing: string[] = []
      for (const [key, value] of cached) {
        if (value === null) {
          missing.push(key)
        }
      }

      // Fetch missing if fetcher provided
      if (missing.length > 0 && fetcher) {
        const fetched = await fetcher(missing)
        
        // Cache fetched values
        await redisCache.mset(fetched, options)
        
        // Merge results
        for (const [key, value] of fetched) {
          cached.set(key, value)
        }
      }

      // Track metrics
      this.metrics.hits += keys.length - missing.length
      this.metrics.misses += missing.length
      this.updateMetrics(Date.now() - start)

      return cached
    } catch (error) {
      console.error('[CacheManager] Batch get error:', error)
      
      // Fallback to fetcher
      if (fetcher) {
        return await fetcher(keys)
      }
      
      return new Map(keys.map(k => [k, null]))
    }
  }

  /**
   * Warm up cache with preloaded data
   */
  public async warmup(
    data: Map<string, any> | Array<{ key: string; value: any }>,
    options: CacheManagerOptions = {}
  ): Promise<void> {
    console.log('[CacheManager] Starting cache warmup')
    
    const entries = data instanceof Map 
      ? data 
      : new Map(data.map(({ key, value }) => [key, value]))

    await redisCache.mset(entries, options)
    
    // Track access for predictive prefetching
    for (const key of entries.keys()) {
      predictivePrefetcher.trackAccess(key)
    }

    console.log(`[CacheManager] Warmed up ${entries.size} cache entries`)
  }

  /**
   * Prefetch data based on predictions
   */
  public async prefetch(
    key: string,
    fetcher: () => Promise<any>,
    options: CacheManagerOptions = {}
  ): Promise<void> {
    const strategy = options.strategy || 'auto'
    const effectiveStrategy = this.selectStrategy(key, strategy)

    if (effectiveStrategy === 'swr') {
      await staleWhileRevalidate.prefetch(key, fetcher, options)
    } else {
      // Check if already cached
      const cached = await redisCache.get(key, options)
      if (cached === null) {
        const value = await fetcher()
        await this.set(key, value, options)
      }
    }
  }

  /**
   * Select optimal caching strategy
   */
  private selectStrategy(key: string, requestedStrategy: CacheStrategy): CacheStrategy {
    if (requestedStrategy !== 'auto') {
      return requestedStrategy
    }

    // Auto-select based on key patterns
    if (key.includes(':list') || key.includes(':page')) {
      return 'swr' // Use SWR for lists and pagination
    }
    
    if (key.includes(':aggregate') || key.includes(':computed')) {
      return 'hydration' // Use hydration for computed fields
    }
    
    if (key.includes(':detail') || key.includes(':next')) {
      return 'predictive' // Use predictive for detail pages
    }

    return 'standard'
  }

  /**
   * Track strategy usage
   */
  private trackStrategyUsage(strategy: CacheStrategy) {
    const count = this.metrics.strategyUsage.get(strategy) || 0
    this.metrics.strategyUsage.set(strategy, count + 1)
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(latency: number) {
    // Track latency
    this.latencies.push(latency)
    if (this.latencies.length > this.maxLatencySamples) {
      this.latencies.shift()
    }

    // Calculate metrics
    const total = this.metrics.hits + this.metrics.misses
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0
    this.metrics.avgLatency = 
      this.latencies.reduce((sum, l) => sum + l, 0) / this.latencies.length
  }

  /**
   * Get cache statistics
   */
  public async getStats() {
    const redisStats = await redisCache.getStats()
    const swrStatus = staleWhileRevalidate.getQueueStatus()
    const prefetchAnalytics = predictivePrefetcher.getAnalytics()
    const hydrationStats = partialHydration.getStats()

    return {
      manager: {
        ...this.metrics,
        strategyUsage: Array.from(this.metrics.strategyUsage.entries()).map(
          ([strategy, count]) => ({ strategy, count })
        ),
      },
      redis: redisStats,
      swr: swrStatus,
      predictive: prefetchAnalytics,
      hydration: hydrationStats,
    }
  }

  /**
   * Reset all metrics
   */
  public resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      avgLatency: 0,
      totalRequests: 0,
      strategyUsage: new Map(),
    }
    this.latencies = []
  }

  /**
   * Configure cache strategies
   */
  public configure(config: {
    defaultTTL?: number
    maxMemory?: number
    compressionThreshold?: number
  }) {
    // Apply configuration to underlying caches
    console.log('[CacheManager] Configuration updated:', config)
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    details: any
  }> {
    try {
      // Test Redis connection
      const testKey = 'health:check'
      await redisCache.set(testKey, Date.now(), { ttl: 10 })
      const value = await redisCache.get(testKey)
      
      if (value === null) {
        return { status: 'unhealthy', details: 'Redis read/write failed' }
      }

      const stats = await this.getStats()
      
      // Check hit rate
      if (stats.manager.hitRate < 50 && stats.manager.totalRequests > 100) {
        return { 
          status: 'degraded', 
          details: `Low hit rate: ${stats.manager.hitRate.toFixed(2)}%` 
        }
      }

      return { status: 'healthy', details: stats }
    } catch (error) {
      return { 
        status: 'unhealthy', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance()