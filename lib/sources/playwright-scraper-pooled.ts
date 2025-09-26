import * as cheerio from 'cheerio'
import { BrowserPool } from '@/lib/crawler/browser-pool'
import { CrawlResult, CrawlProgress } from '@/lib/types/crawler'

/**
 * Optimized Playwright scraper that uses browser pooling
 */
export class PlaywrightScraperPooled {
  private maxPages: number
  private crawlSubpages: boolean
  private fullPageContent: boolean
  private crawledUrls: Set<string> = new Set()
  private domain: string = ''
  private baseDomain: string = ''
  private onProgress?: (progress: CrawlProgress) => void | Promise<void>
  private discoveredLinks: Set<string> = new Set()
  private browserPool: BrowserPool

  constructor(
    maxPages: number = 10,
    crawlSubpages: boolean = true,
    onProgress?: (progress: CrawlProgress) => void | Promise<void>,
    fullPageContent: boolean = false
  ) {
    this.maxPages = maxPages
    this.crawlSubpages = crawlSubpages
    this.onProgress = onProgress
    this.fullPageContent = fullPageContent
    this.browserPool = BrowserPool.getInstance()
  }

  async crawlWebsite(startUrl: string): Promise<CrawlResult[]> {
    const results: CrawlResult[] = []
    const urlQueue: string[] = [this.normalizeUrl(startUrl)]

    // Extract domain for subpage filtering
    try {
      const url = new URL(startUrl)
      this.domain = url.hostname
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

    console.log('[PlaywrightPooled] Starting crawl with browser pool...')

    while (urlQueue.length > 0 && results.length < this.maxPages) {
      const currentUrl = urlQueue.shift()!

      if (this.crawledUrls.has(currentUrl)) {
        continue
      }

      this.crawledUrls.add(currentUrl)

      // Add human-like delay to respect rate limits
      if (results.length > 0) {
        const randomDelay = 500 + Math.random() * 250
        await this.delay(randomDelay)
      }

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

      const result = await this.crawlPage(currentUrl)
      results.push(result)

      // Track discovered links
      result.links.forEach(link => this.discoveredLinks.add(link))

      // Report completed page for progressive processing
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

      // Add subpages to queue if enabled
      if (this.crawlSubpages && !result.error) {
        const subpages = result.links
          .filter(link => this.isValidCrawlUrl(link))
          .filter(link => {
            try {
              const url = new URL(link)
              const linkBaseDomain = url.hostname.replace(/^www\./i, '')
              const isSameDomain = linkBaseDomain === this.baseDomain
              return isSameDomain && !this.crawledUrls.has(link)
            } catch {
              return false
            }
          })

        urlQueue.push(...subpages.slice(0, this.maxPages - results.length))
      }
    }

    console.log(`[PlaywrightPooled] Crawl complete. Pool stats:`, this.browserPool.getStats())

    return results
  }

  private async crawlPage(url: string): Promise<CrawlResult> {
    try {
      console.log(`[PlaywrightPooled] Crawling page: ${url}`)

      // Use browser pool to render the page
      const renderResult = await this.browserPool.render({
        url,
        timeout: 30000,
        waitUntil: 'networkidle',
        blockResources: true
      })

      if (renderResult.error) {
        throw new Error(renderResult.error)
      }

      // Parse the HTML with cheerio
      const $ = cheerio.load(renderResult.html)

      // Remove script and style elements
      $('script, style, noscript').remove()

      // Extract content based on mode
      let content = ''

      if (this.fullPageContent) {
        // Full page mode
        content = $('body').text()
          .replace(/\s+/g, ' ')
          .trim()
      } else {
        // Smart extraction mode
        const contentSelectors = [
          'main',
          'article',
          '[role="main"]',
          '.content',
          '#content',
          '.main-content',
          '#main-content',
          'body'
        ]

        for (const selector of contentSelectors) {
          const element = $(selector).first()
          if (element.length) {
            content = element.text()
              .replace(/\s+/g, ' ')
              .trim()
            if (content.length > 100) break
          }
        }

        // If no good content found, get all text
        if (content.length < 100) {
          content = $('body').text()
            .replace(/\s+/g, ' ')
            .trim()
        }
      }

      // Extract links
      const links: string[] = []
      $('a[href]').each((_, elem) => {
        const href = $(elem).attr('href')
        if (href) {
          const absoluteUrl = this.resolveUrl(href, url)
          if (absoluteUrl) {
            links.push(absoluteUrl)
          }
        }
      })

      // Extract images
      const images: string[] = []
      $('img[src]').each((_, elem) => {
        const src = $(elem).attr('src')
        if (src) {
          const absoluteUrl = this.resolveUrl(src, url)
          if (absoluteUrl) {
            images.push(absoluteUrl)
          }
        }
      })

      console.log(`[PlaywrightPooled] Successfully crawled ${url}: ${content.length} chars`)

      return {
        url,
        title: renderResult.title,
        content: content.slice(0, 50000), // Limit content size
        links: [...new Set(links)],
        images: [...new Set(images)]
      }

    } catch (error: any) {
      console.error(`[PlaywrightPooled] Failed to crawl ${url}:`, error.message)
      return {
        url,
        title: '',
        content: '',
        links: [],
        images: [],
        error: error.message || 'Failed to crawl page'
      }
    }
  }

  private resolveUrl(relativeUrl: string, baseUrl: string): string | null {
    try {
      // Skip non-http protocols
      if (relativeUrl.match(/^(mailto:|tel:|javascript:|#)/)) {
        return null
      }

      const resolved = new URL(relativeUrl, baseUrl)

      // Only return http/https URLs
      if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
        return resolved.toString()
      }

      return null
    } catch {
      return null
    }
  }

  private normalizeUrl(url: string): string {
    try {
      const normalized = new URL(url)
      // Remove trailing slash
      return normalized.toString().replace(/\/$/, '')
    } catch {
      return url
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private isValidCrawlUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url)
      const path = parsedUrl.pathname.toLowerCase()

      // Skip external domains
      const externalDomains = [
        'twitter.com', 'x.com', 'facebook.com', 'instagram.com',
        'youtube.com', 'linkedin.com', 'pinterest.com', 'reddit.com',
        'tiktok.com', 'snapchat.com', 'whatsapp.com', 'telegram.org'
      ]

      if (externalDomains.some(domain => parsedUrl.hostname.includes(domain))) {
        return false
      }

      // Skip non-HTML resources
      const skipExtensions = [
        '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
        '.mp4', '.mp3', '.wav', '.avi', '.mov',
        '.zip', '.rar', '.tar', '.gz',
        '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.css', '.js', '.json', '.xml', '.txt', '.csv'
      ]

      if (skipExtensions.some(ext => path.endsWith(ext))) {
        return false
      }

      // Skip common non-content paths
      const skipPaths = ['/api/', '/assets/', '/static/', '/download/', '/files/']
      if (skipPaths.some(skip => path.includes(skip))) {
        return false
      }

      return true
    } catch {
      return false
    }
  }
}

export async function scrapeWebsiteWithPlaywrightPooled(
  url: string,
  maxPages: number = 10,
  crawlSubpages: boolean = true,
  onProgress?: (progress: CrawlProgress) => void | Promise<void>,
  fullPageContent: boolean = false
): Promise<CrawlResult[]> {
  const scraper = new PlaywrightScraperPooled(maxPages, crawlSubpages, onProgress, fullPageContent)
  return scraper.crawlWebsite(url)
}