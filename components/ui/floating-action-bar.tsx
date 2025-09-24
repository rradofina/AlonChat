'use client'

import { Trash2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FloatingActionBarProps {
  selectedCount: number
  onDelete: () => void
  onRestore?: () => void
  showRestore?: boolean
}

export function FloatingActionBar({
  selectedCount,
  onDelete,
  onRestore,
  showRestore = false
}: FloatingActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-gray-900 text-white rounded-full px-6 py-3 shadow-2xl flex items-center gap-4">
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>

        <div className="h-6 w-px bg-gray-700" />

        <div className="flex items-center gap-2">
          <Button
            onClick={onDelete}
            variant="ghost"
            size="sm"
            className="text-white hover:text-red-400 hover:bg-gray-800 rounded-full px-4"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>

          {showRestore && onRestore && (
            <Button
              onClick={onRestore}
              variant="ghost"
              size="sm"
              className="text-white hover:text-green-400 hover:bg-gray-800 rounded-full px-4"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}