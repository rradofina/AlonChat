import { Queue, Worker, Job } from 'bullmq'
import { createClient } from '@/lib/supabase/server'
import { UnifiedCrawler } from '@/lib/crawler/unified-crawler'
import { ChunkManager } from '@/lib/services/chunk-manager'
import { getSharedConnection, getWorkerConnection } from './redis-connection'
import { WebsiteCrawlJob } from '@/lib/types/crawler'
import { getEventBus, EventTypes } from '@/lib/infrastructure/events/EventBus'

let websiteQueue: Queue<WebsiteCrawlJob> | null = null
let websiteWorker: Worker<WebsiteCrawlJob> | null = null


// Initialize queue
export function initWebsiteQueue() {
  try {
    const connection = getSharedConnection()
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
    const connection = getWorkerConnection()
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
        concurrency: 2, // Process 2 crawls simultaneously
        limiter: {
          max: 10,
          duration: 1000, // Max 10 jobs per second
        }
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

// Process website crawl job using the new UnifiedCrawler
async function processWebsiteCrawl(job: Job<WebsiteCrawlJob>) {
  const { sourceId, agentId, projectId, url, crawlSubpages, maxPages } = job.data
  const supabase = await createClient()
  const eventBus = getEventBus()

  try {
    // Emit crawl started event
    await eventBus.emit(EventTypes.CRAWL_STARTED, {
      jobId: job.id || '',
      sourceId,
      projectId,
      phase: 'discovering',
      progress: 0,
      currentUrl: url,
      pagesProcessed: 0,
      totalPages: maxPages,
      timestamp: Date.now()
    })

    // Update status to processing
    await supabase
      .from('sources')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', sourceId)

    // Report initial progress
    await job.updateProgress(10)

    // Clear existing chunks before starting
    await ChunkManager.deleteChunks(sourceId)
    console.log(`[WebsiteProcessor] Cleared existing chunks for ${sourceId}`)

    // Initialize UnifiedCrawler with all features
    const crawler = new UnifiedCrawler({
      maxPages,
      crawlSubpages,
      sourceId,
      agentId,
      projectId,
      useCache: true, // Enable caching
      onProgress: async (progress) => {
        // Update job progress
        const progressPercent = Math.floor((progress.current / progress.total) * 80) + 10
        await job.updateProgress(progressPercent)

        // Emit real-time progress event
        await eventBus.emit(EventTypes.CRAWL_PROGRESS, {
          jobId: job.id || '',
          sourceId,
          projectId,
          phase: (progress.phase as any) || 'processing',
          progress: progressPercent,
          currentUrl: progress.currentUrl,
          pagesProcessed: progress.current,
          totalPages: progress.total,
          timestamp: Date.now()
        })

        // Update source metadata
        const { data: source } = await supabase
          .from('sources')
          .select('metadata')
          .eq('id', sourceId)
          .single()

        await supabase
          .from('sources')
          .update({
            metadata: {
              ...source?.metadata,
              pages_crawled: progress.current,
              crawl_progress: {
                current: progress.current,
                total: progress.total,
                currentUrl: progress.currentUrl,
                phase: progress.phase || 'processing'
              },
              discovered_links: progress.discoveredLinks || []
            }
          })
          .eq('id', sourceId)

        console.log(`[WebsiteProcessor] Progress: ${progress.current}/${progress.total} - ${progress.phase}`)
      }
    })

    // Crawl the website
    console.log(`[WebsiteProcessor] Starting crawl for ${url} with UnifiedCrawler`)
    const crawlResults = await crawler.crawlWebsite(url)

    await job.updateProgress(90)

    // Calculate totals
    const validPages = crawlResults.filter(r => !r.error && r.content)
    const totalContent = validPages.reduce((sum, page) => sum + page.content.length, 0)
    const sizeKb = Math.ceil(totalContent / 1024)

    // Get chunk count from database
    const { data: chunks } = await supabase
      .from('source_chunks')
      .select('id')
      .eq('source_id', sourceId)

    const totalChunks = chunks?.length || 0

    // Collect crawl metadata
    const crawledPages = crawlResults.filter(r => !r.error).map(r => r.url)
    const crawlErrors = crawlResults.filter(r => r.error).map(r => ({
      url: r.url,
      error: r.error
    }))

    const allDiscoveredLinks = new Set<string>()
    crawlResults.forEach(result => {
      if (result.links && result.links.length > 0) {
        result.links.forEach(link => allDiscoveredLinks.add(link))
      }
    })
    const discoveredLinks = Array.from(allDiscoveredLinks)

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
          discovered_links: discoveredLinks,
          crawl_errors: crawlErrors,
          total_chunks: totalChunks,
          crawl_completed_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', sourceId)

    await job.updateProgress(100)
    console.log(`Successfully processed ${validPages.length} pages, ${totalChunks} chunks`)

    // Emit crawl completed event
    await eventBus.emit(EventTypes.CRAWL_COMPLETED, {
      jobId: job.id || '',
      sourceId,
      projectId,
      phase: 'completed',
      progress: 100,
      pagesProcessed: validPages.length,
      totalPages: validPages.length,
      timestamp: Date.now()
    })

  } catch (error: any) {
    console.error(`Error processing website crawl:`, error)

    // Emit crawl failed event
    await eventBus.emit(EventTypes.CRAWL_FAILED, {
      jobId: job.id || '',
      sourceId,
      projectId,
      phase: 'failed',
      progress: 0,
      error: error.message,
      pagesProcessed: 0,
      timestamp: Date.now()
    })

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

// Get queue status with positions
export async function getQueueStatus(): Promise<any> {
  if (!websiteQueue) return { isAvailable: false }

  try {
    const waiting = await websiteQueue.getWaitingCount()
    const active = await websiteQueue.getActiveCount()
    const completed = await websiteQueue.getCompletedCount()
    const failed = await websiteQueue.getFailedCount()

    // Get waiting jobs with their positions
    const waitingJobs = await websiteQueue.getWaiting(0, 100)
    const jobPositions: Record<string, number> = {}

    waitingJobs.forEach((job, index) => {
      if (job.data.sourceId) {
        jobPositions[job.data.sourceId] = index + 1
      }
    })

    return {
      waiting,
      active,
      completed,
      failed,
      jobPositions,
      isAvailable: true
    }
  } catch (error) {
    console.error('Failed to get queue status:', error)
    return { isAvailable: false }
  }
}

// Check if queue is available
export function isQueueAvailable(): boolean {
  return websiteQueue !== null
}