import { z } from 'zod'

/**
 * Crawl configuration for website sources
 */
export interface CrawlConfig {
  maxPages: number
  crawlSubpages: boolean
  includePaths?: string[]
  excludePaths?: string[]
  slowScraping?: boolean
  fullPageContent?: boolean
  respectRobotsTxt?: boolean
  userAgent?: string
  waitForSelector?: string
  scrollToBottom?: boolean
}

/**
 * Crawl progress information
 */
export interface CrawlProgress {
  current: number
  total: number
  currentUrl: string
  phase: 'discovering' | 'processing' | 'completed' | 'failed'
  discoveredLinks: string[]
  startTime: number
  averageTimePerPage?: number
}

/**
 * Website source validation schema
 */
export const WebsiteSourceSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  agentId: z.string().uuid(),
  url: z.string().url(),
  name: z.string().min(1),
  status: z.enum(['pending', 'processing', 'ready', 'error', 'paused']),
  crawlConfig: z.object({
    maxPages: z.number().min(1).max(10000).default(200),
    crawlSubpages: z.boolean().default(true),
    includePaths: z.array(z.string()).optional(),
    excludePaths: z.array(z.string()).optional(),
    slowScraping: z.boolean().optional(),
    fullPageContent: z.boolean().optional(),
    respectRobotsTxt: z.boolean().default(true),
    userAgent: z.string().optional(),
    waitForSelector: z.string().optional(),
    scrollToBottom: z.boolean().optional(),
  }),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastCrawledAt: z.date().optional(),
})

export type WebsiteSourceData = z.infer<typeof WebsiteSourceSchema>

/**
 * Domain entity for Website Sources
 * Encapsulates business logic and rules for website crawling
 */
export class WebsiteSource {
  private data: WebsiteSourceData

  constructor(data: WebsiteSourceData) {
    // Validate data on construction
    this.data = WebsiteSourceSchema.parse(data)
  }

  /**
   * Factory method to create a new WebsiteSource
   */
  static create(params: {
    projectId: string
    agentId: string
    url: string
    name?: string
    crawlConfig?: Partial<CrawlConfig>
  }): WebsiteSource {
    const normalizedUrl = WebsiteSource.normalizeUrl(params.url)

    return new WebsiteSource({
      id: crypto.randomUUID(),
      projectId: params.projectId,
      agentId: params.agentId,
      url: normalizedUrl,
      name: params.name || new URL(normalizedUrl).hostname,
      status: 'pending',
      crawlConfig: {
        maxPages: params.crawlConfig?.maxPages || 200,
        crawlSubpages: params.crawlConfig?.crawlSubpages ?? true,
        includePaths: params.crawlConfig?.includePaths,
        excludePaths: params.crawlConfig?.excludePaths,
        slowScraping: params.crawlConfig?.slowScraping,
        fullPageContent: params.crawlConfig?.fullPageContent,
        respectRobotsTxt: params.crawlConfig?.respectRobotsTxt ?? true,
        userAgent: params.crawlConfig?.userAgent,
        waitForSelector: params.crawlConfig?.waitForSelector,
        scrollToBottom: params.crawlConfig?.scrollToBottom,
      },
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  /**
   * Normalize URL to ensure consistency
   */
  static normalizeUrl(url: string): string {
    // Remove protocol if user accidentally included it in input
    let cleanUrl = url.replace(/^https?:\/\//i, '')

    // Add https:// protocol by default
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`
    }

    // Remove trailing slash
    cleanUrl = cleanUrl.replace(/\/$/, '')

    // Validate URL format
    try {
      new URL(cleanUrl)
      return cleanUrl
    } catch {
      throw new Error(`Invalid URL format: ${url}`)
    }
  }

  /**
   * Check if a URL can be crawled based on configuration
   */
  canCrawlUrl(url: string): boolean {
    try {
      const sourceUrl = new URL(this.data.url)
      const targetUrl = new URL(url)

      // Check if same domain
      if (sourceUrl.hostname !== targetUrl.hostname) {
        return false
      }

      // Check if crawling subpages is enabled
      if (!this.data.crawlConfig.crawlSubpages) {
        return sourceUrl.pathname === targetUrl.pathname
      }

      // Check include paths
      if (this.data.crawlConfig.includePaths?.length) {
        const included = this.data.crawlConfig.includePaths.some(path =>
          targetUrl.pathname.startsWith(path)
        )
        if (!included) return false
      }

      // Check exclude paths
      if (this.data.crawlConfig.excludePaths?.length) {
        const excluded = this.data.crawlConfig.excludePaths.some(path =>
          targetUrl.pathname.startsWith(path)
        )
        if (excluded) return false
      }

      return true
    } catch {
      return false
    }
  }

  /**
   * Determine if the source should be recrawled
   */
  shouldRecrawl(): boolean {
    if (this.data.status === 'error') return true
    if (this.data.status === 'pending') return true
    if (!this.data.lastCrawledAt) return true

    // Recrawl if older than 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    return this.data.lastCrawledAt < sevenDaysAgo
  }

  /**
   * Calculate crawl priority based on various factors
   */
  calculateCrawlPriority(): number {
    let priority = 0

    // Higher priority for never crawled
    if (!this.data.lastCrawledAt) {
      priority += 100
    }

    // Higher priority for error status
    if (this.data.status === 'error') {
      priority += 50
    }

    // Higher priority for older sources
    if (this.data.lastCrawledAt) {
      const daysSinceLastCrawl = Math.floor(
        (Date.now() - this.data.lastCrawledAt.getTime()) / (1000 * 60 * 60 * 24)
      )
      priority += Math.min(daysSinceLastCrawl * 5, 50)
    }

    // Lower priority for large crawls
    if (this.data.crawlConfig.maxPages > 500) {
      priority -= 20
    }

    return Math.max(0, Math.min(100, priority))
  }

  /**
   * Validate crawl configuration
   */
  validateCrawlConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (this.data.crawlConfig.maxPages < 1) {
      errors.push('Max pages must be at least 1')
    }

    if (this.data.crawlConfig.maxPages > 10000) {
      errors.push('Max pages cannot exceed 10,000')
    }

    if (this.data.crawlConfig.includePaths?.length &&
        this.data.crawlConfig.excludePaths?.length) {
      const hasOverlap = this.data.crawlConfig.includePaths.some(inc =>
        this.data.crawlConfig.excludePaths!.some(exc =>
          inc.startsWith(exc) || exc.startsWith(inc)
        )
      )
      if (hasOverlap) {
        errors.push('Include and exclude paths have overlapping patterns')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Estimate crawl duration based on configuration
   */
  estimateCrawlDuration(): number {
    const baseTimePerPage = this.data.crawlConfig.slowScraping ? 3000 : 1000
    const scrollTime = this.data.crawlConfig.scrollToBottom ? 500 : 0
    const waitTime = this.data.crawlConfig.waitForSelector ? 1000 : 0

    const timePerPage = baseTimePerPage + scrollTime + waitTime
    const totalTime = this.data.crawlConfig.maxPages * timePerPage

    return totalTime
  }

  /**
   * Check if source is currently being processed
   */
  isProcessing(): boolean {
    return this.data.status === 'processing'
  }

  /**
   * Check if source is ready for use
   */
  isReady(): boolean {
    return this.data.status === 'ready'
  }

  /**
   * Update source status
   */
  updateStatus(status: WebsiteSourceData['status']): void {
    this.data.status = status
    this.data.updatedAt = new Date()
  }

  /**
   * Mark as crawled
   */
  markAsCrawled(): void {
    this.data.lastCrawledAt = new Date()
    this.data.status = 'ready'
    this.data.updatedAt = new Date()
  }

  /**
   * Get plan limits for this source
   */
  getPlanLimits(): {
    maxPages: number
    canUseSlow: boolean
    canUseFullPage: boolean
  } {
    // This would typically check the project's plan
    // For now, return default limits
    return {
      maxPages: 1000,
      canUseSlow: true,
      canUseFullPage: true
    }
  }

  /**
   * Convert to plain object for persistence
   */
  toJSON(): WebsiteSourceData {
    return { ...this.data }
  }

  /**
   * Create from database record
   */
  static fromDatabase(record: any): WebsiteSource {
    return new WebsiteSource({
      id: record.id,
      projectId: record.project_id,
      agentId: record.agent_id,
      url: record.url,
      name: record.name,
      status: record.status,
      crawlConfig: record.metadata?.crawlConfig || {
        maxPages: record.metadata?.max_pages || 200,
        crawlSubpages: record.metadata?.crawl_subpages ?? true,
        includePaths: record.metadata?.include_paths,
        excludePaths: record.metadata?.exclude_paths,
        slowScraping: record.metadata?.slow_scraping,
        fullPageContent: record.metadata?.full_page_content,
        respectRobotsTxt: record.metadata?.respect_robots ?? true,
        userAgent: record.metadata?.user_agent,
        waitForSelector: record.metadata?.wait_for_selector,
        scrollToBottom: record.metadata?.scroll_to_bottom,
      },
      metadata: record.metadata || {},
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      lastCrawledAt: record.last_crawled_at ? new Date(record.last_crawled_at) : undefined,
    })
  }

  // Getters for commonly accessed properties
  get id(): string { return this.data.id }
  get projectId(): string { return this.data.projectId }
  get agentId(): string { return this.data.agentId }
  get url(): string { return this.data.url }
  get name(): string { return this.data.name }
  get status(): string { return this.data.status }
  get crawlConfig(): CrawlConfig { return this.data.crawlConfig }
  get metadata(): Record<string, any> { return this.data.metadata || {} }
  get createdAt(): Date { return this.data.createdAt }
  get updatedAt(): Date { return this.data.updatedAt }
  get lastCrawledAt(): Date | undefined { return this.data.lastCrawledAt }
}