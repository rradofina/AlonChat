'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from '@/components/ui/use-toast'

/**
 * Crawl progress state
 */
export interface CrawlProgress {
  jobId: string
  sourceId: string
  phase: 'discovering' | 'processing' | 'completed' | 'failed'
  progress: number
  currentUrl?: string
  pagesProcessed: number
  totalPages?: number
  error?: string
  timestamp: number
  status?: string
}

/**
 * Hook configuration
 */
export interface UseWebsiteCrawlConfig {
  projectId?: string
  sourceId?: string
  onProgress?: (progress: CrawlProgress) => void
  onComplete?: (sourceId: string) => void
  onError?: (error: string, sourceId: string) => void
  autoConnect?: boolean
}

/**
 * React hook for managing website crawl with real-time progress using Supabase Realtime
 */
export function useWebsiteCrawl(config: UseWebsiteCrawlConfig = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [crawlProgress, setCrawlProgress] = useState<Map<string, CrawlProgress>>(new Map())
  const [activeCrawls, setActiveCrawls] = useState<Set<string>>(new Set())
  const channelRef = useRef<any>(null)
  const supabase = createClientComponentClient()

  /**
   * Connect to real-time updates
   */
  const connect = useCallback(async () => {
    // Create a channel for crawl progress updates
    const channelName = config.sourceId ? `crawl-${config.sourceId}` : `crawl-project-${config.projectId || 'global'}`

    const channel = supabase.channel(channelName)

    channel
      .on('broadcast', { event: 'crawl_progress' }, (payload) => {
        const data = payload.payload as CrawlProgress
        console.log('[useWebsiteCrawl] Progress update:', data)

        // Handle different statuses
        if (data.status === 'started') {
          setCrawlProgress(prev => {
            const updated = new Map(prev)
            updated.set(data.sourceId, { ...data, phase: 'discovering', progress: 0 })
            return updated
          })

          setActiveCrawls(prev => {
            const updated = new Set(prev)
            updated.add(data.sourceId)
            return updated
          })

          toast({
            title: 'Crawl Started',
            description: 'Starting to crawl website...',
          })
        } else if (data.status === 'progress') {
          setCrawlProgress(prev => {
            const updated = new Map(prev)
            updated.set(data.sourceId, data)
            return updated
          })

          setActiveCrawls(prev => {
            const updated = new Set(prev)
            updated.add(data.sourceId)
            return updated
          })

          config.onProgress?.(data)
        } else if (data.status === 'completed') {
          setCrawlProgress(prev => {
            const updated = new Map(prev)
            updated.set(data.sourceId, { ...data, phase: 'completed', progress: 100 })
            return updated
          })

          setActiveCrawls(prev => {
            const updated = new Set(prev)
            updated.delete(data.sourceId)
            return updated
          })

          toast({
            title: 'Crawl Completed',
            description: `Successfully crawled ${data.pagesProcessed} pages`,
          })

          config.onComplete?.(data.sourceId)
        } else if (data.status === 'failed') {
          setCrawlProgress(prev => {
            const updated = new Map(prev)
            updated.set(data.sourceId, { ...data, phase: 'failed', progress: 0 })
            return updated
          })

          setActiveCrawls(prev => {
            const updated = new Set(prev)
            updated.delete(data.sourceId)
            return updated
          })

          toast({
            title: 'Crawl Failed',
            description: data.error || 'An error occurred during crawling',
            variant: 'destructive',
          })

          config.onError?.(data.error || 'Crawl failed', data.sourceId)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useWebsiteCrawl] Connected to real-time updates')
          setIsConnected(true)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[useWebsiteCrawl] Channel error')
          toast({
            title: 'Connection Error',
            description: 'Failed to connect to real-time updates',
            variant: 'destructive',
          })
          setIsConnected(false)
        } else if (status === 'CLOSED') {
          console.log('[useWebsiteCrawl] Disconnected from real-time updates')
          setIsConnected(false)
        }
      })

    channelRef.current = channel
  }, [config.sourceId, config.projectId, config.onProgress, config.onComplete, config.onError, supabase])

  /**
   * Disconnect from real-time updates
   */
  const disconnect = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    setIsConnected(false)
  }, [supabase])

  /**
   * Start a website crawl
   */
  const startCrawl = useCallback(async (
    url: string,
    options: {
      sourceId: string
      agentId: string
      projectId: string
      maxPages?: number
      crawlSubpages?: boolean
    }
  ): Promise<string | null> => {
    try {
      const response = await fetch('/api/agents/' + options.agentId + '/sources/website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          max_pages: options.maxPages || 200,
          crawl_subpages: options.crawlSubpages ?? true,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error)
      }

      const data = await response.json()

      // Mark as active immediately
      setActiveCrawls(prev => {
        const updated = new Set(prev)
        updated.add(options.sourceId)
        return updated
      })

      toast({
        title: 'Crawl Queued',
        description: 'Your website crawl has been queued for processing',
      })

      return data.jobId || data.id
    } catch (error: any) {
      console.error('[useWebsiteCrawl] Failed to start crawl:', error)
      toast({
        title: 'Failed to Start Crawl',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      })
      return null
    }
  }, [])

  /**
   * Get progress for a specific source
   */
  const getProgress = useCallback((sourceId: string): CrawlProgress | undefined => {
    return crawlProgress.get(sourceId)
  }, [crawlProgress])

  /**
   * Check if a source is currently crawling
   */
  const isCrawling = useCallback((sourceId: string): boolean => {
    return activeCrawls.has(sourceId)
  }, [activeCrawls])

  /**
   * Clear progress for a source
   */
  const clearProgress = useCallback((sourceId: string) => {
    setCrawlProgress(prev => {
      const updated = new Map(prev)
      updated.delete(sourceId)
      return updated
    })

    setActiveCrawls(prev => {
      const updated = new Set(prev)
      updated.delete(sourceId)
      return updated
    })
  }, [])

  /**
   * Clear all progress
   */
  const clearAllProgress = useCallback(() => {
    setCrawlProgress(new Map())
    setActiveCrawls(new Set())
  }, [])

  // Auto-connect on mount if configured
  useEffect(() => {
    if (config.autoConnect !== false) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, []) // Only run on mount/unmount

  // Reconnect when config changes
  useEffect(() => {
    if (isConnected) {
      disconnect()
      connect()
    }
  }, [config.projectId, config.sourceId])

  return {
    // State
    isConnected,
    crawlProgress: Array.from(crawlProgress.values()),
    activeCrawls: Array.from(activeCrawls),

    // Actions
    connect,
    disconnect,
    startCrawl,

    // Queries
    getProgress,
    isCrawling,

    // Utilities
    clearProgress,
    clearAllProgress,
  }
}