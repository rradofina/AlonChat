import { redisCache } from '../redis-cache'
import type { CacheOptions } from '../redis-cache'

/**
 * Partial Hydration Strategy
 * 
 * Caches expensive computations and partial results to avoid
 * recomputing entire datasets. Perfect for aggregations, 
 * calculations, and complex queries.
 * 
 * Features:
 * - Fragment caching
 * - Dependency tracking
 * - Incremental updates
 * - Computed field caching
 * - Query result caching
 */

interface HydrationFragment {
  id: string
  data: any
  dependencies?: string[]
  computedAt: number
  ttl: number
  version: number
}

interface HydrationOptions extends CacheOptions {
  fragments?: string[] // Specific fragments to hydrate
  dependencies?: string[] // Dependencies that invalidate this cache
  version?: number // Schema version
  incremental?: boolean // Support incremental updates
}

interface ComputedField {
  key: string
  compute: () => Promise<any>
  dependencies: string[]
  ttl: number
}

export class PartialHydration {
  private fragmentRegistry: Map<string, HydrationFragment> = new Map()
  private dependencyGraph: Map<string, Set<string>> = new Map()
  private computedFields: Map<string, ComputedField> = new Map()
  private hydrationCache: Map<string, any> = new Map()
  private currentVersion = 1

  /**
   * Register a computed field
   */
  public registerComputedField(
    key: string,
    compute: () => Promise<any>,
    dependencies: string[] = [],
    ttl: number = 3600
  ) {
    this.computedFields.set(key, {
      key,
      compute,
      dependencies,
      ttl,
    })

    // Update dependency graph
    for (const dep of dependencies) {
      const dependents = this.dependencyGraph.get(dep) || new Set()
      dependents.add(key)
      this.dependencyGraph.set(dep, dependents)
    }
  }

  /**
   * Hydrate an object with cached fragments
   */
  public async hydrate<T extends Record<string, any>>(
    baseObject: T,
    options: HydrationOptions = {}
  ): Promise<T> {
    const {
      fragments = [],
      namespace = 'hydration',
      version = this.currentVersion,
    } = options

    const hydrated = { ...baseObject }
    const hydrateKeys = fragments.length > 0 ? fragments : Object.keys(baseObject)

    // Parallel hydration of all fragments
    const hydrationPromises = hydrateKeys.map(async (key) => {
      // Skip if not a computed field
      const computedField = this.computedFields.get(key)
      if (!computedField) {
        return { key, value: baseObject[key] }
      }

      // Try to get from cache
      const cacheKey = this.getFragmentKey(baseObject, key)
      const cached = await this.getFragment(cacheKey, namespace, version)
      
      if (cached !== null) {
        console.log(`[Hydration] Using cached fragment for ${key}`)
        return { key, value: cached }
      }

      // Compute and cache
      console.log(`[Hydration] Computing fragment for ${key}`)
      const value = await computedField.compute()
      
      await this.cacheFragment(
        cacheKey,
        value,
        computedField.dependencies,
        computedField.ttl,
        namespace,
        version
      )

      return { key, value }
    })

    // Wait for all hydrations
    const results = await Promise.all(hydrationPromises)
    
    // Apply results
    for (const { key, value } of results) {
      hydrated[key] = value
    }

    return hydrated
  }

  /**
   * Partially update a cached object
   */
  public async partialUpdate<T extends Record<string, any>>(
    objectId: string,
    updates: Partial<T>,
    options: HydrationOptions = {}
  ): Promise<T> {
    const {
      namespace = 'hydration',
      version = this.currentVersion,
      incremental = true,
    } = options

    // Get existing cached object
    const cacheKey = `object:${objectId}`
    const existing = await redisCache.get<T>(cacheKey, { namespace })
    
    let base: T
    if (existing && incremental) {
      // Merge with existing
      base = { ...existing, ...updates } as T
    } else {
      // Use updates as base
      base = updates as T
    }

    // Invalidate dependent fragments
    const invalidatedKeys = Object.keys(updates)
    await this.invalidateDependents(invalidatedKeys, namespace)

    // Rehydrate with new data
    const hydrated = await this.hydrate(base, options)
    
    // Cache the complete object
    await redisCache.set(cacheKey, hydrated, { namespace, ttl: 3600 })

    return hydrated
  }

  /**
   * Cache expensive query results
   */
  public async cacheQuery<T>(
    query: string,
    params: any,
    fetcher: () => Promise<T>,
    options: HydrationOptions = {}
  ): Promise<T> {
    const {
      ttl = 300,
      namespace = 'queries',
      dependencies = [],
    } = options

    // Generate cache key from query and params
    const queryKey = this.generateQueryKey(query, params)
    
    // Check cache
    const cached = await redisCache.get<T>(queryKey, { namespace })
    if (cached !== null) {
      console.log(`[Hydration] Query cache hit for ${queryKey}`)
      return cached
    }

    // Execute query
    console.log(`[Hydration] Query cache miss for ${queryKey}`)
    const result = await fetcher()
    
    // Cache result
    await redisCache.set(queryKey, result, { namespace, ttl, tags: dependencies })

    // Track dependencies
    for (const dep of dependencies) {
      const dependents = this.dependencyGraph.get(dep) || new Set()
      dependents.add(queryKey)
      this.dependencyGraph.set(dep, dependents)
    }

    return result
  }

  /**
   * Cache aggregation results
   */
  public async cacheAggregation<T>(
    aggregationId: string,
    compute: () => Promise<T>,
    options: HydrationOptions = {}
  ): Promise<T> {
    const {
      ttl = 600,
      namespace = 'aggregations',
      dependencies = [],
      incremental = false,
    } = options

    const cacheKey = `agg:${aggregationId}`
    
    // Check if we can do incremental update
    if (incremental) {
      const existing = await redisCache.get<any>(cacheKey, { namespace })
      if (existing) {
        // Here you would implement incremental aggregation logic
        // For example, only compute new data and merge
        console.log(`[Hydration] Incremental aggregation for ${aggregationId}`)
      }
    }

    // Check cache for full computation
    const cached = await redisCache.get<T>(cacheKey, { namespace })
    if (cached !== null) {
      console.log(`[Hydration] Aggregation cache hit for ${aggregationId}`)
      return cached
    }

    // Compute aggregation
    console.log(`[Hydration] Computing aggregation for ${aggregationId}`)
    const start = Date.now()
    const result = await compute()
    const computeTime = Date.now() - start
    
    console.log(`[Hydration] Aggregation computed in ${computeTime}ms`)

    // Cache result with metadata
    await redisCache.set(
      cacheKey,
      {
        result,
        computedAt: Date.now(),
        computeTime,
      },
      { namespace, ttl, tags: dependencies }
    )

    return result
  }

  /**
   * Get a cached fragment
   */
  private async getFragment(
    key: string,
    namespace: string,
    version: number
  ): Promise<any | null> {
    const fragment = await redisCache.get<HydrationFragment>(
      `fragment:${key}:v${version}`,
      { namespace }
    )

    if (!fragment) {
      return null
    }

    // Check version
    if (fragment.version !== version) {
      return null
    }

    return fragment.data
  }

  /**
   * Cache a fragment
   */
  private async cacheFragment(
    key: string,
    data: any,
    dependencies: string[],
    ttl: number,
    namespace: string,
    version: number
  ): Promise<void> {
    const fragment: HydrationFragment = {
      id: key,
      data,
      dependencies,
      computedAt: Date.now(),
      ttl,
      version,
    }

    await redisCache.set(
      `fragment:${key}:v${version}`,
      fragment,
      { namespace, ttl, tags: dependencies }
    )

    // Store in registry
    this.fragmentRegistry.set(key, fragment)
  }

  /**
   * Generate fragment key
   */
  private getFragmentKey(object: any, field: string): string {
    // Use object ID if available, otherwise hash the object
    const objectId = object.id || object._id || this.hashObject(object)
    return `${objectId}:${field}`
  }

  /**
   * Generate query cache key
   */
  private generateQueryKey(query: string, params: any): string {
    const crypto = require('crypto')
    const hash = crypto.createHash('md5')
    hash.update(query)
    hash.update(JSON.stringify(params))
    return `query:${hash.digest('hex')}`
  }

  /**
   * Hash an object for cache key
   */
  private hashObject(obj: any): string {
    const crypto = require('crypto')
    const hash = crypto.createHash('md5')
    hash.update(JSON.stringify(obj))
    return hash.digest('hex').substring(0, 8)
  }

  /**
   * Invalidate dependent fragments
   */
  private async invalidateDependents(
    keys: string[],
    namespace: string
  ): Promise<void> {
    const toInvalidate = new Set<string>()

    // Find all dependents
    for (const key of keys) {
      const dependents = this.dependencyGraph.get(key)
      if (dependents) {
        dependents.forEach(dep => toInvalidate.add(dep))
      }
    }

    // Invalidate all dependent fragments
    const invalidationPromises = Array.from(toInvalidate).map(key =>
      redisCache.delete(`fragment:${key}:v${this.currentVersion}`, namespace)
    )

    await Promise.all(invalidationPromises)
    console.log(`[Hydration] Invalidated ${toInvalidate.size} dependent fragments`)
  }

  /**
   * Warm up cache by precomputing fragments
   */
  public async warmUp(
    objects: any[],
    options: HydrationOptions = {}
  ): Promise<void> {
    console.log(`[Hydration] Warming up cache for ${objects.length} objects`)
    
    const warmupPromises = objects.map(obj => 
      this.hydrate(obj, { ...options, fragments: [] })
    )

    await Promise.all(warmupPromises)
    console.log(`[Hydration] Cache warmup complete`)
  }

  /**
   * Get hydration statistics
   */
  public getStats() {
    const fragmentStats = Array.from(this.fragmentRegistry.values()).map(f => ({
      id: f.id,
      age: Date.now() - f.computedAt,
      dependencies: f.dependencies?.length || 0,
      version: f.version,
    }))

    const dependencyStats = Array.from(this.dependencyGraph.entries()).map(
      ([key, deps]) => ({
        key,
        dependentCount: deps.size,
        dependents: Array.from(deps),
      })
    )

    return {
      fragmentCount: this.fragmentRegistry.size,
      computedFieldCount: this.computedFields.size,
      dependencyCount: this.dependencyGraph.size,
      currentVersion: this.currentVersion,
      fragments: fragmentStats,
      dependencies: dependencyStats,
    }
  }

  /**
   * Clear all hydration caches
   */
  public async clear(namespace: string = 'hydration'): Promise<void> {
    // Clear Redis cache
    await redisCache.clear('fragment:*', namespace)
    await redisCache.clear('object:*', namespace)
    await redisCache.clear('agg:*', 'aggregations')
    await redisCache.clear('query:*', 'queries')

    // Clear memory caches
    this.fragmentRegistry.clear()
    this.hydrationCache.clear()
    
    console.log('[Hydration] All caches cleared')
  }

  /**
   * Bump version to invalidate all caches
   */
  public bumpVersion(): void {
    this.currentVersion++
    console.log(`[Hydration] Version bumped to ${this.currentVersion}`)
  }
}

// Export singleton instance
export const partialHydration = new PartialHydration()