'use client'

import { HelpCircle, MoreHorizontal, Edit, Trash2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { QASource } from '../types'

interface QASourceCardProps {
  source: QASource
  isSelected: boolean
  onSelect: (checked: boolean) => void
  onView: (source: QASource) => void
  onEdit: (source: QASource) => void
  onDelete: (sourceId: string) => void
}

export function QASourceCard({
  source,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
}: QASourceCardProps) {
  const questions = source.metadata?.questions || []
  const answer = source.metadata?.answer || ''
  const images = source.metadata?.images || []

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

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="mt-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            aria-label={`Select ${source.name}`}
          />
        </div>

        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="p-2 bg-blue-50 rounded-lg">
            <HelpCircle className="h-5 w-5 text-blue-600" />
          </div>
        </div>

        {/* Content */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onView(source)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                {source.name}
              </p>

              {/* Questions Preview */}
              {questions.length > 0 && (
                <div className="mt-1">
                  <p className="text-xs text-gray-500">
                    {questions.length} question{questions.length > 1 ? 's' : ''}:
                  </p>
                  <p className="text-xs text-gray-600 italic">
                    "{truncateText(questions[0], 100)}"
                    {questions.length > 1 && ` +${questions.length - 1} more`}
                  </p>
                </div>
              )}

              {/* Answer Preview */}
              {answer && (
                <p className="text-xs text-gray-600 mt-1">
                  {truncateText(answer, 150)}
                </p>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-gray-500">
                  {formatDate(source.created_at)}
                </span>
                {images.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {images.length} image{images.length > 1 ? 's' : ''}
                  </span>
                )}
                {source.chunk_count && (
                  <span className="text-xs text-gray-500">
                    {source.chunk_count} chunks
                  </span>
                )}
              </div>

              {/* Status */}
              <div className="mt-2">
                {source.status === 'ready' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                    Ready
                  </span>
                )}
                {source.status === 'processing' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">
                    Processing...
                  </span>
                )}
                {source.status === 'error' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">
                    Error
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(source)}>
              <ChevronRight className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(source)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(source.id)}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}