'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, FileText, Calendar, HardDrive, Clock, CheckCircle, AlertCircle, Loader2, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface FileViewerProps {
  file: any
  onBack: () => void
}

export function FileViewer({ file, onBack }: FileViewerProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [showSidebar, setShowSidebar] = useState(true)
  const [content, setContent] = useState<string>('')
  const [pages, setPages] = useState<any[]>([])

  useEffect(() => {
    // Set up content and pages
    if (file.content) {
      setContent(file.content)
    }

    // Check if we have page data in metadata
    if (file.metadata?.pages && Array.isArray(file.metadata.pages)) {
      setPages(file.metadata.pages)
    } else if (file.content) {
      // If no pages, treat entire content as single page
      setPages([{ pageNumber: 1, content: file.content }])
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

  const totalPages = pages.length || 1
  const currentPageContent = pages[currentPage - 1]?.content || content

  const goToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum)
    }
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Left Sidebar - Page Navigation */}
      {showSidebar && totalPages > 1 && (
        <div className="w-64 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-medium text-sm text-gray-900">Pages</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-1">
              {pages.map((page, index) => (
                <button
                  key={index}
                  onClick={() => goToPage(index + 1)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between group ${
                    currentPage === index + 1
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className="text-sm">Page {index + 1}</span>
                  {currentPage === index + 1 && (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header Bar */}
        <div className="bg-white border-b px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to files
              </button>

              {totalPages > 1 && (
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                  title="Toggle sidebar"
                >
                  {showSidebar ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
              )}

              <div className="h-6 w-px bg-gray-300" />

              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">{file.name}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{formatBytes(file.size_bytes || 0)}</span>
                <span>•</span>
                <span>{getStatusIcon()}</span>
                <span>{getStatusText()}</span>
              </div>
            </div>

            {/* Page Navigation Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-8">
            {currentPageContent ? (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-8">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {currentPageContent}
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

        {/* Footer with metadata */}
        <div className="bg-white border-t px-6 py-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span>Created: {new Date(file.created_at).toLocaleDateString()}</span>
              <span>•</span>
              <span>Updated: {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}</span>
            </div>
            {file.metadata?.file_type && (
              <span>Type: {file.metadata.file_type}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}