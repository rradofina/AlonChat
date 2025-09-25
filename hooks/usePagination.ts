import { useState, useMemo, useEffect } from 'react'

interface UsePaginationProps<T> {
  items: T[]
  defaultRowsPerPage?: number
  visibilityThreshold?: number
  rowsPerPageOptions?: number[]
}

interface UsePaginationReturn<T> {
  currentPage: number
  setCurrentPage: (page: number) => void
  rowsPerPage: number
  setRowsPerPage: (rows: number) => void
  totalPages: number
  currentItems: T[]
  startIndex: number
  endIndex: number
  showPagination: boolean

  // Navigation functions
  goToFirstPage: () => void
  goToLastPage: () => void
  goToPreviousPage: () => void
  goToNextPage: () => void
  goToPage: (page: number) => void

  // State checks
  isFirstPage: boolean
  isLastPage: boolean
  hasMultiplePages: boolean

  // Display info
  itemsRange: { from: number; to: number; total: number }
}

export function usePagination<T>({
  items,
  defaultRowsPerPage = 20,
  visibilityThreshold = 5,
  rowsPerPageOptions = [5, 10, 25, 50]
}: UsePaginationProps<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPageState] = useState(defaultRowsPerPage)

  // Calculate pagination values
  const totalPages = Math.max(1, Math.ceil(items.length / rowsPerPage))
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = Math.min(startIndex + rowsPerPage, items.length)
  const currentItems = items.slice(startIndex, endIndex)

  // Determine if pagination should be shown
  const showPagination = items.length > visibilityThreshold

  // State checks
  const isFirstPage = currentPage === 1
  const isLastPage = currentPage === totalPages
  const hasMultiplePages = totalPages > 1

  // Calculate items range for display
  const itemsRange = {
    from: items.length > 0 ? startIndex + 1 : 0,
    to: endIndex,
    total: items.length
  }

  // Reset to valid page when items change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    } else if (currentPage < 1 && items.length > 0) {
      setCurrentPage(1)
    }
  }, [items.length, totalPages, currentPage])

  // Navigation functions
  const goToFirstPage = () => {
    if (!isFirstPage) {
      setCurrentPage(1)
    }
  }

  const goToLastPage = () => {
    if (!isLastPage) {
      setCurrentPage(totalPages)
    }
  }

  const goToPreviousPage = () => {
    if (!isFirstPage) {
      setCurrentPage(prev => Math.max(1, prev - 1))
    }
  }

  const goToNextPage = () => {
    if (!isLastPage) {
      setCurrentPage(prev => Math.min(totalPages, prev + 1))
    }
  }

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(validPage)
  }

  // Handle rows per page change
  const handleSetRowsPerPage = (rows: number) => {
    setRowsPerPageState(rows)
    setCurrentPage(1) // Reset to first page when changing rows per page
  }

  return {
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage: handleSetRowsPerPage,
    totalPages,
    currentItems,
    startIndex,
    endIndex,
    showPagination,
    goToFirstPage,
    goToLastPage,
    goToPreviousPage,
    goToNextPage,
    goToPage,
    isFirstPage,
    isLastPage,
    hasMultiplePages,
    itemsRange
  }
}