'use client'

import { useState } from 'react'
import { Search, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
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
import { QASourceCard } from './QASourceCard'
import { QAViewer } from '@/components/agents/qa-viewer'
import {
  useQASources,
  useDeleteQA,
  useSortedQA,
  useQAStorageStats,
} from '../hooks/useQASources'
import type { QASource, QAListFilters } from '../types'

interface QASourcesListProps {
  agentId: string
  onEdit?: (source: QASource) => void
}

export function QASourcesList({ agentId, onEdit }: QASourcesListProps) {
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<QAListFilters['sortBy']>('Default')
  const [viewingQA, setViewingQA] = useState<QASource | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    sourceIds: string[]
    sourceName?: string
  }>({ isOpen: false, sourceIds: [] })

  // React Query hooks
  const { data: sources = [], isLoading } = useQASources(agentId)
  const sortedSources = useSortedQA(sources, { searchQuery, sortBy })
  const deleteMutation = useDeleteQA()
  const { totalSizeMB, totalCount } = useQAStorageStats(agentId)

  // Pagination
  const {
    currentItems: currentSources,
    currentPage,
    totalPages,
    goToPage,
    goToNextPage,
    goToPreviousPage,
  } = usePagination({
    items: sortedSources,
    defaultRowsPerPage: 20,
    visibilityThreshold: 5,
  })

  // Selection management
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const sourceIds = currentSources.map(s => s.id)
      setSelectedSources(prev => [...new Set([...prev, ...sourceIds])])
    } else {
      const currentIds = new Set(currentSources.map(s => s.id))
      setSelectedSources(prev => prev.filter(id => !currentIds.has(id)))
    }
  }

  const handleSelectSource = (sourceId: string, checked: boolean) => {
    if (checked) {
      setSelectedSources(prev => [...prev, sourceId])
    } else {
      setSelectedSources(prev => prev.filter(id => id !== sourceId))
    }
  }

  // Actions
  const handleDeleteSelected = () => {
    if (selectedSources.length === 0) return

    const sourceName = selectedSources.length === 1
      ? sources.find(s => s.id === selectedSources[0])?.name
      : undefined

    setDeleteConfirmation({
      isOpen: true,
      sourceIds: selectedSources,
      sourceName,
    })
  }

  const confirmDelete = async () => {
    await deleteMutation.mutateAsync({
      agentId,
      sourceIds: deleteConfirmation.sourceIds,
    })

    setSelectedSources([])
    setDeleteConfirmation({ isOpen: false, sourceIds: [] })
  }

  // Render empty state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading Q&A sources...</div>
      </div>
    )
  }

  if (sources.length === 0 && !searchQuery) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Q&A pairs yet</h3>
        <p className="text-gray-500">Create question and answer pairs to train your agent.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600">
            <span className="font-medium">{totalCount}</span> Q&A pairs
          </div>
          <div className="text-gray-600">
            Total storage: <span className="font-medium">{totalSizeMB} MB</span>
          </div>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search Q&A..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as QAListFilters['sortBy'])}
          className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Default">Default</option>
          <option value="Title">Title</option>
          <option value="Date">Date Added</option>
          <option value="Size">Size</option>
        </select>
      </div>

      {/* Q&A List */}
      <div className="space-y-3">
        {currentSources.map(source => (
          <QASourceCard
            key={source.id}
            source={source}
            isSelected={selectedSources.includes(source.id)}
            onSelect={(checked) => handleSelectSource(source.id, checked)}
            onView={(source) => setViewingQA(source)}
            onEdit={(source) => onEdit?.(source)}
            onDelete={(sourceId) => setDeleteConfirmation({
              isOpen: true,
              sourceIds: [sourceId],
              sourceName: source.name,
            })}
          />
        ))}
      </div>

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
      {selectedSources.length > 0 && (
        <FloatingActionBar
          selectedCount={selectedSources.length}
          onDelete={handleDeleteSelected}
        />
      )}

      {/* Q&A Viewer Modal */}
      {viewingQA && (
        <QAViewer
          qa={viewingQA}
          onClose={() => setViewingQA(null)}
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
            <AlertDialogTitle>Delete Q&A source{deleteConfirmation.sourceIds.length > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmation.sourceName
                ? `Are you sure you want to delete "${deleteConfirmation.sourceName}"?`
                : `Are you sure you want to delete ${deleteConfirmation.sourceIds.length} Q&A source${
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