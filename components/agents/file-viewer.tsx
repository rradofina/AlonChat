'use client'

import { ArrowLeft, FileText, Calendar, HardDrive, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface FileViewerProps {
  file: any
  onBack: () => void
}

export function FileViewer({ file, onBack }: FileViewerProps) {
  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  const getStatusIcon = () => {
    switch (file.status) {
      case 'ready':
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
    switch (file.status) {
      case 'ready':
        return 'Trained'
      case 'processing':
        return 'Processing...'
      case 'failed':
        return 'Failed'
      case 'error':
        return 'Error'
      default:
        return 'Pending'
    }
  }

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to files
          </button>
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-gray-400" />
            <h1 className="text-xl font-semibold text-gray-900">{file.name}</h1>
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Content Area */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="max-w-4xl mx-auto p-8">
            {file.content ? (
              <div className="bg-white rounded-lg shadow-sm border p-8">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {file.content}
                </pre>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-8">
                <div className="flex flex-col items-center justify-center py-12">
                  {file.status === 'processing' ? (
                    <>
                      <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
                      <p className="text-gray-500">Processing file content...</p>
                      <p className="text-sm text-gray-400 mt-2">This may take a few moments</p>
                    </>
                  ) : (
                    <>
                      <FileText className="h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-gray-500">No content available</p>
                      <p className="text-sm text-gray-400 mt-2">The file content could not be extracted</p>
                    </>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Metadata Sidebar */}
          <div className="w-80 border-l bg-white p-6 overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Details</h2>

          <div className="space-y-5">
            {/* Created */}
            <div>
              <div className="text-sm text-gray-500 mb-1">Created:</div>
              <div className="text-sm text-gray-900">
                {new Date(file.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>

            {/* Last Updated */}
            <div>
              <div className="text-sm text-gray-500 mb-1">Last updated:</div>
              <div className="text-sm text-gray-900">
                {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
              </div>
            </div>

            {/* Size */}
            <div>
              <div className="text-sm text-gray-500 mb-1">Size:</div>
              <div className="text-sm text-gray-900 font-medium">
                {formatBytes(file.size_bytes || 0)}
              </div>
            </div>

            {/* Status */}
            <div>
              <div className="text-sm text-gray-500 mb-1">Status:</div>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className={`text-sm font-medium ${
                  file.status === 'ready' ? 'text-green-700' :
                  file.status === 'processing' ? 'text-blue-700' :
                  file.status === 'failed' || file.status === 'error' ? 'text-red-700' :
                  'text-yellow-700'
                }`}>
                  {getStatusText()}
                </span>
              </div>
            </div>

            {/* File Type */}
            <div>
              <div className="text-sm text-gray-500 mb-1">File Type:</div>
              <div className="text-sm text-gray-900">
                {file.name.split('.').pop()?.toUpperCase() || 'Unknown'}
              </div>
            </div>

            {/* Additional Metadata */}
            {file.metadata && (
              <>
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Additional Information</h3>

                  {file.metadata.original_name && (
                    <div className="mb-3">
                      <div className="text-sm text-gray-500 mb-1">Original Name:</div>
                      <div className="text-sm text-gray-900 break-all">
                        {file.metadata.original_name}
                      </div>
                    </div>
                  )}

                  {file.metadata.file_type && (
                    <div>
                      <div className="text-sm text-gray-500 mb-1">MIME Type:</div>
                      <div className="text-sm text-gray-900">
                        {file.metadata.file_type}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Character/Word Count if content exists */}
            {file.content && (
              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Content Statistics</h3>
                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-gray-500">Characters:</div>
                    <div className="text-sm text-gray-900">{file.content.length.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Words:</div>
                    <div className="text-sm text-gray-900">
                      {file.content.split(/\s+/).filter((word: string) => word.length > 0).length.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Lines:</div>
                    <div className="text-sm text-gray-900">
                      {file.content.split('\n').length.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}