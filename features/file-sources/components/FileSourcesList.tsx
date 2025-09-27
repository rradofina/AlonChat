'use client'

import { useState, useEffect } from 'react'
import { Search, SortDesc, AlertCircle } from 'lucide-react'
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
import { FileSourceCard } from './FileSourceCard'
import {
  useFileSources,
  useDeleteFiles,
  useRestoreFiles,
  useSortedFiles,
  useFileStorageStats,
} from '../hooks/useFileSources'
import { FileViewer } from '@/components/agents/file-viewer'
import type { FileSource, FileListFilters } from '../types'

interface FileSourcesListProps {
  agentId: string
  includeRemoved?: boolean
}

export function FileSourcesList({ agentId, includeRemoved = false }: FileSourcesListProps) {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<FileListFilters['sortBy']>('Default')
  const [selectedFile, setSelectedFile] = useState<FileSource | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    fileIds: string[]
    fileName?: string
    permanent?: boolean
  }>({ isOpen: false, fileIds: [] })

  // React Query hooks
  const { data: files = [], isLoading } = useFileSources(agentId, { includeRemoved })
  const sortedFiles = useSortedFiles(files, { searchQuery, sortBy })
  const deleteMutation = useDeleteFiles()
  const restoreMutation = useRestoreFiles()
  const { totalSizeMB, activeCount, removedCount } = useFileStorageStats(agentId)

  // Pagination
  const {
    currentItems: currentFiles,
    currentPage,
    totalPages,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    rowsPerPage,
    setRowsPerPage,
    itemsRange,
  } = usePagination({
    items: sortedFiles,
    defaultRowsPerPage: 20,
    visibilityThreshold: 5,
  })

  // Filter active vs removed files
  const activeFiles = currentFiles.filter(f => f.status !== 'removed')
  const removedFiles = currentFiles.filter(f => f.status === 'removed')

  // Selection management
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const fileIds = currentFiles.map(f => f.id)
      setSelectedFiles(prev => [...new Set([...prev, ...fileIds])])
    } else {
      const currentIds = new Set(currentFiles.map(f => f.id))
      setSelectedFiles(prev => prev.filter(id => !currentIds.has(id)))
    }
  }

  const handleSelectFile = (fileId: string, checked: boolean) => {
    if (checked) {
      setSelectedFiles(prev => [...prev, fileId])
    } else {
      setSelectedFiles(prev => prev.filter(id => id !== fileId))
    }
  }

  const allPageSelected = currentFiles.length > 0 &&
    currentFiles.every(file => selectedFiles.includes(file.id))

  // Actions
  const handleDeleteSelected = (permanent = false) => {
    if (selectedFiles.length === 0) return

    const fileName = selectedFiles.length === 1
      ? files.find(f => f.id === selectedFiles[0])?.name
      : undefined

    setDeleteConfirmation({
      isOpen: true,
      fileIds: selectedFiles,
      fileName,
      permanent,
    })
  }

  const confirmDelete = async () => {
    await deleteMutation.mutateAsync({
      agentId,
      fileIds: deleteConfirmation.fileIds,
      permanent: deleteConfirmation.permanent,
    })

    setSelectedFiles([])
    setDeleteConfirmation({ isOpen: false, fileIds: [] })
  }

  const handleRestoreSelected = async () => {
    if (selectedFiles.length === 0) return

    await restoreMutation.mutateAsync({
      agentId,
      fileIds: selectedFiles,
    })

    setSelectedFiles([])
  }

  // Render empty state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading files...</div>
      </div>
    )
  }

  if (files.length === 0 && !searchQuery) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No files uploaded yet</h3>
        <p className="text-gray-500">Upload documents to start training your agent.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Storage Stats */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600">
            <span className="font-medium">{activeCount}</span> active files
            {removedCount > 0 && (
              <span className="ml-2">
                • <span className="font-medium">{removedCount}</span> in trash
              </span>
            )}
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
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as FileListFilters['sortBy'])}
          className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Default">Default</option>
          <option value="Name">Name</option>
          <option value="Date">Date Added</option>
          <option value="Size">File Size</option>
          <option value="Type">File Type</option>
        </select>
      </div>

      {/* File List */}
      <div className="space-y-3">
        {/* Active Files */}
        {activeFiles.map(file => (
          <FileSourceCard
            key={file.id}
            file={file}
            isSelected={selectedFiles.includes(file.id)}
            onSelect={(checked) => handleSelectFile(file.id, checked)}
            onView={(file) => setSelectedFile(file)}
            onDelete={(fileId) => setDeleteConfirmation({
              isOpen: true,
              fileIds: [fileId],
              fileName: file.name,
              permanent: false,
            })}
          />
        ))}

        {/* Removed Files */}
        {includeRemoved && removedFiles.length > 0 && (
          <>
            {activeFiles.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <p className="text-sm text-gray-500 mb-3">Removed Files</p>
              </div>
            )}
            {removedFiles.map(file => (
              <FileSourceCard
                key={file.id}
                file={file}
                isSelected={selectedFiles.includes(file.id)}
                onSelect={(checked) => handleSelectFile(file.id, checked)}
                onView={(file) => setSelectedFile(file)}
                onDelete={(fileId) => setDeleteConfirmation({
                  isOpen: true,
                  fileIds: [fileId],
                  fileName: file.name,
                  permanent: true,
                })}
                onRestore={(fileId) => restoreMutation.mutate({
                  agentId,
                  fileIds: [fileId],
                })}
              />
            ))}
          </>
        )}
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
      {selectedFiles.length > 0 && (
        <FloatingActionBar
          selectedCount={selectedFiles.length}
          onDelete={() => handleDeleteSelected(false)}
          onRestore={
            selectedFiles.some(id => files.find(f => f.id === id)?.status === 'removed')
              ? handleRestoreSelected
              : undefined
          }
          showRestore={selectedFiles.some(id =>
            files.find(f => f.id === id)?.status === 'removed'
          )}
        />
      )}

      {/* File Viewer Modal */}
      {selectedFile && (
        <FileViewer
          fileId={selectedFile.id}
          fileName={selectedFile.name}
          fileType={selectedFile.metadata?.file_type}
          agentId={agentId}
          onClose={() => setSelectedFile(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(open) =>
          !open && setDeleteConfirmation({ isOpen: false, fileIds: [] })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirmation.permanent ? 'Permanently delete' : 'Delete'} file
              {deleteConfirmation.fileIds.length > 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmation.fileName
                ? `Are you sure you want to ${
                    deleteConfirmation.permanent ? 'permanently delete' : 'delete'
                  } "${deleteConfirmation.fileName}"?`
                : `Are you sure you want to ${
                    deleteConfirmation.permanent ? 'permanently delete' : 'delete'
                  } ${deleteConfirmation.fileIds.length} file${
                    deleteConfirmation.fileIds.length > 1 ? 's' : ''
                  }?`}
              {deleteConfirmation.permanent
                ? ' This action cannot be undone.'
                : ' You can restore this file from the trash later.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              {deleteConfirmation.permanent ? 'Permanently Delete' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}