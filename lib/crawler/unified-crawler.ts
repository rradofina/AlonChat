import * as cheerio from 'cheerio'
import { BrowserPool } from './browser-pool'
import { CrawlCache } from './cache-manager'
import { ChunkManager } from '@/lib/services/chunk-manager'
import { CrawlResult, CrawlProgress, CrawlOptions } from '@/lib/types/crawler'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * UnifiedCrawler - Single source of truth for all crawling operations
 * Replaces WebsiteScraper, PlaywrightScraper, and ProgressiveCrawler
 *
 * Features:
 * - HTTP-first approach for efficiency
 * - Browser pool for JS-heavy sites
 * - Built-in progressive chunking
 * - Per-domain rate limiting
 * - Caching support
 */
export class UnifiedCrawler {
  private browserPool: BrowserPool
  private cache: CrawlCache
  private chunkManager = ChunkManager
  private crawledUrls = new Set<string>()
  private discoveredLinks = new Set<string>()
  private domainLastCrawl = new Map<string, number>()
  private domainDelay = 1000 // 1 second between requests per domain
  private baseDomain = ''
  private useCache = true // Enable caching by default

  // Crawler options
  private maxPages: number
  private crawlSubpages: boolean
  private fullPageContent: boolean
  private onProgress?: (progress: CrawlProgress) => void | Promise<void>

  // For progressive saving
  private sourceId?: string
  private agentId?: string
  private projectId?: string

  constructor(options: CrawlOptions & {
    sourceId?: string
    agentId?: string
    projectId?: string
    useCache?: boolean
  }) {
    this.maxPages = options.maxPages || 10
    this.crawlSubpages = options.crawlSubpages !== false
    this.fullPageContent = options.fullPageContent || false
    this.onProgress = options.onProgress
    this.sourceId = options.sourceId
    this.agentId = options.agentId
    this.projectId = options.projectId
    this.useCache = options.useCache !== false // Default to true

    this.browserPool = BrowserPool.getInstance()
    this.cache = CrawlCache.getInstance()
  }

  /**
   * Main crawl method - coordinates all crawling strategies
   */
  async crawlWebsite(startUrl: string): Promise<CrawlResult[]> {
    const results: CrawlResult[] = []
    const urlQueue: string[] = [this.normalizeUrl(startUrl)]

    // Extract base domain
    try {
      const url = new URL(startUrl)
      this.baseDomain = url.hostname.replace(/^www\./i, '')
    } catch {
      return [{
        url: startUrl,
        title: '',
        content: '',
        links: [],
        images: [],
        error: 'Invalid URL'
      }]
    }

    console.log(`[UnifiedCrawler] Starting crawl of ${startUrl}`)

    // Report initial progress
    if (this.onProgress) {
      await this.onProgress({
        current: 0,
        total: this.maxPages,
        currentUrl: startUrl,
        phase: 'discovering',
        discoveredLinks: []
      })
    }

    // Main crawl loop
    while (urlQueue.length > 0 && results.length < this.maxPages) {
      const currentUrl = urlQueue.shift()!

      if (this.crawledUrls.has(currentUrl)) {
        continue
      }

      this.crawledUrls.add(currentUrl)

      // Apply rate limiting
      await this.respectRateLimit(currentUrl)

      // Report progress
      if (this.onProgress) {
        await this.onProgress({
          current: results.length + 1,
          total: this.maxPages,
          currentUrl,
          phase: 'processing',
          discoveredLinks: Array.from(this.discoveredLinks)
        })
      }

      // Crawl the page
      const result = await this.crawlPage(currentUrl)
      results.push(result)

      // Track discovered links
      result.links.forEach(link => this.discoveredLinks.add(link))

      // Progressive save if configured
      if (this.shouldProgressivelySave() && !result.error && result.content) {
        await this.progressivelySaveChunks(result)
      }

      // Report completed page
      if (this.onProgress) {
        await this.onProgress({
          current: results.length,
          total: this.maxPages,
          currentUrl: result.url,
          phase: 'processing',
          discoveredLinks: Array.from(this.discoveredLinks),
          completedPage: result
        })
      }

      // Add subpages if enabled
      if (this.crawlSubpages && !result.error) {
        const validSubpages = this.filterValidSubpages(result.links)
        urlQueue.push(...validSubpages.slice(0, this.maxPages - results.length))
      }
    }

    console.log(`[UnifiedCrawler] Crawl complete: ${results.length} pages`)
    console.log(`[UnifiedCrawler] Browser pool stats:`, this.browserPool.getStats())

    return results
  }

  /**
   * Crawl a single page - decides between cache, HTTP, and browser rendering
   */
  private async crawlPage(url: string): Promise<CrawlResult> {
    console.log(`[UnifiedCrawler] Crawling ${url}`)

    // Check cache first if enabled
    if (this.useCache) {
      const cached = await this.cache.get(url)
      if (cached) {
        console.log(`[UnifiedCrawler] Using cached content for ${url}`)
        const $ = cheerio.load(cached.html)
        $('script, style, noscript').remove()

        const content = this.extractContent($)
        const links = this.extractLinks($, url)
        const images = this.extractImages($, url)

        return {
          url,
          title: cached.title,
          content,
          links,
          images
        }
      }
    }

    // Try HTTP first (fast and lightweight)
    const httpResult = await this.crawlWithHttp(url)

    // Check if we got meaningful content
    if (!httpResult.error && httpResult.content && httpResult.content.length > 500) {
      console.log(`[UnifiedCrawler] HTTP success for ${url}: ${httpResult.content.length} chars`)

      // Cache the successful result
      if (this.useCache && httpResult.content) {
        // Get full HTML for caching (we need to refetch for full HTML)
        try {
          const response = await fetch(url)
          const html = await response.text()
          await this.cache.set(url, html, httpResult.title, 3600) // 1 hour TTL
        } catch (error) {
          console.log(`[UnifiedCrawler] Failed to cache ${url}:`, error)
        }
      }

      return httpResult
    }

    // If HTTP failed or got minimal content, try browser rendering
    console.log(`[UnifiedCrawler] HTTP got minimal content, using browser for ${url}`)
    const browserResult = await this.crawlWithBrowser(url)

    // Cache successful browser result
    if (this.useCache && !browserResult.error && browserResult.content) {
      // We need to get the HTML from browser again for caching
      const renderResult = await this.browserPool.render({
        url,
        timeout: 30000,
        waitUntil: 'networkidle',
        blockResources: true
      })

      if (!renderResult.error) {
        await this.cache.set(url, renderResult.html, browserResult.title, 3600)
      }
    }

    // Return browser result if successful, otherwise return HTTP result
    return browserResult.error ? httpResult : browserResult
  }

  /**
   * HTTP-based crawling (fast, lightweight)
   */
  private async crawlWithHttp(url: string): Promise<CrawlResult> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AlonChatBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        redirect: 'follow'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('text/html')) {
        throw new Error('Not an HTML page')
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      // Clean up HTML
      $('script, style, noscript').remove()

      // Extract content
      const title = $('title').text().trim() || $('h1').first().text().trim()
      const content = this.extractContent($)
      const links = this.extractLinks($, url)
      const images = this.extractImages($, url)

      return { url, title, content, links, images }

    } catch (error: any) {
      return {
        url,
        title: '',
        content: '',
        links: [],
        images: [],
        error: error.message
      }
    }
  }

  /**
   * Browser-based crawling (for JS-heavy sites)
   */
  private async crawlWithBrowser(url: string): Promise<CrawlResult> {
    const renderResult = await this.browserPool.render({
      url,
      timeout: 30000,
      waitUntil: 'networkidle',
      blockResources: true
    })

    if (renderResult.error) {
      return {
        url,
        title: '',
        content: '',
        links: [],
        images: [],
        error: renderResult.error
      }
    }

    const $ = cheerio.load(renderResult.html)
    $('script, style, noscript').remove()

    const content = this.extractContent($)
    const links = this.extractLinks($, url)
    const images = this.extractImages($, url)

    return {
      url,
      title: renderResult.title,
      content,
      links,
      images
    }
  }

  /**
   * Extract text content from parsed HTML
   */
  private extractContent($: cheerio.CheerioAPI): string {
    let content = ''

    if (this.fullPageContent) {
      content = $('body').text().replace(/\s+/g, ' ').trim()
    } else {
      // Smart extraction - try main content areas first
      const selectors = [
        'main', 'article', '[role="main"]',
        '.content', '#content', '.main-content', '#main-content'
      ]

      for (const selector of selectors) {
        const element = $(selector).first()
        if (element.length) {
          content = element.text().replace(/\s+/g, ' ').trim()
          if (content.length > 100) break
        }
      }

      // Fallback to body if no good content found
      if (content.length < 100) {
        content = $('body').text().replace(/\s+/g, ' ').trim()
      }
    }

    return content.slice(0, 50000) // Limit to 50KB
  }

  /**
   * Extract all links from the page
   */
  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const links: string[] = []

    $('a[href]').each((_, elem) => {
      const href = $(elem).attr('href')
      if (href) {
        const absoluteUrl = this.resolveUrl(href, baseUrl)
        if (absoluteUrl) links.push(absoluteUrl)
      }
    })

    return [...new Set(links)]
  }

  /**
   * Extract all images from the page
   */
  private extractImages($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const images: string[] = []

    $('img[src]').each((_, elem) => {
      const src = $(elem).attr('src')
      if (src) {
        const absoluteUrl = this.resolveUrl(src, baseUrl)
        if (absoluteUrl) images.push(absoluteUrl)
      }
    })

    return [...new Set(images)]
  }

  /**
   * Progressive save chunks to database
   */
  private async progressivelySaveChunks(page: CrawlResult): Promise<void> {
    if (!this.sourceId || !this.agentId || !this.projectId) return

    try {
      // Check if source still exists before saving chunks
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: sourceExists } = await supabase
        .from('sources')
        .select('id')
        .eq('id', this.sourceId)
        .single()

      if (!sourceExists) {
        console.warn(`[UnifiedCrawler] Source ${this.sourceId} no longer exists, skipping chunk save`)
        return
      }

      const chunkCount = await this.chunkManager.appendChunks({
        sourceId: this.sourceId,
        agentId: this.agentId,
        projectId: this.projectId,
        content: page.content,
        metadata: {
          type: 'website',
          page_url: page.url,
          page_title: page.title,
          crawl_timestamp: new Date().toISOString()
        },
        chunkSize: 16000,
        chunkOverlap: 1600
      })

      console.log(`[UnifiedCrawler] Saved ${chunkCount} chunks for ${page.url}`)
    } catch (error) {
      console.error(`[UnifiedCrawler] Failed to save chunks for ${page.url}:`, error)
      // Don't throw the error, just log it and continue
    }
  }

  /**
   * Apply rate limiting per domain
   */
  private async respectRateLimit(url: string): Promise<void> {
    try {
      const domain = new URL(url).hostname
      const lastCrawl = this.domainLastCrawl.get(domain)

      if (lastCrawl) {
        const timeSinceLastCrawl = Date.now() - lastCrawl
        if (timeSinceLastCrawl < this.domainDelay) {
          const waitTime = this.domainDelay - timeSinceLastCrawl
          console.log(`[UnifiedCrawler] Rate limit: waiting ${waitTime}ms for ${domain}`)
          await this.delay(waitTime)
        }
      }

      this.domainLastCrawl.set(domain, Date.now())
    } catch {
      // If URL parsing fails, just continue
    }
  }

  /**
   * Filter valid subpages for crawling
   */
  private filterValidSubpages(links: string[]): string[] {
    return links.filter(link => {
      if (this.crawledUrls.has(link)) return false

      try {
        const url = new URL(link)
        const linkDomain = url.hostname.replace(/^www\./i, '')

        // Same domain check
        if (linkDomain !== this.baseDomain) return false

        // Skip non-content URLs
        const path = url.pathname.toLowerCase()
        const skipExtensions = [
          '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.zip',
          '.doc', '.xls', '.ppt', '.mp4', '.mp3'
        ]

        if (skipExtensions.some(ext => path.endsWith(ext))) return false

        return true
      } catch {
        return false
      }
    })
  }

  /**
   * Check if progressive saving is configured
   */
  private shouldProgressivelySave(): boolean {
    return !!(this.sourceId && this.agentId && this.projectId)
  }

  /**
   * Resolve relative URLs to absolute
   */
  private resolveUrl(relativeUrl: string, baseUrl: string): string | null {
    try {
      if (relativeUrl.match(/^(mailto:|tel:|javascript:|#)/)) {
        return null
      }

      const resolved = new URL(relativeUrl, baseUrl)
      if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
        return resolved.toString()
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Normalize URL (remove trailing slash, etc.)
   */
  private normalizeUrl(url: string): string {
    try {
      const normalized = new URL(url)
      return normalized.toString().replace(/\/$/, '')
    } catch {
      return url
    }
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get crawler statistics
   */
  getStats() {
    return {
      crawledUrls: this.crawledUrls.size,
      discoveredLinks: this.discoveredLinks.size,
      browserPoolStats: this.browserPool.getStats()
    }
  }
}