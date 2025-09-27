'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Globe, CheckCircle, AlertCircle, Loader2, MoreHorizontal, Trash2, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'

interface SubLink {
  url: string
  title?: string
  status: 'included' | 'excluded'
  crawled: boolean
}

interface WebsiteSource {
  id: string
  name: string
  url: string
  status: string
  pages_crawled: number
  max_pages: number
  created_at: string
  sub_links?: SubLink[]
  metadata?: any
  agent_id?: string
}

interface WebsiteViewerProps {
  website: WebsiteSource
  subLink?: SubLink | null
  onBack: () => void
}

export function WebsiteViewer({ website, subLink, onBack }: WebsiteViewerProps) {
  const [content, setContent] = useState<string>('')
  const [isLoadingContent, setIsLoadingContent] = useState(true)

  useEffect(() => {
    // Fetch content from API
    const fetchContent = async () => {
      if (!website.id) {
        setIsLoadingContent(false)
        return
      }

      try {
        setIsLoadingContent(true)
        const agentId = website.agent_id || window.location.pathname.split('/')[3]
        const response = await fetch(`/api/agents/${agentId}/sources/${website.id}/content`)
        const data = await response.json()

        if (data.content) {
          setContent(data.content)
        }
      } catch (error) {
        console.error('Error fetching content:', error)
      } finally {
        setIsLoadingContent(false)
      }
    }

    fetchContent()
  }, [website.id, website.agent_id])

  const getStatusIcon = () => {
    switch (website.status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'error':
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusText = () => {
    switch (website.status) {
      case 'ready':
        return 'Ready'
      case 'pending':
        return 'Pending'
      case 'processing':
        return 'Processing...'
      case 'error':
      case 'failed':
        return 'Failed'
      default:
        return 'Unknown'
    }
  }

  const statusBadgeClasses = (() => {
    switch (website.status) {
      case 'ready':
        return 'bg-green-50 text-green-700 border border-green-300'
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-300'
      case 'processing':
        return 'bg-blue-50 text-blue-700 border border-blue-300'
      case 'error':
      case 'failed':
        return 'bg-red-50 text-red-700 border border-red-300'
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-300'
    }
  })()

  const displayUrl = subLink?.url || website.url

  return (
    <div className="flex h-full bg-white">
      <div className="flex-1 flex flex-col">
        {/* Header Bar */}
        <div className="bg-white border-b px-6 py-3">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-3">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors w-fit"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to websites
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <span className="text-lg font-semibold text-gray-900 break-all">{displayUrl}</span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClasses}`}>
                    {getStatusIcon()}
                    {getStatusText()}
                  </span>
                  {website.pages_crawled > 0 && (
                    <>
                      <span>•</span>
                      <span>{website.pages_crawled} pages crawled</span>
                    </>
                  )}
                  {subLink && (
                    <>
                      <span>•</span>
                      <span className="text-xs">
                        {subLink.status === 'included' ? 'Included' : 'Excluded'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-gray-900">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Website actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    // TODO: Wire up re-crawl action
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Re-crawl website
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    // TODO: Wire up delete action
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete website
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
          <div className="w-full">
            {isLoadingContent ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <div className="space-y-4">
                  <Skeleton className="h-7 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/6" />
                  <div className="pt-4">
                    <Skeleton className="h-7 w-2/3" />
                    <div className="mt-3 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                </div>
              </div>
            ) : content ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <div className="mb-4 text-xs uppercase tracking-wide text-gray-400">
                  {displayUrl}
                </div>
                <div>
                  <pre className="leading-7 text-gray-800 whitespace-pre-wrap font-sans text-[0.95rem]">
                    {content}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-8">
                <div className="flex flex-col items-center justify-center py-12">
                  {website.status === 'processing' ? (
                    <>
                      <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
                      <p className="text-gray-500">Processing website content...</p>
                      <p className="text-sm text-gray-400 mt-2">This may take a few moments</p>
                    </>
                  ) : (
                    <>
                      <Globe className="h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-gray-500">No content available</p>
                      <p className="text-sm text-gray-400 mt-2">The website content could not be extracted</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details Sidebar */}
      <div className="w-80 border-l bg-gray-50 flex flex-col px-6 py-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Details</h3>
        </div>
        <div className="space-y-5 text-sm">
          <div>
            <p className="text-gray-500">Main URL</p>
            <p className="text-gray-900 break-all">{website.url}</p>
          </div>
          {subLink && (
            <div>
              <p className="text-gray-500">Sub-link URL</p>
              <p className="text-gray-900 break-all">{subLink.url}</p>
            </div>
          )}
          <div>
            <p className="text-gray-500">Status</p>
            <p className="text-gray-900">{getStatusText()}</p>
          </div>
          <div>
            <p className="text-gray-500">Crawled</p>
            <p className="text-gray-900">{website.created_at ? new Date(website.created_at).toLocaleString() : '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Pages crawled</p>
            <p className="text-gray-900">{website.pages_crawled || 0}</p>
          </div>
          {website.max_pages && (
            <div>
              <p className="text-gray-500">Max pages allowed</p>
              <p className="text-gray-900">{website.max_pages}</p>
            </div>
          )}
          {website.metadata?.error_message && (
            <div>
              <p className="text-gray-500">Error</p>
              <p className="text-red-600 text-xs">{website.metadata.error_message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}