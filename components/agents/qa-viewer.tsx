'use client'

import { useState, useRef } from 'react'
import { ArrowLeft, HelpCircle, CheckCircle, AlertCircle, Loader2, MoreHorizontal, Trash2, Edit, Save, X, Plus, Upload, Image as ImageIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatDistanceToNow } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'
import { uploadMultipleImages, isValidImageType, validateImageSize, deleteMultipleImages } from '@/lib/supabase/storage'

interface QAViewerProps {
  qa: any
  onBack: () => void
  onDelete?: (id: string) => void
  onUpdate?: () => void
}

export function QAViewer({ qa, onBack, onDelete, onUpdate }: QAViewerProps) {
  const { toast } = useToast()
  const editFileInputRef = useRef<HTMLInputElement>(null)

  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState(qa.title || qa.metadata?.title || '')
  const [editQuestions, setEditQuestions] = useState<string[]>(
    qa.questions || (qa.question ? qa.question.split(' | ').filter((q: string) => q.trim() !== '') : [''])
  )
  const [editAnswer, setEditAnswer] = useState(qa.answer || '')
  const [editImages, setEditImages] = useState<string[]>(
    Array.isArray(qa.images) ? qa.images : (qa.metadata?.images && Array.isArray(qa.metadata.images) ? qa.metadata.images : [])
  )
  const [editNewImages, setEditNewImages] = useState<File[]>([])
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingImages, setIsUploadingImages] = useState(false)

  // Image modal states
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  // Helper function to extract storage path from full URL
  const extractStoragePath = (url: string): string => {
    // URL format: https://[project].supabase.co/storage/v1/object/public/agent-sources/[path]
    const storagePattern = /\/storage\/v1\/object\/public\/agent-sources\//
    const match = url.split(storagePattern)
    if (match.length > 1) {
      return match[1] // Return just the path after the bucket name
    }
    // If it's already a path, return as is
    return url
  }

  const getStatusIcon = () => {
    switch (qa.status) {
      case 'ready':
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'failed':
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusText = () => {
    switch (qa.status) {
      case 'ready':
      case 'processed':
        return 'Ready'
      case 'new':
      case 'pending':
        return 'New'
      case 'processing':
        return 'Processing...'
      case 'failed':
        return 'Failed'
      case 'error':
        return 'Error'
      default:
        return 'New'
    }
  }

  const statusBadgeClasses = (() => {
    switch (qa.status) {
      case 'ready':
      case 'processed':
        return 'bg-green-50 text-green-700 border border-green-300'
      case 'new':
      case 'pending':
        return 'bg-blue-50 text-blue-700 border border-blue-300'
      case 'processing':
        return 'bg-blue-50 text-blue-700 border border-blue-300'
      case 'failed':
      case 'error':
        return 'bg-red-50 text-red-700 border border-red-300'
      default:
        return 'bg-blue-50 text-blue-700 border border-blue-300'
    }
  })()

  const handleAddQuestion = () => {
    setEditQuestions([...editQuestions, ''])
  }

  const handleRemoveQuestion = (index: number) => {
    if (editQuestions.length > 1) {
      const newQuestions = editQuestions.filter((_, i) => i !== index)
      setEditQuestions(newQuestions)
    }
  }

  const handleQuestionChange = (value: string, index: number) => {
    const newQuestions = [...editQuestions]
    newQuestions[index] = value
    setEditQuestions(newQuestions)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    const validFiles = files.filter(file => {
      if (!isValidImageType(file)) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: `${file.name} is not a supported image type`
        })
        return false
      }
      if (!validateImageSize(file)) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: `${file.name} exceeds 5MB limit`
        })
        return false
      }
      return true
    })

    setEditNewImages([...editNewImages, ...validFiles])
  }

  const handleRemoveExistingImage = (index: number) => {
    const imageToRemove = editImages[index]
    setEditImages(editImages.filter((_, i) => i !== index))
    // Track this image for deletion from storage
    setImagesToDelete(prev => [...prev, imageToRemove])
  }

  const handleRemoveNewImage = (index: number) => {
    // Clean up object URL if it exists
    const file = editNewImages[index]
    if (file) {
      const objectUrl = URL.createObjectURL(file)
      URL.revokeObjectURL(objectUrl)
    }
    setEditNewImages(editNewImages.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    const validQuestions = editQuestions.filter(q => q.trim() !== '')

    if (validQuestions.length === 0 || !editAnswer.trim()) {
      toast({
        title: 'Error',
        description: 'At least one question and an answer are required',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    setIsUploadingImages(true)

    try {
      // Upload new images if any
      let newImageUrls: string[] = []
      if (editNewImages.length > 0) {
        const uploadResults = await uploadMultipleImages(editNewImages, qa.agent_id, 'qa')
        newImageUrls = uploadResults.map(result => result.url)
      }

      // Combine existing and new image URLs
      const allImages = [...editImages, ...newImageUrls]

      const response = await fetch(`/api/agents/${qa.agent_id}/sources/qa`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: qa.id,
          questions: validQuestions,
          answer: editAnswer.trim(),
          title: editTitle.trim(),
          images: allImages
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update Q&A')
      }

      toast({
        title: 'Success',
        description: 'Q&A pair updated successfully',
      })

      // Delete removed images from storage
      if (imagesToDelete.length > 0) {
        const pathsToDelete = imagesToDelete.map(url => extractStoragePath(url))
        const deleteResult = await deleteMultipleImages(pathsToDelete)

        if (!deleteResult) {
          console.error('Failed to delete some images from storage')
          toast({
            title: 'Warning',
            description: 'Q&A updated but some images could not be deleted from storage',
            variant: 'destructive',
          })
        }
      }

      // Update local state
      qa.title = editTitle.trim()
      qa.questions = validQuestions
      qa.answer = editAnswer.trim()
      qa.images = allImages
      setEditImages(allImages)
      setEditNewImages([])
      setImagesToDelete([]) // Clear the deletion queue
      setIsEditMode(false)

      // Notify parent to refresh if needed
      if (onUpdate) {
        onUpdate()
      }
    } catch (error: any) {
      console.error('Error updating Q&A:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update Q&A pair',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
      setIsUploadingImages(false)
    }
  }

  const handleCancel = () => {
    setEditTitle(qa.title || qa.metadata?.title || '')
    setEditQuestions(
      qa.questions || (qa.question ? qa.question.split(' | ').filter((q: string) => q.trim() !== '') : [''])
    )
    setEditAnswer(qa.answer || '')
    setEditImages(
      Array.isArray(qa.images) ? qa.images : (qa.metadata?.images && Array.isArray(qa.metadata.images) ? qa.metadata.images : [])
    )
    setEditNewImages([])
    setImagesToDelete([]) // Clear the deletion queue when canceling
    setIsEditMode(false)
  }

  const handleDelete = () => {
    if (onDelete && confirm('Are you sure you want to delete this Q&A pair?')) {
      onDelete(qa.id)
    }
  }

  const displayTitle = qa.title || qa.metadata?.title || (qa.questions ? qa.questions[0] : qa.question?.split(' | ')[0]) || 'Untitled Q&A'
  const displayQuestions = qa.questions || (qa.question ? qa.question.split(' | ').filter((q: string) => q.trim() !== '') : [])
  const displayImages = Array.isArray(qa.images) ? qa.images : (qa.metadata?.images && Array.isArray(qa.metadata.images) ? qa.metadata.images : [])

  return (
    <>
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
                  Back to Q&A sources
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                    <span className="text-lg font-semibold text-gray-900 break-all">{displayTitle}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                    <span>{displayQuestions.length} question(s)</span>
                    {displayImages.length > 0 && (
                      <>
                        <span>•</span>
                        <span>{displayImages.length} image(s)</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{formatBytes(qa.size_bytes || 0)}</span>
                    <span>•</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClasses}`}>
                      {getStatusIcon()}
                      {getStatusText()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditMode && (
                  <Button
                    onClick={() => setIsEditMode(true)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-gray-900">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Q&A actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Q&A
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
            <div className="w-full">
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                {isEditMode ? (
                  <div className="space-y-6">
                    {/* Edit Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Title (Optional)</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
                        placeholder="Enter title..."
                        disabled={isSaving}
                      />
                    </div>

                    {/* Edit Questions */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Questions</label>
                      <div className="space-y-2">
                        {editQuestions.map((q, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={q}
                              onChange={(e) => handleQuestionChange(e.target.value, index)}
                              placeholder="Enter question..."
                              disabled={isSaving}
                              className="flex-1"
                            />
                            {editQuestions.length > 1 && (
                              <button
                                onClick={() => handleRemoveQuestion(index)}
                                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                                disabled={isSaving}
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
                          disabled={isSaving}
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add question
                        </Button>
                      </div>
                    </div>

                    {/* Edit Answer */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Answer</label>
                      <Textarea
                        value={editAnswer}
                        onChange={(e) => setEditAnswer(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 min-h-[200px] resize-y"
                        placeholder="Enter answer..."
                        disabled={isSaving}
                      />
                      <div className="text-right text-xs text-gray-500 mt-1">
                        {formatBytes(new TextEncoder().encode(editAnswer).length)}
                      </div>
                    </div>

                    {/* Edit Images */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Images</label>
                      <div className="space-y-3">
                        {/* Add images button */}
                        <div>
                          <input
                            ref={editFileInputRef}
                            type="file"
                            multiple
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            onChange={handleImageSelect}
                            className="hidden"
                            disabled={isSaving}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => editFileInputRef.current?.click()}
                            disabled={isSaving || isUploadingImages}
                            className="flex items-center gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            Add images
                          </Button>
                        </div>

                        {/* Image grid */}
                        {(editImages.length > 0 || editNewImages.length > 0) && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {/* Existing images */}
                            {editImages.map((imageUrl, idx) => (
                              <div key={`existing-${idx}`} className="relative group">
                                <div className="aspect-square bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                  <img
                                    src={imageUrl}
                                    alt={`Image ${idx + 1}`}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExistingImage(idx)}
                                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                  disabled={isSaving}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                            {/* New images to add */}
                            {editNewImages.map((file, idx) => (
                              <div key={`new-${idx}`} className="relative group">
                                <div className="aspect-square bg-gray-50 rounded-lg border-2 border-green-500 overflow-hidden">
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={`New ${idx + 1}`}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveNewImage(idx)}
                                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                  disabled={isSaving}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                                <div className="absolute bottom-2 left-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded shadow-md">
                                  New
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Save/Cancel buttons */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancel}
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving || editQuestions.every(q => !q.trim()) || !editAnswer.trim()}
                        className="border-gray-300"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Questions Section */}
                    <div>
                      <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-3">Questions</h3>
                      <div className="space-y-2">
                        {displayQuestions.map((question: string, index: number) => (
                          <div key={index} className="flex items-start gap-2">
                            <span className="text-sm text-gray-500 mt-0.5">{index + 1}.</span>
                            <p className="text-sm text-gray-900 flex-1">{question}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Answer Section */}
                    <div>
                      <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-3">Answer</h3>
                      <pre className="leading-7 text-gray-800 whitespace-pre-wrap font-sans text-[0.95rem]">
                        {qa.answer}
                      </pre>
                    </div>

                    {/* Images Section */}
                    {displayImages.length > 0 && (
                      <div>
                        <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-3">Images</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {displayImages.map((imageUrl: string, idx: number) => (
                            <div
                              key={idx}
                              className="relative group cursor-pointer"
                              onClick={() => setSelectedImage(imageUrl)}
                            >
                              <div className="aspect-square bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors overflow-hidden">
                                <img
                                  src={imageUrl}
                                  alt={`Image ${idx + 1}`}
                                  className="w-full h-full object-contain hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity pointer-events-none" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
              <p className="text-gray-500">Created</p>
              <p className="text-gray-900">{qa.created_at ? new Date(qa.created_at).toLocaleString() : '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Last updated</p>
              <p className="text-gray-900">
                {qa.updated_at
                  ? new Date(qa.updated_at).toLocaleString()
                  : qa.created_at
                    ? formatDistanceToNow(new Date(qa.created_at), { addSuffix: true })
                    : '—'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Size</p>
              <p className="text-gray-900">{formatBytes(qa.size_bytes || 0)}</p>
            </div>
            <div>
              <p className="text-gray-500">Questions</p>
              <p className="text-gray-900">{displayQuestions.length}</p>
            </div>
            {displayImages.length > 0 && (
              <div>
                <p className="text-gray-500">Images</p>
                <p className="text-gray-900">{displayImages.length}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500">Type</p>
              <p className="text-gray-900">Q&A pair</p>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-4xl max-h-full relative">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-700" />
            </button>
            <img
              src={selectedImage}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  )
}