import { redisCache } from '../redis-cache'
import type { CacheOptions } from '../redis-cache'

/**
 * Predictive Prefetching Strategy
 * 
 * Uses machine learning patterns and heuristics to prefetch data
 * that users are likely to need next.
 * 
 * Features:
 * - Pattern recognition for user behavior
 * - Sequential prefetching for lists
 * - Related data prefetching
 * - Time-based predictions
 * - Confidence scoring
 */

interface PrefetchPattern {
  from: string | RegExp
  to: string[] | ((key: string) => string[])
  confidence: number
  maxPrefetch?: number
}

interface UserPattern {
  userId: string
  patterns: Map<string, string[]>
  lastAccess: Map<string, number>
  frequency: Map<string, number>
}

interface PrefetchOptions extends CacheOptions {
  confidence?: number // Minimum confidence to prefetch (0-1)
  maxPrefetch?: number // Maximum items to prefetch
  prefetchDelay?: number // Delay before prefetching (ms)
  adaptive?: boolean // Learn from user behavior
}

export class PredictivePrefetcher {
  private patterns: PrefetchPattern[] = []
  private userPatterns: Map<string, UserPattern> = new Map()
  private prefetchQueue: Map<string, NodeJS.Timeout> = new Map()
  private accessLog: Array<{ key: string; timestamp: number; userId?: string }> = []
  private maxLogSize = 10000

  constructor() {
    this.initializeDefaultPatterns()
    this.startPatternAnalysis()
  }

  /**
   * Initialize default prefetch patterns
   */
  private initializeDefaultPatterns() {
    // Page navigation patterns
    this.addPattern({
      from: /^page:(\d+)$/,
      to: (key) => {
        const match = key.match(/^page:(\d+)$/)
        if (!match) return []
        const page = parseInt(match[1])
        return [
          `page:${page + 1}`, // Next page
          `page:${page - 1}`, // Previous page
        ].filter(k => k.includes(':') && parseInt(k.split(':')[1]) > 0)
      },
      confidence: 0.8,
      maxPrefetch: 2,
    })

    // Detail -> Related items pattern
    this.addPattern({
      from: /^(\w+):(\w+):detail$/,
      to: (key) => {
        const match = key.match(/^(\w+):(\w+):detail$/)
        if (!match) return []
        const [, type, id] = match
        return [
          `${type}:${id}:related`,
          `${type}:${id}:comments`,
          `${type}:${id}:metadata`,
        ]
      },
      confidence: 0.7,
      maxPrefetch: 3,
    })

    // List -> Individual items pattern
    this.addPattern({
      from: /^(\w+):list$/,
      to: (key) => {
        const match = key.match(/^(\w+):list$/)
        if (!match) return []
        const [, type] = match
        // Prefetch first few items
        return Array.from({ length: 5 }, (_, i) => `${type}:${i}:detail`)
      },
      confidence: 0.6,
      maxPrefetch: 5,
    })

    // Source -> Chunks pattern (for our app)
    this.addPattern({
      from: /^source:(\w+)$/,
      to: (key) => {
        const match = key.match(/^source:(\w+)$/)
        if (!match) return []
        const [, sourceId] = match
        return [
          `source:${sourceId}:chunks`,
          `source:${sourceId}:metadata`,
          `source:${sourceId}:status`,
        ]
      },
      confidence: 0.9,
      maxPrefetch: 3,
    })

    // Agent -> Sources pattern
    this.addPattern({
      from: /^agent:(\w+)$/,
      to: (key) => {
        const match = key.match(/^agent:(\w+)$/)
        if (!match) return []
        const [, agentId] = match
        return [
          `agent:${agentId}:sources`,
          `agent:${agentId}:settings`,
          `agent:${agentId}:stats`,
        ]
      },
      confidence: 0.85,
      maxPrefetch: 3,
    })
  }

  /**
   * Add a prefetch pattern
   */
  public addPattern(pattern: PrefetchPattern) {
    this.patterns.push(pattern)
  }

  /**
   * Track cache access for learning
   */
  public trackAccess(key: string, userId?: string) {
    // Log access
    this.accessLog.push({
      key,
      timestamp: Date.now(),
      userId,
    })

    // Trim log if too large
    if (this.accessLog.length > this.maxLogSize) {
      this.accessLog = this.accessLog.slice(-this.maxLogSize / 2)
    }

    // Update user patterns if userId provided
    if (userId) {
      this.updateUserPattern(userId, key)
    }

    // Trigger predictive prefetching
    this.predictAndPrefetch(key, { userId })
  }

  /**
   * Update user-specific patterns
   */
  private updateUserPattern(userId: string, key: string) {
    let userPattern = this.userPatterns.get(userId)
    
    if (!userPattern) {
      userPattern = {
        userId,
        patterns: new Map(),
        lastAccess: new Map(),
        frequency: new Map(),
      }
      this.userPatterns.set(userId, userPattern)
    }

    // Update frequency
    const freq = userPattern.frequency.get(key) || 0
    userPattern.frequency.set(key, freq + 1)

    // Update last access
    const lastKey = Array.from(userPattern.lastAccess.entries())
      .sort(([, a], [, b]) => b - a)[0]?.[0]
    
    if (lastKey && lastKey !== key) {
      // Record transition pattern
      const transitions = userPattern.patterns.get(lastKey) || []
      if (!transitions.includes(key)) {
        transitions.push(key)
        userPattern.patterns.set(lastKey, transitions)
      }
    }

    userPattern.lastAccess.set(key, Date.now())
  }

  /**
   * Predict what to prefetch based on current access
   */
  private async predictAndPrefetch(
    key: string,
    context: { userId?: string } = {}
  ) {
    const predictions = this.getPredictions(key, context)
    
    // Sort by confidence
    predictions.sort((a, b) => b.confidence - a.confidence)

    // Prefetch top predictions
    for (const prediction of predictions.slice(0, 5)) {
      if (prediction.confidence >= 0.5) {
        this.schedulePrefetch(prediction.key, {
          confidence: prediction.confidence,
          prefetchDelay: 100, // Small delay to avoid overwhelming
        })
      }
    }
  }

  /**
   * Get predictions for what might be accessed next
   */
  private getPredictions(
    key: string,
    context: { userId?: string } = {}
  ): Array<{ key: string; confidence: number }> {
    const predictions: Array<{ key: string; confidence: number }> = []

    // Pattern-based predictions
    for (const pattern of this.patterns) {
      if (
        (typeof pattern.from === 'string' && pattern.from === key) ||
        (pattern.from instanceof RegExp && pattern.from.test(key))
      ) {
        const nextKeys = typeof pattern.to === 'function' 
          ? pattern.to(key)
          : pattern.to
        
        for (const nextKey of nextKeys.slice(0, pattern.maxPrefetch)) {
          predictions.push({
            key: nextKey,
            confidence: pattern.confidence,
          })
        }
      }
    }

    // User-based predictions
    if (context.userId) {
      const userPattern = this.userPatterns.get(context.userId)
      if (userPattern) {
        const transitions = userPattern.patterns.get(key) || []
        for (const nextKey of transitions) {
          const frequency = userPattern.frequency.get(nextKey) || 0
          const totalFreq = Array.from(userPattern.frequency.values())
            .reduce((sum, f) => sum + f, 0)
          
          predictions.push({
            key: nextKey,
            confidence: Math.min(0.95, frequency / totalFreq + 0.3),
          })
        }
      }
    }

    // Time-based predictions (e.g., what's typically accessed at this time)
    const timePredictions = this.getTimeBasedPredictions(key)
    predictions.push(...timePredictions)

    // Deduplicate and merge confidences
    const merged = new Map<string, number>()
    for (const pred of predictions) {
      const existing = merged.get(pred.key) || 0
      merged.set(pred.key, Math.max(existing, pred.confidence))
    }

    return Array.from(merged.entries()).map(([key, confidence]) => ({
      key,
      confidence,
    }))
  }

  /**
   * Get time-based predictions
   */
  private getTimeBasedPredictions(
    key: string
  ): Array<{ key: string; confidence: number }> {
    const predictions: Array<{ key: string; confidence: number }> = []
    const now = new Date()
    const hour = now.getHours()
    
    // Business hours patterns
    if (hour >= 9 && hour <= 17) {
      // During business hours, prefetch work-related data
      if (key.includes('dashboard')) {
        predictions.push(
          { key: 'stats:daily', confidence: 0.7 },
          { key: 'tasks:pending', confidence: 0.6 }
        )
      }
    } else {
      // Outside business hours, prefetch different content
      if (key.includes('dashboard')) {
        predictions.push(
          { key: 'stats:weekly', confidence: 0.5 },
          { key: 'notifications:unread', confidence: 0.6 }
        )
      }
    }

    return predictions
  }

  /**
   * Schedule a prefetch operation
   */
  private schedulePrefetch(key: string, options: PrefetchOptions = {}) {
    // Cancel existing prefetch for this key
    const existing = this.prefetchQueue.get(key)
    if (existing) {
      clearTimeout(existing)
    }

    // Schedule new prefetch
    const timeout = setTimeout(async () => {
      await this.prefetch(key, options)
      this.prefetchQueue.delete(key)
    }, options.prefetchDelay || 50)

    this.prefetchQueue.set(key, timeout)
  }

  /**
   * Perform the actual prefetch
   */
  private async prefetch(key: string, options: PrefetchOptions = {}) {
    try {
      // Check if already cached
      const cached = await redisCache.get(key, options)
      if (cached !== null) {
        console.log(`[Prefetch] ${key} already cached`)
        return
      }

      // Here you would fetch the actual data
      // This is application-specific
      console.log(`[Prefetch] Would fetch ${key} with confidence ${options.confidence}`)
      
      // Example: Fetch from your data source
      // const data = await fetchDataForKey(key)
      // await redisCache.set(key, data, options)
    } catch (error) {
      console.error(`[Prefetch] Error prefetching ${key}:`, error)
    }
  }

  /**
   * Start background pattern analysis
   */
  private startPatternAnalysis() {
    // Analyze patterns every 5 minutes
    setInterval(() => {
      this.analyzeAccessPatterns()
    }, 5 * 60 * 1000)
  }

  /**
   * Analyze access patterns to find new patterns
   */
  private analyzeAccessPatterns() {
    const recentAccesses = this.accessLog.filter(
      log => Date.now() - log.timestamp < 3600000 // Last hour
    )

    // Find sequential patterns
    const sequences = new Map<string, string[]>()
    
    for (let i = 0; i < recentAccesses.length - 1; i++) {
      const current = recentAccesses[i].key
      const next = recentAccesses[i + 1].key
      
      // Same user within 30 seconds
      if (
        recentAccesses[i].userId === recentAccesses[i + 1].userId &&
        recentAccesses[i + 1].timestamp - recentAccesses[i].timestamp < 30000
      ) {
        const seq = sequences.get(current) || []
        seq.push(next)
        sequences.set(current, seq)
      }
    }

    // Find common patterns
    for (const [from, toList] of sequences) {
      const frequency = new Map<string, number>()
      
      for (const to of toList) {
        frequency.set(to, (frequency.get(to) || 0) + 1)
      }

      // If a pattern occurs frequently enough, add it
      for (const [to, count] of frequency) {
        if (count >= 5 && count / toList.length > 0.3) {
          // Check if pattern already exists
          const exists = this.patterns.some(
            p => p.from === from && 
                 (Array.isArray(p.to) ? p.to.includes(to) : false)
          )
          
          if (!exists) {
            console.log(`[Prefetch] Discovered pattern: ${from} -> ${to} (${count}/${toList.length})`)
            this.addPattern({
              from,
              to: [to],
              confidence: Math.min(0.9, count / toList.length),
              maxPrefetch: 1,
            })
          }
        }
      }
    }
  }

  /**
   * Clear prefetch queue
   */
  public clearQueue() {
    for (const timeout of this.prefetchQueue.values()) {
      clearTimeout(timeout)
    }
    this.prefetchQueue.clear()
  }

  /**
   * Get analytics about prefetching
   */
  public getAnalytics() {
    return {
      patternsCount: this.patterns.length,
      userPatternsCount: this.userPatterns.size,
      queueSize: this.prefetchQueue.size,
      accessLogSize: this.accessLog.length,
      recentAccesses: this.accessLog.slice(-10).map(log => ({
        key: log.key,
        age: Date.now() - log.timestamp,
      })),
    }
  }
}

// Export singleton instance
export const predictivePrefetcher = new PredictivePrefetcher()