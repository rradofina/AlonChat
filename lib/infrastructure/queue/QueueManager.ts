import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq'
import { z } from 'zod'
import { getSharedConnection, getWorkerConnection } from '@/lib/queue/redis-connection'

/**
 * Job schemas for type safety
 */
export const WebsiteCrawlJobSchema = z.object({
  sourceId: z.string().uuid(),
  agentId: z.string().uuid(),
  projectId: z.string().uuid(),
  url: z.string().url(),
  crawlSubpages: z.boolean().default(true),
  maxPages: z.number().min(1).max(10000).default(200),
  includePaths: z.array(z.string()).optional(),
  excludePaths: z.array(z.string()).optional(),
  slowScraping: z.boolean().optional(),
  fullPageContent: z.boolean().optional(),
})

export const ChunkJobSchema = z.object({
  sourceId: z.string().uuid(),
  agentId: z.string().uuid(),
  projectId: z.string().uuid(),
  content: z.string(),
  sourceType: z.enum(['website', 'file', 'text', 'qna']),
  metadata: z.record(z.any()).optional(),
})

export const EmbedJobSchema = z.object({
  chunkIds: z.array(z.string().uuid()),
  projectId: z.string().uuid(),
  model: z.string().default('text-embedding-ada-002'),
  batchSize: z.number().min(1).max(100).default(50),
})

export const AdvancedTrainingJobSchema = z.object({
  sourceId: z.string().uuid(),
  projectId: z.string().uuid(),
  uploadedBy: z.string().uuid(),
  storagePath: z.string(),
  archiveType: z.enum(['messenger', 'whatsapp', 'telegram']),
})

export const IntegrationJobSchema = z.object({
  type: z.enum(['webhook', 'sync', 'notification']),
  integration: z.enum(['messenger', 'calendar', 'payment', 'email']),
  projectId: z.string().uuid(),
  payload: z.record(z.any()),
  retryCount: z.number().default(0),
})

// Export job types
export type WebsiteCrawlJob = z.infer<typeof WebsiteCrawlJobSchema>
export type ChunkJob = z.infer<typeof ChunkJobSchema>
export type EmbedJob = z.infer<typeof EmbedJobSchema>
export type AdvancedTrainingJob = z.infer<typeof AdvancedTrainingJobSchema>
export type IntegrationJob = z.infer<typeof IntegrationJobSchema>

/**
 * Queue names enumeration
 */
export enum QueueNames {
  WEBSITE_CRAWL = 'website-crawl',
  CHUNK = 'chunk',
  EMBED = 'embed',
  ADVANCED_TRAINING = 'advanced-training',
  INTEGRATION = 'integration',
  RETRY = 'retry',
}

/**
 * Queue configuration
 */
interface QueueConfig {
  attempts?: number
  backoff?: {
    type: 'fixed' | 'exponential'
    delay: number
  }
  removeOnComplete?: boolean | number
  removeOnFail?: boolean | number
}

/**
 * Worker configuration
 */
interface WorkerConfig {
  concurrency?: number
  limiter?: {
    max: number
    duration: number
  }
}

/**
 * Centralized Queue Manager for all job queues
 * Manages BullMQ queues with Redis backing
 */
export class QueueManager {
  private static instance: QueueManager | null = null
  private queues: Map<QueueNames, Queue> = new Map()
  private workers: Map<QueueNames, Worker> = new Map()
  private connected: boolean = false

  // Default queue configurations
  private readonly defaultQueueConfigs: Record<QueueNames, QueueConfig> = {
    [QueueNames.WEBSITE_CRAWL]: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
    [QueueNames.CHUNK]: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
    [QueueNames.EMBED]: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
    [QueueNames.ADVANCED_TRAINING]: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: 50,
      removeOnFail: false,
    },
    [QueueNames.INTEGRATION]: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
    [QueueNames.RETRY]: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: true,
      removeOnFail: true,
    },
  }

  // Default worker configurations
  private readonly defaultWorkerConfigs: Record<QueueNames, WorkerConfig> = {
    [QueueNames.WEBSITE_CRAWL]: {
      concurrency: 2,
      limiter: { max: 10, duration: 1000 },
    },
    [QueueNames.CHUNK]: {
      concurrency: 5,
      limiter: { max: 20, duration: 1000 },
    },
    [QueueNames.EMBED]: {
      concurrency: 1, // Rate limited by API
      limiter: { max: 5, duration: 1000 },
    },
    [QueueNames.ADVANCED_TRAINING]: {
      concurrency: 2,
      limiter: { max: 5, duration: 1000 },
    },
    [QueueNames.INTEGRATION]: {
      concurrency: 3,
      limiter: { max: 15, duration: 1000 },
    },
    [QueueNames.RETRY]: {
      concurrency: 1,
      limiter: { max: 5, duration: 1000 },
    },
  }

  private constructor() {
    this.initializeQueues()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager()
    }
    return QueueManager.instance
  }

  /**
   * Initialize all queues
   */
  private async initializeQueues(): Promise<void> {
    const connection = getSharedConnection()

    if (!connection) {
      console.warn('[QueueManager] Redis connection not available')
      return
    }

    try {
      for (const queueName of Object.values(QueueNames)) {
        const queue = new Queue(queueName, {
          connection,
          defaultJobOptions: this.defaultQueueConfigs[queueName],
        } as QueueOptions)

        this.queues.set(queueName, queue)
        console.log(`[QueueManager] Initialized queue: ${queueName}`)
      }

      this.connected = true
    } catch (error) {
      console.error('[QueueManager] Failed to initialize queues:', error)
      this.connected = false
    }
  }

  /**
   * Create a worker for a specific queue
   */
  createWorker<T>(
    queueName: QueueNames,
    processor: (job: Job<T>) => Promise<any>,
    config?: Partial<WorkerConfig>
  ): Worker<T> | null {
    const connection = getWorkerConnection()

    if (!connection) {
      console.warn(`[QueueManager] Cannot create worker for ${queueName}: Redis not available`)
      return null
    }

    try {
      const workerConfig = {
        ...this.defaultWorkerConfigs[queueName],
        ...config,
      }

      const worker = new Worker<T>(
        queueName,
        processor,
        {
          connection,
          ...workerConfig,
        } as WorkerOptions
      )

      // Set up event handlers
      worker.on('completed', (job) => {
        console.log(`[QueueManager] Job ${job.id} completed in ${queueName}`)
      })

      worker.on('failed', (job, err) => {
        console.error(`[QueueManager] Job ${job?.id} failed in ${queueName}:`, err.message)
      })

      worker.on('error', (err) => {
        console.error(`[QueueManager] Worker error in ${queueName}:`, err)
      })

      this.workers.set(queueName, worker as Worker)
      console.log(`[QueueManager] Created worker for queue: ${queueName}`)

      return worker
    } catch (error) {
      console.error(`[QueueManager] Failed to create worker for ${queueName}:`, error)
      return null
    }
  }

  /**
   * Add a website crawl job
   */
  async addWebsiteCrawlJob(data: WebsiteCrawlJob): Promise<string | null> {
    const validatedData = WebsiteCrawlJobSchema.parse(data)
    const queue = this.queues.get(QueueNames.WEBSITE_CRAWL)

    if (!queue) {
      console.error('[QueueManager] Website crawl queue not available')
      return null
    }

    try {
      const job = await queue.add('crawl', validatedData, {
        jobId: `crawl-${validatedData.sourceId}`,
      })
      console.log(`[QueueManager] Added website crawl job: ${job.id}`)
      return job.id || null
    } catch (error) {
      console.error('[QueueManager] Failed to add website crawl job:', error)
      return null
    }
  }

  /**
   * Add a chunk job
   */
  async addChunkJob(data: ChunkJob): Promise<string | null> {
    const validatedData = ChunkJobSchema.parse(data)
    const queue = this.queues.get(QueueNames.CHUNK)

    if (!queue) {
      console.error('[QueueManager] Chunk queue not available')
      return null
    }

    try {
      const job = await queue.add('chunk', validatedData)
      console.log(`[QueueManager] Added chunk job: ${job.id}`)
      return job.id || null
    } catch (error) {
      console.error('[QueueManager] Failed to add chunk job:', error)
      return null
    }
  }

  /**
   * Add an embedding job
   */
  async addEmbedJob(data: EmbedJob): Promise<string | null> {
    const validatedData = EmbedJobSchema.parse(data)
    const queue = this.queues.get(QueueNames.EMBED)

    if (!queue) {
      console.error('[QueueManager] Embed queue not available')
      return null
    }

    try {
      const job = await queue.add('embed', validatedData, {
        priority: 1, // Higher priority for smaller batches
      })
      console.log(`[QueueManager] Added embed job: ${job.id}`)
      return job.id || null
    } catch (error) {
      console.error('[QueueManager] Failed to add embed job:', error)
      return null
    }
  }

  /**
   * Add an advanced training job
   */
  async addAdvancedTrainingJob(data: AdvancedTrainingJob): Promise<string | null> {
    const validatedData = AdvancedTrainingJobSchema.parse(data)
    const queue = this.queues.get(QueueNames.ADVANCED_TRAINING)

    if (!queue) {
      console.error('[QueueManager] Advanced training queue not available')
      return null
    }

    try {
      const job = await queue.add('train', validatedData)
      console.log(`[QueueManager] Added advanced training job: ${job.id}`)
      return job.id || null
    } catch (error) {
      console.error('[QueueManager] Failed to add advanced training job:', error)
      return null
    }
  }

  /**
   * Add an integration job
   */
  async addIntegrationJob(data: IntegrationJob): Promise<string | null> {
    const validatedData = IntegrationJobSchema.parse(data)
    const queue = this.queues.get(QueueNames.INTEGRATION)

    if (!queue) {
      console.error('[QueueManager] Integration queue not available')
      return null
    }

    try {
      const job = await queue.add(validatedData.type, validatedData, {
        delay: validatedData.type === 'notification' ? 1000 : undefined,
      })
      console.log(`[QueueManager] Added integration job: ${job.id}`)
      return job.id || null
    } catch (error) {
      console.error('[QueueManager] Failed to add integration job:', error)
      return null
    }
  }

  /**
   * Get job by ID
   */
  async getJob(queueName: QueueNames, jobId: string): Promise<Job | null> {
    const queue = this.queues.get(queueName)
    if (!queue) return null

    try {
      return await queue.getJob(jobId)
    } catch (error) {
      console.error(`[QueueManager] Failed to get job ${jobId} from ${queueName}:`, error)
      return null
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: QueueNames): Promise<any> {
    const queue = this.queues.get(queueName)

    if (!queue) {
      return { available: false, queueName }
    }

    try {
      const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
        queue.getPausedCount(),
      ])

      return {
        available: true,
        queueName,
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused,
        total: waiting + active + completed + failed + delayed + paused,
      }
    } catch (error) {
      console.error(`[QueueManager] Failed to get stats for ${queueName}:`, error)
      return { available: false, queueName, error: error.message }
    }
  }

  /**
   * Get all queue statistics
   */
  async getAllQueueStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {}

    for (const queueName of Object.values(QueueNames)) {
      stats[queueName] = await this.getQueueStats(queueName)
    }

    return stats
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: QueueNames): Promise<void> {
    const queue = this.queues.get(queueName)
    if (queue) {
      await queue.pause()
      console.log(`[QueueManager] Paused queue: ${queueName}`)
    }
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: QueueNames): Promise<void> {
    const queue = this.queues.get(queueName)
    if (queue) {
      await queue.resume()
      console.log(`[QueueManager] Resumed queue: ${queueName}`)
    }
  }

  /**
   * Clean completed jobs
   */
  async cleanQueue(
    queueName: QueueNames,
    grace: number = 0,
    limit: number = 100,
    status: 'completed' | 'failed' = 'completed'
  ): Promise<string[]> {
    const queue = this.queues.get(queueName)
    if (!queue) return []

    try {
      return await queue.clean(grace, limit, status)
    } catch (error) {
      console.error(`[QueueManager] Failed to clean ${queueName}:`, error)
      return []
    }
  }

  /**
   * Gracefully shutdown all queues and workers
   */
  async shutdown(): Promise<void> {
    console.log('[QueueManager] Shutting down...')

    // Close all workers
    for (const [name, worker] of this.workers.entries()) {
      await worker.close()
      console.log(`[QueueManager] Closed worker: ${name}`)
    }

    // Close all queues
    for (const [name, queue] of this.queues.entries()) {
      await queue.close()
      console.log(`[QueueManager] Closed queue: ${name}`)
    }

    this.workers.clear()
    this.queues.clear()
    this.connected = false

    console.log('[QueueManager] Shutdown complete')
  }

  /**
   * Check if queue manager is connected
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * Get queue by name
   */
  getQueue(queueName: QueueNames): Queue | undefined {
    return this.queues.get(queueName)
  }

  /**
   * Get worker by name
   */
  getWorker(queueName: QueueNames): Worker | undefined {
    return this.workers.get(queueName)
  }
}

// Export singleton instance
export const queueManager = QueueManager.getInstance()