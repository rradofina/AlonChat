import { Clock, Loader2 } from 'lucide-react'
import { WebsiteSource } from '../hooks/useWebsiteSources'

interface WebsiteSourceStatusProps {
  source: WebsiteSource
}

export function WebsiteSourceStatus({ source }: WebsiteSourceStatusProps) {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  if (source.status === 'queued') {
    return (
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Queued
        </span>
        {source.queue_position && (
          <span className="text-xs text-gray-600">
            Position {source.queue_position} in queue
          </span>
        )}
      </div>
    )
  }

  if (source.status === 'pending' || source.status === 'processing') {
    const progress = source.progress || source.metadata?.crawl_progress

    return (
      <>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </span>
          <span className="text-xs text-gray-600 flex items-center gap-1">
            {progress ? (
              <>
                {(() => {
                  const discoveredCount = progress.discoveredLinks?.length ||
                    source.metadata?.discovered_links?.length || 0
                  const crawledCount = progress.current || 0
                  const queuedCount = progress.queueLength || progress.total || 0
                  const totalInProgress = crawledCount + queuedCount

                  if (progress.phase === 'discovering') {
                    return `Discovering links... (found ${discoveredCount})`
                  }

                  return `${totalInProgress} Links (${crawledCount} Crawled, ${queuedCount} Pending)`
                })()}
              </>
            ) : (
              'Starting crawl...'
            )}
          </span>
          {progress?.averageTimePerPage && (
            <span className="text-xs text-gray-400">
              (~{Math.ceil(
                ((progress.total - progress.current) * progress.averageTimePerPage) / 1000
              )}s remaining)
            </span>
          )}
        </div>
        {progress?.currentUrl && (
          <span className="text-xs text-gray-400 truncate" title={progress.currentUrl}>
            Current: {new URL(progress.currentUrl).pathname}
          </span>
        )}
      </>
    )
  }

  if (source.status === 'ready') {
    return (
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
          Ready
        </span>
        <span className="text-xs text-gray-500">
          Last crawled {formatTimeAgo(source.created_at)} •
          Links: {source.pages_crawled || source.metadata?.pages_crawled || 0}
        </span>
      </div>
    )
  }

  if (source.status === 'error') {
    return (
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded">
          Failed
        </span>
        <span className="text-xs text-gray-500">
          {source.metadata?.error_message || 'Crawl failed'}
        </span>
      </div>
    )
  }

  return null
}