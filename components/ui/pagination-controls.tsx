import React from 'react'
import { Button } from './button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { CustomSelect } from './custom-select'

interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  rowsPerPage: number
  totalItems: number
  onPageChange: (page: number) => void
  onRowsPerPageChange: (rows: number) => void
  rowsPerPageOptions?: number[]
  showPagination: boolean
  itemsRange: { from: number; to: number; total: number }
  isFirstPage: boolean
  isLastPage: boolean
  itemLabel?: string
}

export function PaginationControls({
  currentPage,
  totalPages,
  rowsPerPage,
  totalItems,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [5, 10, 25, 50],
  showPagination,
  itemsRange,
  isFirstPage,
  isLastPage,
  itemLabel = 'item'
}: PaginationControlsProps) {
  if (!showPagination && totalItems > 0) {
    // Don't show anything when pagination is hidden
    return null
  }

  if (totalItems === 0) {
    return null
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-2 text-sm text-gray-600">
      {/* Left side - Rows per page only */}
      <div className="flex items-center gap-4">
        {showPagination && (
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <CustomSelect
              value={rowsPerPage.toString()}
              onChange={(value) => onRowsPerPageChange(Number(value))}
              options={rowsPerPageOptions.map(option => option.toString())}
              dropUp={true}
              compact={true}
            />
          </div>
        )}
      </div>

      {/* Right side - Page info and navigation */}
      {showPagination && (
        <div className="flex items-center gap-4">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex items-center gap-1">
            {/* First page button */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={isFirstPage}
              onClick={() => onPageChange(1)}
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            {/* Previous page button */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={isFirstPage}
              onClick={() => onPageChange(currentPage - 1)}
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Next page button */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={isLastPage}
              onClick={() => onPageChange(currentPage + 1)}
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Last page button */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={isLastPage}
              onClick={() => onPageChange(totalPages)}
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}