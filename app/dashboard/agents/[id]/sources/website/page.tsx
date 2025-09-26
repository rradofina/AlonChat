'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Globe, Trash2, X, ChevronRight, ChevronDown, MoreHorizontal, Edit, RefreshCw, Loader2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useParams } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'
import SourcesSidebar from '@/components/agents/sources-sidebar'
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
}

export default function WebsitePage() {
  const params = useParams()
  const [url, setUrl] = useState('')
  const [showRetrainingAlert, setShowRetrainingAlert] = useState(false)
  const [agentTrained, setAgentTrained] = useState(false)
  const [crawlOption, setCrawlOption] = useState('crawl')
  const [sources, setSources] = useState<WebsiteSource[]>([])
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [maxPages, setMaxPages] = useState(100)
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

  const handleUrlChange = (value: string) => {
    setUrl(value)
    // Only show retraining alert if agent has been trained before
    if (value && !showRetrainingAlert && agentTrained) {
      setShowRetrainingAlert(true)
    }
  }

  useEffect(() => {
    fetchWebsiteSources()
    fetchAgentStatus()
  }, [])

  // Auto-refresh for crawling status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/agents/${params.id}/sources/website`)
        if (response.ok) {
          const data = await response.json()
          const currentSources = data.sources || []

          // Only update if there are pending/processing websites
          const hasCrawlingWebsites = currentSources.some((s: any) =>
            s.status === 'pending' || s.status === 'processing'
          )

          if (hasCrawlingWebsites) {
            setSources(currentSources)
          } else if (sources.some(s => s.status === 'pending' || s.status === 'processing')) {
            // Final update when all crawling is done
            setSources(currentSources)
          }
        }
      } catch (error) {
        console.error('Error refreshing websites:', error)
      }
    }, 3000) // Check every 3 seconds

    return () => clearInterval(interval)
  }, [params.id, sources])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest('.dropdown-menu')) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdown])

  const fetchWebsiteSources = async () => {
    try {
      const response = await fetch(`/api/agents/${params.id}/sources/website`)
      if (response.ok) {
        const data = await response.json()
        setSources(data.sources || [])
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

    setIsLoading(true)
    try {
      const response = await fetch(`/api/agents/${params.id}/sources/website`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          crawlSubpages: crawlOption === 'crawl', // Always crawl subpages when in crawl mode
          maxPages: crawlOption === 'crawl' ? maxPages : 1,
          fullPageContent
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSources([...sources, data.source])
        setUrl('')
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

  const handleDeleteSources = async () => {
    if (selectedSources.size === 0) return

    try {
      const response = await fetch(`/api/agents/${params.id}/sources/website`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: Array.from(selectedSources) }),
      })

      if (response.ok) {
        setSources(sources.filter(s => !selectedSources.has(s.id)))
        setSelectedSources(new Set())
        setRefreshTrigger(prev => prev + 1)
        toast({
          title: 'Success',
          description: `Deleted ${selectedSources.size} website(s)`,
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete websites',
        variant: 'destructive',
      })
    }
  }

  const handleSelectAll = () => {
    if (selectedSources.size === sources.length) {
      setSelectedSources(new Set())
    } else {
      setSelectedSources(new Set(sources.map(s => s.id)))
    }
  }

  const calculateTotalSize = () => {
    return sources.reduce((total, source) => total + (source.pages_crawled * 25), 0) // Estimate 25KB per page
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
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 px-8 pt-8 pb-4 bg-white min-h-full">
        <div className="w-full">
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
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      value={url}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="https://www.example.com"
                      className="flex-1"
                    />
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
                          <ChevronRight className="h-4 w-4" />
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
                              onChange={(e) => setMaxPages(parseInt(e.target.value) || 100)}
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
          {filteredSources.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Link sources</h2>

              {/* Controls */}
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

              {/* Sources List */}
              <div>
                {currentSources.map((source, index) => {
                  const isExpanded = expandedSources.has(source.id)
                  const isEditing = editingSource === source.id

                  // Get crawled or discovered pages from metadata
                  const crawledPages = source.metadata?.crawled_pages || []
                  const discoveredLinks = source.discovered_links || source.metadata?.discovered_links || []

                  // Combine crawled and discovered links
                  const allLinks = new Set([...crawledPages, ...discoveredLinks])
                  const subLinks = Array.from(allLinks).map((url: string) => ({
                    url,
                    status: 'included' as const,
                    crawled: crawledPages.includes(url)
                  }))

                  // Only show chevron for crawl_subpages mode
                  const hasSubLinks = source.metadata?.crawl_subpages === true

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
                            className="flex-1"
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
                                <div className="flex items-center gap-2 mt-1">
                                  {(source.status === 'pending' || source.status === 'processing') && (
                                    <>
                                      <span className="text-xs text-gray-600 flex items-center gap-1">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        {source.progress ? (
                                          <>
                                            {source.progress.phase === 'discovering'
                                              ? `Discovering links... (found ${source.progress.discoveredLinks?.length || 0})`
                                              : `Processing page ${source.progress.current} of ${source.progress.total}`
                                            }
                                          </>
                                        ) : (
                                          'Crawling in-progress'
                                        )}
                                      </span>
                                      {source.progress && source.progress.averageTimePerPage && (
                                        <span className="text-xs text-gray-400">
                                          (~{Math.ceil(((source.progress.total - source.progress.current) * source.progress.averageTimePerPage) / 1000)}s remaining)
                                        </span>
                                      )}
                                    </>
                                  )}
                                  {source.progress && source.progress.currentUrl && (
                                    <span className="text-xs text-gray-400 truncate max-w-[200px]" title={source.progress.currentUrl}>
                                      {new URL(source.progress.currentUrl).pathname}
                                    </span>
                                  )}
                                  {source.status === 'ready' && (
                                    <>
                                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                                        New
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        Last crawled {formatTimeAgo(source.created_at)} • Links: {source.pages_crawled || source.metadata?.pages_crawled || 0}
                                      </span>
                                    </>
                                  )}
                                  {source.status === 'error' && (
                                    <>
                                      <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded">
                                        Failed
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {source.metadata?.error_message || 'Failed to crawl'}
                                      </span>
                                    </>
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
                                <MoreHorizontal className="h-4 w-4 text-gray-400" />
                              </button>
                              {openDropdown === source.id && (
                              <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
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
                                    setSelectedSources(new Set([source.id]))
                                    handleDeleteSources()
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
                                  <ChevronRight className="h-4 w-4 text-gray-500" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expanded Sub-links */}
                        {isExpanded && (
                          <div className="mt-3 ml-12 space-y-1 pb-2">
                            {subLinks && subLinks.length > 0 ? (
                              <>
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                                  {subLinks.length === 1 ? '1 LINK' : `${subLinks.length} LINKS`}
                                  {source.status === 'processing' && source.progress && (
                                    <span className="text-gray-400">
                                      ({subLinks.filter(l => l.crawled).length} crawled, {subLinks.filter(l => !l.crawled).length} pending)
                                    </span>
                                  )}
                                </p>
                                {subLinks.map((link: SubLink, index: number) => {
                                  const linkId = `${source.id}-${index}`
                                  return (
                                    <div key={index} className="flex items-center justify-between py-1 hover:bg-gray-50 rounded px-2 -mx-2 group">
                                      <div className="flex-1 flex items-center gap-2">
                                        <span className="text-sm text-gray-700 truncate">
                                          {link.url}
                                        </span>
                                        {/* Show status badge */}
                                        {link.crawled ? (
                                          <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                                            Crawled
                                          </span>
                                        ) : (
                                          <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                            Discovered
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1">
                                        {/* Sub-link Actions Menu */}
                                        <div className="relative dropdown-menu">
                                          <button
                                            className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setOpenDropdown(openDropdown === linkId ? null : linkId)
                                            }}
                                          >
                                            <MoreHorizontal className="h-4 w-4 text-gray-400" />
                                          </button>
                                          {openDropdown === linkId && (
                                            <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
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
                                          <ChevronRight className="h-4 w-4 text-gray-400" />
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
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
                })}
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
          )}
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
    </div>
  )
}