import { createClient } from '@/lib/supabase/server'
import { ChunkManager } from '@/lib/services/chunk-manager'
import { CrawlResult, ProgressiveCrawlOptions } from '@/lib/types/crawler'

/**
 * Progressive crawler that saves chunks immediately as each page is crawled
 * This allows users to view content while crawling is still in progress
 */
export class ProgressiveCrawler {
  private totalChunks = 0
  private totalSize = 0
  private processedPages: string[] = []

  constructor(private options: ProgressiveCrawlOptions) {}

  /**
   * Process a single crawled page immediately
   * Saves chunks to database right away so content is viewable
   */
  async processPage(page: CrawlResult, rootUrl: string): Promise<number> {
    if (!page.content || page.error) {
      console.log(`[ProgressiveCrawler] Skipping page ${page.url}: ${page.error || 'no content'}`)
      return 0
    }

    console.log(`[ProgressiveCrawler] Processing page ${page.url}, content length: ${page.content.length}`)
    console.log(`[ProgressiveCrawler] Agent ID: ${this.options.agentId}, Source ID: ${this.options.sourceId}`)

    try {
      // Save chunks for this page immediately (append, don't delete existing)
      console.log(`[ProgressiveCrawler] Calling appendChunks for ${page.url}`)
      const chunkCount = await ChunkManager.appendChunks({
        sourceId: this.options.sourceId,
        agentId: this.options.agentId,
        projectId: this.options.projectId,
        content: page.content,
        metadata: {
          type: 'website',
          page_url: page.url,
          page_title: page.title || page.url,
          root_url: rootUrl,
          crawl_timestamp: new Date().toISOString(),
          depth: page.url === rootUrl ? 0 : page.url.split('/').length - rootUrl.split('/').length
        },
        chunkSize: 16000, // Much larger chunks to avoid creating too many
        chunkOverlap: 1600 // Proportional overlap
      })

      // Update running totals
      this.totalChunks += chunkCount
      this.totalSize += page.content.length
      this.processedPages.push(page.url)

      // Update source with progressive chunk count
      await this.updateSourceProgress()

      console.log(`✅ Saved ${chunkCount} chunks for ${page.url} immediately`)

      // Callback for additional processing
      if (this.options.onPageComplete) {
        await this.options.onPageComplete(page, chunkCount)
      }

      return chunkCount
    } catch (error) {
      console.error(`Failed to process page ${page.url}:`, error)
      return 0
    }
  }

  /**
   * Update source record with current progress
   * This makes content viewable even while crawling continues
   */
  private async updateSourceProgress(): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('sources')
      .update({
        chunk_count: this.totalChunks,
        size_kb: Math.ceil(this.totalSize / 1024),
        metadata: {
          progressive_chunks: this.totalChunks,
          processed_pages: this.processedPages,
          last_chunk_update: new Date().toISOString()
        }
      })
      .eq('id', this.options.sourceId)
  }

  getTotals() {
    return {
      chunks: this.totalChunks,
      sizeKb: Math.ceil(this.totalSize / 1024),
      pagesProcessed: this.processedPages.length,
      processedUrls: this.processedPages  // Return the actual URLs
    }
  }
}