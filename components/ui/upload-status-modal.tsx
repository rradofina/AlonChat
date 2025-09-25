'use client'

import { useState } from 'react'
import { FileText, Loader2, CheckCircle, XCircle, X, ChevronUp, ChevronDown, Clock, RotateCw } from 'lucide-react'

export interface UploadingFile {
  id: string
  name: string
  status: 'waiting' | 'uploading' | 'processing' | 'success' | 'error'
  error?: string
  progress?: number
  position?: number
}

interface UploadStatusModalProps {
  files: UploadingFile[]
  onClose: () => void
  onRetry?: (fileId: string) => void
  onRemove?: (fileId: string) => void
}

export function UploadStatusModal({ files, onClose, onRetry, onRemove }: UploadStatusModalProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const uploadingCount = files.filter(f => f.status === 'uploading').length
  const waitingCount = files.filter(f => f.status === 'waiting').length
  const processingCount = files.filter(f => f.status === 'processing').length
  const successCount = files.filter(f => f.status === 'success').length
  const errorCount = files.filter(f => f.status === 'error').length
  const totalCount = files.length

  const getStatusIcon = (status: UploadingFile['status']) => {
    switch (status) {
      case 'waiting':
        return <Clock className="h-4 w-4 text-gray-400" />
      case 'uploading':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusText = (status: UploadingFile['status']) => {
    switch (status) {
      case 'waiting':
        return 'Waiting in queue...'
      case 'uploading':
        return 'Uploading...'
      case 'processing':
        return 'Processing...'
      case 'success':
        return 'Complete'
      case 'error':
        return 'Failed'
      default:
        return 'Unknown'
    }
  }

  const getProgressText = () => {
    if (uploadingCount > 0) {
      return `Uploading ${uploadingCount}/${totalCount} files`
    } else if (processingCount > 0) {
      return `Processing ${processingCount}/${totalCount} files`
    } else if (waitingCount > 0) {
      return `${waitingCount} files waiting`
    } else if (errorCount > 0 && successCount > 0) {
      return `${successCount} completed, ${errorCount} failed`
    } else if (successCount === totalCount) {
      return `All ${totalCount} files completed`
    } else if (errorCount === totalCount) {
      return `All ${totalCount} files failed`
    }
    return `${totalCount} files`
  }

  if (files.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <div className="bg-white rounded-lg shadow-2xl border">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-3">
            <h3 className="font-medium text-sm text-gray-900">{getProgressText()}</h3>
            {(uploadingCount > 0 || processingCount > 0) && (
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title={isExpanded ? "Minimize" : "Expand"}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* File List */}
        {isExpanded && (
          <div className="max-h-96 overflow-y-auto">
            <div className="p-2">
              {files.map((file, index) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {/* File Number */}
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
                      {file.position || index + 1}
                    </span>
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {getStatusText(file.status)}
                    </p>
                  </div>

                  {/* Status Icon */}
                  <div className="flex items-center gap-2">
                    {getStatusIcon(file.status)}

                    {/* Action Buttons */}
                    {file.status === 'error' && (
                      <div className="flex items-center gap-1">
                        {onRetry && (
                          <button
                            onClick={() => onRetry(file.id)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Retry"
                          >
                            <RotateCw className="h-3.5 w-3.5 text-gray-500" />
                          </button>
                        )}
                        {onRemove && (
                          <button
                            onClick={() => onRemove(file.id)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Remove"
                          >
                            <X className="h-3.5 w-3.5 text-gray-500" />
                          </button>
                        )}
                      </div>
                    )}

                    {file.status === 'success' && onRemove && (
                      <button
                        onClick={() => onRemove(file.id)}
                        className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-all"
                        title="Remove"
                      >
                        <X className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {(uploadingCount > 0 || processingCount > 0) && (
          <div className="px-4 pb-3">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${((totalCount - waitingCount - uploadingCount - processingCount) / totalCount) * 100}%`
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}