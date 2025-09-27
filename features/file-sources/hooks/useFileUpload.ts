import { useState, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { FileUploadParams, UploadingFile } from '../types'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_EXTENSIONS = ['.txt', '.pdf', '.doc', '.docx', '.md', '.rtf', '.csv', '.json']

export function useFileUpload(agentId: string | string[]) {
  const id = Array.isArray(agentId) ? agentId[0] : agentId
  const queryClient = useQueryClient()
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const processingQueueRef = useRef(false)

  // Validate file before upload
  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" is too large. Maximum size is 50MB.`
    }

    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `File type "${extension}" is not supported. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
    }

    return null
  }

  // Process upload queue
  const processUploadQueue = useCallback(async () => {
    if (processingQueueRef.current) return
    processingQueueRef.current = true

    const pending = uploadingFiles.find(f => f.status === 'uploading')
    if (!pending) {
      processingQueueRef.current = false
      if (uploadingFiles.every(f => f.status === 'complete' || f.status === 'error')) {
        setIsUploading(false)
        queryClient.invalidateQueries({ queryKey: ['file-sources', id] })
      }
      return
    }

    try {
      // Create FormData for file upload
      const formData = new FormData()
      if (pending.file) {
        formData.append('file', pending.file)
      }

      // Upload with progress tracking
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          setUploadingFiles(prev =>
            prev.map(f =>
              f.id === pending.id ? { ...f, progress } : f
            )
          )
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          setUploadingFiles(prev =>
            prev.map(f =>
              f.id === pending.id
                ? { ...f, status: 'complete', progress: 100 }
                : f
            )
          )
        } else {
          throw new Error('Upload failed')
        }
      })

      xhr.addEventListener('error', () => {
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === pending.id
              ? { ...f, status: 'error', error: 'Upload failed' }
              : f
          )
        )
      })

      xhr.open('POST', `/api/agents/${id}/sources/files`)
      xhr.send(formData)

      // Wait for completion
      await new Promise((resolve) => {
        xhr.addEventListener('loadend', resolve)
      })

    } catch (error) {
      setUploadingFiles(prev =>
        prev.map(f =>
          f.id === pending.id
            ? { ...f, status: 'error', error: 'Upload failed' }
            : f
        )
      )
    }

    processingQueueRef.current = false
    // Process next file in queue
    setTimeout(() => processUploadQueue(), 100)
  }, [uploadingFiles, id, queryClient])

  // Upload files
  const uploadFiles = useCallback(async (files: File[]) => {
    if (!files.length) return

    // Validate all files
    const validationErrors: string[] = []
    const validFiles: File[] = []

    for (const file of files) {
      const error = validateFile(file)
      if (error) {
        validationErrors.push(error)
      } else {
        validFiles.push(file)
      }
    }

    // Show validation errors
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error))
    }

    // Exit if no valid files
    if (validFiles.length === 0) return

    // Create uploading file entries
    const newUploadingFiles: UploadingFile[] = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      status: 'uploading' as const,
      progress: 0,
      file,
    }))

    setUploadingFiles(prev => [...prev, ...newUploadingFiles])
    setIsUploading(true)

    // Start processing queue
    processUploadQueue()
  }, [processUploadQueue])

  // Clear completed uploads
  const clearCompletedUploads = useCallback(() => {
    setUploadingFiles(prev => prev.filter(f => f.status === 'uploading'))
  }, [])

  // Cancel upload
  const cancelUpload = useCallback((fileId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== fileId))
  }, [])

  return {
    uploadingFiles,
    isUploading,
    uploadFiles,
    clearCompletedUploads,
    cancelUpload,
  }
}

// Hook for drag and drop
export function useFileDragDrop(onDrop: (files: File[]) => void) {
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounter.current = 0

    const files: File[] = []
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(file => {
        files.push(file)
      })
    }

    if (files.length > 0) {
      onDrop(files)
    }
  }, [onDrop])

  return {
    isDragging,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  }
}