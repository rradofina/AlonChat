'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Globe, Trash2, X, ChevronRight, ChevronDown, MoreHorizontal, Edit, RefreshCw, Loader2, Info, Lock, AlertTriangle, Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useParams } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'
import SourcesSidebar from '@/components/agents/sources-sidebar'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CustomSelect } from '@/components/ui/custom-select'
import { FloatingActionBar } from '@/components/ui/floating-action-bar'
import { Checkbox } from '@/components/ui/checkbox'
import { usePagination } from '@/hooks/usePagination'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { WebsiteViewer } from '@/components/agents/website-viewer'

interface SubLink {
  url: string
  title?: string
  status: 'included' | 'excluded'
  crawled: boolean
}

interface CrawlProgress {
  current: number
  total: number
  currentUrl: string
  phase: 'discovering' | 'processing'
  discoveredLinks?: string[]
  startTime?: number
  averageTimePerPage?: number
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
  progress?: CrawlProgress | null
  discovered_links?: string[]
  queue_position?: number
}

export default function WebsitePage() {
  const params = useParams()
  const [url, setUrl] = useState('')
  const [protocol, setProtocol] = useState<'https' | 'http'>('https')
  const [showProtocolDropdown, setShowProtocolDropdown] = useState(false)
  const [showRetrainingAlert, setShowRetrainingAlert] = useState(false)
  const [agentTrained, setAgentTrained] = useState(false)
  const [crawlOption, setCrawlOption] = useState('crawl')
  const [sources, setSources] = useState<WebsiteSource[]>([])
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [maxPages, setMaxPages] = useState(200)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())
  const [editingSource, setEditingSource] = useState<string | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [includeOnlyPaths, setIncludeOnlyPaths] = useState('')
  const [excludePaths, setExcludePaths] = useState('')
  const [slowScraping, setSlowScraping] = useState(false)
  const [fullPageContent, setFullPageContent] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('Default')
  const [selectedWebsite, setSelectedWebsite] = useState<WebsiteSource | null>(null)
  const [selectedSubLink, setSelectedSubLink] = useState<SubLink | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    sourceIds: string[]
    sourceName?: string
    onConfirm: () => void
  }>({ isOpen: false, sourceIds: [], onConfirm: () => {} })

  // Track recently deleted items to prevent race condition with auto-refresh
  const [recentlyDeleted, setRecentlyDeleted] = useState<Set<string>>(new Set())

  const handleUrlChange = (value: string) => {
    // Remove any protocol if user types it in the input
    const cleanedValue = value.replace(/^https?:\/\//i, '')
    setUrl(cleanedValue)
    // Only show retraining alert if agent has been trained before
    if (cleanedValue && !showRetrainingAlert && agentTrained) {
      setShowRetrainingAlert(true)
    }
  }

  useEffect(() => {
    const loadInitialData = async () => {
      setIsInitialLoading(true)
      await Promise.all([
        fetchWebsiteSources(),
        fetchAgentStatus()
      ])
      setIsInitialLoading(false)
    }

    loadInitialData()

    // Initialize queue system
    fetch('/api/init')
      .then(res => res.json())
      .then(data => console.log('Queue system:', data))
      .catch(err => console.error('Failed to initialize queue:', err))
  }, [])

  // Subscribe to real-time updates for active crawls only
  useEffect(() => {
    const supabase = createClient()
    const activeSources = sources.filter(s =>
      s.status === 'pending' || s.status === 'processing' || s.status === 'queued'
    )

    // Don't subscribe if no active sources
    if (activeSources.length === 0) return

    const channels: any[] = []

    activeSources.forEach(source => {
      const channelName = `crawl-${source.id}`

      // Check if already subscribed to avoid duplicates
      const existingChannel = supabase.getChannels().find(ch => ch.topic === channelName)
      if (existingChannel) {
        supabase.removeChannel(existingChannel)
      }

      const channel = supabase
        .channel(channelName)
        .on('broadcast', { event: 'crawl_progress' }, (payload) => {
          setSources(prevSources =>
            prevSources.map(s => {
              if (s.id === payload.payload.sourceId) {
                const updatedSource = { ...s }

                if (payload.payload.status === 'completed') {
                  updatedSource.status = 'ready'
                  updatedSource.progress = null
                  updatedSource.pages_crawled = payload.payload.pagesProcessed || 0
                } else if (payload.payload.status === 'failed') {
                  updatedSource.status = 'error'
                  updatedSource.progress = null
                  if (payload.payload.error) {
                    updatedSource.metadata = {
                      ...updatedSource.metadata,
                      error_message: payload.payload.error
                    }
                  }
                } else {
                  updatedSource.status = 'processing'
                  updatedSource.progress = {
                    current: payload.payload.current || 0,
                    total: payload.payload.total || 0,
                    currentUrl: payload.payload.currentUrl || '',
                    phase: payload.payload.phase as any || 'processing',
                    discoveredLinks: payload.payload.discoveredLinks || [],
                    startTime: Date.now(),
                    averageTimePerPage: 0
                  }
                }

                return updatedSource
              }
              return s
            })
          )
        })
        .subscribe()

      channels.push(channel)
    })

    // Cleanup function to properly unsubscribe
    return () => {
      channels.forEach(channel => {
        channel.unsubscribe()
        supabase.removeChannel(channel)
      })
    }
  }, [sources.filter(s => s.status === 'pending' || s.status === 'processing' || s.status === 'queued').map(s => s.id).join(',')])

  // Auto-refresh for crawling status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Fetch sources
        const response = await fetch(`/api/agents/${params.id}/sources/website`)
        if (response.ok) {
          const data = await response.json()
          const currentSources = data.sources || []

          // Fetch queue status if any sources are queued
          const hasQueuedSources = currentSources.some((s: any) => s.status === 'queued')
          if (hasQueuedSources) {
            const queueResponse = await fetch('/api/queue/status')
            if (queueResponse.ok) {
              const queueData = await queueResponse.json()
              if (queueData.available && queueData.jobPositions) {
                // Add queue positions to sources
                currentSources.forEach((source: any) => {
                  if (source.status === 'queued' && queueData.jobPositions[source.id]) {
                    source.queue_position = queueData.jobPositions[source.id]
                  }
                })
              }
            }
          }

          // Only update if there are pending/processing/queued websites
          const hasCrawlingWebsites = currentSources.some((s: any) =>
            s.status === 'pending' || s.status === 'processing' || s.status === 'queued'
          )

          // Filter out recently deleted items before updating
          const filteredSources = currentSources.filter((s: any) => !recentlyDeleted.has(s.id))

          if (hasCrawlingWebsites) {
            setSources(filteredSources)
          } else if (sources.some(s => s.status === 'pending' || s.status === 'processing' || s.status === 'queued')) {
            // Final update when all crawling is done
            setSources(filteredSources)
          }
        }
      } catch (error) {
        console.error('Error refreshing websites:', error)
      }
    }, 3000) // Check every 3 seconds

    return () => clearInterval(interval)
  }, [params.id, sources, recentlyDeleted])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest('.dropdown-menu')) {
        setOpenDropdown(null)
      }
      // Also close protocol dropdown
      if (showProtocolDropdown && !(event.target as Element).closest('.protocol-dropdown')) {
        setShowProtocolDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdown, showProtocolDropdown])

  const fetchWebsiteSources = async () => {
    try {
      const response = await fetch(`/api/agents/${params.id}/sources/website`)
      if (response.ok) {
        const data = await response.json()
        // Filter out recently deleted items
        const filteredSources = (data.sources || []).filter((s: any) => !recentlyDeleted.has(s.id))
        setSources(filteredSources)
      }
    } catch (error) {
      console.error('Error fetching websites:', error)
    }
  }

  const fetchAgentStatus = async () => {
    try {
      const response = await fetch(`/api/agents/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        // Check if agent has been trained before (last_trained_at exists)
        setAgentTrained(!!data.agent?.last_trained_at)
      }
    } catch (error) {
      console.error('Error fetching agent status:', error)
    }
  }

  const handleFetchLinks = async () => {
    if (!url) {
      toast({
        title: 'Error',
        description: 'Please enter a URL',
        variant: 'destructive',
      })
      return
    }

    // Combine protocol and URL
    const fullUrl = `${protocol}://${url}`

    setIsLoading(true)
    try {
      const response = await fetch(`/api/agents/${params.id}/sources/website`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: fullUrl,
          crawlSubpages: crawlOption === 'crawl', // Always crawl subpages when in crawl mode
          maxPages: crawlOption === 'crawl' ? maxPages : 1,
          fullPageContent
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSources([...sources, data.source])
        setUrl('')
        setProtocol('https') // Reset protocol to default
        toast({
          title: 'Success',
          description: 'Website crawling started',
        })
        // Only show retraining alert if agent has been trained before
        if (agentTrained) {
          setShowRetrainingAlert(true)
        }
        setRefreshTrigger(prev => prev + 1)
      } else {
        throw new Error('Failed to start crawling')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start website crawling',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReCrawl = async (sourceId: string) => {
    try {
      const sourceToRecrawl = sources.find(s => s.id === sourceId)
      if (!sourceToRecrawl) return

      // Update status to pending locally
      setSources(prev => prev.map(s =>
        s.id === sourceId ? { ...s, status: 'pending' } : s
      ))

      // Call API to re-crawl
      const response = await fetch(`/api/agents/${params.id}/sources/website/${sourceId}/recrawl`, {
        method: 'POST',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Website re-crawling started',
        })
        setRefreshTrigger(prev => prev + 1)
      } else {
        throw new Error('Failed to start re-crawl')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to re-crawl website',
        variant: 'destructive',
      })
    }
  }

  const handleEditSource = async (sourceId: string) => {
    if (!editUrl.trim()) return

    try {
      const response = await fetch(`/api/agents/${params.id}/sources/website/${sourceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: editUrl }),
      })

      if (response.ok) {
        setSources(prev => prev.map(s =>
          s.id === sourceId ? { ...s, url: editUrl, name: editUrl } : s
        ))
        setEditingSource(null)
        toast({
          title: 'Success',
          description: 'Website URL updated',
        })
      } else {
        throw new Error('Failed to update website')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update website',
        variant: 'destructive',
      })
    }
  }

  const handleExcludeLink = async (sourceId: string, linkUrl: string) => {
    try {
      const response = await fetch(`/api/agents/${params.id}/sources/website/${sourceId}/exclude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkUrl }),
      })

      if (response.ok) {
        // Update the sub-link status locally
        setSources(prev => prev.map(source => {
          if (source.id === sourceId && source.sub_links) {
            return {
              ...source,
              sub_links: source.sub_links.map(link =>
                link.url === linkUrl ? { ...link, status: 'excluded' } : link
              )
            }
          }
          return source
        }))
        toast({
          title: 'Success',
          description: 'Link excluded from crawling',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to exclude link',
        variant: 'destructive',
      })
    }
  }

  const toggleExpanded = (sourceId: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev)
      if (next.has(sourceId)) {
        next.delete(sourceId)
      } else {
        next.add(sourceId)
      }
      return next
    })
  }

  const handleDeleteSingleSource = (source: WebsiteSource) => {
    setDeleteConfirmation({
      isOpen: true,
      sourceIds: [source.id],
      sourceName: source.url,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/agents/${params.id}/sources/website`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceIds: [source.id] }),
          })

          if (!response.ok) throw new Error('Failed to delete website')

          const data = await response.json()
          toast({
            title: 'Success',
            description: data.message || 'Website deleted successfully',
          })

          // Add to recently deleted set
          setRecentlyDeleted(prev => new Set([...prev, source.id]))

          // Remove from UI immediately
          setSources(sources.filter(s => s.id !== source.id))
          setSelectedSources(new Set())
          setShowRetrainingAlert(true)
          setRefreshTrigger(prev => prev + 1)
          setDeleteConfirmation({ isOpen: false, sourceIds: [], onConfirm: () => {} })

          // Clear from recently deleted after 10 seconds
          setTimeout(() => {
            setRecentlyDeleted(prev => {
              const newSet = new Set(prev)
              newSet.delete(source.id)
              return newSet
            })
          }, 10000)
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Failed to delete website',
            variant: 'destructive',
          })
          setDeleteConfirmation({ isOpen: false, sourceIds: [], onConfirm: () => {} })
        }
      }
    })
  }

  const handleDeleteSources = async () => {
    if (selectedSources.size === 0) return

    const sourceArray = Array.from(selectedSources)
    setDeleteConfirmation({
      isOpen: true,
      sourceIds: sourceArray,
      sourceName: sourceArray.length > 1 ? `${sourceArray.length} websites` : undefined,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/agents/${params.id}/sources/website`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceIds: sourceArray }),
          })

          if (!response.ok) throw new Error('Failed to delete websites')

          const data = await response.json()
          toast({
            title: 'Success',
            description: data.message || `Deleted ${sourceArray.length} website(s)`,
          })

          // Add all deleted items to recently deleted set
          setRecentlyDeleted(prev => new Set([...prev, ...sourceArray]))

          // Remove from UI immediately
          setSources(sources.filter(s => !selectedSources.has(s.id)))
          setSelectedSources(new Set())
          setShowRetrainingAlert(true)
          setRefreshTrigger(prev => prev + 1)
          setDeleteConfirmation({ isOpen: false, sourceIds: [], onConfirm: () => {} })

          // Clear from recently deleted after 10 seconds
          setTimeout(() => {
            setRecentlyDeleted(prev => {
              const newSet = new Set(prev)
              sourceArray.forEach(id => newSet.delete(id))
              return newSet
            })
          }, 10000)
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Failed to delete websites',
            variant: 'destructive',
          })
          setDeleteConfirmation({ isOpen: false, sourceIds: [], onConfirm: () => {} })
        }
      }
    })
  }

  const handleSelectAll = () => {
    if (selectedSources.size === sources.length) {
      setSelectedSources(new Set())
    } else {
      setSelectedSources(new Set(sources.map(s => s.id)))
    }
  }

  const filteredSources = sources
    .filter(source => {
      if (!searchQuery) return true
      const lower = searchQuery.toLowerCase()
      return source.url.toLowerCase().includes(lower) || source.name.toLowerCase().includes(lower)
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'Status':
          return a.status.localeCompare(b.status)
        case 'Newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'Oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'Alphabetical (A-Z)':
          return a.url.localeCompare(b.url)
        case 'Alphabetical (Z-A)':
          return b.url.localeCompare(a.url)
        default:
          return 0
      }
    })

  // Use the pagination hook
  const {
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalPages,
    currentItems: currentSources,
    showPagination,
    goToPage,
    isFirstPage,
    isLastPage,
    itemsRange
  } = usePagination({
    items: filteredSources,
    defaultRowsPerPage: 20,
    visibilityThreshold: 5,
    rowsPerPageOptions: [5, 10, 25, 50]
  })

  const allPageSelected = currentSources.length > 0 && currentSources.every(source => selectedSources.has(source.id))

  // Format time ago helper
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`
    return date.toLocaleDateString()
  }

  const closeWebsiteViewer = () => {
    setSelectedWebsite(null)
    setSelectedSubLink(null)
  }

  // Show website viewer if a website is selected
  if (selectedWebsite) {
    return (
      <WebsiteViewer
        website={selectedWebsite}
        subLink={selectedSubLink}
        onBack={closeWebsiteViewer}
      />
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 px-8 pt-8 pb-4 bg-white min-h-full overflow-x-hidden">
        <div className="w-full max-w-full">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Website</h1>
          <p className="text-sm text-gray-600 mb-6">
            Crawl web pages or submit sitemaps to update your AI with the latest content.
          </p>

          {/* Retraining Required Alert */}
          {showRetrainingAlert && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-800">
                  <p className="font-medium">Retraining is required for changes to apply</p>
                </div>
              </div>
            </div>
          )}

          {/* Add Links Section */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add links</h2>

              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setCrawlOption('crawl')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    crawlOption === 'crawl'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Crawl links
                </button>
                <button
                  onClick={() => setCrawlOption('individual')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    crawlOption === 'individual'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Individual link
                </button>
              </div>

              <div className="space-y-4 mt-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">URL</label>
                  <div className="relative">
                    <div className="flex">
                      {/* Clean Protocol Selector */}
                      <div className="relative protocol-dropdown">
                        <button
                          type="button"
                          onClick={() => setShowProtocolDropdown(!showProtocolDropdown)}
                          className="flex items-center gap-1 px-3 h-10 bg-white border border-gray-300 border-r-0 rounded-l-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:z-10"
                        >
                          <span className="text-sm text-gray-600">{protocol}://</span>
                          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                        </button>

                        {/* Clean Dropdown */}
                        {showProtocolDropdown && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md z-10 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                setProtocol('https')
                                setShowProtocolDropdown(false)
                              }}
                              className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                                protocol === 'https' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                              }`}
                            >
                              https://
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setProtocol('http')
                                setShowProtocolDropdown(false)
                              }}
                              className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                                protocol === 'http' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                              }`}
                            >
                              http://
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Clean URL Input */}
                      <Input
                        type="text"
                        value={url}
                        onChange={(e) => handleUrlChange(e.target.value)}
                        placeholder="example.com"
                        className="flex-1 rounded-l-none focus:z-10"
                        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                      />
                    </div>
                  </div>
                  {crawlOption === 'crawl' && (
                    <div className="flex items-start gap-1.5 mt-2">
                      <Info className="h-3 w-3 text-gray-400 mt-0.5" />
                      <p className="text-xs text-gray-500">
                        Links found during crawling or sitemap retrieval may be updated if new links are discovered or some links are invalid.
                      </p>
                    </div>
                  )}
                </div>

                {crawlOption === 'crawl' && (
                  <>
                    {/* Advanced Options Dropdown */}
                    <div className="border-t pt-4">
                      <button
                        onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        {showAdvancedOptions ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                        Advanced options
                      </button>

                      {showAdvancedOptions && (
                        <div className="mt-4 space-y-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                              Max pages to crawl
                              <div className="relative group">
                                <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                  <div className="absolute bottom-[-4px] left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                  Maximum 1000 pages can be crawled
                                </div>
                              </div>
                            </label>
                            <Input
                              type="number"
                              value={maxPages}
                              onChange={(e) => setMaxPages(parseInt(e.target.value) || 200)}
                              min="1"
                              max="1000"
                              className="w-32"
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                              Include only paths
                            </label>
                            <Input
                              value={includeOnlyPaths}
                              onChange={(e) => setIncludeOnlyPaths(e.target.value)}
                              placeholder="Ex: blog/*, dev/*"
                              className="text-sm"
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                              Exclude paths
                            </label>
                            <Input
                              value={excludePaths}
                              onChange={(e) => setExcludePaths(e.target.value)}
                              placeholder="Ex: blog/*, dev/*"
                              className="text-sm"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="slow-scraping"
                              checked={slowScraping}
                              onChange={(e) => setSlowScraping(e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            <label htmlFor="slow-scraping" className="text-sm text-gray-600 flex items-center gap-1">
                              Slow scraping
                              <div className="relative group">
                                <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                  <div className="absolute bottom-[-4px] left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                  Spreads out requests more gently to avoid overwhelming resource-limited websites.
                                </div>
                              </div>
                            </label>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="full-page-content"
                              checked={fullPageContent}
                              onChange={(e) => setFullPageContent(e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            <label htmlFor="full-page-content" className="text-sm text-gray-600 flex items-center gap-1">
                              Include full page content
                              <div className="relative group">
                                <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                  <div className="absolute bottom-[-4px] left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                  Include headers, footers, and navigation content. By default, only main content is extracted.
                                </div>
                              </div>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={handleFetchLinks}
                    disabled={isLoading || !url}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    {isLoading ? 'Crawling...' : 'Fetch links'}
                  </Button>
                </div>
              </div>
          </div>

          {/* Link Sources List - Only show entire section when we have data */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Link sources
              {!isLoading && filteredSources.length > 0 && (
                <span className="ml-2 text-sm text-gray-500">({filteredSources.length})</span>
              )}
            </h2>

              {/* Controls - Only show when we have sources */}
              {!isLoading && filteredSources.length > 0 && (
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 cursor-pointer">
                    <Checkbox
                      checked={allPageSelected}
                      onChange={() => {
                        setSelectedSources(prev => {
                          const next = new Set(prev)
                          if (allPageSelected) {
                            currentSources.forEach(source => next.delete(source.id))
                          } else {
                            currentSources.forEach(source => next.add(source.id))
                          }
                          return next
                        })
                      }}
                    />
                    <span>Select all</span>
                  </label>
                  {selectedSources.size > 0 && (
                    <span className="text-sm text-gray-500">
                      {selectedSources.size} item(s) selected
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-700">Sort by:</span>
                    <CustomSelect
                      value={sortBy}
                      onChange={setSortBy}
                      options={['Default', 'Status', 'Newest', 'Oldest', 'Alphabetical (A-Z)', 'Alphabetical (Z-A)']}
                    />
                  </div>
                </div>
              </div>
              )}

              <div>
                {(isLoading || isInitialLoading) ? (
                  // Skeleton loaders for loading state
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="py-3">
                        <div className="flex items-start gap-3">
                          <Skeleton className="h-5 w-5 rounded" />
                          <Skeleton className="h-5 w-5 rounded" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredSources.length === 0 ? (
                  // Empty state
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Globe className="h-12 w-12 mb-3 text-gray-300" />
                    <p className="text-sm">No website sources yet</p>
                    <p className="text-xs text-gray-400 mt-1">Add a website URL above to get started</p>
                  </div>
                ) : (
                  // Actual sources list
                  currentSources.map((source, index) => {
                  const isExpanded = expandedSources.has(source.id)
                  const isEditing = editingSource === source.id

                  // Get crawled or discovered pages from metadata
                  const crawledPages = source.metadata?.crawled_pages || []
                  const discoveredLinks = source.discovered_links || source.metadata?.discovered_links || []

                  // Get the root domain from the source URL
                  const getRootDomain = (url: string) => {
                    try {
                      const urlObj = new URL(url)
                      return urlObj.hostname.replace(/^www\./, '')
                    } catch {
                      return ''
                    }
                  }

                  const rootDomain = getRootDomain(source.url)

                  // Filter to only include same-domain links
                  const sameDomainFilter = (url: string) => {
                    const linkDomain = getRootDomain(url)
                    return linkDomain === rootDomain
                  }

                  // Filter out external links
                  const filteredCrawledPages = crawledPages.filter(sameDomainFilter)
                  const filteredDiscoveredLinks = discoveredLinks.filter(sameDomainFilter)

                  // Normalize URLs for comparison (remove trailing slashes)
                  const normalizeUrl = (url: string) => url.replace(/\/$/, '')

                  // Create a set of normalized crawled URLs for quick lookup
                  const crawledSet = new Set(filteredCrawledPages.map(normalizeUrl))

                  // Combine crawled and discovered links, removing duplicates
                  const allLinks = new Set([...filteredCrawledPages, ...filteredDiscoveredLinks])
                  const subLinks = Array.from(allLinks).map((url: string) => ({
                    url,
                    status: 'included' as const,
                    crawled: crawledSet.has(normalizeUrl(url)) // Check if URL was actually crawled (normalized)
                  }))

                  // Show chevron if there are any filtered sub-links to show
                  const hasSubLinks = subLinks.length > 1 || // More than just the main URL
                                     (subLinks.length === 1 && subLinks[0].url !== source.url)

                  return (
                    <div key={source.id}>
                      <div className="py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedSources.has(source.id)}
                            onChange={(e: any) => {
                              const newSelected = new Set(selectedSources)
                              if (e.target.checked) {
                                newSelected.add(source.id)
                              } else {
                                newSelected.delete(source.id)
                              }
                              setSelectedSources(newSelected)
                            }}
                            className="mt-1"
                          />

                          <Globe className="h-5 w-5 text-gray-400 mt-0.5" />

                          <div
                            className="flex-1 min-w-0"
                            style={{ cursor: !isEditing && !hasSubLinks ? 'pointer' : 'default' }}
                            onClick={() => {
                              if (!isEditing && !hasSubLinks && source.status === 'ready') {
                                // For individual links, go straight to website details
                                setSelectedWebsite(source)
                                setSelectedSubLink(null) // View main URL
                              }
                            }}
                          >
                            {isEditing ? (
                              <div className="flex gap-2">
                                <Input
                                  value={editUrl}
                                  onChange={(e) => setEditUrl(e.target.value)}
                                  className="text-sm"
                                  placeholder="Enter URL"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleEditSource(source.id)}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingSource(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                                  {source.url}
                                </p>
                                <div className="flex flex-col gap-1 mt-1">
                                  {source.status === 'queued' && (
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
                                  )}
                                  {(source.status === 'pending' || source.status === 'processing') && (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded flex items-center gap-1">
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                          Processing
                                        </span>
                                        <span className="text-xs text-gray-600 flex items-center gap-1">
                                          {source.progress || source.metadata?.crawl_progress ? (
                                            <>
                                              {(source.progress || source.metadata?.crawl_progress).phase === 'discovering'
                                                ? `Discovering links... (found ${(source.progress || source.metadata?.crawl_progress).discoveredLinks?.length || source.metadata?.discovered_links?.length || 0})`
                                                : `Crawling page ${(source.progress || source.metadata?.crawl_progress).current} of ${(source.progress || source.metadata?.crawl_progress).total}`
                                              }
                                            </>
                                          ) : (
                                            'Starting crawl...'
                                          )}
                                        </span>
                                        {source.progress && source.progress.averageTimePerPage && (
                                          <span className="text-xs text-gray-400">
                                            (~{Math.ceil(((source.progress.total - source.progress.current) * source.progress.averageTimePerPage) / 1000)}s remaining)
                                          </span>
                                        )}
                                      </div>
                                      {(source.progress?.currentUrl || source.metadata?.crawl_progress?.currentUrl) && (
                                        <span className="text-xs text-gray-400 truncate" title={source.progress?.currentUrl || source.metadata?.crawl_progress?.currentUrl}>
                                          Current: {new URL(source.progress?.currentUrl || source.metadata?.crawl_progress?.currentUrl).pathname}
                                        </span>
                                      )}
                                    </>
                                  )}
                                  {source.status === 'ready' && (
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                                        Ready
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        Last crawled {formatTimeAgo(source.created_at)} • Links: {filteredCrawledPages.length || 0}
                                      </span>
                                    </div>
                                  )}
                                  {source.status === 'error' && (
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded">
                                        Failed
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {source.metadata?.error_message || 'Failed to crawl'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Expand/Collapse and Actions */}
                          <div className="flex items-center gap-1">
                            {/* Actions Menu */}
                            <div className="relative dropdown-menu">
                              <button
                                className="p-1 hover:bg-gray-100 rounded"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenDropdown(openDropdown === source.id ? null : source.id)
                                }}
                              >
                                <MoreHorizontal className="h-5 w-5 text-gray-400" />
                              </button>
                              {openDropdown === source.id && (
                              <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                <button
                                  onClick={() => {
                                    setEditingSource(source.id)
                                    setEditUrl(source.url)
                                    setOpenDropdown(null)
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <Edit className="h-4 w-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    handleReCrawl(source.id)
                                    setOpenDropdown(null)
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                  Re-crawl
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteSingleSource(source)
                                    setOpenDropdown(null)
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              </div>
                            )}
                            </div>

                            {/* Expand/Collapse Button */}
                            {hasSubLinks && (
                              <button
                                onClick={() => toggleExpanded(source.id)}
                                className="p-1 hover:bg-gray-100 rounded"
                                title={isExpanded ? "Collapse" : "Expand"}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-gray-500" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expanded Sub-links */}
                        {isExpanded && (
                          <div className="mt-3 ml-12 pb-2 mr-2 overflow-hidden">
                            {subLinks && subLinks.length > 0 ? (
                              <>
                                <div className="flex items-center gap-2 mb-2">
                                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    {subLinks.length === 1 ? '1 LINK' : `${subLinks.length} LINKS`}
                                    {source.status === 'processing' && source.progress && (
                                      <span className="text-gray-400">
                                        ({subLinks.filter(l => l.crawled).length} crawled, {subLinks.filter(l => !l.crawled).length} discovered)
                                      </span>
                                    )}
                                  </p>
                                  {subLinks.filter(l => !l.crawled).length > 0 && source.status === 'ready' && (
                                    <div className="relative group">
                                      <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 max-w-xs">
                                        <div className="absolute bottom-[-4px] left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                        'Discovered' links were found but not crawled due to the max pages limit ({source.max_pages || source.metadata?.max_pages || 200} pages)
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="max-h-96 overflow-y-auto overflow-x-hidden border border-gray-200 rounded-md bg-gray-50 p-2">
                                  <div className="space-y-1">
                                    {subLinks.map((link: SubLink, index: number) => {
                                  const linkId = `${source.id}-${index}`
                                  return (
                                    <div key={index} className="flex items-center justify-between py-1 hover:bg-white rounded px-2 group">
                                      <div className="flex-1 flex items-center gap-2 min-w-0 overflow-hidden">
                                        <span className="text-sm text-gray-700 truncate flex-1" title={link.url}>
                                          {link.url}
                                        </span>
                                        {/* Show status badge */}
                                        {link.crawled ? (
                                          <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-800 rounded flex-shrink-0 whitespace-nowrap">
                                            Ready
                                          </span>
                                        ) : source.status === 'processing' ? (
                                          <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded flex-shrink-0 whitespace-nowrap flex items-center gap-1">
                                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                            Processing
                                          </span>
                                        ) : (
                                          <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded flex-shrink-0 whitespace-nowrap">
                                            Discovered Only
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        {/* Sub-link Actions Menu */}
                                        <div className="relative dropdown-menu">
                                          <button
                                            className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setOpenDropdown(openDropdown === linkId ? null : linkId)
                                            }}
                                          >
                                            <MoreHorizontal className="h-5 w-5 text-gray-400" />
                                          </button>
                                          {openDropdown === linkId && (
                                            <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                              <button
                                                onClick={() => {
                                                  // Handle edit link
                                                  setOpenDropdown(null)
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                                              >
                                                <Edit className="h-3 w-3" />
                                                Edit
                                              </button>
                                              <button
                                                onClick={() => {
                                                  handleExcludeLink(source.id, link.url)
                                                  setOpenDropdown(null)
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2"
                                              >
                                                <X className="h-3 w-3" />
                                                Exclude link
                                              </button>
                                            </div>
                                          )}
                                        </div>

                                        {/* Navigate to Details */}
                                        <button
                                          onClick={() => {
                                            setSelectedWebsite(source)
                                            setSelectedSubLink(link)
                                          }}
                                          className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="View details"
                                        >
                                          <ChevronRight className="h-5 w-5 text-gray-400" />
                                        </button>
                                      </div>
                                    </div>
                                    )
                                  })}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                NO LINKS FOUND
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      {index < currentSources.length - 1 && <div className="border-b border-gray-200" />}
                    </div>
                  )
                })
              )}
              </div>

              {/* Pagination Controls */}
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                rowsPerPage={rowsPerPage}
                totalItems={filteredSources.length}
                onPageChange={goToPage}
                onRowsPerPageChange={(rows) => {
                  setRowsPerPage(rows)
                  // Clear selections when changing page size
                  setSelectedSources(new Set())
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
                showPagination={showPagination}
                itemsRange={itemsRange}
                isFirstPage={isFirstPage}
                isLastPage={isLastPage}
                itemLabel="link"
              />
            </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <SourcesSidebar
        agentId={params.id as string}
        showRetrainingAlert={showRetrainingAlert}
        refreshTrigger={refreshTrigger}
      />

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedSources.size}
        onDelete={handleDeleteSources}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setDeleteConfirmation({ isOpen: false, sourceIds: [], onConfirm: () => {} })
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Website</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteConfirmation.sourceName || 'this website'}?
              {deleteConfirmation.sourceIds.length === 1 ? (
                <>
                  {' '}This action will remove the website from your sources.
                  Untrained websites will be permanently deleted.
                  Trained websites will be removed and permanently deleted when you retrain your agent.
                </>
              ) : (
                <>
                  {' '}This action will remove the selected websites from your sources.
                  Untrained websites will be permanently deleted.
                  Trained websites will be removed and permanently deleted when you retrain your agent.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteConfirmation.onConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}