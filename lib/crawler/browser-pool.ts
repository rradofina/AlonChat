import { chromium, Browser, BrowserContext, Page } from 'playwright'

export interface PooledBrowser {
  browser: Browser
  contexts: number
  lastUsed: Date
  id: string
}

export interface RenderOptions {
  url: string
  timeout?: number
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'
  blockResources?: boolean
}

export interface RenderResult {
  html: string
  title: string
  url: string
  error?: string
}

/**
 * Browser Pool Manager
 * Manages a pool of Playwright browser instances to reduce memory usage
 * and improve performance by reusing browsers across crawl jobs
 */
export class BrowserPool {
  private static instance: BrowserPool | null = null
  private browsers: Map<string, PooledBrowser> = new Map()
  private maxBrowsers = 3 // Maximum number of browser instances
  private maxContextsPerBrowser = 5 // Maximum contexts per browser
  private browserTimeout = 5 * 60 * 1000 // 5 minutes idle timeout
  private cleanupInterval: NodeJS.Timeout | null = null

  private constructor() {
    // Start cleanup interval to remove idle browsers
    this.startCleanupInterval()
  }

  /**
   * Get singleton instance of BrowserPool
   */
  public static getInstance(): BrowserPool {
    if (!BrowserPool.instance) {
      BrowserPool.instance = new BrowserPool()
    }
    return BrowserPool.instance
  }

  /**
   * Render a page using a pooled browser
   */
  async render(options: RenderOptions): Promise<RenderResult> {
    const browser = await this.getBrowser()
    let context: BrowserContext | null = null
    let page: Page | null = null

    try {
      // Create a new context (isolated session)
      context = await browser.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      })

      page = await context.newPage()

      // Block resources if requested
      if (options.blockResources !== false) {
        await this.setupResourceBlocking(page)
      }

      // Navigate to the page
      const response = await page.goto(options.url, {
        waitUntil: options.waitUntil || 'networkidle',
        timeout: options.timeout || 30000
      })

      if (!response) {
        throw new Error('No response received')
      }

      if (response.status() >= 400) {
        throw new Error(`HTTP ${response.status()}`)
      }

      // Extract content
      const html = await page.content()
      const title = await page.title()

      // Update last used time
      browser.lastUsed = new Date()

      return {
        html,
        title,
        url: options.url
      }

    } catch (error: any) {
      console.error(`Browser pool render error for ${options.url}:`, error.message)
      return {
        html: '',
        title: '',
        url: options.url,
        error: error.message
      }
    } finally {
      // Clean up context and page
      if (page) await page.close().catch(() => {})
      if (context) await context.close().catch(() => {})

      // Decrement context count
      if (browser) {
        browser.contexts = Math.max(0, browser.contexts - 1)
      }
    }
  }

  /**
   * Get an available browser from the pool or create a new one
   */
  private async getBrowser(): Promise<PooledBrowser> {
    // Find browser with available context slots
    for (const [id, browser] of this.browsers) {
      if (browser.contexts < this.maxContextsPerBrowser) {
        browser.contexts++
        browser.lastUsed = new Date()
        console.log(`[BrowserPool] Reusing browser ${id} (${browser.contexts}/${this.maxContextsPerBrowser} contexts)`)
        return browser
      }
    }

    // Create new browser if under limit
    if (this.browsers.size < this.maxBrowsers) {
      const browser = await this.createBrowser()
      console.log(`[BrowserPool] Created new browser ${browser.id} (${this.browsers.size}/${this.maxBrowsers} browsers)`)
      return browser
    }

    // Wait for a browser to become available
    console.log('[BrowserPool] All browsers busy, waiting for availability...')
    await this.waitForAvailableBrowser()
    return this.getBrowser()
  }

  /**
   * Create a new browser instance
   */
  private async createBrowser(): Promise<PooledBrowser> {
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--disable-extensions'
      ]
    })

    const id = Math.random().toString(36).substring(7)
    const pooledBrowser: PooledBrowser = {
      browser,
      contexts: 1,
      lastUsed: new Date(),
      id
    }

    this.browsers.set(id, pooledBrowser)
    return pooledBrowser
  }

  /**
   * Wait for a browser context to become available
   */
  private async waitForAvailableBrowser(): Promise<void> {
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        for (const browser of this.browsers.values()) {
          if (browser.contexts < this.maxContextsPerBrowser) {
            clearInterval(checkInterval)
            resolve()
            return
          }
        }
      }, 100)
    })
  }

  /**
   * Setup resource blocking for a page
   */
  private async setupResourceBlocking(page: Page): Promise<void> {
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType()
      const url = route.request().url()

      // Block resource-heavy content
      const blockedTypes = ['image', 'media', 'font', 'stylesheet']
      const blockedDomains = [
        'googletagmanager.com',
        'google-analytics.com',
        'facebook.com',
        'twitter.com',
        'doubleclick.net',
        'cloudflare.com/cdn-cgi',
        'fontawesome.com',
        'googleapis.com/css'
      ]

      if (blockedTypes.includes(resourceType) ||
          blockedDomains.some(domain => url.includes(domain))) {
        route.abort()
      } else {
        route.continue()
      }
    })
  }

  /**
   * Start interval to clean up idle browsers
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(async () => {
      const now = Date.now()

      for (const [id, browser] of this.browsers) {
        const idleTime = now - browser.lastUsed.getTime()

        // Remove browsers idle for more than timeout
        if (idleTime > this.browserTimeout && browser.contexts === 0) {
          console.log(`[BrowserPool] Removing idle browser ${id}`)
          await browser.browser.close().catch(() => {})
          this.browsers.delete(id)
        }
      }

      // Log pool status
      if (this.browsers.size > 0) {
        console.log(`[BrowserPool] Active: ${this.browsers.size} browsers, ${
          Array.from(this.browsers.values()).reduce((sum, b) => sum + b.contexts, 0)
        } total contexts`)
      }
    }, 30000) // Check every 30 seconds
  }

  /**
   * Close all browsers and cleanup
   */
  async shutdown(): Promise<void> {
    console.log('[BrowserPool] Shutting down browser pool...')

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    for (const [id, browser] of this.browsers) {
      await browser.browser.close().catch(() => {})
    }

    this.browsers.clear()
    BrowserPool.instance = null
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      browsers: this.browsers.size,
      maxBrowsers: this.maxBrowsers,
      contexts: Array.from(this.browsers.values()).reduce((sum, b) => sum + b.contexts, 0),
      maxContextsPerBrowser: this.maxContextsPerBrowser,
      details: Array.from(this.browsers.entries()).map(([id, b]) => ({
        id,
        contexts: b.contexts,
        lastUsed: b.lastUsed
      }))
    }
  }
}