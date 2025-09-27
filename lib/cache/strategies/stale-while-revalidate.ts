import { redisCache } from '../redis-cache'
import type { CacheOptions } from '../redis-cache'

/**
 * Stale-While-Revalidate Caching Strategy
 * 
 * Serves stale cached content immediately while fetching fresh data
 * in the background, providing instant responses with eventual consistency.
 * 
 * Features:
 * - Zero-latency responses for stale content
 * - Background revalidation
 * - Grace period for errors
 * - Revalidation deduplication
 * - Adaptive TTL based on change frequency
 */

interface SWROptions extends CacheOptions {
  maxStale?: number // Maximum staleness in seconds
  errorGracePeriod?: number // Keep stale content on error (seconds)
  revalidateAfter?: number // Force revalidation after this time (seconds)
  adaptiveTTL?: boolean // Adjust TTL based on change frequency
  onRevalidate?: (key: string) => Promise<any> // Custom revalidation function
}

interface RevalidationJob {
  key: string
  promise: Promise<any>
  startedAt: number
  attempts: number
}

export class StaleWhileRevalidate {
  private revalidationQueue: Map<string, RevalidationJob> = new Map()
  private changeFrequency: Map<string, number[]> = new Map()
  private maxQueueSize = 100
  private maxRevalidationAttempts = 3

  /**
   * Get value with stale-while-revalidate strategy
   */
  public async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: SWROptions = {}
  ): Promise<T | null> {
    const {
      ttl = 3600,
      maxStale = 86400, // 24 hours default
      errorGracePeriod = 3600, // 1 hour default
      revalidateAfter = ttl,
      adaptiveTTL = true,
      namespace = 'swr',
      onRevalidate,
    } = options

    try {
      // Try to get from cache
      const cached = await redisCache.get<{
        data: T
        timestamp: number
        etag?: string
        revalidatedAt?: number
      }>(key, { namespace })

      const now = Date.now()
      
      if (cached) {
        const age = (now - cached.timestamp) / 1000 // Age in seconds
        const isStale = age > ttl
        const isTooStale = age > maxStale
        const shouldRevalidate = 
          !cached.revalidatedAt || 
          (now - cached.revalidatedAt) / 1000 > revalidateAfter

        // If not too stale, return immediately
        if (!isTooStale) {
          // Trigger background revalidation if stale
          if (isStale && shouldRevalidate) {
            this.revalidateInBackground(
              key,
              onRevalidate || fetcher,
              { ...options, previousData: cached }
            )
          }
          
          return cached.data
        }
      }

      // No cache or too stale - fetch synchronously
      return await this.fetchAndCache(key, fetcher, options)
    } catch (error) {
      console.error(`[SWR] Error getting ${key}:`, error)
      
      // Try to return stale content on error
      if (errorGracePeriod > 0) {
        const stale = await redisCache.get<{ data: T }>(key, { namespace })
        if (stale) {
          console.log(`[SWR] Returning stale content for ${key} due to error`)
          return stale.data
        }
      }
      
      throw error
    }
  }

  /**
   * Set value with SWR metadata
   */
  public async set<T>(
    key: string,
    value: T,
    options: SWROptions = {}
  ): Promise<boolean> {
    const {
      ttl = 3600,
      maxStale = 86400,
      adaptiveTTL = true,
      namespace = 'swr',
    } = options

    // Calculate adaptive TTL if enabled
    let effectiveTTL = ttl
    if (adaptiveTTL) {
      effectiveTTL = this.calculateAdaptiveTTL(key, ttl)
    }

    // Store with metadata
    const entry = {
      data: value,
      timestamp: Date.now(),
      etag: this.generateETag(value),
    }

    // Set main cache entry
    const success = await redisCache.set(
      key,
      entry,
      {
        ...options,
        namespace,
        ttl: effectiveTTL + maxStale, // Keep in cache for maxStale period
        staleWhileRevalidate: maxStale,
      }
    )

    // Track change frequency for adaptive TTL
    if (adaptiveTTL) {
      this.trackChangeFrequency(key)
    }

    return success
  }

  /**
   * Fetch data and cache it
   */
  private async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: SWROptions
  ): Promise<T> {
    // Check if already being revalidated
    const existing = this.revalidationQueue.get(key)
    if (existing) {
      console.log(`[SWR] Waiting for existing revalidation of ${key}`)
      return existing.promise
    }

    // Create revalidation job
    const job: RevalidationJob = {
      key,
      promise: null as any,
      startedAt: Date.now(),
      attempts: 1,
    }

    // Create promise for the fetch
    job.promise = (async () => {
      try {
        const data = await fetcher()
        await this.set(key, data, options)
        return data
      } finally {
        this.revalidationQueue.delete(key)
      }
    })()

    this.revalidationQueue.set(key, job)
    return job.promise
  }

  /**
   * Revalidate in background
   */
  private async revalidateInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: SWROptions & { previousData?: any }
  ): Promise<void> {
    // Check if already revalidating
    if (this.revalidationQueue.has(key)) {
      console.log(`[SWR] Already revalidating ${key}`)
      return
    }

    // Check queue size
    if (this.revalidationQueue.size >= this.maxQueueSize) {
      console.warn(`[SWR] Revalidation queue full, skipping ${key}`)
      return
    }

    console.log(`[SWR] Background revalidation started for ${key}`)

    // Create revalidation job
    const job: RevalidationJob = {
      key,
      promise: null as any,
      startedAt: Date.now(),
      attempts: 1,
    }

    // Start background revalidation
    job.promise = (async () => {
      let attempts = 0
      let lastError: any

      while (attempts < this.maxRevalidationAttempts) {
        attempts++
        
        try {
          const newData = await fetcher()
          
          // Check if data changed using ETag
          const newETag = this.generateETag(newData)
          const oldETag = options.previousData?.etag
          
          if (newETag !== oldETag) {
            console.log(`[SWR] Data changed for ${key}, updating cache`)
          } else {
            console.log(`[SWR] Data unchanged for ${key}, updating timestamp`)
          }

          // Update cache with new data and revalidation timestamp
          await redisCache.set(
            key,
            {
              data: newData,
              timestamp: Date.now(),
              etag: newETag,
              revalidatedAt: Date.now(),
            },
            {
              ...options,
              namespace: options.namespace || 'swr',
            }
          )

          console.log(`[SWR] Background revalidation completed for ${key}`)
          return
        } catch (error) {
          lastError = error
          console.error(`[SWR] Revalidation attempt ${attempts} failed for ${key}:`, error)
          
          // Wait before retry with exponential backoff
          if (attempts < this.maxRevalidationAttempts) {
            await new Promise(resolve => 
              setTimeout(resolve, Math.pow(2, attempts) * 1000)
            )
          }
        }
      }

      console.error(`[SWR] All revalidation attempts failed for ${key}:`, lastError)
    })().finally(() => {
      this.revalidationQueue.delete(key)
    })

    this.revalidationQueue.set(key, job)
  }

  /**
   * Generate ETag for change detection
   */
  private generateETag(value: any): string {
    const crypto = require('crypto')
    const hash = crypto.createHash('md5')
    hash.update(JSON.stringify(value))
    return hash.digest('hex')
  }

  /**
   * Track change frequency for adaptive TTL
   */
  private trackChangeFrequency(key: string) {
    const now = Date.now()
    const history = this.changeFrequency.get(key) || []
    
    history.push(now)
    
    // Keep last 10 changes
    if (history.length > 10) {
      history.shift()
    }
    
    this.changeFrequency.set(key, history)
  }

  /**
   * Calculate adaptive TTL based on change frequency
   */
  private calculateAdaptiveTTL(key: string, baseTTL: number): number {
    const history = this.changeFrequency.get(key) || []
    
    if (history.length < 2) {
      return baseTTL
    }

    // Calculate average time between changes
    let totalInterval = 0
    for (let i = 1; i < history.length; i++) {
      totalInterval += history[i] - history[i - 1]
    }
    const avgInterval = totalInterval / (history.length - 1) / 1000 // Convert to seconds

    // Adjust TTL based on change frequency
    // Frequently changing: shorter TTL
    // Rarely changing: longer TTL
    let adaptiveTTL: number
    
    if (avgInterval < 60) {
      // Changes every minute - very short TTL
      adaptiveTTL = Math.min(baseTTL, 30)
    } else if (avgInterval < 300) {
      // Changes every 5 minutes - short TTL
      adaptiveTTL = Math.min(baseTTL, 120)
    } else if (avgInterval < 3600) {
      // Changes hourly - normal TTL
      adaptiveTTL = baseTTL
    } else if (avgInterval < 86400) {
      // Changes daily - long TTL
      adaptiveTTL = baseTTL * 2
    } else {
      // Rarely changes - very long TTL
      adaptiveTTL = baseTTL * 4
    }

    console.log(
      `[SWR] Adaptive TTL for ${key}: ${adaptiveTTL}s ` +
      `(avg change interval: ${Math.round(avgInterval)}s)`
    )

    return adaptiveTTL
  }

  /**
   * Invalidate cache and force revalidation
   */
  public async invalidate(
    key: string,
    fetcher?: () => Promise<any>,
    options: SWROptions = {}
  ): Promise<void> {
    const namespace = options.namespace || 'swr'
    
    // Delete from cache
    await redisCache.delete(key, namespace)
    
    // Clear change frequency tracking
    this.changeFrequency.delete(key)
    
    // If fetcher provided, revalidate immediately
    if (fetcher) {
      await this.fetchAndCache(key, fetcher, options)
    }
  }

  /**
   * Prefetch data into cache
   */
  public async prefetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: SWROptions = {}
  ): Promise<void> {
    // Check if already cached and fresh
    const cached = await redisCache.get(key, { 
      namespace: options.namespace || 'swr' 
    })
    
    if (cached) {
      const age = (Date.now() - (cached as any).timestamp) / 1000
      if (age < (options.ttl || 3600)) {
        console.log(`[SWR] ${key} already cached and fresh`)
        return
      }
    }

    // Prefetch in background
    this.revalidateInBackground(key, fetcher, options)
  }

  /**
   * Get revalidation queue status
   */
  public getQueueStatus() {
    const jobs = Array.from(this.revalidationQueue.entries()).map(
      ([key, job]) => ({
        key,
        age: Date.now() - job.startedAt,
        attempts: job.attempts,
      })
    )

    return {
      queueSize: this.revalidationQueue.size,
      maxQueueSize: this.maxQueueSize,
      jobs,
    }
  }

  /**
   * Clear revalidation queue
   */
  public clearQueue() {
    this.revalidationQueue.clear()
  }

  /**
   * Get change frequency analytics
   */
  public getChangeFrequencyStats() {
    const stats = new Map<string, {
      changeCount: number
      avgInterval: number
      lastChange: number
    }>()

    for (const [key, history] of this.changeFrequency) {
      if (history.length < 2) continue

      let totalInterval = 0
      for (let i = 1; i < history.length; i++) {
        totalInterval += history[i] - history[i - 1]
      }

      stats.set(key, {
        changeCount: history.length,
        avgInterval: totalInterval / (history.length - 1) / 1000,
        lastChange: history[history.length - 1],
      })
    }

    return stats
  }
}

// Export singleton instance
export const staleWhileRevalidate = new StaleWhileRevalidate()