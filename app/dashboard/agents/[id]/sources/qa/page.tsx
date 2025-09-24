'use client'

import { useState, useEffect, useRef } from 'react'
import { AlertCircle, Plus, HelpCircle, Edit, Trash2, X, MoreHorizontal, Upload, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useParams } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'
import SourcesSidebar from '@/components/agents/sources-sidebar'
import { CustomSelect } from '@/components/ui/custom-select'
import { FloatingActionBar } from '@/components/ui/floating-action-bar'
import { Checkbox } from '@/components/ui/checkbox'
import { uploadMultipleImages, isValidImageType, validateImageSize, deleteMultipleImages } from '@/lib/supabase/storage'

interface QASource {
  id: string
  title?: string
  question: string // Keep for backward compatibility
  questions?: string[] // New array format
  answer: string
  images?: string[] // Image URLs
  size_bytes: number
  created_at: string
  metadata?: {
    images?: string[]
    has_images?: boolean
    title?: string
  }
}

export default function QAPage() {
  const params = useParams()
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<string[]>([''])
  const [answer, setAnswer] = useState('')
  const [showRetrainingAlert, setShowRetrainingAlert] = useState(false)
  const [qaItems, setQaItems] = useState<QASource[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQuestions, setEditQuestions] = useState<string[]>([''])
  const [editAnswer, setEditAnswer] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('Default')
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; items: Set<string> | null }>({
    isOpen: false,
    items: null
  })

  // Image handling states
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([])
  const [editImages, setEditImages] = useState<string[]>([])
  const [editNewImages, setEditNewImages] = useState<File[]>([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  const handleQuestionChange = (value: string, index: number) => {
    const newQuestions = [...questions]
    newQuestions[index] = value
    setQuestions(newQuestions)
    if (value && !showRetrainingAlert) {
      setShowRetrainingAlert(true)
    }
  }

  const addQuestion = () => {
    setQuestions([...questions, ''])
  }

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      const newQuestions = questions.filter((_, i) => i !== index)
      setQuestions(newQuestions)
    }
  }

  const handleAnswerChange = (value: string) => {
    setAnswer(value)
    if (value && !showRetrainingAlert) {
      setShowRetrainingAlert(true)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    console.log('Files selected:', files.length, files.map(f => ({ name: f.name, size: f.size, type: f.type })))

    // Validate files
    const validFiles = files.filter(file => {
      if (!isValidImageType(file)) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not a valid image file`,
          variant: 'destructive'
        })
        return false
      }
      if (!validateImageSize(file)) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds 5MB limit`,
          variant: 'destructive'
        })
        return false
      }
      return true
    })

    console.log('Valid files after validation:', validFiles.length)

    if (validFiles.length > 0) {
      const newSelectedImages = [...selectedImages, ...validFiles]
      setSelectedImages(newSelectedImages)
      console.log('Total selected images:', newSelectedImages.length)

      // Create preview URLs
      const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file))
      setImagePreviewUrls([...imagePreviewUrls, ...newPreviewUrls])
    }
  }

  const removeImage = (index: number) => {
    // Clean up object URL to prevent memory leak
    URL.revokeObjectURL(imagePreviewUrls[index])

    setSelectedImages(selectedImages.filter((_, i) => i !== index))
    setImagePreviewUrls(imagePreviewUrls.filter((_, i) => i !== index))
  }

  const removeUploadedImage = (index: number) => {
    setUploadedImageUrls(uploadedImageUrls.filter((_, i) => i !== index))
  }

  useEffect(() => {
    fetchQASources()
  }, [])

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

  const fetchQASources = async () => {
    try {
      const response = await fetch(`/api/agents/${params.id}/sources/qa`)
      if (response.ok) {
        const data = await response.json()

        // Ensure images are properly extracted from metadata if needed
        const processedSources = (data.sources || []).map((item: any) => {
          // Check if images array exists and is valid
          let images = []
          if (Array.isArray(item.images) && item.images.length > 0) {
            images = item.images
          } else if (Array.isArray(item.metadata?.images) && item.metadata.images.length > 0) {
            images = item.metadata.images
          }

          return {
            ...item,
            images: images
          }
        })

        console.log('Fetched Q&A sources:', processedSources)
        // Log items with images
        processedSources.forEach((item: any) => {
          if (item.images && item.images.length > 0) {
            console.log(`Q&A "${item.title}" has ${item.images.length} images:`, item.images)
          }
        })
        setQaItems(processedSources)
      }
    } catch (error) {
      console.error('Error fetching Q&A:', error)
    }
  }

  const handleAddQA = async () => {
    const validQuestions = questions.filter(q => q.trim() !== '')

    if (validQuestions.length === 0 || !answer) {
      toast({
        title: 'Error',
        description: 'Please fill in at least one question and an answer',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    setIsUploadingImages(true)

    console.log('handleAddQA called with:', {
      selectedImagesCount: selectedImages.length,
      selectedImages: selectedImages.map(f => ({ name: f.name, size: f.size })),
      questionsCount: validQuestions.length,
      title,
      answer: answer.substring(0, 50)
    })

    try {
      // Upload images first if any
      let imageUrls: string[] = []
      if (selectedImages.length > 0) {
        console.log('Starting upload of', selectedImages.length, 'images')
        const uploadResults = await uploadMultipleImages(selectedImages, params.id as string, 'qa')
        console.log('Upload results:', uploadResults)
        imageUrls = uploadResults.map(result => result.url)
        console.log('Uploaded images to storage:', imageUrls)
      } else {
        console.log('No images to upload')
      }

      const requestData = {
        questions: validQuestions, // Send as array
        answer,
        title,
        images: imageUrls
      }
      console.log('Sending Q&A data:', requestData)

      const response = await fetch(`/api/agents/${params.id}/sources/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      })

      if (response.ok) {
        setTitle('')
        setQuestions(['']) // Reset to single empty question
        setAnswer('')

        // Clear images
        imagePreviewUrls.forEach(url => URL.revokeObjectURL(url))
        setSelectedImages([])
        setImagePreviewUrls([])

        // Fetch fresh data to ensure images are loaded
        await fetchQASources()

        setRefreshTrigger(prev => prev + 1)
        toast({
          title: 'Success',
          description: 'Q&A pair added successfully',
        })
        setShowRetrainingAlert(true)
      } else {
        throw new Error('Failed to add Q&A')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add Q&A pair',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
      setIsUploadingImages(false)
    }
  }

  const handleUpdateQA = async (id: string) => {
    const validQuestions = editQuestions.filter(q => q.trim() !== '')

    if (validQuestions.length === 0 || !editAnswer) return

    setIsUploadingImages(true)

    try {
      // Upload new images if any
      let newImageUrls: string[] = []
      if (editNewImages.length > 0) {
        const uploadResults = await uploadMultipleImages(editNewImages, params.id as string, 'qa')
        newImageUrls = uploadResults.map(result => result.url)
      }

      // Combine existing and new image URLs
      const allImages = [...editImages, ...newImageUrls]

      console.log('Updating Q&A with:', {
        sourceId: id,
        questionsCount: validQuestions.length,
        existingImages: editImages,
        newImages: newImageUrls,
        totalImages: allImages
      })

      const response = await fetch(`/api/agents/${params.id}/sources/qa`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: id,
          questions: validQuestions, // Send as array
          answer: editAnswer,
          title: editTitle,
          images: allImages
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Update response:', data)
        console.log('Images in response:', data.source?.images)

        // Fetch fresh data to ensure images are loaded
        await fetchQASources()
        setEditingId(null)
        setEditImages([])
        setEditNewImages([])
        setRefreshTrigger(prev => prev + 1)
        toast({
          title: 'Success',
          description: 'Q&A pair updated successfully',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update Q&A pair',
        variant: 'destructive',
      })
    } finally {
      setIsUploadingImages(false)
    }
  }

  const handleDeleteItems = async () => {
    const items = deleteConfirmation.items
    if (!items || items.size === 0) return

    try {
      const response = await fetch(`/api/agents/${params.id}/sources/qa`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: Array.from(items) }),
      })

      if (response.ok) {
        setQaItems(qaItems.filter(item => !items.has(item.id)))
        setSelectedItems(new Set())
        setDeleteConfirmation({ isOpen: false, items: null })
        setRefreshTrigger(prev => prev + 1)
        toast({
          title: 'Success',
          description: `Deleted ${items.size} Q&A pair(s)`,
        })
      } else {
        throw new Error('Failed to delete')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete Q&A pairs',
        variant: 'destructive',
      })
    } finally {
      setDeleteConfirmation({ isOpen: false, items: null })
    }
  }

  const openDeleteConfirmation = (itemsToDelete?: Set<string>) => {
    const items = itemsToDelete || selectedItems
    if (items.size === 0) return
    setDeleteConfirmation({ isOpen: true, items })
  }

  const handleDeleteSingleItem = (itemId: string) => {
    openDeleteConfirmation(new Set([itemId]))
  }

  const handleSelectAll = () => {
    if (selectedItems.size === qaItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(qaItems.map(item => item.id)))
    }
  }

  const calculateTotalSize = () => {
    return qaItems.reduce((total, item) => total + (item.size_bytes || 0), 0)
  }

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
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

          {/* Add Q&A Section */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Q&A</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Title</label>
                  <Input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Refund requests"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Question</label>
                  <div className="space-y-2">
                    {questions.map((q, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          type="text"
                          value={q}
                          onChange={(e) => handleQuestionChange(e.target.value, index)}
                          placeholder="Ex: How do I request a refund?"
                          className="flex-1"
                        />
                        {questions.length > 1 && (
                          <button
                            onClick={() => removeQuestion(index)}
                            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <X className="h-4 w-4 text-gray-500" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addQuestion}
                    className="mt-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add question
                  </Button>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Answer</label>
                  <Textarea
                    value={answer}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder="Enter your answer..."
                    className="min-h-[200px] resize-none"
                  />
                  <div className="text-right text-xs text-gray-500 mt-1">
                    {new TextEncoder().encode(answer).length} B
                  </div>
                </div>

                {/* Image Upload Section */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Images (Optional)
                  </label>

                  <div className="space-y-3">
                    {/* Upload Button */}
                    <div className="flex items-center gap-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingImages}
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Upload Images
                      </Button>
                      <span className="text-sm text-gray-500">
                        {selectedImages.length > 0 && `${selectedImages.length} image(s) selected`}
                      </span>
                    </div>

                    {/* Image Preview Grid */}
                    {imagePreviewUrls.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {imagePreviewUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <div className="absolute bottom-1 left-1 text-xs bg-black bg-opacity-50 text-white px-1 rounded">
                              {(selectedImages[index].size / 1024).toFixed(0)} KB
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleAddQA}
                    disabled={isLoading || questions.every(q => !q.trim()) || !answer}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    {isLoading ? 'Adding...' : 'Add Q&A'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Q&A Sources List */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Q&A sources</h2>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedItems.size === qaItems.length && qaItems.length > 0}
                    onChange={() => handleSelectAll()}
                    className="cursor-pointer"
                  />
                  <label
                    onClick={handleSelectAll}
                    className="text-sm text-gray-700 hover:text-gray-900 cursor-pointer select-none"
                  >
                    Select all
                  </label>
                </div>
                {selectedItems.size > 0 && (
                  <span className="text-sm text-gray-500">
                    All {selectedItems.size} items on this page are selected
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
                    options={['Default', 'Newest', 'Oldest', 'Alphabetical (A-Z)', 'Alphabetical (Z-A)', 'Size (Smallest)', 'Size (Largest)']}
                  />
                </div>
              </div>
            </div>

            {qaItems.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <p className="text-sm text-gray-500 text-center">No Q&A pairs added yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {qaItems
                  .filter(item => {
                    if (!searchQuery) return true
                    const questionsToSearch = item.questions || [item.question]
                    return questionsToSearch.some(q => q.toLowerCase().includes(searchQuery.toLowerCase())) ||
                           item.answer.toLowerCase().includes(searchQuery.toLowerCase())
                  })
                  .sort((a, b) => {
                    switch (sortBy) {
                      case 'Newest':
                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                      case 'Oldest':
                        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                      case 'Alphabetical (A-Z)':
                        return a.question.localeCompare(b.question)
                      case 'Alphabetical (Z-A)':
                        return b.question.localeCompare(a.question)
                      case 'Size (Smallest)':
                        return a.size_bytes - b.size_bytes
                      case 'Size (Largest)':
                        return b.size_bytes - a.size_bytes
                      default:
                        return 0
                    }
                  })
                  .map((item) => (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-lg">
                    {editingId === item.id ? (
                      <div className="p-4 space-y-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Questions</label>
                          {editQuestions.map((q, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                value={q}
                                onChange={(e) => {
                                  const newQuestions = [...editQuestions]
                                  newQuestions[index] = e.target.value
                                  setEditQuestions(newQuestions)
                                }}
                                placeholder="Question"
                              />
                              {editQuestions.length > 1 && (
                                <button
                                  onClick={() => {
                                    const newQuestions = editQuestions.filter((_, i) => i !== index)
                                    setEditQuestions(newQuestions)
                                  }}
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
                            onClick={() => setEditQuestions([...editQuestions, ''])}
                            className="text-sm text-gray-600 hover:text-gray-900"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add question
                          </Button>
                        </div>
                        <Textarea
                          value={editAnswer}
                          onChange={(e) => setEditAnswer(e.target.value)}
                          placeholder="Answer"
                          className="min-h-[100px]"
                        />

                        {/* Images in Edit Mode */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-700">Images</label>
                          <div className="space-y-2">
                            {/* Add new images button */}
                            <div className="flex items-center gap-2">
                              <input
                                ref={editFileInputRef}
                                type="file"
                                multiple
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                onChange={(e) => {
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
                                }}
                                className="hidden"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => editFileInputRef.current?.click()}
                                className="flex items-center gap-1"
                              >
                                <Plus className="h-3 w-3" />
                                Add images
                              </Button>
                            </div>

                            {/* Image grid */}
                            {(editImages.length > 0 || editNewImages.length > 0) && (
                              <div className="flex gap-2 flex-wrap">
                                {/* Existing images */}
                                {editImages.map((imageUrl, idx) => (
                                  <div key={`existing-${idx}`} className="relative group">
                                    <img
                                      src={imageUrl}
                                      alt={`Image ${idx + 1}`}
                                      className="h-16 w-16 object-cover rounded border border-gray-200"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setEditImages(editImages.filter((_, i) => i !== idx))}
                                      className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                                {/* New images to add */}
                                {editNewImages.map((file, idx) => (
                                  <div key={`new-${idx}`} className="relative group">
                                    <img
                                      src={URL.createObjectURL(file)}
                                      alt={`New ${idx + 1}`}
                                      className="h-16 w-16 object-cover rounded border-2 border-green-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setEditNewImages(editNewImages.filter((_, i) => i !== idx))}
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

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateQA(item.id)}
                            className="bg-gray-900 hover:bg-gray-800 text-white"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onChange={(e: any) => {
                              const newSelected = new Set(selectedItems)
                              if (e.target.checked) {
                                newSelected.add(item.id)
                              } else {
                                newSelected.delete(item.id)
                              }
                              setSelectedItems(newSelected)
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            {/* Show only title or first question */}
                            <p className="text-sm font-medium text-gray-900">
                              {item.title || item.metadata?.title || (item.questions ? item.questions[0] : item.question.split(' | ')[0])}
                            </p>

                            {/* Show answer truncated */}
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.answer}</p>

                            {/* Compact info row */}
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-gray-500">
                                {item.questions?.length || item.question.split(' | ').length} question(s)
                              </span>
                              {item.images && Array.isArray(item.images) && item.images.length > 0 && (
                                <>
                                  <span className="text-xs text-gray-400">·</span>
                                  <span className="text-xs text-gray-500">
                                    {item.images.length} photo(s)
                                  </span>
                                </>
                              )}
                              <span className="text-xs text-gray-400">·</span>
                              <span className="text-xs text-gray-500">
                                {new Date(item.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          {/* Actions Menu */}
                          <div className="relative dropdown-menu">
                            <button
                              className="p-1 hover:bg-gray-100 rounded"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenDropdown(openDropdown === item.id ? null : item.id)
                              }}
                            >
                              <MoreHorizontal className="h-4 w-4 text-gray-400" />
                            </button>
                            {openDropdown === item.id && (
                              <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                <button
                                  onClick={() => {
                                    setEditingId(item.id)
                                    setEditQuestions(item.questions || item.question.split(' | ').filter((q: string) => q.trim() !== ''))
                                    setEditAnswer(item.answer)
                                    setEditTitle(item.title || item.metadata?.title || '')
                                    // Ensure images is an array
                                    const images = Array.isArray(item.images) ? item.images : (item.metadata?.images && Array.isArray(item.metadata.images) ? item.metadata.images : [])
                                    console.log('Setting edit images:', { itemId: item.id, images, rawImages: item.images, metadataImages: item.metadata?.images })
                                    setEditImages(images)
                                    setEditNewImages([])
                                    setOpenDropdown(null)
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <Edit className="h-4 w-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenDropdown(null)
                                    handleDeleteSingleItem(item.id)
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
          {/* Add padding at bottom */}
          <div className="h-24"></div>
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
        selectedCount={selectedItems.size}
        onDelete={() => openDeleteConfirmation()}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-50 rounded-full">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Delete Q&A
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Are you sure you want to permanently delete {deleteConfirmation.items?.size || 0} source{deleteConfirmation.items?.size !== 1 ? 's' : ''}? All untrained sources will be permanently deleted and cannot be restored.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteConfirmation({ isOpen: false, items: null })}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteItems}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}