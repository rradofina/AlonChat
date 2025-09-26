/**
 * Centralized crawler type definitions
 * All crawler-related interfaces in one place
 */

export interface CrawlResult {
  url: string
  title: string
  content: string
  links: string[]
  images: string[]
  error?: string
}

export interface CrawlProgress {
  current: number
  total: number
  currentUrl: string
  phase: 'discovering' | 'processing'
  discoveredLinks?: string[]
  completedPage?: CrawlResult  // For progressive processing
}

export interface CrawlOptions {
  maxPages?: number
  crawlSubpages?: boolean
  fullPageContent?: boolean
  onProgress?: (progress: CrawlProgress) => void | Promise<void>
}

export interface WebsiteCrawlJob {
  sourceId: string
  agentId: string
  projectId: string
  url: string
  crawlSubpages: boolean
  maxPages: number
}

export interface ProgressiveCrawlOptions {
  sourceId: string
  agentId: string
  projectId: string
  onPageComplete?: (page: CrawlResult, chunkCount: number) => Promise<void>
}

export interface ChunkOptions {
  sourceId: string
  agentId: string
  projectId: string
  content: string
  metadata?: any
  chunkSize?: number
  chunkOverlap?: number
  supabaseClient?: any
}