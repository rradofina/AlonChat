'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Upload, FileText, AlertCircle, Loader2, Trash2, ChevronRight, X, RotateCw, MoreHorizontal, Eye } from 'lucide-react'
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
import { FloatingActionBar } from '@/components/ui/floating-action-bar'
import { Checkbox } from '@/components/ui/checkbox'
import { FileViewer } from '@/components/agents/file-viewer'
import { UploadStatusModal, type UploadingFile } from '@/components/ui/upload-status-modal'
import { usePagination } from '@/hooks/usePagination'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { CustomSelect } from '@/components/ui/custom-select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'

export default function FilesPage() {
  const params = useParams()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showRetrainingAlert, setShowRetrainingAlert] = useState(false)
  const [files, setFiles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [totalSize, setTotalSize] = useState(0)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [uploadingFiles, setUploadingFiles] = useState<(UploadingFile & { file?: File })[]>([])
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('Default')
  const processingQueueRef = useRef(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    fileIds: string[]
    fileName?: string
    onConfirm: () => void
  }>({ isOpen: false, fileIds: [], onConfirm: () => {} })

  // Use the pagination hook
  const {
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalPages,
    currentItems: currentFiles,
    showPagination,
    goToPage,
    isFirstPage,
    isLastPage,
    itemsRange
  } = usePagination({
    items: files,
    defaultRowsPerPage: 20,
    visibilityThreshold: 5,
    rowsPerPageOptions: [5, 10, 25, 50]
  })

  const allPageSelected = currentFiles.length > 0 && currentFiles.every(file => selectedFiles.includes(file.id))

  // Fetch files on mount and setup auto-refresh
  useEffect(() => {
    if (params.id) {
      fetchFiles()

      // Setup interval for auto-refresh (only for processing files)
      const interval = setInterval(async () => {
        // Fetch current files silently to check status
        try {
          const response = await fetch(`/api/agents/${params.id}/sources/files?includeRemoved=true`)
          if (response.ok) {
            const data = await response.json()
            const currentFiles = data.sources || []

            // Only update if there are processing files
            const hasProcessingFiles = currentFiles.some((f: any) => f.status === 'processing')
            if (hasProcessingFiles) {
              setFiles(currentFiles)
              // Calculate total size
              const total = currentFiles.reduce((sum: number, file: any) => sum + (file.size_bytes || 0), 0)
              setTotalSize(total)
            }
          }
        } catch (error) {
          // Silent fail for background refresh
          console.error('Background refresh error:', error)
        }
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [params.id])

  const fetchFiles = async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true)
      }
      // Don't include removed files by default - they'll be hidden from view
      const response = await fetch(`/api/agents/${params.id}/sources/files`)
      if (!response.ok) throw new Error('Failed to fetch files')
      const data = await response.json()
      setFiles(data.sources || [])
      // Pagination hook will automatically reset to page 1 when items change

      // Calculate total size
      const total = data.sources?.reduce((sum: number, file: any) => sum + (file.size_bytes || 0), 0) || 0
      setTotalSize(total)
    } catch (error) {
      console.error('Error fetching files:', error)
      if (showLoader) {
        toast({
          title: 'Error',
          description: 'Failed to load files',
          variant: 'destructive',
        })
      }
    } finally {
      // Always set loading to false after the first fetch
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return

    const newUploadingFiles: (UploadingFile & { file?: File })[] = []
    let position = uploadingFiles.length + 1

    // Validate and prepare files for queue
    Array.from(fileList).forEach(file => {
      const fileName = file.name.toLowerCase()

      // Check by extension - most reliable method
      const hasValidExtension = fileName.endsWith('.pdf') ||
                                fileName.endsWith('.doc') ||
                                fileName.endsWith('.docx') ||
                                fileName.endsWith('.txt')

      if (!hasValidExtension) {
        // Add to error list
        newUploadingFiles.push({
          id: crypto.randomUUID(),
          name: file.name,
          status: 'error',
          error: 'File must be PDF, DOC, DOCX, or TXT',
          position: position++
        })
      } else if (file.size > 30 * 1024 * 1024) {
        // File too large
        newUploadingFiles.push({
          id: crypto.randomUUID(),
          name: file.name,
          status: 'error',
          error: `File exceeds 30MB limit`,
          position: position++
        })
      } else {
        // Valid file - add to queue
        newUploadingFiles.push({
          id: crypto.randomUUID(),
          name: file.name,
          status: 'waiting',
          position: position++,
          // Store file in metadata for processing
          file
        })
      }
    })

    // Add files to upload queue and trigger processing
    setUploadingFiles(prev => {
      const updated = [...prev, ...newUploadingFiles]
      console.log('Files added to queue:', newUploadingFiles.length, 'Total in queue:', updated.length)
      return updated
    })
  }

  // Process upload queue
  useEffect(() => {
    if (uploadingFiles.length === 0 || processingQueueRef.current || !params.id) {
      return
    }

    const hasWaiting = uploadingFiles.some(f => f.status === 'waiting' && f.file)
    if (!hasWaiting) {
      return
    }

    const processQueue = async () => {
      console.log('Starting upload queue processing...', {
        totalFiles: uploadingFiles.length,
        waitingFiles: uploadingFiles.filter(f => f.status === 'waiting').length,
        agentId: params.id
      })

      processingQueueRef.current = true
      setIsUploading(true)

      // Process files one by one
      for (const fileToUpload of uploadingFiles) {
        if (fileToUpload.status !== 'waiting' || !fileToUpload.file) {
          continue
        }

        const fileId = fileToUpload.id
        const file = fileToUpload.file

        console.log(`Processing file: ${file.name}, size: ${file.size} bytes`)

        // Update to uploading
        setUploadingFiles(prev => prev.map(f =>
          f.id === fileId ? { ...f, status: 'uploading' as const } : f
        ))

        try {
          const formData = new FormData()
          formData.append('files', file)

          console.log(`Sending POST request to /api/agents/${params.id}/sources/files`)
          const response = await fetch(`/api/agents/${params.id}/sources/files`, {
            method: 'POST',
            body: formData,
          })

          console.log(`Response status: ${response.status}`)
          const data = await response.json()
          console.log('Response data:', data)

          if (!response.ok) {
            throw new Error(data.error || 'Failed to upload file')
          }

          // Check if any files were actually uploaded
          if (!data.sources || data.sources.length === 0) {
            console.error('No files were uploaded in the response')
            throw new Error('File processing failed - no files were saved')
          }

          // Check if the file has an error status
          const uploadedFile = data.sources[0]
          if (uploadedFile.status === 'error') {
            console.error('File has error status:', uploadedFile.error)
            throw new Error(uploadedFile.error || 'File processing failed')
          }

          // File uploaded successfully - immediately mark as success
          // No artificial delay needed since backend already processed it
          setUploadingFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, status: 'success' as const } : f
          ))

          // Refresh the files list to show the newly uploaded file
          console.log('Upload successful, refreshing files list...')
          await fetchFiles(false) // Don't show loading spinner for refresh

          // Remove after delay
          setTimeout(() => {
            setUploadingFiles(prev => prev.filter(f => f.id !== fileId))
          }, 3000)

          setShowRetrainingAlert(true)
        } catch (error: any) {
          console.error(`Upload error for ${file.name}:`, error)
          // Update to error
          setUploadingFiles(prev => prev.map(f =>
            f.id === fileId
              ? { ...f, status: 'error' as const, error: error.message || 'Failed to upload' }
              : f
          ))
        }
      }

      setIsUploading(false)
      processingQueueRef.current = false

      console.log('Fetching updated files list...')
      await fetchFiles(false) // Refresh the file list without loader
    }

    // Start processing
    processQueue()
  }, [uploadingFiles, params.id])

  const retryUpload = (fileId: string) => {
    setUploadingFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, status: 'waiting' as const } : f
    ))
  }

  const removeFromQueue = (fileId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const handleDeleteSelected = async () => {
    console.log('handleDeleteSelected called with selectedFiles:', selectedFiles)
    if (selectedFiles.length === 0) {
      console.log('No files selected, returning')
      return
    }

    setDeleteConfirmation({
      isOpen: true,
      fileIds: selectedFiles,
      fileName: selectedFiles.length > 1 ? `${selectedFiles.length} files` : undefined,
      onConfirm: async () => {

    console.log('Sending DELETE request for files:', selectedFiles)
    try {
      const response = await fetch(`/api/agents/${params.id}/sources/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: selectedFiles }),
      })

      console.log('Delete response status:', response.status)
      if (!response.ok) throw new Error('Failed to delete files')

      const data = await response.json()
      console.log('Delete response data:', data)

      toast({
        title: 'Success',
        description: data.message,
      })

      setSelectedFiles([])
      setShowRetrainingAlert(true)
      setRefreshTrigger(prev => prev + 1)
      await fetchFiles(false)
      setDeleteConfirmation({ isOpen: false, fileIds: [], onConfirm: () => {} })
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete files',
        variant: 'destructive',
      })
      setDeleteConfirmation({ isOpen: false, fileIds: [], onConfirm: () => {} })
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileUpload(e.dataTransfer.files)
  }

  const openFileViewer = (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (file) {
      setSelectedFile(file)
    }
  }

  const closeFileViewer = () => {
    setSelectedFile(null)
  }

  // Show file viewer if a file is selected
  if (selectedFile) {
    return (
      <FileViewer file={selectedFile} onBack={closeFileViewer} />
    )
  }

  return (
    <div className="flex h-full min-h-full bg-white">
      {/* Main Content Area */}
      <div className="flex-1 px-8 pt-8 pb-4 bg-white min-h-full overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Files</h1>
          <p className="text-sm text-gray-600 mb-6">
            Upload business documents, guides, or FAQs to train your AI Agent with accurate data.
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

          {/* Upload Section */}
          <div
            className={`bg-gray-50 border-2 ${isDragging ? 'border-gray-400 bg-gray-100' : 'border-gray-200'} border-dashed rounded-lg`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="p-12 text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-base font-medium text-gray-900 mb-2">
                Drag and drop files to upload
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Max file size: 30MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.txt,.doc,.docx"
                onChange={(e) => handleFileUpload(e.target.files)}
                disabled={isUploading}
              />
              <Button
                type="button"
                variant="outline"
                className="border-gray-300"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Browse files'
                )}
              </Button>
              <p className="text-xs text-gray-400 mt-3">
                Supported file types: pdf, doc, docx, txt
              </p>
            </div>
          </div>

          {/* File Sources List - Only show entire section when we have files or loading */}
          {(isLoading || files.length > 0) && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">File sources</h2>

              {/* Controls row - Only show when we have files */}
              {!isLoading && files.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={allPageSelected}
                      onChange={() => {
                        if (allPageSelected) {
                          setSelectedFiles(prev => prev.filter(id => !currentFiles.find(file => file.id === id)))
                        } else {
                          setSelectedFiles(prev => {
                            const newIds = currentFiles.map(file => file.id)
                            return Array.from(new Set([...prev, ...newIds]))
                          })
                        }
                      }}
                    />
                    <span className="text-sm text-gray-600">Select all</span>
                    {selectedFiles.length > 0 && (
                      <span className="ml-2 text-sm text-gray-500">
                        {selectedFiles.length} item(s) selected
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
            )}

            {/* Files List - No container, ultra-minimal */}
            <div>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : files.length === 0 ? null : (
                <div className="divide-y divide-gray-100">
                  {currentFiles.map((file) => (
                    <div key={file.id}>
                      <div
                        className={`flex items-center justify-between py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedFiles.includes(file.id) ? 'bg-gray-50' : ''
                        } ${
                          file.status === 'removed' ? 'opacity-60' : ''
                        }`}
                      >
                          <div
                            className="flex items-center gap-3 flex-1"
                            onClick={() => {
                              if (selectedFiles.includes(file.id)) {
                                setSelectedFiles(selectedFiles.filter(id => id !== file.id))
                              } else {
                                setSelectedFiles([...selectedFiles, file.id])
                              }
                            }}
                          >
                            <Checkbox
                              checked={selectedFiles.includes(file.id)}
                              onChange={(e: any) => {
                                // Don't call stopPropagation here - it's handled by onClick
                                if (e.target.checked) {
                                  setSelectedFiles([...selectedFiles, file.id])
                                } else {
                                  setSelectedFiles(selectedFiles.filter(id => id !== file.id))
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <FileText className="h-5 w-5 text-gray-400" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-md border ${
                                  file.status === 'ready' ? 'bg-green-50 text-green-700 border-green-300' :
                                  file.status === 'new' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                  file.status === 'pending_processing' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                                  file.status === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                  file.status === 'chunking' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                  file.status === 'removed' ? 'bg-red-50 text-red-700 border-red-300' :
                                  file.status === 'restored' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                                  file.status === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                  file.status === 'failed' ? 'bg-red-50 text-red-700 border-red-300' :
                                  file.status === 'error' ? 'bg-red-50 text-red-700 border-red-300' :
                                  'bg-blue-50 text-blue-700 border-blue-300'
                                }`}>
                                  {file.status === 'ready' ? 'Ready' :
                                   file.status === 'new' ? 'New' :
                                   file.status === 'pending_processing' ? 'Pending' :
                                   file.status === 'processing' ? 'Processing' :
                                   file.status === 'chunking' ? 'Chunking' :
                                   file.status === 'removed' ? 'Removed' :
                                   file.status === 'restored' ? 'Restored' :
                                   file.status === 'processing' ? 'Processing...' :
                                   file.status === 'failed' ? 'Failed' :
                                   file.status === 'error' ? 'Error' :
                                   'New'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                {formatBytes(file.size_bytes || 0)} • {new Date(file.created_at).toLocaleDateString()}
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
                                {(file.status === 'ready' || file.status === 'new') && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openFileViewer(file.id)
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View content
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                {file.status === 'error' && (
                                  <DropdownMenuItem
                                    onClick={async (e) => {
                                      e.stopPropagation()
                                      try {
                                        const response = await fetch(`/api/agents/${params.id}/sources/${file.id}/reprocess`, {
                                          method: 'POST',
                                        })

                                        if (!response.ok) throw new Error('Failed to reprocess file')

                                        toast({
                                          title: 'Processing',
                                          description: `Reprocessing "${file.name}"...`,
                                        })

                                        await fetchFiles(false)
                                      } catch (error) {
                                        toast({
                                          title: 'Error',
                                          description: 'Failed to reprocess file',
                                          variant: 'destructive',
                                        })
                                      }
                                    }}
                                  >
                                    <RotateCw className="h-4 w-4 mr-2" />
                                    Retry Processing
                                  </DropdownMenuItem>
                                )}
                                {file.status === 'removed' ? (
                                  <>
                                    <DropdownMenuItem
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        try {
                                          const response = await fetch(`/api/agents/${params.id}/sources/restore`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ sourceIds: [file.id] }),
                                          })

                                          if (!response.ok) throw new Error('Failed to restore file')

                                          const data = await response.json()
                                          toast({
                                            title: 'Success',
                                            description: `File "${file.name}" has been restored`,
                                          })

                                          setShowRetrainingAlert(true)
                                          await fetchFiles(false)
                                        } catch (error) {
                                          toast({
                                            title: 'Error',
                                            description: 'Failed to restore file',
                                            variant: 'destructive',
                                          })
                                        }
                                      }}
                                    >
                                      <RotateCw className="h-4 w-4 mr-2" />
                                      Restore
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        if (!confirm(`Permanently delete "${file.name}"? This action cannot be undone.`)) return

                                        try {
                                          const response = await fetch(`/api/agents/${params.id}/sources/permanent-delete`, {
                                            method: 'DELETE',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ sourceIds: [file.id] }),
                                          })

                                          if (!response.ok) throw new Error('Failed to permanently delete file')

                                          toast({
                                            title: 'Success',
                                            description: `File "${file.name}" has been permanently deleted`,
                                          })

                                          await fetchFiles(false)
                                        } catch (error) {
                                          toast({
                                            title: 'Error',
                                            description: 'Failed to permanently delete file',
                                            variant: 'destructive',
                                          })
                                        }
                                      }}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Permanently Delete
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDeleteConfirmation({
                                        isOpen: true,
                                        fileIds: [file.id],
                                        fileName: file.name,
                                        onConfirm: async () => {
                                          try {
                                            const response = await fetch(`/api/agents/${params.id}/sources/files`, {
                                              method: 'DELETE',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ sourceIds: [file.id] }),
                                            })

                                            if (!response.ok) throw new Error('Failed to delete file')

                                            const data = await response.json()
                                            toast({
                                              title: 'Success',
                                              description: `File "${file.name}" has been deleted`,
                                            })

                                            setShowRetrainingAlert(true)
                                            await fetchFiles(false)
                                            setDeleteConfirmation({ isOpen: false, fileIds: [], onConfirm: () => {} })
                                          } catch (error) {
                                            toast({
                                              title: 'Error',
                                              description: 'Failed to delete file',
                                              variant: 'destructive',
                                            })
                                            setDeleteConfirmation({ isOpen: false, fileIds: [], onConfirm: () => {} })
                                          }
                                        }
                                      })
                                    }}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (file.status !== 'removed') {
                                  openFileViewer(file.id)
                                }
                              }}
                              className={`p-1 rounded transition-colors ${
                                file.status === 'removed'
                                  ? 'cursor-not-allowed'
                                  : 'hover:bg-gray-100'
                              }`}
                              title={file.status === 'removed' ? 'Cannot view removed files' : 'View file details'}
                              disabled={file.status === 'removed'}
                            >
                              <ChevronRight className={`h-4 w-4 ${
                                file.status === 'removed' ? 'text-gray-300' : 'text-gray-500'
                              }`} />
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
              totalItems={files.length}
              onPageChange={goToPage}
              onRowsPerPageChange={(rows) => {
                setRowsPerPage(rows)
                // Clear selections when changing page size
                setSelectedFiles([])
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
              showPagination={showPagination}
              itemsRange={itemsRange}
              isFirstPage={isFirstPage}
              isLastPage={isLastPage}
              itemLabel="file"
            />
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      {!selectedFile && (
        <SourcesSidebar
          agentId={params.id as string}
          showRetrainingAlert={showRetrainingAlert}
          refreshTrigger={refreshTrigger}
        />
      )}

      {/* Upload Status Modal */}
      <UploadStatusModal
        files={uploadingFiles}
        onClose={() => setUploadingFiles([])}
        onRetry={retryUpload}
        onRemove={removeFromQueue}
      />

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedFiles.length}
        onDelete={handleDeleteSelected}
        showRestore={selectedFiles.some(id => {
          const file = files.find(f => f.id === id)
          return file?.status === 'removed'
        })}
        onRestore={async () => {
          // Only restore selected files that are actually removed
          const removedFileIds = selectedFiles.filter(id => {
            const file = files.find(f => f.id === id)
            return file?.status === 'removed'
          })

          if (removedFileIds.length === 0) return

          try {
            const response = await fetch(`/api/agents/${params.id}/sources/restore`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sourceIds: removedFileIds }),
            })

            if (!response.ok) throw new Error('Failed to restore files')

            const data = await response.json()
            toast({
              title: 'Success',
              description: data.message,
            })

            setSelectedFiles([])
            setShowRetrainingAlert(true)
            await fetchFiles(false)
          } catch (error) {
            toast({
              title: 'Error',
              description: 'Failed to restore files',
              variant: 'destructive',
            })
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setDeleteConfirmation({ isOpen: false, fileIds: [], onConfirm: () => {} })
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteConfirmation.fileName || 'this source'}?
              {deleteConfirmation.fileIds.length === 1 ? (
                <>
                  This action will remove the file from your sources.
                  Untrained files will be permanently deleted.
                  Trained files will be removed and permanently deleted when you retrain your agent.
                </>
              ) : (
                <>
                  This action will remove the selected files from your sources.
                  Untrained files will be permanently deleted.
                  Trained files will be removed and permanently deleted when you retrain your agent.
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