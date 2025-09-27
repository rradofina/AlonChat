'use client'

import { FileText, MoreHorizontal, Eye, Trash2, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { FileSource } from '../types'

interface FileSourceCardProps {
  file: FileSource
  isSelected: boolean
  onSelect: (checked: boolean) => void
  onView: (file: FileSource) => void
  onDelete: (fileId: string) => void
  onRestore?: (fileId: string) => void
}

export function FileSourceCard({
  file,
  isSelected,
  onSelect,
  onView,
  onDelete,
  onRestore,
}: FileSourceCardProps) {
  const isRemoved = file.status === 'removed'
  const fileExtension = file.name.split('.').pop()?.toUpperCase() || 'FILE'
  const fileSizeKB = file.size_kb || Math.ceil((file.size_bytes || 0) / 1024)

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60))
        return `${diffMins} min ago`
      }
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    }
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div
      className={`bg-white border rounded-lg p-4 transition-all ${
        isRemoved ? 'opacity-60' : 'hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="mt-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            aria-label={`Select ${file.name}`}
          />
        </div>

        {/* File Icon */}
        <div className="flex-shrink-0">
          <div className={`p-2 rounded-lg ${
            isRemoved ? 'bg-gray-100' : 'bg-blue-50'
          }`}>
            <FileText className={`h-5 w-5 ${
              isRemoved ? 'text-gray-400' : 'text-blue-600'
            }`} />
          </div>
        </div>

        {/* File Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                isRemoved ? 'text-gray-500 line-through' : 'text-gray-900'
              }`}>
                {file.name}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-500">
                  {fileExtension}
                </span>
                <span className="text-xs text-gray-500">
                  {formatFileSize(file.size_bytes || 0)}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(file.created_at)}
                </span>
                {file.chunk_count && (
                  <span className="text-xs text-gray-500">
                    {file.chunk_count} chunks
                  </span>
                )}
              </div>

              {/* Status Badge */}
              <div className="mt-2">
                {file.status === 'processing' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">
                    Processing...
                  </span>
                )}
                {file.status === 'ready' && !isRemoved && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                    Ready
                  </span>
                )}
                {file.status === 'error' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">
                    Error
                  </span>
                )}
                {isRemoved && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                    <Trash2 className="h-3 w-3 mr-1" />
                    Removed {file.removed_at ? formatDate(file.removed_at) : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onView(file)}
                  disabled={file.status === 'processing'}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Content
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isRemoved ? (
                  <DropdownMenuItem
                    onClick={() => onRestore?.(file.id)}
                  >
                    <RotateCw className="h-4 w-4 mr-2" />
                    Restore
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => onDelete(file.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}