'use client'

import { useState } from 'react'
import { Upload, FileText, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function FilesPage() {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles(prev => [...prev, ...droppedFiles])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles(prev => [...prev, ...selectedFiles])
    }
  }

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Files</h1>

          {/* Info Banner */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">PDF files are text-only</p>
                <p>If you have charts and tables in the PDF, it's better to copy and paste them as text.</p>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging ? 'border-gray-400 bg-gray-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-gray-400" />
              </div>

              <p className="text-gray-900 font-medium mb-2">
                Drag & drop files here, or click to select files
              </p>

              <p className="text-sm text-gray-500 mb-6">
                Supported File Types: .pdf, .doc, .docx, .txt
              </p>

              <label htmlFor="file-upload">
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button asChild className="bg-gray-900 hover:bg-gray-800 text-white">
                  <span>Choose Files</span>
                </Button>
              </label>
            </div>
          </div>

          {/* Files List */}
          {files.length > 0 && (
            <div className="mt-6 space-y-2">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Selected Files</h3>
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <FileText className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-700 flex-1">{file.name}</span>
                  <span className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-96 border-l border-gray-200 bg-gray-50 p-6">
        <div className="space-y-6">
          {/* Sources Count */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl font-bold text-gray-900">10</span>
              <span className="text-sm text-gray-600">Links</span>
            </div>
            <div className="text-sm text-gray-500">231 KB</div>
          </div>

          {/* Total Size */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Total size</span>
              <span className="text-sm text-gray-600">231 KB / 400 KB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gray-900 h-2 rounded-full"
                style={{ width: '57.75%' }}
              />
            </div>
          </div>

          {/* Retrain Button */}
          <Button
            className="w-full bg-gray-900 hover:bg-gray-800 text-white"
            onClick={() => {}}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retrain agent
          </Button>
        </div>
      </div>
    </div>
  )
}