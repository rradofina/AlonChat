'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RealtimeGateway } from '@/lib/infrastructure/realtime/RealtimeGateway'
import { EventTypes } from '@/lib/infrastructure/events/EventTypes'
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
 * React hook for managing website crawl with real-time progress
 */
export function useWebsiteCrawl(config: UseWebsiteCrawlConfig = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [crawlProgress, setCrawlProgress] = useState<Map<string, CrawlProgress>>(new Map())
  const [activeCrawls, setActiveCrawls] = useState<Set<string>>(new Set())
  const gatewayRef = useRef<RealtimeGateway | null>(null)
  const unsubscribersRef = useRef<Array<() => void>>([])

  /**
   * Initialize real-time gateway
   */
  const initializeGateway = useCallback(() => {
    if (gatewayRef.current) {
      return gatewayRef.current
    }

    const gateway = new RealtimeGateway({
      projectId: config.projectId,
      sourceId: config.sourceId,
      eventTypes: ['crawl'],
      onConnect: () => {
        console.log('[useWebsiteCrawl] Connected to real-time updates')
        setIsConnected(true)
      },
      onDisconnect: () => {
        console.log('[useWebsiteCrawl] Disconnected from real-time updates')
        setIsConnected(false)
      },
      onError: (error) => {
        console.error('[useWebsiteCrawl] Real-time error:', error)
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to real-time updates. Retrying...',
          variant: 'destructive',
        })
      },
    })

    gatewayRef.current = gateway
    return gateway
  }, [config.projectId, config.sourceId])

  /**
   * Connect to real-time updates
   */
  const connect = useCallback(async () => {
    const gateway = initializeGateway()

    try {
      await gateway.connect()

      // Subscribe to crawl events
      const unsubProgress = gateway.on(EventTypes.CRAWL_PROGRESS, (data: CrawlProgress) => {
        console.log('[useWebsiteCrawl] Progress update:', data)

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
      })

      const unsubCompleted = gateway.on(EventTypes.CRAWL_COMPLETED, (data: CrawlProgress) => {
        console.log('[useWebsiteCrawl] Crawl completed:', data)

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
      })

      const unsubFailed = gateway.on(EventTypes.CRAWL_FAILED, (data: CrawlProgress) => {
        console.error('[useWebsiteCrawl] Crawl failed:', data)

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
      })

      const unsubStarted = gateway.on(EventTypes.CRAWL_STARTED, (data: CrawlProgress) => {
        console.log('[useWebsiteCrawl] Crawl started:', data)

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
      })

      // Store unsubscribers
      unsubscribersRef.current = [unsubProgress, unsubCompleted, unsubFailed, unsubStarted]

    } catch (error) {
      console.error('[useWebsiteCrawl] Failed to connect:', error)
      toast({
        title: 'Connection Failed',
        description: 'Could not establish real-time connection',
        variant: 'destructive',
      })
    }
  }, [initializeGateway, config])

  /**
   * Disconnect from real-time updates
   */
  const disconnect = useCallback(() => {
    // Unsubscribe from all events
    unsubscribersRef.current.forEach(unsub => {
      try {
        unsub()
      } catch (error) {
        console.error('[useWebsiteCrawl] Error unsubscribing:', error)
      }
    })
    unsubscribersRef.current = []

    // Disconnect gateway
    if (gatewayRef.current) {
      gatewayRef.current.disconnect()
      gatewayRef.current = null
    }

    setIsConnected(false)
  }, [])

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
    } catch (error) {
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

  // Update gateway config when props change
  useEffect(() => {
    if (gatewayRef.current && isConnected) {
      gatewayRef.current.updateConfig({
        projectId: config.projectId,
        sourceId: config.sourceId,
      })
    }
  }, [config.projectId, config.sourceId, isConnected])

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