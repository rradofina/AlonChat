import * as cheerio from 'cheerio'
import { scrapeWebsiteWithPlaywrightPooled } from './playwright-scraper-pooled'
import { CrawlResult, CrawlProgress, CrawlOptions } from '@/lib/types/crawler'

export { CrawlProgress } from '@/lib/types/crawler'

export class WebsiteScraper {
  private maxPages: number
  private crawlSubpages: boolean
  private fullPageContent: boolean
  private crawledUrls: Set<string> = new Set()
  private domain: string = ''
  private baseDomain: string = ''
  private discoveredLinks: Set<string> = new Set()
  private onProgress?: (progress: CrawlProgress) => void | Promise<void>

  constructor(options: CrawlOptions = {}) {
    this.maxPages = options.maxPages || 10
    this.crawlSubpages = options.crawlSubpages !== false
    this.fullPageContent = options.fullPageContent || false
    this.onProgress = options.onProgress
  }

  async crawlWebsite(startUrl: string): Promise<CrawlResult[]> {
    const results: CrawlResult[] = []
    const urlQueue: string[] = [this.normalizeUrl(startUrl)]

    // Extract domain for subpage filtering
    try {
      const url = new URL(startUrl)
      this.domain = url.hostname
      // Extract base domain (remove www. prefix if present)
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

    // Report initial discovery phase
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

      // Add delay to respect rate limits
      if (results.length > 0) {
        await this.delay(1000)
      }

      // Report progress before crawling
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

      // Add discovered links to our set
      result.links.forEach(link => this.discoveredLinks.add(link))

      // Report completed page in progress callback for progressive processing
      if (this.onProgress) {
        await this.onProgress({
          current: results.length,
          total: this.maxPages,
          currentUrl: result.url,
          phase: 'processing',
          discoveredLinks: Array.from(this.discoveredLinks),
          completedPage: result  // Pass the completed page for immediate processing
        })
      }

      // Add subpages to queue if enabled
      if (this.crawlSubpages && !result.error) {
        const subpages = result.links
          .filter(link => this.isValidCrawlUrl(link))
          .filter(link => {
            try {
              const url = new URL(link)
              // Check if same domain (handle www vs non-www)
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

    return results
  }

  private async crawlPage(url: string): Promise<CrawlResult> {
    try {
      console.log(`Crawling page: ${url}`)

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        redirect: 'follow'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('text/html')) {
        throw new Error('Not an HTML page')
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      // Remove script and style elements
      $('script, style, noscript').remove()

      // Extract title
      const title = $('title').text().trim() ||
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

      return {
        url,
        title,
        content: content, // Don't limit content here - let chunking handle it
        links: [...new Set(links)], // Remove duplicates
        images: [...new Set(images)]
      }

    } catch (error: any) {
      console.error(`Failed to crawl ${url}:`, error.message)
      console.error('Full error:', error)
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
      // Add https:// if no protocol is specified
      let urlToNormalize = url
      if (!url.match(/^https?:\/\//i)) {
        urlToNormalize = 'https://' + url
      }

      const normalized = new URL(urlToNormalize)
      // Remove trailing slash
      return normalized.toString().replace(/\/$/, '')
    } catch {
      return url
    }
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export async function scrapeWebsite(
  url: string,
  maxPages: number = 10,
  crawlSubpages: boolean = true,
  onProgress?: (progress: CrawlProgress) => void | Promise<void>,
  fullPageContent: boolean = false
): Promise<CrawlResult[]> {
  // Try HTTP fetch first (faster and lighter)
  console.log('Attempting HTTP-based crawl...')
  const scraper = new WebsiteScraper({
    maxPages,
    crawlSubpages,
    fullPageContent,
    onProgress
  })

  const results = await scraper.crawlWebsite(url)

  // Check if we got meaningful content
  const validResults = results.filter(r => !r.error && r.content && r.content.length > 500)

  if (validResults.length > 0) {
    console.log(`HTTP crawl succeeded: ${validResults.length} pages with content`)
    return results
  }

  // If HTTP failed or got minimal content, try Playwright for JS-heavy sites
  console.log('HTTP crawl got minimal content, trying Playwright for JS rendering...')
  try {
    const playwrightResults = await scrapeWebsiteWithPlaywrightPooled(url, maxPages, crawlSubpages, onProgress, fullPageContent)
    const validPlaywrightResults = playwrightResults.filter(r => !r.error || r.content)

    if (validPlaywrightResults.length > 0) {
      console.log(`Playwright succeeded: ${validPlaywrightResults.length} pages crawled`)
      return playwrightResults
    }
  } catch (error: any) {
    console.log('Playwright also failed:', error.message)
  }

  // Return whatever we got from HTTP even if minimal
  console.log('Returning HTTP results (may be limited)')
  return results
}