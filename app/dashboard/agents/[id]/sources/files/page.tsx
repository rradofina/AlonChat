'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Upload, FileText, AlertCircle, Loader2, Trash2, ChevronRight, X, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import SourcesSidebar from '@/components/agents/sources-sidebar'
import { FloatingActionBar } from '@/components/ui/floating-action-bar'
import { Checkbox } from '@/components/ui/checkbox'
import { FileViewer } from '@/components/agents/file-viewer'
import { UploadStatusModal, type UploadingFile } from '@/components/ui/upload-status-modal'

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
  const processingQueueRef = useRef(false)

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

    // Add files to upload queue
    setUploadingFiles(prev => [...prev, ...newUploadingFiles])
  }

  // Process the upload queue
  const processUploadQueue = async () => {
    if (processingQueueRef.current) return
    processingQueueRef.current = true
    setIsUploading(true)

    while (true) {
      // Get current state to find next waiting file
      let nextFile: (UploadingFile & { file?: File }) | undefined
      setUploadingFiles(current => {
        nextFile = current.find(f => f.status === 'waiting' && f.file)
        return current
      })

      if (!nextFile || !nextFile.file) {
        break
      }

      // Update status to uploading
      setUploadingFiles(prev => prev.map(f =>
        f.id === nextFile!.id ? { ...f, status: 'uploading' } : f
      ))

      try {
        const formData = new FormData()
        formData.append('files', nextFile.file!)

        const response = await fetch(`/api/agents/${params.id}/sources/files`, {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload file')
        }

        // Update status to processing
        setUploadingFiles(prev => prev.map(f =>
          f.id === nextFile!.id ? { ...f, status: 'processing' } : f
        ))

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Update status to success
        setUploadingFiles(prev => prev.map(f =>
          f.id === nextFile!.id ? { ...f, status: 'success' } : f
        ))

        // Remove successful uploads after delay
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== nextFile!.id))
        }, 3000)

        setShowRetrainingAlert(true)
        setRefreshTrigger(prev => prev + 1)
      } catch (error: any) {
        // Update status to error
        setUploadingFiles(prev => prev.map(f =>
          f.id === nextFile!.id
            ? { ...f, status: 'error', error: error.message || 'Failed to upload' }
            : f
        ))
      }
    }

    setIsUploading(false)
    processingQueueRef.current = false
    await fetchFiles() // Refresh the file list
  }

  // Add effect to process queue when files are added
  useEffect(() => {
    const hasWaitingFiles = uploadingFiles.some(f => f.status === 'waiting')
    if (hasWaitingFiles && !processingQueueRef.current) {
      processUploadQueue()
    }
  }, [uploadingFiles])

  const retryUpload = (fileId: string) => {
    setUploadingFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, status: 'waiting' as const } : f
    ))
  }

  const removeFromQueue = (fileId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== fileId))
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
      <div className="flex h-full">
        <FileViewer file={selectedFile} onBack={closeFileViewer} />
        <SourcesSidebar
          agentId={params.id as string}
          showRetrainingAlert={showRetrainingAlert}
          refreshTrigger={refreshTrigger}
        />
      </div>
    )
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
                                  openFileViewer(file.id)
                                }}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                              >
                                <ChevronRight className="h-4 w-4 text-gray-500" />
                              </button>
                            )}
                          </div>
                        </div>
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