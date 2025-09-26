import { chromium, Browser, Page } from 'playwright'
import * as cheerio from 'cheerio'

export interface CrawlResult {
  url: string
  title: string
  content: string
  links: string[]
  images: string[]
  error?: string
}

export interface CrawlProgress {
  current: number
  total: number
  currentUrl: string
  phase: 'discovering' | 'processing'
  discoveredLinks?: string[]
}

export class PlaywrightScraper {
  private maxPages: number
  private crawlSubpages: boolean
  private fullPageContent: boolean
  private crawledUrls: Set<string> = new Set()
  private domain: string = ''
  private browser: Browser | null = null
  private onProgress?: (progress: CrawlProgress) => void | Promise<void>
  private discoveredLinks: Set<string> = new Set()

  constructor(maxPages: number = 10, crawlSubpages: boolean = true, onProgress?: (progress: CrawlProgress) => void | Promise<void>, fullPageContent: boolean = false) {
    this.maxPages = maxPages
    this.crawlSubpages = crawlSubpages
    this.onProgress = onProgress
    this.fullPageContent = fullPageContent
  }

  setProgressCallback(callback: (progress: CrawlProgress) => void) {
    this.onProgress = callback
  }

  async crawlWebsite(startUrl: string): Promise<CrawlResult[]> {
    const results: CrawlResult[] = []
    const urlQueue: string[] = [this.normalizeUrl(startUrl)]

    // Extract domain for subpage filtering
    try {
      const url = new URL(startUrl)
      this.domain = url.hostname
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

    try {
      // Launch browser
      console.log('Launching browser for crawling...')
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })

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

      while (urlQueue.length > 0 && results.length < this.maxPages) {
        const currentUrl = urlQueue.shift()!

        if (this.crawledUrls.has(currentUrl)) {
          continue
        }

        this.crawledUrls.add(currentUrl)

        // Add human-like random delay (500-750ms) to respect rate limits
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

        // Add subpages to queue if enabled
        if (this.crawlSubpages && !result.error) {
          const subpages = result.links
            .filter(link => this.isValidCrawlUrl(link))
            .filter(link => {
              try {
                const url = new URL(link)
                // Only crawl same domain, no external links
                return url.hostname === this.domain && !this.crawledUrls.has(link)
              } catch {
                return false
              }
            })

          urlQueue.push(...subpages.slice(0, this.maxPages - results.length))
        }
      }
    } catch (error: any) {
      console.error('Browser launch error:', error)
      // If Playwright fails, return error result
      return [{
        url: startUrl,
        title: '',
        content: '',
        links: [],
        images: [],
        error: `Browser launch failed: ${error.message}`
      }]
    } finally {
      // Close browser
      if (this.browser) {
        await this.browser.close()
      }
    }

    return results
  }

  private async crawlPage(url: string): Promise<CrawlResult> {
    let page: Page | null = null

    try {
      console.log(`Crawling page with Playwright: ${url}`)

      if (!this.browser) {
        throw new Error('Browser not initialized')
      }

      // Create a new page
      page = await this.browser.newPage()

      // Set user agent to avoid detection
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9'
      })

      // Navigate to the page
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      })

      if (!response) {
        throw new Error('No response received')
      }

      const status = response.status()
      if (status >= 400) {
        throw new Error(`HTTP ${status}`)
      }

      // Wait for network to be idle (no requests for 500ms)
      // This is smarter than fixed wait and adapts to page speed
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 })
      } catch {
        // If networkidle times out, continue anyway
        console.log(`Network idle timeout for ${url}, continuing...`)
      }

      // Get the page content
      const html = await page.content()
      const $ = cheerio.load(html)

      // Remove script and style elements
      $('script, style, noscript').remove()

      // Extract title
      const title = await page.title() ||
                   $('h1').first().text().trim() ||
                   'Untitled Page'

      // Extract content based on mode
      let content = ''

      if (this.fullPageContent) {
        // Full page mode - get everything including headers/footers
        content = $('body').text()
          .replace(/\s+/g, ' ')
          .trim()
      } else {
        // Smart extraction mode - focus on main content
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

      console.log(`Successfully crawled ${url}: ${content.length} chars`)

      return {
        url,
        title,
        content: content.slice(0, 50000), // Limit content size
        links: [...new Set(links)], // Remove duplicates
        images: [...new Set(images)]
      }

    } catch (error: any) {
      console.error(`Failed to crawl ${url}:`, error.message)
      return {
        url,
        title: '',
        content: '',
        links: [],
        images: [],
        error: error.message || 'Failed to crawl page'
      }
    } finally {
      // Close the page
      if (page) {
        await page.close()
      }
    }
  }

  private resolveUrl(relativeUrl: string, baseUrl: string): string | null {
    try {
      // Skip mailto, tel, and other non-http protocols
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

      // Skip external domains (social media, etc)
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

export async function scrapeWebsiteWithPlaywright(
  url: string,
  maxPages: number = 10,
  crawlSubpages: boolean = true,
  onProgress?: (progress: CrawlProgress) => void | Promise<void>,
  fullPageContent: boolean = false
): Promise<CrawlResult[]> {
  const scraper = new PlaywrightScraper(maxPages, crawlSubpages, onProgress, fullPageContent)
  return scraper.crawlWebsite(url)
}