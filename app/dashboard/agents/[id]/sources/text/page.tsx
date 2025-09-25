'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AlertCircle, Loader2, Trash2, Edit2, Save, X, MoreHorizontal, Edit, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import SourcesSidebar from '@/components/agents/sources-sidebar'
import { CustomSelect } from '@/components/ui/custom-select'
import { FloatingActionBar } from '@/components/ui/floating-action-bar'
import { Checkbox } from '@/components/ui/checkbox'
import { usePagination } from '@/hooks/usePagination'
import { PaginationControls } from '@/components/ui/pagination-controls'

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
  const [editingSource, setEditingSource] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [totalSize, setTotalSize] = useState(0)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('Default')

  useEffect(() => {
    if (params.id) {
      fetchTextSources()
    }
  }, [params.id])

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

  const handleUpdateSnippet = async (sourceId: string) => {
    if (!editTitle.trim() || !editContent.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide both title and content',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch(`/api/agents/${params.id}/sources/text`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          title: editTitle,
          content: editContent
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update text snippet')
      }

      toast({
        title: 'Success',
        description: 'Text snippet updated successfully',
      })

      setEditingSource(null)
      setShowRetrainingAlert(true)
      setRefreshTrigger(prev => prev + 1)
      await fetchTextSources()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update text snippet',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedSources.length === 0) return

    if (!confirm(`Delete ${selectedSources.length} text snippet(s)?`)) return

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
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete text snippets',
        variant: 'destructive',
      })
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const startEditing = (source: any) => {
    setEditingSource(source.id)
    setEditTitle(source.name)
    setEditContent(source.content || '')
  }

  const cancelEditing = () => {
    setEditingSource(null)
    setEditTitle('')
    setEditContent('')
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
        case 'Alphabetical (A-Z)':
          return (a.name || '').localeCompare(b.name || '')
        case 'Alphabetical (Z-A)':
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

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 p-8 pb-24">
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
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Add text snippet</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Title</label>
                  <Input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Company policies, Product descriptions"
                    className="w-full"
                  />
                </div>

                <div>
                  <Textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Enter your text content here..."
                    className="min-h-[200px] resize-none"
                  />
                  <div className="text-right text-xs text-gray-500 mt-1">
                    {new TextEncoder().encode(textContent).length} B
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleAddSnippet}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                    disabled={isSaving}
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

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 cursor-pointer">
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
                  <span>Select all</span>
                </label>
                {selectedSources.length > 0 && (
                  <span className="block text-sm text-gray-500 mt-1">
                    {selectedSources.length} item(s) selected
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
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
                    options={['Default', 'Newest', 'Oldest', 'Alphabetical (A-Z)', 'Alphabetical (Z-A)', 'Size (Smallest)', 'Size (Largest)']}
                  />
                </div>

              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : textSources.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">No text snippets yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentSources.map((source) => (
                      <div key={source.id}>
                        {editingSource === source.id ? (
                          // Edit mode
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="mb-3"
                              placeholder="Title"
                            />
                            <Textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="min-h-[100px] mb-3"
                              placeholder="Content"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleUpdateSnippet(source.id)}
                                className="bg-gray-900 hover:bg-gray-800"
                              >
                                <Save className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditing}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // Display mode
                          <div
                            className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors ${
                              selectedSources.includes(source.id) ? 'bg-gray-100' : ''
                            }`}
                            onClick={() => {
                              if (selectedSources.includes(source.id)) {
                                setSelectedSources(selectedSources.filter(id => id !== source.id))
                              } else {
                                setSelectedSources([...selectedSources, source.id])
                              }
                            }}
                          >
                            <div className="flex items-center gap-3 flex-1">
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
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{source.name}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatBytes(source.size_bytes || 0)} • {new Date(source.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded ${
                                source.status === 'processed' ? 'bg-green-100 text-green-800' :
                                source.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {source.status || 'pending'}
                              </span>

                              {/* Actions Menu */}
                              <div className="relative dropdown-menu">
                                <button
                                  className="p-1 hover:bg-gray-200 rounded"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenDropdown(openDropdown === source.id ? null : source.id)
                                  }}
                                >
                                  <MoreHorizontal className="h-4 w-4 text-gray-600" />
                                </button>
                                {openDropdown === source.id && (
                                  <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        startEditing(source)
                                        setOpenDropdown(null)
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                                    >
                                      <Edit className="h-4 w-4" />
                                      Edit
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedSources([source.id])
                                        handleDeleteSelected()
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
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
              itemLabel="text snippet"
            />
          </div>
          {/* Add padding at bottom */}
          <div className="h-6"></div>
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
    </div>
  )
}