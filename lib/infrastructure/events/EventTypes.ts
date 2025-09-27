import { z } from 'zod'

// Event type definitions with Zod schemas for type safety
export const CrawlProgressEvent = z.object({
  jobId: z.string(),
  sourceId: z.string(),
  projectId: z.string(),
  phase: z.enum(['discovering', 'processing', 'completed', 'failed']),
  progress: z.number().min(0).max(100),
  currentUrl: z.string().optional(),
  pagesProcessed: z.number().default(0),
  totalPages: z.number().optional(),
  error: z.string().optional(),
  timestamp: z.number().optional()
})

export const ChunkProgressEvent = z.object({
  jobId: z.string(),
  sourceId: z.string(),
  projectId: z.string(),
  chunksCreated: z.number(),
  totalChunks: z.number().optional(),
  progress: z.number().min(0).max(100),
  timestamp: z.number().optional()
})

export const EmbedProgressEvent = z.object({
  jobId: z.string(),
  sourceId: z.string(),
  projectId: z.string(),
  chunksEmbedded: z.number(),
  totalChunks: z.number(),
  tokensUsed: z.number(),
  estimatedCost: z.number(),
  progress: z.number().min(0).max(100),
  timestamp: z.number().optional()
})

// Event type mapping
export const EventTypes = {
  CRAWL_PROGRESS: 'crawl:progress',
  CRAWL_STARTED: 'crawl:started',
  CRAWL_COMPLETED: 'crawl:completed',
  CRAWL_FAILED: 'crawl:failed',

  CHUNK_PROGRESS: 'chunk:progress',
  CHUNK_STARTED: 'chunk:started',
  CHUNK_COMPLETED: 'chunk:completed',
  CHUNK_FAILED: 'chunk:failed',

  EMBED_PROGRESS: 'embed:progress',
  EMBED_STARTED: 'embed:started',
  EMBED_COMPLETED: 'embed:completed',
  EMBED_FAILED: 'embed:failed',

  FILE_UPLOAD_PROGRESS: 'file:upload:progress',
  FILE_UPLOAD_COMPLETED: 'file:upload:completed',
  FILE_UPLOAD_FAILED: 'file:upload:failed',

  AGENT_TRAINING_STARTED: 'agent:training:started',
  AGENT_TRAINING_PROGRESS: 'agent:training:progress',
  AGENT_TRAINING_COMPLETED: 'agent:training:completed',
  AGENT_TRAINING_FAILED: 'agent:training:failed'
} as const

// Type infers
export type CrawlProgressEventType = z.infer<typeof CrawlProgressEvent>
export type ChunkProgressEventType = z.infer<typeof ChunkProgressEvent>
export type EmbedProgressEventType = z.infer<typeof EmbedProgressEvent>

// Event data type mapping
export type EventDataMap = {
  [EventTypes.CRAWL_PROGRESS]: CrawlProgressEventType
  [EventTypes.CRAWL_STARTED]: CrawlProgressEventType
  [EventTypes.CRAWL_COMPLETED]: CrawlProgressEventType
  [EventTypes.CRAWL_FAILED]: CrawlProgressEventType
  [EventTypes.CHUNK_PROGRESS]: ChunkProgressEventType
  [EventTypes.CHUNK_STARTED]: ChunkProgressEventType
  [EventTypes.CHUNK_COMPLETED]: ChunkProgressEventType
  [EventTypes.CHUNK_FAILED]: ChunkProgressEventType
  [EventTypes.EMBED_PROGRESS]: EmbedProgressEventType
  [EventTypes.EMBED_STARTED]: EmbedProgressEventType
  [EventTypes.EMBED_COMPLETED]: EmbedProgressEventType
  [EventTypes.EMBED_FAILED]: EmbedProgressEventType
}