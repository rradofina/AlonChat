import { Queue, Worker, Job } from 'bullmq'
import IORedis from 'ioredis'
import { createClient } from '@/lib/supabase/server'
import { scrapeWebsite } from '@/lib/sources/website-scraper'
import { chunkWebsiteContent } from '@/lib/sources/chunker'

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

    // Update pages crawled count with crawled pages list
    const crawledPages = crawlResults.filter(r => !r.error).map(r => r.url)
    await supabase
      .from('sources')
      .update({
        metadata: {
          url,
          crawl_subpages: crawlSubpages,
          max_pages: maxPages,
          pages_crawled: crawlResults.length,
          crawled_pages: crawledPages,
          crawl_errors: crawlResults.filter(r => r.error).map(r => ({
            url: r.url,
            error: r.error
          }))
        }
      })
      .eq('id', sourceId)

    // Process and chunk content
    const validPages = crawlResults.filter(r => !r.error && r.content)
    if (validPages.length === 0) {
      throw new Error('No valid pages found to process')
    }

    console.log(`Processing ${validPages.length} pages`)
    const chunks = await chunkWebsiteContent(validPages)

    await job.updateProgress(80)

    // Calculate total size
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0)

    // Insert chunks into database
    const { error: insertError } = await supabase
      .from('documents')
      .insert(
        chunks.map((chunk, index) => ({
          source_id: sourceId,
          agent_id: agentId,
          project_id: projectId,
          content: chunk.content,
          embedding: chunk.embedding || null,
          metadata: chunk.metadata,
          chunk_index: index
        }))
      )

    if (insertError) {
      throw new Error(`Failed to insert chunks: ${insertError.message}`)
    }

    // Update source status to ready
    await supabase
      .from('sources')
      .update({
        status: 'ready',
        size_kb: Math.ceil(totalSize / 1024),
        metadata: {
          url,
          crawl_subpages: crawlSubpages,
          max_pages: maxPages,
          pages_crawled: validPages.length,
          crawled_pages: validPages.map(p => p.url),
          total_chunks: chunks.length,
          crawl_completed_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', sourceId)

    await job.updateProgress(100)
    console.log(`Successfully processed ${validPages.length} pages, ${chunks.length} chunks`)

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