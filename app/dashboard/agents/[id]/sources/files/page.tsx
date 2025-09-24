'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Upload, FileText, AlertCircle, Loader2, Trash2, X, RotateCw, ChevronRight, ChevronDown, Calendar, HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import SourcesSidebar from '@/components/agents/sources-sidebar'
import { FloatingActionBar } from '@/components/ui/floating-action-bar'
import { Checkbox } from '@/components/ui/checkbox'

interface UploadingFile {
  id: string
  name: string
  status: 'uploading' | 'error' | 'success'
  error?: string
  progress?: number
  file?: File
}

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
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null)
  const [filePreview, setFilePreview] = useState<{ [key: string]: any }>({})
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Fetch files on mount and setup auto-refresh
  useEffect(() => {
    if (params.id) {
      fetchFiles()

      // Setup interval for auto-refresh (only for processing files)
      const interval = setInterval(async () => {
        // Fetch current files silently to check status
        try {
          const response = await fetch(`/api/agents/${params.id}/sources/files`)
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
      const response = await fetch(`/api/agents/${params.id}/sources/files`)
      if (!response.ok) throw new Error('Failed to fetch files')
      const data = await response.json()
      setFiles(data.sources || [])

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
      if (showLoader) {
        setIsLoading(false)
      }
    }
  }

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return

    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt']
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]

    const newUploadingFiles: UploadingFile[] = []
    const validFiles: File[] = []

    // Validate files
    Array.from(fileList).forEach(file => {
      const fileName = file.name.toLowerCase()
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()

      // Log for debugging
      console.log('File validation:', {
        name: file.name,
        type: file.type,
        ext: fileExt,
        size: file.size
      })

      // Check by extension - most reliable method
      const hasValidExtension = fileName.endsWith('.pdf') ||
                                fileName.endsWith('.doc') ||
                                fileName.endsWith('.docx') ||
                                fileName.endsWith('.txt')

      // Also check MIME type as backup
      const hasValidMimeType = file.type === 'application/pdf' ||
                               file.type === 'application/msword' ||
                               file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                               file.type === 'text/plain' ||
                               file.type === '' // Some systems don't set MIME type

      const isValidType = hasValidExtension // Rely primarily on extension

      if (!isValidType) {
        // Add to error list
        newUploadingFiles.push({
          id: crypto.randomUUID(),
          name: file.name,
          status: 'error',
          error: 'File must be PDF, DOC, DOCX, or TXT',
          file: file
        })
      } else if (file.size > 30 * 1024 * 1024) {
        // File too large
        newUploadingFiles.push({
          id: crypto.randomUUID(),
          name: file.name,
          status: 'error',
          error: `File exceeds 30MB limit`,
          file: file
        })
      } else {
        // Valid file
        const uploadId = crypto.randomUUID()
        validFiles.push(file)
        newUploadingFiles.push({
          id: uploadId,
          name: file.name,
          status: 'uploading',
          file: file
        })
      }
    })

    setUploadingFiles(prev => [...prev, ...newUploadingFiles])

    if (validFiles.length === 0) {
      return
    }

    setIsUploading(true)

    // Upload valid files
    for (const file of validFiles) {
      const formData = new FormData()
      formData.append('files', file)

      const uploadingFile = newUploadingFiles.find(f => f.file === file)
      if (!uploadingFile) continue

      try {
        const response = await fetch(`/api/agents/${params.id}/sources/files`, {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload file')
        }

        // Update status to success
        setUploadingFiles(prev => prev.map(f =>
          f.id === uploadingFile.id
            ? { ...f, status: 'success' }
            : f
        ))

        // Remove successful uploads after delay
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== uploadingFile.id))
        }, 3000)

        setShowRetrainingAlert(true)
        setRefreshTrigger(prev => prev + 1)
      } catch (error: any) {
        // Update status to error
        setUploadingFiles(prev => prev.map(f =>
          f.id === uploadingFile.id
            ? { ...f, status: 'error', error: error.message || 'Failed to upload' }
            : f
        ))
      }
    }

    setIsUploading(false)
    await fetchFiles() // Refresh the file list
  }

  const retryUpload = (uploadId: string) => {
    const uploadingFile = uploadingFiles.find(f => f.id === uploadId)
    if (!uploadingFile?.file) return

    const newFileList = new DataTransfer()
    newFileList.items.add(uploadingFile.file)

    // Remove from error list
    setUploadingFiles(prev => prev.filter(f => f.id !== uploadId))

    // Retry upload
    handleFileUpload(newFileList.files)
  }

  const removeUpload = (uploadId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== uploadId))
  }

  const handleDeleteSelected = async () => {
    if (selectedFiles.length === 0) return

    if (!confirm(`Delete ${selectedFiles.length} file(s)?`)) return

    try {
      const response = await fetch(`/api/agents/${params.id}/sources/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: selectedFiles }),
      })

      if (!response.ok) throw new Error('Failed to delete files')

      const data = await response.json()
      toast({
        title: 'Success',
        description: data.message,
      })

      setSelectedFiles([])
      setShowRetrainingAlert(true)
      setRefreshTrigger(prev => prev + 1)
      await fetchFiles()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete files',
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

  const toggleFileExpand = async (fileId: string) => {
    if (expandedFileId === fileId) {
      setExpandedFileId(null)
    } else {
      setExpandedFileId(fileId)
      // Fetch file preview if not already loaded
      if (!filePreview[fileId]) {
        const file = files.find(f => f.id === fileId)
        if (file) {
          // Use actual content from database if available
          let content = ''
          let pageCount = 1

          if (file.content) {
            // Use the actual extracted content from the database
            content = `${file.name}

Document Preview
================

${file.content}`

            // Estimate page count based on content length (roughly 3000 chars per page)
            pageCount = Math.max(1, Math.ceil(file.content.length / 3000))
          } else {
            // Fallback if content is not available yet
            content = `${file.name}

Document Preview
================

Content is being processed. Please check back in a moment.

File Type: ${file.name.split('.').pop()?.toUpperCase() || 'Unknown'}
Size: ${formatBytes(file.size_bytes || 0)}
Status: ${file.status || 'processing'}`
          }

          setFilePreview(prev => ({
            ...prev,
            [fileId]: {
              content,
              pageCount
            }
          }))
        }
      }
    }
  }

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
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
            className={`bg-white border-2 ${isDragging ? 'border-gray-400 bg-gray-50' : 'border-gray-200'} border-dashed rounded-lg`}
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

          {/* File Sources List */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">File sources</h2>

            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 cursor-pointer">
                <Checkbox
                  checked={selectedFiles.length === files.length && files.length > 0}
                  onChange={() => {
                    if (selectedFiles.length === files.length) {
                      setSelectedFiles([])
                    } else {
                      setSelectedFiles(files.map(f => f.id))
                    }
                  }}
                />
                <span>Select all</span>
              </label>
              {selectedFiles.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  All {selectedFiles.length} items on this page are selected
                </p>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : files.length === 0 ? (
                  <div className="flex items-center justify-center text-center py-8">
                    <div>
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-900">No files uploaded</p>
                      <p className="text-xs text-gray-500 mt-1">Upload files to get started</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div key={file.id}>
                        <div
                          className={`flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                            selectedFiles.includes(file.id) ? 'bg-gray-50' : ''
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
                                e.stopPropagation()
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
                              <p className="text-sm font-medium text-gray-900">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {formatBytes(file.size_bytes || 0)} • {new Date(file.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              file.status === 'ready' ? 'bg-green-100 text-green-800' :
                              file.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                              file.status === 'failed' ? 'bg-red-100 text-red-800' :
                              file.status === 'error' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {file.status === 'ready' ? 'Ready' :
                               file.status === 'processing' ? 'Processing...' :
                               file.status === 'failed' ? 'Failed' :
                               file.status === 'error' ? 'Error' :
                               'Pending'}
                            </span>
                            {file.status === 'ready' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFileExpand(file.id)
                                }}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                              >
                                {expandedFileId === file.id ? (
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-500" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expanded Preview Section */}
                        {expandedFileId === file.id && filePreview[file.id] && (
                          <div className="ml-12 mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-gray-700">File Preview</h4>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  {file.name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Created: {new Date(file.created_at).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <HardDrive className="h-3 w-3" />
                                  Size: {formatBytes(file.size_bytes || 0)}
                                </span>
                              </div>
                            </div>
                            <div className="bg-white p-4 rounded border border-gray-200 max-h-96 overflow-y-auto">
                              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                                {filePreview[file.id].content}
                              </pre>
                              {filePreview[file.id].pageCount && (
                                <p className="text-xs text-gray-500 mt-4 pt-4 border-t">
                                  Page 4 of {filePreview[file.id].pageCount}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
              <span>{files.length} file(s)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <SourcesSidebar
        agentId={params.id as string}
        showRetrainingAlert={showRetrainingAlert}
        refreshTrigger={refreshTrigger}
      />

      {/* Upload Status Bar - Fixed at bottom */}
      {uploadingFiles.length > 0 && (
        <div className="fixed bottom-0 right-0 left-0 bg-gray-900 text-white shadow-lg z-50">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  Uploading {uploadingFiles.filter(f => f.status === 'uploading').length}/
                  {uploadingFiles.length} files
                </span>
                {uploadingFiles.filter(f => f.status === 'uploading').length > 0 && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
              </div>
              <button
                onClick={() => setUploadingFiles([])}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* File upload items */}
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {uploadingFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between bg-gray-800 rounded px-3 py-2"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {file.status === 'uploading' && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    )}
                    {file.status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-red-400" />
                    )}
                    {file.status === 'success' && (
                      <FileText className="h-4 w-4 text-green-400" />
                    )}
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    {file.error && (
                      <span className="text-xs text-red-400 ml-2">
                        File must be a PDF or DOCX
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {file.status === 'error' && (
                      <>
                        <button
                          onClick={() => retryUpload(file.id)}
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <RotateCw className="h-3 w-3" />
                          Retry
                        </button>
                        <button
                          onClick={() => removeUpload(file.id)}
                          className="text-xs text-gray-400 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedFiles.length}
        onDelete={handleDeleteSelected}
        showRestore={files.some(f => f.status === 'removed')}
        onRestore={() => {
          // Handle restore functionality if needed
          toast({
            title: 'Restore',
            description: 'Restore functionality coming soon'
          })
        }}
      />
    </div>
  )
}