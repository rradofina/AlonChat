'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { AlertCircle, Loader2, Trash2, Plus, X, MoreHorizontal, Edit, ChevronRight, HelpCircle, Image, MessageSquare } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
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
import { CustomSelect } from '@/components/ui/custom-select'
import { FloatingActionBar } from '@/components/ui/floating-action-bar'
import { Checkbox } from '@/components/ui/checkbox'
import { usePagination } from '@/hooks/usePagination'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { QAViewer } from '@/components/agents/qa-viewer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'

export default function QAPage() {
  const params = useParams()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const agentId = Array.isArray(params.id) ? params.id[0] : params.id

  // Form states
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<string[]>([''])
  const [answer, setAnswer] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  // List states
  const [showRetrainingAlert, setShowRetrainingAlert] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [qaSources, setQaSources] = useState<any[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [totalSize, setTotalSize] = useState(0)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('Default')
  const [viewingQA, setViewingQA] = useState<any | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    sourceIds: string[]
    sourceName?: string
    onConfirm: () => void
  }>({ isOpen: false, sourceIds: [], onConfirm: () => {} })

  useEffect(() => {
    if (agentId) {
      fetchQASources()
    }
  }, [agentId, refreshTrigger])

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url))
    }
  }, [imagePreviews])

  const fetchQASources = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/agents/${agentId}/sources/qa`)
      if (!response.ok) throw new Error('Failed to fetch Q&A sources')
      const data = await response.json()
      setQaSources(data.sources || [])

      // Calculate total size
      const total = data.sources?.reduce((sum: number, source: any) => sum + (source.size_bytes || 0), 0) || 0
      setTotalSize(total)
    } catch (error) {
      console.error('Error fetching Q&A sources:', error)
      toast({
        title: 'Error',
        description: 'Failed to load Q&A sources',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddQuestion = () => {
    setQuestions([...questions, ''])
  }

  const handleRemoveQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index))
    }
  }

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...questions]
    newQuestions[index] = value
    setQuestions(newQuestions)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/')
      if (!isValid) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: `${file.name} is not a supported image type`
        })
      }
      return isValid
    })

    if (validFiles.length > 0) {
      setImages([...images, ...validFiles])

      // Create previews
      const newPreviews = validFiles.map(file => URL.createObjectURL(file))
      setImagePreviews([...imagePreviews, ...newPreviews])
    }
  }

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index])
    setImages(images.filter((_, i) => i !== index))
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
  }

  const handleAddQA = async () => {
    // Filter out empty questions
    const validQuestions = questions.filter(q => q.trim())

    if (!title.trim() || validQuestions.length === 0 || !answer.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide title, at least one question, and an answer',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('questions', JSON.stringify(validQuestions))
      formData.append('answer', answer)

      // Add images to formData
      images.forEach(image => {
        formData.append('images', image)
      })

      const response = await fetch(`/api/agents/${agentId}/sources/qa`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add Q&A')
      }

      toast({
        title: 'Success',
        description: 'Q&A added successfully',
      })

      // Reset form
      setTitle('')
      setQuestions([''])
      setAnswer('')
      setImages([])
      imagePreviews.forEach(url => URL.revokeObjectURL(url))
      setImagePreviews([])
      setShowRetrainingAlert(true)
      setRefreshTrigger(prev => prev + 1)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add Q&A',
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
      sourceName: selectedSources.length > 1 ? `${selectedSources.length} Q&A items` : undefined,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/agents/${agentId}/sources/qa`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceIds: selectedSources }),
          })

          if (!response.ok) throw new Error('Failed to delete Q&A items')

          const data = await response.json()
          toast({
            title: 'Success',
            description: data.message,
          })

          setSelectedSources([])
          setShowRetrainingAlert(true)
          setRefreshTrigger(prev => prev + 1)
          setDeleteConfirmation({ isOpen: false, sourceIds: [], onConfirm: () => {} })
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Failed to delete Q&A items',
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

  const processedSources = qaSources
    .filter(source => {
      if (!searchQuery) return true
      const searchLower = searchQuery.toLowerCase()
      return source.title?.toLowerCase().includes(searchLower) ||
             source.questions?.some((q: string) => q.toLowerCase().includes(searchLower)) ||
             source.answer?.toLowerCase().includes(searchLower)
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'Newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'Oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'Title (A-Z)':
          return (a.title || '').localeCompare(b.title || '')
        case 'Title (Z-A)':
          return (b.title || '').localeCompare(a.title || '')
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

  // Functions for viewing Q&A items
  const openQAViewer = (qa: any) => {
    // Ensure agent_id is set for the viewer
    setViewingQA({ ...qa, agent_id: agentId })
  }

  const handleQAUpdate = () => {
    setShowRetrainingAlert(true)
    setRefreshTrigger(prev => prev + 1)
  }

  const handleQADelete = async (id: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/sources/qa`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: [id] }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete Q&A')
      }

      toast({
        title: 'Success',
        description: 'Q&A pair deleted successfully',
      })

      setViewingQA(null)
      setShowRetrainingAlert(true)
      setRefreshTrigger(prev => prev + 1)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete Q&A',
        variant: 'destructive',
      })
    }
  }

  // Show QAViewer when viewing a Q&A item
  if (viewingQA) {
    return (
      <QAViewer
        qa={viewingQA}
        onBack={() => setViewingQA(null)}
        onDelete={handleQADelete}
        onUpdate={handleQAUpdate}
      />
    )
  }

  return (
    <div className="flex h-full min-h-full bg-white">
      {/* Main Content Area */}
      <div className="flex-1 px-8 pt-8 pb-4 bg-white min-h-full overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Q&A</h1>
          <p className="text-sm text-gray-600 mb-6">
            Craft responses for key questions, ensuring your AI shares relevant info.
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

          {/* Add Q&A Section with PROPER Design */}
          <div className="bg-gray-50 border-2 border-gray-200 border-dashed rounded-lg">
            <div className="p-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Q&A</h2>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-sm text-gray-700 mb-1 block">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Refund requests"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 placeholder-gray-400"
                  />
                </div>

                {/* Questions */}
                <div>
                  <label className="text-sm text-gray-700 mb-1 block">Question</label>
                  {questions.map((question, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={question}
                        onChange={(e) => handleQuestionChange(index, e.target.value)}
                        placeholder="Ex: How do I request a refund?"
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 placeholder-gray-400"
                      />
                      {questions.length > 1 && (
                        <button
                          onClick={() => handleRemoveQuestion(index)}
                          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAddQuestion}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add question
                  </Button>
                </div>

                {/* Answer with Rich Text Editor */}
                <div>
                  <label className="text-sm text-gray-700 mb-1 block">Answer</label>
                  <RichTextEditor
                    value={answer}
                    onChange={setAnswer}
                    placeholder="Enter your answer with formatting, links, and emojis..."
                    disabled={isSaving}
                    minHeight="min-h-[200px]"
                  />
                  <div className="text-right text-xs text-gray-500 mt-1">
                    {formatBytes(new TextEncoder().encode(answer).length)}
                  </div>
                </div>

                {/* Images */}
                <div>
                  <label className="text-sm text-gray-700 mb-1 block">Images (optional)</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1"
                      >
                        <Image className="h-4 w-4" />
                        Add images
                      </Button>
                    </div>

                    {imagePreviews.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {imagePreviews.map((preview, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={preview}
                              alt={`Preview ${idx + 1}`}
                              className="h-20 w-20 object-cover rounded border border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleAddQA}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                    disabled={isSaving || !title.trim() || questions.every(q => !q.trim()) || !answer.trim()}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Q&A'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Q&A Sources List - Always visible for better UX */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Q&A sources
              {!isLoading && qaSources.length > 0 && (
                <span className="ml-2 text-sm text-gray-500">({qaSources.length})</span>
              )}
            </h2>

              {/* Only show controls if we have data */}
              {!isLoading && qaSources.length > 0 && (
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
                        options={['Default', 'Newest', 'Oldest', 'Title (A-Z)', 'Title (Z-A)', 'Size (Smallest)', 'Size (Largest)']}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

              {/* Q&A Sources List with Skeleton Loaders */}
              <div>
                {isLoading ? (
                  // Show skeleton loaders while loading
                  <div className="divide-y divide-gray-100">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="py-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-5 w-5 rounded" />
                          <Skeleton className="h-5 w-5 rounded" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-4 w-[350px]" />
                              <Skeleton className="h-5 w-12 rounded" />
                            </div>
                            <Skeleton className="h-3 w-[250px] mt-1" />
                          </div>
                          <div className="flex items-center gap-1">
                            <Skeleton className="h-4 w-4 rounded" />
                            <Skeleton className="h-4 w-4 rounded" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : qaSources.length === 0 ? (
                  // Show empty state with icon
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No Q&A pairs added yet</p>
                    <p className="text-sm text-gray-400 mt-1">Add your first Q&A pair above to get started</p>
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
                          <HelpCircle className="h-5 w-5 text-gray-400" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">{source.title || source.questions?.[0] || 'Untitled Q&A'}</p>
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
                              {source.images && Array.isArray(source.images) && source.images.length > 0 && (
                                <span className="text-xs text-gray-500">
                                  {source.images.length} image(s)
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {source.questions?.length || 1} question(s) • {formatBytes(source.size_bytes || 0)} • {new Date(source.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-1">{source.answer}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                              >
                                <MoreHorizontal className="h-5 w-5 text-gray-500" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openQAViewer(source)
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
                                    sourceName: source.title || 'this Q&A',
                                    onConfirm: async () => {
                                      try {
                                        const response = await fetch(`/api/agents/${agentId}/sources/qa`, {
                                          method: 'DELETE',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ sourceIds: [source.id] }),
                                        })

                                        if (!response.ok) throw new Error('Failed to delete Q&A')

                                        const data = await response.json()
                                        toast({
                                          title: 'Success',
                                          description: `Q&A "${source.title || 'item'}" has been deleted`,
                                        })

                                        setShowRetrainingAlert(true)
                                        await fetchQASources()
                                        setDeleteConfirmation({ isOpen: false, sourceIds: [], onConfirm: () => {} })
                                      } catch (error) {
                                        toast({
                                          title: 'Error',
                                          description: 'Failed to delete Q&A',
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
                              openQAViewer(source)
                            }}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="View details"
                          >
                            <ChevronRight className="h-5 w-5 text-gray-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>

              {/* Pagination Controls - Only show when we have data */}
              {qaSources.length > 0 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                rowsPerPage={rowsPerPage}
                totalItems={processedSources.length}
                onPageChange={goToPage}
                onRowsPerPageChange={(rows) => {
                  setRowsPerPage(rows)
                  setSelectedSources([])
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
                showPagination={showPagination}
                itemsRange={itemsRange}
                isFirstPage={isFirstPage}
                isLastPage={isLastPage}
              />
              )}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <SourcesSidebar
        agentId={agentId}
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
            <AlertDialogTitle>Delete Q&A</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteConfirmation.sourceName || 'this Q&A'}?
              {deleteConfirmation.sourceIds.length === 1 ? (
                <>
                  {' '}This action will remove the Q&A from your sources.
                  Untrained Q&As will be permanently deleted.
                  Trained Q&As will be removed and permanently deleted when you retrain your agent.
                </>
              ) : (
                <>
                  {' '}This action will remove the selected Q&As from your sources.
                  Untrained Q&As will be permanently deleted.
                  Trained Q&As will be removed and permanently deleted when you retrain your agent.
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