import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { QASource, CreateQAParams, UpdateQAParams, DeleteQAParams, QAListFilters } from '../types'

// Fetch all Q&A sources for an agent
export function useQASources(agentId: string | string[]) {
  const id = Array.isArray(agentId) ? agentId[0] : agentId

  return useQuery({
    queryKey: ['qa-sources', id],
    queryFn: async () => {
      const response = await fetch(`/api/agents/${id}/sources/qa`)
      if (!response.ok) {
        throw new Error('Failed to fetch Q&A sources')
      }
      const data = await response.json()
      return data.sources as QASource[]
    },
    enabled: !!id,
  })
}

// Create new Q&A
export function useCreateQA() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ agentId, data }: CreateQAParams) => {
      const formData = new FormData()
      formData.append('title', data.title)
      formData.append('questions', JSON.stringify(data.questions.filter(q => q.trim())))
      formData.append('answer', data.answer)

      // Add images if any
      if (data.images && data.images.length > 0) {
        data.images.forEach((image, index) => {
          formData.append(`images`, image)
        })
      }

      const response = await fetch(`/api/agents/${agentId}/sources/qa`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to create Q&A')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['qa-sources', variables.agentId] })
      toast.success('Q&A added successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add Q&A')
    },
  })
}

// Update existing Q&A
export function useUpdateQA() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ agentId, sourceId, data }: UpdateQAParams) => {
      const formData = new FormData()
      if (data.title) formData.append('title', data.title)
      if (data.questions) formData.append('questions', JSON.stringify(data.questions))
      if (data.answer) formData.append('answer', data.answer)

      if (data.images && data.images.length > 0) {
        data.images.forEach((image) => {
          formData.append(`images`, image)
        })
      }

      const response = await fetch(`/api/agents/${agentId}/sources/qa/${sourceId}`, {
        method: 'PATCH',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to update Q&A')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['qa-sources', variables.agentId] })
      toast.success('Q&A updated successfully')
    },
    onError: () => {
      toast.error('Failed to update Q&A')
    },
  })
}

// Delete Q&A sources
export function useDeleteQA() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ agentId, sourceIds }: DeleteQAParams) => {
      const response = await fetch(`/api/agents/${agentId}/sources/qa`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete Q&A sources')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['qa-sources', variables.agentId] })
      toast.success('Q&A sources deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete Q&A sources')
    },
  })
}

// Sort and filter Q&A sources locally
export function useSortedQA(sources: QASource[], filters: QAListFilters) {
  const { searchQuery, sortBy } = filters

  // Filter by search query
  let filtered = sources
  if (searchQuery) {
    filtered = sources.filter(source => {
      const title = source.name.toLowerCase()
      const questions = source.metadata?.questions?.join(' ').toLowerCase() || ''
      const answer = source.metadata?.answer?.toLowerCase() || ''
      const query = searchQuery.toLowerCase()

      return title.includes(query) || questions.includes(query) || answer.includes(query)
    })
  }

  // Sort sources
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'Title':
        return a.name.localeCompare(b.name)
      case 'Date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'Size':
        return (b.size_bytes || 0) - (a.size_bytes || 0)
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  return sorted
}

// Get storage stats for Q&A sources
export function useQAStorageStats(agentId: string | string[]) {
  const { data: sources = [] } = useQASources(agentId)

  const totalSize = sources.reduce((sum, source) => sum + (source.size_bytes || 0), 0)
  const totalCount = sources.length

  return {
    totalSize,
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    totalCount,
    sources,
  }
}