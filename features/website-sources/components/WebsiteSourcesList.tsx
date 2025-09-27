'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Search, SortDesc } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FloatingActionBar } from '@/components/ui/floating-action-bar'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { usePagination } from '@/hooks/usePagination'
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
import { WebsiteSourceCard } from './WebsiteSourceCard'
import {
  WebsiteSource,
  useWebsiteSources,
  useDeleteWebsiteSource,
  useRecrawlWebsite,
  useUpdateWebsiteSource,
} from '../hooks/useWebsiteSources'
import { useWebsiteCrawl } from '../hooks/useWebsiteCrawl'

interface WebsiteSourcesListProps {
  agentId: string
  onViewWebsite: (source: WebsiteSource) => void
}

export function WebsiteSourcesList({ agentId, onViewWebsite }: WebsiteSourcesListProps) {
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set())
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('Default')
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    sourceIds: string[]
    sourceName?: string
  }>({ isOpen: false, sourceIds: [] })

  // React Query hooks
  const { data: sources = [], isLoading, refetch } = useWebsiteSources(agentId)
  const deleteMutation = useDeleteWebsiteSource()
  const recrawlMutation = useRecrawlWebsite()
  const updateMutation = useUpdateWebsiteSource()

  // Real-time crawl progress
  const { crawlProgress } = useWebsiteCrawl({
    autoConnect: true,
    onProgress: (progress) => {
      // Refetch sources to update progress
      refetch()
    },
    onComplete: () => {
      refetch()
    },
    onError: () => {
      refetch()
    },
  })

  // Filter and sort sources
  const filteredSources = sources.filter((source) => {
    if (!searchQuery) return true
    return source.url.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const sortedSources = [...filteredSources].sort((a, b) => {
    switch (sortBy) {
      case 'Date Added':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'Status':
        return a.status.localeCompare(b.status)
      case 'URL':
        return a.url.localeCompare(b.url)
      default:
        return 0
    }
  })

  // Pagination
  const {
    currentItems: paginatedSources,
    currentPage,
    totalPages,
    goToPage,
    goToNextPage,
    goToPreviousPage,
  } = usePagination({
    items: sortedSources,
    defaultRowsPerPage: 10,
  })

  // Handle select all
  const handleSelectAll = (checked: boolean): void => {
    if (checked) {
      const newSelected = new Set(selectedSources)
      paginatedSources.forEach((source) => newSelected.add(source.id))
      setSelectedSources(newSelected)
    } else {
      const newSelected = new Set<string>()
      sources.forEach((source) => {
        if (!paginatedSources.find((s) => s.id === source.id)) {
          if (selectedSources.has(source.id)) {
            newSelected.add(source.id)
          }
        }
      })
      setSelectedSources(newSelected)
    }
  }

  // Handle individual selection
  const handleSelectSource = (sourceId: string, selected: boolean) => {
    const newSelected = new Set(selectedSources)
    if (selected) {
      newSelected.add(sourceId)
    } else {
      newSelected.delete(sourceId)
    }
    setSelectedSources(newSelected)
  }

  // Handle delete
  const handleDeleteSelected = () => {
    const sourceIds = Array.from(selectedSources)
    if (sourceIds.length === 0) return

    const sourceName = sourceIds.length === 1
      ? sources.find((s) => s.id === sourceIds[0])?.url
      : undefined

    setDeleteConfirmation({
      isOpen: true,
      sourceIds,
      sourceName,
    })
  }

  const confirmDelete = async () => {
    await deleteMutation.mutateAsync({
      agentId,
      sourceIds: deleteConfirmation.sourceIds,
    })

    setSelectedSources(new Set())
    setDeleteConfirmation({ isOpen: false, sourceIds: [] })
  }

  // Handle expand/collapse
  const toggleExpanded = (sourceId: string) => {
    const newExpanded = new Set(expandedSources)
    if (newExpanded.has(sourceId)) {
      newExpanded.delete(sourceId)
    } else {
      newExpanded.add(sourceId)
    }
    setExpandedSources(newExpanded)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading website sources...</div>
      </div>
    )
  }

  if (sources.length === 0 && !searchQuery) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No website sources yet</h3>
        <p className="text-gray-500">Add a website URL to start importing content.</p>
      </div>
    )
  }

  return (
    <div>
      {filteredSources.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Link sources</h2>

          {/* Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSources.size === paginatedSources.length && paginatedSources.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                >
                  <option value="Default">Default</option>
                  <option value="Status">Status</option>
                  <option value="Newest">Newest</option>
                  <option value="Oldest">Oldest</option>
                  <option value="Alphabetical (A-Z)">Alphabetical (A-Z)</option>
                  <option value="Alphabetical (Z-A)">Alphabetical (Z-A)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sources List */}
          <div>
            {paginatedSources.map((source) => (
              <WebsiteSourceCard
                key={source.id}
                source={source}
                isSelected={selectedSources.has(source.id)}
                isExpanded={expandedSources.has(source.id)}
                onSelect={(selected) => handleSelectSource(source.id, selected)}
                onToggleExpand={() => toggleExpanded(source.id)}
                onEdit={(sourceId, newUrl) =>
                  updateMutation.mutate({ agentId, sourceId, url: newUrl })
                }
                onRecrawl={(sourceId) => recrawlMutation.mutate({ agentId, sourceId })}
                onDelete={(sourceId) =>
                  setDeleteConfirmation({
                    isOpen: true,
                    sourceIds: [sourceId],
                    sourceName: source.url,
                  })
                }
                onViewDetails={onViewWebsite}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          onNext={goToNextPage}
          onPrevious={goToPreviousPage}
        />
      )}

      {/* Floating Action Bar */}
      {selectedSources.size > 0 && (
        <FloatingActionBar
          selectedCount={selectedSources.size}
          onDelete={handleDeleteSelected}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(open) =>
          !open && setDeleteConfirmation({ isOpen: false, sourceIds: [] })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete website source{deleteConfirmation.sourceIds.length > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmation.sourceName
                ? `Are you sure you want to delete "${deleteConfirmation.sourceName}"?`
                : `Are you sure you want to delete ${deleteConfirmation.sourceIds.length} website source${
                    deleteConfirmation.sourceIds.length > 1 ? 's' : ''
                  }?`}
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}