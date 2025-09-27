'use client'

import { useRef } from 'react'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFileUpload, useFileDragDrop } from '../hooks/useFileUpload'

interface FileUploadFormProps {
  agentId: string
  showRetrainingAlert?: boolean
  onUploadStart?: () => void
  onUploadComplete?: () => void
}

const ALLOWED_EXTENSIONS = ['.txt', '.pdf', '.doc', '.docx', '.md', '.rtf', '.csv', '.json']

export function FileUploadForm({
  agentId,
  showRetrainingAlert,
  onUploadStart,
  onUploadComplete,
}: FileUploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadFiles, isUploading } = useFileUpload(agentId)

  const handleFileSelect = (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length > 0) {
      onUploadStart?.()
      uploadFiles(fileArray).then(() => {
        onUploadComplete?.()
      })
    }
  }

  const { isDragging, dragHandlers } = useFileDragDrop((files) => {
    handleFileSelect(files)
  })

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">File Sources</h2>
            <p className="text-sm text-gray-500">Upload documents to train your agent</p>
          </div>
        </div>
      </div>

      {showRetrainingAlert && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-amber-900 font-medium">Agent needs retraining</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Adding new sources will require retraining your agent to include this content.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Drag and Drop Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        {...dragHandlers}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={(e) => {
            if (e.target.files) {
              handleFileSelect(e.target.files)
            }
          }}
        />

        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 mb-2">
          {isDragging ? 'Drop files here...' : 'Drag and drop files here, or click to browse'}
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Supported: {ALLOWED_EXTENSIONS.join(', ')} (Max 50MB per file)
        </p>

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Select Files'}
        </Button>
      </div>

      {/* Quick Tips */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 font-medium mb-1">Quick Tips:</p>
        <ul className="text-xs text-gray-500 space-y-0.5">
          <li>• Upload multiple files at once by selecting them together</li>
          <li>• Files are automatically processed and chunked for optimal performance</li>
          <li>• Larger files may take a moment to process</li>
        </ul>
      </div>
    </div>
  )
}