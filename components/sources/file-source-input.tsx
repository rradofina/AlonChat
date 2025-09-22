'use client'

import { useState, useRef } from 'react'
import { Upload, FileText } from 'lucide-react'

interface FileSourceInputProps {
  onAddSource: (data: any, name: string, size: number) => void
}

export function FileSourceInput({ onAddSource }: FileSourceInputProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | null) => {
    if (!files) return

    Array.from(files).forEach(file => {
      // In a real app, you'd upload the file to storage
      // For now, we'll just store file metadata
      const data = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        lastModified: file.lastModified
      }
      onAddSource(data, file.name, file.size)
    })
  }

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
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="font-medium mb-2">Add files</h3>
        {/* Warning message */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <span className="text-amber-600">ℹ</span>
          <span>If you are uploading a PDF, make sure you can select/highlight the text.</span>
        </div>
      </div>

      {/* Upload area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600 mb-2">
          Drag & drop files here, or click to select files
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Supported file types: pdf, doc, docx, txt
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
        >
          Select Files
        </button>
      </div>
    </div>
  )
}