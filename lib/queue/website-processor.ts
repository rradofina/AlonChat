import { Queue, Worker, Job } from 'bullmq'
import IORedis from 'ioredis'
import { createClient } from '@/lib/supabase/server'
import { scrapeWebsite } from '@/lib/sources/website-scraper'
import { ChunkManager } from '@/lib/services/chunk-manager'

export interface WebsiteCrawlJob {
  sourceId: string
  agentId: string
  projectId: string
  url: string
  crawlSubpages: boolean
  maxPages: number
}

let websiteQueue: Queue<WebsiteCrawlJob> | null = null
let websiteWorker: Worker<WebsiteCrawlJob> | null = null

// Initialize Redis connection
function getRedisConnection() {
  try {
    const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          console.error('Redis connection failed after 3 retries')
          return null
        }
        const delay = Math.min(times * 500, 2000)
        return delay
      }
    })

    redis.on('error', (error) => {
      console.error('Redis connection error:', error)
    })

    return redis
  } catch (error) {
    console.error('Failed to create Redis connection:', error)
    return null
  }
}

// Initialize queue
export function initWebsiteQueue() {
  try {
    const connection = getRedisConnection()
    if (!connection) {
      console.warn('Redis not available, website crawling will not work')
      return null
    }

    websiteQueue = new Queue<WebsiteCrawlJob>('website-crawl', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    })

    return websiteQueue
  } catch (error) {
    console.error('Failed to initialize website queue:', error)
    return null
  }
}

// Initialize worker
export function initWebsiteWorker() {
  try {
    const connection = getRedisConnection()
    if (!connection) {
      console.warn('Redis not available, website worker will not start')
      return null
    }

    websiteWorker = new Worker<WebsiteCrawlJob>(
      'website-crawl',
      async (job: Job<WebsiteCrawlJob>) => {
        await processWebsiteCrawl(job)
      },
      {
        connection,
        concurrency: 2 // Process 2 crawls simultaneously
      }
    )

    websiteWorker.on('completed', (job) => {
      console.log(`Website crawl completed for job ${job.id}`)
    })

    websiteWorker.on('failed', (job, err) => {
      console.error(`Website crawl failed for job ${job?.id}:`, err.message)
    })

    return websiteWorker
  } catch (error) {
    console.error('Failed to initialize website worker:', error)
    return null
  }
}

// Process website crawl job
async function processWebsiteCrawl(job: Job<WebsiteCrawlJob>) {
  const { sourceId, agentId, projectId, url, crawlSubpages, maxPages } = job.data
  const supabase = await createClient()

  try {
    // Update status to processing
    await supabase
      .from('sources')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', sourceId)

    // Report progress
    await job.updateProgress(10)

    // Crawl website
    console.log(`Starting crawl for ${url}`)
    const crawlResults = await scrapeWebsite(url, maxPages, crawlSubpages)

    await job.updateProgress(50)

    // Track initial crawl results
    const crawledPages = crawlResults.filter(r => !r.error).map(r => r.url)
    const crawlErrors = crawlResults.filter(r => r.error).map(r => ({
      url: r.url,
      error: r.error
    }))

    // Process and chunk content
    const validPages = crawlResults.filter(r => !r.error && r.content)
    if (validPages.length === 0) {
      throw new Error('No valid pages found to process')
    }

    console.log(`Processing ${validPages.length} pages`)

    // Process each page separately to maintain page boundaries
    let totalChunks = 0
    let totalSize = 0

    for (const page of validPages) {
      // Store chunks for each page with page-specific metadata
      const chunkCount = await ChunkManager.storeChunks({
        sourceId,
        agentId,
        projectId,
        content: page.content || '',
        metadata: {
          type: 'website',
          page_url: page.url,
          page_title: page.title || page.url,
          root_url: url,
          crawl_timestamp: new Date().toISOString(),
          // Add link depth if available
          depth: page.url === url ? 0 : page.url.split('/').length - url.split('/').length
        },
        chunkSize: 4000, // Larger chunks for websites
        chunkOverlap: 400 // Maintain overlap for context
      })

      totalChunks += chunkCount
      totalSize += (page.content || '').length
      console.log(`Chunked page ${page.url}: ${chunkCount} chunks`)

      // Update progress for each page
      const pageProgress = 80 + Math.floor((20 * validPages.indexOf(page)) / validPages.length)
      await job.updateProgress(pageProgress)
    }

    // Calculate size in KB
    const sizeKb = Math.ceil(totalSize / 1024)

    // Update source status to ready with all metadata
    await supabase
      .from('sources')
      .update({
        status: 'ready',
        size_kb: sizeKb,
        chunk_count: totalChunks,
        is_trained: false, // Mark as not trained initially
        metadata: {
          url,
          crawl_subpages: crawlSubpages,
          max_pages: maxPages,
          pages_crawled: validPages.length,
          crawled_pages: validPages.map(p => p.url),
          crawl_errors: crawlErrors,
          total_chunks: totalChunks,
          crawl_completed_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', sourceId)

    await job.updateProgress(100)
    console.log(`Successfully processed ${validPages.length} pages, ${totalChunks} chunks`)

  } catch (error: any) {
    console.error(`Error processing website crawl:`, error)

    // Update source status to error
    await supabase
      .from('sources')
      .update({
        status: 'error',
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', sourceId)

    throw error
  }
}

// Add job to queue
export async function queueWebsiteCrawl(data: WebsiteCrawlJob): Promise<string | null> {
  if (!websiteQueue) {
    websiteQueue = initWebsiteQueue()
    if (!websiteQueue) {
      console.error('Website queue not available')
      return null
    }
  }

  try {
    const job = await websiteQueue.add('crawl', data, {
      jobId: `crawl-${data.sourceId}`
    })
    return job.id || null
  } catch (error) {
    console.error('Failed to queue website crawl:', error)
    return null
  }
}

// Get job status
export async function getJobStatus(jobId: string) {
  if (!websiteQueue) return null

  try {
    const job = await websiteQueue.getJob(jobId)
    if (!job) return null

    const state = await job.getState()
    const progress = job.progress

    return {
      id: job.id,
      state,
      progress,
      data: job.data
    }
  } catch (error) {
    console.error('Failed to get job status:', error)
    return null
  }
}

// Initialize worker on startup (call this from your app initialization)
export function startWebsiteWorker() {
  if (!websiteWorker) {
    initWebsiteWorker()
  }
}