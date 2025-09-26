# Architecture Cleanup Plan

## Current Issues
1. **Duplicate interfaces** in multiple scraper files
2. **Complex callback flow** for progressive processing
3. **Three separate crawler classes** doing similar things
4. **Unclear separation of concerns**

## Proposed Clean Architecture

### Single Crawler Service
```typescript
// lib/crawler/index.ts
export class UnifiedCrawler {
  private httpClient: HTTPCrawler
  private browserPool: BrowserPool  // Manages Playwright instances
  private chunkManager: ChunkManager

  async crawl(url: string, options: CrawlOptions) {
    // 1. Try HTTP first
    const result = await this.httpClient.fetch(url)

    // 2. If needs JS, get from browser pool
    if (this.needsJavaScript(result)) {
      result = await this.browserPool.render(url)
    }

    // 3. Save chunks immediately
    await this.chunkManager.save(result)

    return result
  }
}
```

### Browser Pool (ChatGPT's recommendation)
```typescript
// lib/crawler/browser-pool.ts
export class BrowserPool {
  private browsers: Browser[] = []
  private available: Browser[] = []
  private maxBrowsers = 3

  async getBrowser(): Promise<Browser> {
    // Reuse existing browser or create new
    if (this.available.length > 0) {
      return this.available.pop()
    }
    if (this.browsers.length < this.maxBrowsers) {
      return this.createBrowser()
    }
    // Wait for one to be available
    await this.waitForAvailable()
  }

  async releaseBrowser(browser: Browser) {
    this.available.push(browser)
  }
}
```

### Simplified Queue Processor
```typescript
// lib/queue/website-processor.ts
export async function processWebsiteCrawl(job: Job) {
  const crawler = new UnifiedCrawler()

  const results = await crawler.crawlWebsite({
    url: job.data.url,
    maxPages: job.data.maxPages,
    onProgress: (progress) => job.updateProgress(progress)
  })

  // That's it! Crawler handles everything internally
}
```

## Benefits of This Approach

1. **Single source of truth** - One crawler to rule them all
2. **Browser pooling** - Reuse browser instances (massive memory savings)
3. **Clear flow** - No callbacks within callbacks
4. **Testable** - Each component is isolated
5. **Scalable** - Can easily add more strategies (Puppeteer, API, etc.)

## Implementation Priority

1. **High Priority** (Do Now):
   - Browser pooling - Will immediately reduce memory usage
   - Consolidate interfaces into single file

2. **Medium Priority** (This Week):
   - Unify crawler classes
   - Add caching layer

3. **Low Priority** (Later):
   - Advanced features like per-domain rate limiting
   - Distributed crawling

## Redis Usage - Keep It Simple

Currently using Redis correctly for:
- BullMQ job queue ✅

Should NOT use Redis for:
- Caching crawled content (use Supabase or CDN)
- Session storage (not needed)
- Pub/sub (WebSockets are sufficient)

## Migration Path

1. Start with browser pooling (biggest impact)
2. Gradually move logic from 3 scrapers into UnifiedCrawler
3. Keep existing APIs working during transition
4. Test thoroughly with different site types