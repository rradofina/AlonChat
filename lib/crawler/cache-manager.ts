import { createServiceClient } from '@/lib/supabase/service'

export interface CacheEntry {
  url: string
  html: string
  title: string
  timestamp: Date
  ttl: number // Time to live in seconds
}

/**
 * Simple caching layer for crawled content
 * Uses Supabase for persistent cache storage
 */
export class CrawlCache {
  private static instance: CrawlCache | null = null
  private memoryCache: Map<string, CacheEntry> = new Map()
  private defaultTTL = 3600 // 1 hour default TTL
  private maxMemoryCacheSize = 100 // Max items in memory

  private constructor() {
    // Start cleanup interval for expired entries
    setInterval(() => this.cleanupExpired(), 60000) // Every minute
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CrawlCache {
    if (!CrawlCache.instance) {
      CrawlCache.instance = new CrawlCache()
    }
    return CrawlCache.instance
  }

  /**
   * Get cached content for a URL
   */
  async get(url: string): Promise<CacheEntry | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(url)
    if (memoryEntry && this.isValid(memoryEntry)) {
      console.log(`[Cache] Memory hit for ${url}`)
      return memoryEntry
    }

    // Check database cache
    try {
      const supabase = createServiceClient()
      const { data } = await supabase
        .from('crawl_cache')
        .select('*')
        .eq('url', url)
        .single()

      if (data && this.isValidTimestamp(data.timestamp, data.ttl)) {
        const entry: CacheEntry = {
          url: data.url,
          html: data.html,
          title: data.title,
          timestamp: new Date(data.timestamp),
          ttl: data.ttl
        }

        // Add to memory cache for faster subsequent access
        this.addToMemoryCache(url, entry)
        console.log(`[Cache] Database hit for ${url}`)
        return entry
      }
    } catch (error) {
      // Cache miss or error, continue without cache
      console.log(`[Cache] Miss for ${url}`)
    }

    return null
  }

  /**
   * Set cached content for a URL
   */
  async set(url: string, html: string, title: string, ttl?: number): Promise<void> {
    const entry: CacheEntry = {
      url,
      html,
      title,
      timestamp: new Date(),
      ttl: ttl || this.defaultTTL
    }

    // Add to memory cache
    this.addToMemoryCache(url, entry)

    // Save to database (async, don't wait)
    this.saveToDatabase(entry).catch(error => {
      console.error(`[Cache] Failed to save to database:`, error)
    })

    console.log(`[Cache] Stored ${url} with TTL ${entry.ttl}s`)
  }

  /**
   * Save cache entry to database
   */
  private async saveToDatabase(entry: CacheEntry): Promise<void> {
    const supabase = createServiceClient()

    await supabase
      .from('crawl_cache')
      .upsert({
        url: entry.url,
        html: entry.html,
        title: entry.title,
        timestamp: entry.timestamp.toISOString(),
        ttl: entry.ttl
      })
      .select()
  }

  /**
   * Add to memory cache with size limit
   */
  private addToMemoryCache(url: string, entry: CacheEntry): void {
    // Remove oldest entries if cache is full
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const firstKey = this.memoryCache.keys().next().value
      if (firstKey) {
        this.memoryCache.delete(firstKey)
      }
    }

    this.memoryCache.set(url, entry)
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry): boolean {
    const age = (Date.now() - entry.timestamp.getTime()) / 1000
    return age < entry.ttl
  }

  /**
   * Check if timestamp is still valid
   */
  private isValidTimestamp(timestamp: string, ttl: number): boolean {
    const age = (Date.now() - new Date(timestamp).getTime()) / 1000
    return age < ttl
  }

  /**
   * Clean up expired entries from memory cache
   */
  private cleanupExpired(): void {
    let removed = 0
    for (const [url, entry] of this.memoryCache.entries()) {
      if (!this.isValid(entry)) {
        this.memoryCache.delete(url)
        removed++
      }
    }
    if (removed > 0) {
      console.log(`[Cache] Cleaned up ${removed} expired entries`)
    }
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    this.memoryCache.clear()

    try {
      const supabase = createServiceClient()
      await supabase.from('crawl_cache').delete().neq('url', '')
      console.log('[Cache] Cleared all cache entries')
    } catch (error) {
      console.error('[Cache] Failed to clear database cache:', error)
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memoryCacheSize: this.memoryCache.size,
      maxMemoryCacheSize: this.maxMemoryCacheSize,
      entries: Array.from(this.memoryCache.entries()).map(([url, entry]) => ({
        url,
        age: Math.floor((Date.now() - entry.timestamp.getTime()) / 1000),
        ttl: entry.ttl,
        expired: !this.isValid(entry)
      }))
    }
  }
}