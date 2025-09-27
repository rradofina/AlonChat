import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { FileSource, FileListFilters, FileDeleteParams, FileRestoreParams } from '../types'

// Fetch all file sources for an agent
export function useFileSources(agentId: string | string[], filters?: FileListFilters) {
  const id = Array.isArray(agentId) ? agentId[0] : agentId

  return useQuery({
    queryKey: ['file-sources', id, filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.includeRemoved) params.append('includeRemoved', 'true')
      if (filters?.searchQuery) params.append('search', filters.searchQuery)
      if (filters?.fileType) params.append('type', filters.fileType)

      const response = await fetch(`/api/agents/${id}/sources/files?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch file sources')
      }
      const data = await response.json()
      return data.sources as FileSource[]
    },
    refetchInterval: (data) => {
      // Auto-refresh every 5s if there are processing files
      const hasProcessingFiles = Array.isArray(data) && data.some(f => f.status === 'processing')
      return hasProcessingFiles ? 5000 : false
    },
    enabled: !!id,
  })
}

// Delete files (soft or permanent)
export function useDeleteFiles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ agentId, fileIds, permanent }: FileDeleteParams & { permanent?: boolean }) => {
      const response = await fetch(`/api/agents/${agentId}/sources/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceIds: fileIds,
          permanent: permanent || false
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete files')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['file-sources', variables.agentId] })
      toast.success(
        variables.permanent
          ? 'Files permanently deleted'
          : 'Files moved to trash'
      )
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete files')
    },
  })
}

// Restore removed files
export function useRestoreFiles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ agentId, fileIds }: FileRestoreParams) => {
      const response = await fetch(`/api/agents/${agentId}/sources/files/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: fileIds }),
      })

      if (!response.ok) {
        throw new Error('Failed to restore files')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['file-sources', variables.agentId] })
      toast.success('Files restored successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to restore files')
    },
  })
}

// Get total storage used
export function useFileStorageStats(agentId: string | string[]) {
  const id = Array.isArray(agentId) ? agentId[0] : agentId
  const { data: files = [] } = useFileSources(id, { includeRemoved: true })

  const totalSize = files.reduce((sum, file) => sum + (file.size_bytes || 0), 0)
  const activeFiles = files.filter(f => f.status !== 'removed')
  const removedFiles = files.filter(f => f.status === 'removed')

  return {
    totalSize,
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    activeCount: activeFiles.length,
    removedCount: removedFiles.length,
    files,
  }
}

// Sort and filter files locally
export function useSortedFiles(files: FileSource[], filters: FileListFilters) {
  const { searchQuery, sortBy } = filters

  // Filter by search query
  let filtered = files
  if (searchQuery) {
    filtered = files.filter(file =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.metadata?.original_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  // Sort files
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'Name':
        return a.name.localeCompare(b.name)
      case 'Date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'Size':
        return (b.size_bytes || 0) - (a.size_bytes || 0)
      case 'Type':
        const typeA = a.metadata?.file_type || 'unknown'
        const typeB = b.metadata?.file_type || 'unknown'
        return typeA.localeCompare(typeB)
      default:
        // Default: removed files last, then by date
        if (a.status === 'removed' && b.status !== 'removed') return 1
        if (a.status !== 'removed' && b.status === 'removed') return -1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  return sorted
}