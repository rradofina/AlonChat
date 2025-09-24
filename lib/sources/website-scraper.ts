import * as cheerio from 'cheerio'

export interface CrawlResult {
  url: string
  title: string
  content: string
  links: string[]
  images: string[]
  error?: string
}

export class WebsiteScraper {
  private maxPages: number
  private crawlSubpages: boolean
  private crawledUrls: Set<string> = new Set()
  private domain: string = ''

  constructor(maxPages: number = 10, crawlSubpages: boolean = true) {
    this.maxPages = maxPages
    this.crawlSubpages = crawlSubpages
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

      const result = await this.crawlPage(currentUrl)
      results.push(result)

      // Add subpages to queue if enabled
      if (this.crawlSubpages && !result.error) {
        const subpages = result.links.filter(link => {
          try {
            const url = new URL(link)
            return url.hostname === this.domain && !this.crawledUrls.has(link)
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
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AlonChatBot/1.0)'
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

      // Extract main content
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

      let content = ''
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
        content: content.slice(0, 50000), // Limit content size
        links: [...new Set(links)], // Remove duplicates
        images: [...new Set(images)]
      }

    } catch (error: any) {
      console.error(`Error crawling ${url}:`, error.message)
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
}

export async function scrapeWebsite(
  url: string,
  maxPages: number = 10,
  crawlSubpages: boolean = true
): Promise<CrawlResult[]> {
  const scraper = new WebsiteScraper(maxPages, crawlSubpages)
  return scraper.crawlWebsite(url)
}