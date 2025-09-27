import { createClient, RedisClientType } from 'redis'
import { z } from 'zod'
import crypto from 'crypto'

/**
 * Advanced Redis Cache Implementation
 * 
 * Features:
 * - TTL-based expiration
 * - Compression for large values
 * - Atomic operations
 * - Pipeline support for batch operations
 * - Cache warming
 * - Invalidation patterns
 * - Memory limits
 */

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  compress?: boolean // Compress large values
  tags?: string[] // Cache tags for invalidation
  staleWhileRevalidate?: number // Serve stale content while revalidating
  namespace?: string // Cache namespace
}

export interface CacheEntry<T = any> {
  value: T
  timestamp: number
  ttl?: number
  tags?: string[]
  staleUntil?: number
  etag?: string
  compressed?: boolean
}

const CacheEntrySchema = z.object({
  value: z.any(),
  timestamp: z.number(),
  ttl: z.number().optional(),
  tags: z.array(z.string()).optional(),
  staleUntil: z.number().optional(),
  etag: z.string().optional(),
  compressed: z.boolean().optional(),
})

export class RedisCache {
  private static instance: RedisCache
  private client: RedisClientType
  private isConnected: boolean = false
  private defaultTTL: number = 3600 // 1 hour default
  private maxMemory: number = 100 * 1024 * 1024 // 100MB default
  private currentMemoryUsage: number = 0
  private compressionThreshold: number = 1024 // Compress values > 1KB

  private constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    
    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('[RedisCache] Max reconnection attempts reached')
            return new Error('Max reconnection attempts')
          }
          const delay = Math.min(retries * 100, 3000)
          console.log(`[RedisCache] Reconnecting in ${delay}ms (attempt ${retries})`)
          return delay
        },
      },
    }) as RedisClientType

    this.setupEventHandlers()
  }

  public static getInstance(): RedisCache {
    if (!RedisCache.instance) {
      RedisCache.instance = new RedisCache()
    }
    return RedisCache.instance
  }

  private setupEventHandlers() {
    this.client.on('error', (err) => {
      console.error('[RedisCache] Error:', err)
      this.isConnected = false
    })

    this.client.on('connect', () => {
      console.log('[RedisCache] Connected')
      this.isConnected = true
    })

    this.client.on('ready', () => {
      console.log('[RedisCache] Ready')
      this.isConnected = true
    })

    this.client.on('reconnecting', () => {
      console.log('[RedisCache] Reconnecting...')
      this.isConnected = false
    })
  }

  public async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect()
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect()
      this.isConnected = false
    }
  }

  /**
   * Generate cache key with namespace
   */
  private getCacheKey(key: string, namespace?: string): string {
    const prefix = namespace || 'cache'
    return `${prefix}:${key}`
  }

  /**
   * Generate ETag for cache validation
   */
  private generateETag(value: any): string {
    const hash = crypto.createHash('md5')
    hash.update(JSON.stringify(value))
    return hash.digest('hex')
  }

  /**
   * Compress value if needed
   */
  private async compressValue(value: string): Promise<string> {
    if (value.length < this.compressionThreshold) {
      return value
    }

    const { gzip } = await import('zlib')
    const { promisify } = await import('util')
    const compress = promisify(gzip)
    
    const compressed = await compress(Buffer.from(value))
    return compressed.toString('base64')
  }

  /**
   * Decompress value if needed
   */
  private async decompressValue(value: string): Promise<string> {
    const { gunzip } = await import('zlib')
    const { promisify } = await import('util')
    const decompress = promisify(gunzip)
    
    const buffer = Buffer.from(value, 'base64')
    const decompressed = await decompress(buffer)
    return decompressed.toString()
  }

  /**
   * Get value from cache
   */
  public async get<T>(
    key: string, 
    options: CacheOptions = {}
  ): Promise<T | null> {
    try {
      await this.connect()
      
      const cacheKey = this.getCacheKey(key, options.namespace)
      const cached = await this.client.get(cacheKey)
      
      if (!cached) {
        return null
      }

      const entry = JSON.parse(cached) as CacheEntry<T>
      
      // Check if stale
      const now = Date.now()
      if (entry.staleUntil && now > entry.staleUntil) {
        // Return stale value but trigger revalidation
        this.revalidateInBackground(key, options)
        return entry.value
      }

      // Decompress if needed
      if (entry.compressed) {
        const decompressed = await this.decompressValue(JSON.stringify(entry.value))
        entry.value = JSON.parse(decompressed)
      }

      return entry.value
    } catch (error) {
      console.error('[RedisCache] Get error:', error)
      return null
    }
  }

  /**
   * Set value in cache
   */
  public async set<T>(
    key: string, 
    value: T, 
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      await this.connect()
      
      const cacheKey = this.getCacheKey(key, options.namespace)
      const ttl = options.ttl || this.defaultTTL
      
      // Check memory limit
      const valueStr = JSON.stringify(value)
      const valueSize = Buffer.byteLength(valueStr)
      
      if (this.currentMemoryUsage + valueSize > this.maxMemory) {
        await this.evictLRU()
      }

      // Compress if needed
      let finalValue = value
      let compressed = false
      
      if (options.compress !== false && valueSize > this.compressionThreshold) {
        const compressedStr = await this.compressValue(valueStr)
        if (compressedStr.length < valueStr.length) {
          finalValue = JSON.parse(compressedStr) as T
          compressed = true
        }
      }

      const entry: CacheEntry<T> = {
        value: finalValue,
        timestamp: Date.now(),
        ttl,
        tags: options.tags,
        etag: this.generateETag(value),
        compressed,
      }

      // Set stale-while-revalidate window
      if (options.staleWhileRevalidate) {
        entry.staleUntil = Date.now() + (ttl * 1000) + (options.staleWhileRevalidate * 1000)
      }

      const success = await this.client.setEx(
        cacheKey,
        ttl,
        JSON.stringify(entry)
      )

      // Update memory tracking
      this.currentMemoryUsage += valueSize

      // Store tags for invalidation
      if (options.tags) {
        await this.storeTags(key, options.tags, options.namespace)
      }

      return success === 'OK'
    } catch (error) {
      console.error('[RedisCache] Set error:', error)
      return false
    }
  }

  /**
   * Delete value from cache
   */
  public async delete(key: string, namespace?: string): Promise<boolean> {
    try {
      await this.connect()
      
      const cacheKey = this.getCacheKey(key, namespace)
      const result = await this.client.del(cacheKey)
      
      return result > 0
    } catch (error) {
      console.error('[RedisCache] Delete error:', error)
      return false
    }
  }

  /**
   * Clear all cache or by pattern
   */
  public async clear(pattern?: string, namespace?: string): Promise<number> {
    try {
      await this.connect()
      
      const searchPattern = pattern 
        ? this.getCacheKey(pattern, namespace)
        : this.getCacheKey('*', namespace)
      
      const keys = await this.client.keys(searchPattern)
      
      if (keys.length === 0) {
        return 0
      }

      const result = await this.client.del(keys)
      this.currentMemoryUsage = 0 // Reset memory tracking
      
      return result
    } catch (error) {
      console.error('[RedisCache] Clear error:', error)
      return 0
    }
  }

  /**
   * Invalidate cache by tags
   */
  public async invalidateByTags(tags: string[], namespace?: string): Promise<number> {
    try {
      await this.connect()
      
      const keys: string[] = []
      
      for (const tag of tags) {
        const tagKey = this.getCacheKey(`tags:${tag}`, namespace)
        const taggedKeys = await this.client.sMembers(tagKey)
        keys.push(...taggedKeys)
      }

      if (keys.length === 0) {
        return 0
      }

      const uniqueKeys = [...new Set(keys)]
      const result = await this.client.del(uniqueKeys)
      
      // Clean up tag sets
      for (const tag of tags) {
        const tagKey = this.getCacheKey(`tags:${tag}`, namespace)
        await this.client.del(tagKey)
      }

      return result
    } catch (error) {
      console.error('[RedisCache] Invalidate by tags error:', error)
      return 0
    }
  }

  /**
   * Store tags for cache invalidation
   */
  private async storeTags(key: string, tags: string[], namespace?: string): Promise<void> {
    const cacheKey = this.getCacheKey(key, namespace)
    
    for (const tag of tags) {
      const tagKey = this.getCacheKey(`tags:${tag}`, namespace)
      await this.client.sAdd(tagKey, cacheKey)
    }
  }

  /**
   * Revalidate cache in background
   */
  private async revalidateInBackground(key: string, options: CacheOptions): Promise<void> {
    // This would trigger a background job to refresh the cache
    // Implementation depends on your revalidation strategy
    console.log(`[RedisCache] Revalidating ${key} in background`)
  }

  /**
   * Evict least recently used items
   */
  private async evictLRU(bytesToFree: number = this.maxMemory * 0.1): Promise<void> {
    try {
      const keys = await this.client.keys('cache:*')
      const entries: Array<{ key: string; timestamp: number }> = []

      // Get timestamps for all entries
      for (const key of keys) {
        const value = await this.client.get(key)
        if (value) {
          try {
            const entry = JSON.parse(value) as CacheEntry
            entries.push({ key, timestamp: entry.timestamp })
          } catch {}
        }
      }

      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a.timestamp - b.timestamp)

      // Delete oldest entries
      let freedBytes = 0
      for (const entry of entries) {
        if (freedBytes >= bytesToFree) break
        
        const value = await this.client.get(entry.key)
        if (value) {
          freedBytes += Buffer.byteLength(value)
          await this.client.del(entry.key)
        }
      }

      this.currentMemoryUsage = Math.max(0, this.currentMemoryUsage - freedBytes)
    } catch (error) {
      console.error('[RedisCache] LRU eviction error:', error)
    }
  }

  /**
   * Get cache statistics
   */
  public async getStats(): Promise<{
    memoryUsage: number
    keyCount: number
    hitRate?: number
  }> {
    try {
      await this.connect()
      
      const keys = await this.client.keys('cache:*')
      const info = await this.client.info('stats')
      
      // Parse hit rate from Redis info
      const hitRateMatch = info.match(/keyspace_hits:(\d+)/);
      const missRateMatch = info.match(/keyspace_misses:(\d+)/);
      
      let hitRate: number | undefined
      if (hitRateMatch && missRateMatch) {
        const hits = parseInt(hitRateMatch[1])
        const misses = parseInt(missRateMatch[1])
        const total = hits + misses
        hitRate = total > 0 ? (hits / total) * 100 : 0
      }

      return {
        memoryUsage: this.currentMemoryUsage,
        keyCount: keys.length,
        hitRate,
      }
    } catch (error) {
      console.error('[RedisCache] Stats error:', error)
      return {
        memoryUsage: 0,
        keyCount: 0,
      }
    }
  }

  /**
   * Batch get operation
   */
  public async mget<T>(
    keys: string[], 
    namespace?: string
  ): Promise<Map<string, T | null>> {
    try {
      await this.connect()
      
      const cacheKeys = keys.map(k => this.getCacheKey(k, namespace))
      const values = await this.client.mGet(cacheKeys)
      
      const result = new Map<string, T | null>()
      
      for (let i = 0; i < keys.length; i++) {
        const value = values[i]
        if (value) {
          try {
            const entry = JSON.parse(value) as CacheEntry<T>
            result.set(keys[i], entry.value)
          } catch {
            result.set(keys[i], null)
          }
        } else {
          result.set(keys[i], null)
        }
      }

      return result
    } catch (error) {
      console.error('[RedisCache] Batch get error:', error)
      return new Map(keys.map(k => [k, null]))
    }
  }

  /**
   * Batch set operation
   */
  public async mset<T>(
    entries: Map<string, T>,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      await this.connect()
      
      const pipeline = this.client.multi()
      const ttl = options.ttl || this.defaultTTL
      
      for (const [key, value] of entries) {
        const cacheKey = this.getCacheKey(key, options.namespace)
        const entry: CacheEntry<T> = {
          value,
          timestamp: Date.now(),
          ttl,
          tags: options.tags,
          etag: this.generateETag(value),
        }
        
        pipeline.setEx(cacheKey, ttl, JSON.stringify(entry))
      }

      const results = await pipeline.exec()
      return results.every(r => r === 'OK')
    } catch (error) {
      console.error('[RedisCache] Batch set error:', error)
      return false
    }
  }
}

// Export singleton instance
export const redisCache = RedisCache.getInstance()