'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AlertCircle, Loader2, Trash2, Edit2, Save, X, MoreHorizontal, Edit, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
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
import SourcesSidebar from '@/components/agents/sources-sidebar'
import { TextViewer } from '@/components/agents/text-viewer'
import { CustomSelect } from '@/components/ui/custom-select'
import { FloatingActionBar } from '@/components/ui/floating-action-bar'
import { Checkbox } from '@/components/ui/checkbox'
import { usePagination } from '@/hooks/usePagination'
import { PaginationControls } from '@/components/ui/pagination-controls'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'

export default function TextPage() {
  const params = useParams()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [showRetrainingAlert, setShowRetrainingAlert] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [textSources, setTextSources] = useState<any[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [viewingText, setViewingText] = useState<any | null>(null)
  const [totalSize, setTotalSize] = useState(0)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('Default')
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    sourceIds: string[]
    sourceName?: string
    onConfirm: () => void
  }>({ isOpen: false, sourceIds: [], onConfirm: () => {} })

  useEffect(() => {
    if (params.id) {
      fetchTextSources()
    }
  }, [params.id])

  const fetchTextSources = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/agents/${params.id}/sources/text`)
      if (!response.ok) throw new Error('Failed to fetch text sources')
      const data = await response.json()
      setTextSources(data.sources || [])

      // Calculate total size
      const total = data.sources?.reduce((sum: number, source: any) => sum + (source.size_bytes || 0), 0) || 0
      setTotalSize(total)
    } catch (error) {
      console.error('Error fetching text sources:', error)
      toast({
        title: 'Error',
        description: 'Failed to load text sources',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSnippet = async () => {
    if (!title.trim() || !textContent.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide both title and content',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/agents/${params.id}/sources/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: textContent }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add text snippet')
      }

      toast({
        title: 'Success',
        description: 'Text snippet added successfully',
      })

      setTitle('')
      setTextContent('')
      setShowRetrainingAlert(true)
      setRefreshTrigger(prev => prev + 1)
      await fetchTextSources()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add text snippet',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }


  const handleDeleteSelected = async () => {
    if (selectedSources.length === 0) return

    setDeleteConfirmation({
      isOpen: true,
      sourceIds: selectedSources,
      sourceName: selectedSources.length > 1 ? `${selectedSources.length} text snippets` : undefined,
      onConfirm: async () => {

    try {
      const response = await fetch(`/api/agents/${params.id}/sources/text`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: selectedSources }),
      })

      if (!response.ok) throw new Error('Failed to delete text snippets')

      const data = await response.json()
      toast({
        title: 'Success',
        description: data.message,
      })

      setSelectedSources([])
      setShowRetrainingAlert(true)
      setRefreshTrigger(prev => prev + 1)
      await fetchTextSources()
      setDeleteConfirmation({ isOpen: false, sourceIds: [], onConfirm: () => {} })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete text snippets',
        variant: 'destructive',
      })
      setDeleteConfirmation({ isOpen: false, sourceIds: [], onConfirm: () => {} })
    }
      }
    })
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const openTextViewer = (source: any) => {
    setViewingText(source)
  }

  const handleTextUpdate = () => {
    setShowRetrainingAlert(true)
    setRefreshTrigger(prev => prev + 1)
    fetchTextSources()
  }

  const handleTextDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/agents/${params.id}/sources/text`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: [id] }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete text')
      }

      toast({
        title: 'Success',
        description: 'Text snippet deleted successfully',
      })

      setViewingText(null)
      setShowRetrainingAlert(true)
      await fetchTextSources()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete text',
        variant: 'destructive',
      })
    }
  }

  const processedSources = textSources
    .filter(source => {
      if (!searchQuery) return true
      const searchLower = searchQuery.toLowerCase()
      return source.name?.toLowerCase().includes(searchLower) ||
             source.content?.toLowerCase().includes(searchLower)
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'Newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'Oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'Name (A-Z)':
          return (a.name || '').localeCompare(b.name || '')
        case 'Name (Z-A)':
          return (b.name || '').localeCompare(a.name || '')
        case 'Size (Smallest)':
          return (a.size_bytes || 0) - (b.size_bytes || 0)
        case 'Size (Largest)':
          return (b.size_bytes || 0) - (a.size_bytes || 0)
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
    items: processedSources,
    defaultRowsPerPage: 20,
    visibilityThreshold: 5,
    rowsPerPageOptions: [5, 10, 25, 50]
  })

  const allPageSelected = currentSources.length > 0 && currentSources.every(source => selectedSources.includes(source.id))

  // Show TextViewer when viewing a text snippet
  if (viewingText) {
    return (
      <TextViewer
        text={viewingText}
        onBack={() => setViewingText(null)}
        onDelete={handleTextDelete}
        onUpdate={handleTextUpdate}
      />
    )
  }

  return (
    <div className="flex h-full min-h-full bg-white">
      {/* Main Content Area */}
      <div className="flex-1 px-8 pt-8 pb-4 bg-white min-h-full overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Text</h1>
          <p className="text-sm text-gray-600 mb-6">
            Add plain text-based sources to train your AI Agent with precise information.
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

          {/* Add Text Snippet Section */}
          <div className="bg-gray-50 border-2 border-gray-200 border-dashed rounded-lg">
            <div className="p-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Add text snippet</h2>

              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title (e.g., Company policies, Product descriptions)"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 placeholder-gray-400"
                  />
                </div>

                <div>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Enter your text content here..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 placeholder-gray-400 min-h-[150px] resize-none"
                  />
                  <div className="text-right text-xs text-gray-500 mt-1">
                    {formatBytes(new TextEncoder().encode(textContent).length)}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleAddSnippet}
                    variant="outline"
                    className="border-gray-300"
                    disabled={isSaving || !title.trim() || !textContent.trim()}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add text snippet'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Text Sources List */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Text sources</h2>

            {/* Controls row */}
            <div className="mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={allPageSelected}
                    onChange={() => {
                      if (allPageSelected) {
                        setSelectedSources(prev => prev.filter(id => !currentSources.find(source => source.id === id)))
                      } else {
                        setSelectedSources(prev => {
                          const newIds = currentSources.map(source => source.id)
                          return Array.from(new Set([...prev, ...newIds]))
                        })
                      }
                    }}
                  />
                  <span className="text-sm text-gray-600">Select all</span>
                  {selectedSources.length > 0 && (
                    <span className="ml-2 text-sm text-gray-500">
                      {selectedSources.length} item(s) selected
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
                      options={['Default', 'Newest', 'Oldest', 'Name (A-Z)', 'Name (Z-A)', 'Size (Smallest)', 'Size (Largest)']}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Text Sources List - No container, ultra-minimal */}
            <div>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : currentSources.length === 0 ? (
                <div className="flex items-center justify-center text-center py-12">
                  <div>
                    <Edit2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-900">No text snippets</p>
                    <p className="text-xs text-gray-500 mt-1">Add text snippets to get started</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {currentSources.map((source) => (
                    <div key={source.id}>
                      <div
                          className={`flex items-center justify-between py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                            selectedSources.includes(source.id) ? 'bg-gray-50' : ''
                          }`}
                        >
                          <div
                            className="flex items-center gap-3 flex-1"
                            onClick={() => {
                              if (selectedSources.includes(source.id)) {
                                setSelectedSources(selectedSources.filter(id => id !== source.id))
                              } else {
                                setSelectedSources([...selectedSources, source.id])
                              }
                            }}
                          >
                            <Checkbox
                              checked={selectedSources.includes(source.id)}
                              onChange={(e: any) => {
                                e.stopPropagation()
                                if (e.target.checked) {
                                  setSelectedSources([...selectedSources, source.id])
                                } else {
                                  setSelectedSources(selectedSources.filter(id => id !== source.id))
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Edit2 className="h-5 w-5 text-gray-400" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900">{source.name}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-md border ${
                                  source.status === 'processed' || source.status === 'ready' ? 'bg-green-50 text-green-700 border-green-300' :
                                  source.status === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                  source.status === 'failed' || source.status === 'error' ? 'bg-red-50 text-red-700 border-red-300' :
                                  'bg-blue-50 text-blue-700 border-blue-300'
                                }`}>
                                  {source.status === 'processed' || source.status === 'ready' ? 'Ready' :
                                   source.status === 'processing' ? 'Processing' :
                                   source.status === 'failed' || source.status === 'error' ? 'Failed' :
                                   'New'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                {formatBytes(source.size_bytes || 0)} • {new Date(source.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                                >
                                  <MoreHorizontal className="h-4 w-4 text-gray-500" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openTextViewer(source)
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeleteConfirmation({
                                      isOpen: true,
                                      sourceIds: [source.id],
                                      sourceName: source.name,
                                      onConfirm: async () => {
                                        try {
                                          const response = await fetch(`/api/agents/${params.id}/sources/text`, {
                                            method: 'DELETE',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ sourceIds: [source.id] }),
                                          })

                                          if (!response.ok) throw new Error('Failed to delete text snippet')

                                          const data = await response.json()
                                          toast({
                                            title: 'Success',
                                            description: `Text snippet "${source.name}" has been deleted`,
                                          })

                                          setShowRetrainingAlert(true)
                                          await fetchTextSources()
                                          setDeleteConfirmation({ isOpen: false, sourceIds: [], onConfirm: () => {} })
                                        } catch (error) {
                                          toast({
                                            title: 'Error',
                                            description: 'Failed to delete text snippet',
                                            variant: 'destructive',
                                          })
                                          setDeleteConfirmation({ isOpen: false, sourceIds: [], onConfirm: () => {} })
                                        }
                                      }
                                    })
                                  }}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                openTextViewer(source)
                              }}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title="View details"
                            >
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            </button>
                          </div>
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              rowsPerPage={rowsPerPage}
              totalItems={processedSources.length}
              onPageChange={goToPage}
              onRowsPerPageChange={(rows) => {
                setRowsPerPage(rows)
                // Clear selections when changing page size
                setSelectedSources([])
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
              showPagination={showPagination}
              itemsRange={itemsRange}
              isFirstPage={isFirstPage}
              isLastPage={isLastPage}
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
        selectedCount={selectedSources.length}
        onDelete={handleDeleteSelected}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setDeleteConfirmation({ isOpen: false, sourceIds: [], onConfirm: () => {} })
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete text snippet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteConfirmation.sourceName || 'this text snippet'}?
              {deleteConfirmation.sourceIds.length === 1 ? (
                <>
                  {' '}This action will remove the text from your sources.
                  Untrained texts will be permanently deleted.
                  Trained texts will be removed and permanently deleted when you retrain your agent.
                </>
              ) : (
                <>
                  {' '}This action will remove the selected texts from your sources.
                  Untrained texts will be permanently deleted.
                  Trained texts will be removed and permanently deleted when you retrain your agent.
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