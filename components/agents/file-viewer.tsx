'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, FileText, CheckCircle, AlertCircle, Loader2, MoreHorizontal, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'

interface FileViewerProps {
  file: any
  onBack: () => void
}

export function FileViewer({ file, onBack }: FileViewerProps) {
  const [content, setContent] = useState<string>('')

  useEffect(() => {
    // Set up content and pages
    if (file.content) {
      setContent(file.content)
    }
  }, [file])

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
        return 'Ready'
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

  const statusBadgeClasses = (() => {
    switch (file.status) {
      case 'ready':
        return 'bg-green-100 text-green-700 border border-green-200'
      case 'processing':
        return 'bg-blue-100 text-blue-700 border border-blue-200'
      case 'error':
      case 'failed':
        return 'bg-red-100 text-red-700 border border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200'
    }
  })()

  return (
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
                Back to files
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-lg font-semibold text-gray-900 break-all">{file.name}</span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                  <span>{formatBytes(file.size_bytes || 0)}</span>
                  <span>•</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClasses}`}>
                    {getStatusIcon()}
                    {getStatusText()}
                  </span>
                  {file.metadata?.page_count && (
                    <>
                      <span>•</span>
                      <span>{file.metadata.page_count} pages</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-gray-900">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">File actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    // TODO: wire up delete action via callback when available
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete file
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
          <div className="w-full">
            {content ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <div className="mb-4 text-xs uppercase tracking-wide text-gray-400">
                  {file.name}
                </div>
                <div>
                  <pre className="leading-7 text-gray-800 whitespace-pre-wrap font-sans text-[0.95rem]">
                    {content}
                  </pre>
                </div>
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
      </div>

      {/* Details Sidebar */}
      <div className="w-80 border-l bg-gray-50 flex flex-col px-6 py-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Details</h3>
        </div>
        <div className="space-y-5 text-sm">
          <div>
            <p className="text-gray-500">Created</p>
            <p className="text-gray-900">{file.created_at ? new Date(file.created_at).toLocaleString() : '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Last updated</p>
            <p className="text-gray-900">
              {file.updated_at
                ? new Date(file.updated_at).toLocaleString()
                : formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Size</p>
            <p className="text-gray-900">{formatBytes(file.size_bytes || 0)}</p>
          </div>
          {file.metadata?.page_count && (
            <div>
              <p className="text-gray-500">Page count</p>
              <p className="text-gray-900">{file.metadata.page_count}</p>
            </div>
          )}
          {file.metadata?.file_type && (
            <div>
              <p className="text-gray-500">Type</p>
              <p className="text-gray-900 uppercase">{file.metadata.file_type}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}