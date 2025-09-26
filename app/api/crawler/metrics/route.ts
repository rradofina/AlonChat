import { NextResponse } from 'next/server'
import { BrowserPool } from '@/lib/crawler/browser-pool'
import { CrawlCache } from '@/lib/crawler/cache-manager'
import { getQueueStatus } from '@/lib/queue/website-processor'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Comprehensive metrics endpoint for crawler monitoring
 * Provides real-time stats on all crawler subsystems
 */
export async function GET() {
  try {
    const supabase = createServiceClient()

    // Get browser pool stats
    const browserPool = BrowserPool.getInstance()
    const poolStats = browserPool.getStats()

    // Get cache stats
    const cache = CrawlCache.getInstance()
    const cacheStats = cache.getStats()

    // Get queue stats
    const queueStats = await getQueueStatus()

    // Get recent crawl performance from database
    const { data: recentCrawls } = await supabase
      .from('sources')
      .select('created_at, metadata, chunk_count, size_kb')
      .eq('type', 'website')
      .order('created_at', { ascending: false })
      .limit(10)

    // Calculate averages
    const avgChunksPerCrawl = recentCrawls
      ? recentCrawls.reduce((sum, c) => sum + (c.chunk_count || 0), 0) / recentCrawls.length
      : 0

    const avgSizePerCrawl = recentCrawls
      ? recentCrawls.reduce((sum, c) => sum + (c.size_kb || 0), 0) / recentCrawls.length
      : 0

    // Get total chunks in system
    const { count: totalChunks } = await supabase
      .from('source_chunks')
      .select('*', { count: 'exact', head: true })

    // Get active crawls
    const { data: activeCrawls } = await supabase
      .from('sources')
      .select('id, url, status')
      .eq('status', 'processing')
      .eq('type', 'website')

    // Memory usage estimate
    const memoryUsage = process.memoryUsage()
    const memoryStats = {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    }

    // Compile all metrics
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        memory: memoryStats,
        uptime: Math.round(process.uptime()),
      },
      crawler: {
        browserPool: {
          browsers: poolStats.browsers,
          maxBrowsers: poolStats.maxBrowsers,
          activeContexts: poolStats.contexts,
          maxContextsPerBrowser: poolStats.maxContextsPerBrowser,
          utilization: `${Math.round((poolStats.contexts / (poolStats.maxBrowsers * poolStats.maxContextsPerBrowser)) * 100)}%`
        },
        cache: {
          entriesInMemory: cacheStats.memoryCacheSize,
          maxMemorySize: cacheStats.maxMemoryCacheSize,
          cacheHitRate: 'Not tracked yet', // Could add hit/miss tracking
        },
        queue: {
          waiting: queueStats.waiting || 0,
          active: queueStats.active || 0,
          completed: queueStats.completed || 0,
          failed: queueStats.failed || 0,
          isAvailable: queueStats.isAvailable
        },
        performance: {
          activeCrawls: activeCrawls?.length || 0,
          avgChunksPerCrawl: Math.round(avgChunksPerCrawl),
          avgSizeKbPerCrawl: Math.round(avgSizePerCrawl),
          totalChunksInSystem: totalChunks || 0,
          recentCrawlsAnalyzed: recentCrawls?.length || 0
        }
      },
      health: {
        status: determineHealthStatus(poolStats, queueStats, memoryStats),
        warnings: getHealthWarnings(poolStats, queueStats, memoryStats)
      }
    }

    return NextResponse.json(metrics)

  } catch (error: any) {
    console.error('Metrics error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * Determine overall system health
 */
function determineHealthStatus(poolStats: any, queueStats: any, memoryStats: any): string {
  // Check critical thresholds
  if (memoryStats.heapUsed > memoryStats.heapTotal * 0.9) {
    return 'critical'
  }

  if (queueStats.failed > 10) {
    return 'degraded'
  }

  if (poolStats.browsers >= poolStats.maxBrowsers) {
    return 'busy'
  }

  return 'healthy'
}

/**
 * Get health warnings
 */
function getHealthWarnings(poolStats: any, queueStats: any, memoryStats: any): string[] {
  const warnings: string[] = []

  if (memoryStats.heapUsed > memoryStats.heapTotal * 0.8) {
    warnings.push('High memory usage detected')
  }

  if (poolStats.browsers >= poolStats.maxBrowsers * 0.8) {
    warnings.push('Browser pool near capacity')
  }

  if (queueStats.failed > 5) {
    warnings.push(`${queueStats.failed} failed jobs in queue`)
  }

  if (queueStats.waiting > 50) {
    warnings.push('High queue backlog')
  }

  return warnings
}