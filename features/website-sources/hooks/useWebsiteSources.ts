import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface SubLink {
  url: string
  title?: string
  status: 'included' | 'excluded'
  crawled: boolean
}

export interface CrawlProgress {
  current: number
  total: number
  currentUrl: string
  phase: 'discovering' | 'processing'
  discoveredLinks?: string[]
  startTime?: number
  averageTimePerPage?: number
}

export interface WebsiteSource {
  id: string
  name: string
  url: string
  status: 'pending' | 'processing' | 'queued' | 'ready' | 'error'
  pages_crawled: number
  max_pages: number
  created_at: string
  sub_links?: SubLink[]
  metadata?: any
  progress?: CrawlProgress | null
  discovered_links?: string[]
  queue_position?: number
}

export interface AddWebsiteParams {
  agentId: string
  url: string
  crawlOption: 'single' | 'crawl'
  maxPages?: number
  includeOnlyPaths?: string
  excludePaths?: string
  slowScraping?: boolean
  fullPageContent?: boolean
}

// Fetch all website sources for an agent
export function useWebsiteSources(agentId: string | string[]) {
  const id = Array.isArray(agentId) ? agentId[0] : agentId

  return useQuery({
    queryKey: ['website-sources', id],
    queryFn: async () => {
      const response = await fetch(`/api/agents/${id}/sources/website`)
      if (!response.ok) {
        throw new Error('Failed to fetch website sources')
      }
      const data = await response.json()
      return data.sources as WebsiteSource[]
    },
    refetchInterval: 5000, // Poll every 5 seconds for updates
    enabled: !!id,
  })
}

// Add a new website source
export function useAddWebsiteSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: AddWebsiteParams) => {
      const response = await fetch(`/api/agents/${params.agentId}/sources/website`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: params.url,
          crawl_subpages: params.crawlOption === 'crawl',
          max_pages: params.maxPages || 200,
          include_only_paths: params.includeOnlyPaths,
          exclude_paths: params.excludePaths,
          slow_scraping: params.slowScraping,
          full_page_content: params.fullPageContent,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to add website source')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['website-sources', variables.agentId] })
      toast.success('Website added successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add website')
    },
  })
}

// Delete website sources
export function useDeleteWebsiteSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ agentId, sourceIds }: { agentId: string, sourceIds: string[] }) => {
      const response = await fetch(`/api/agents/${agentId}/sources/website`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete website sources')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['website-sources', variables.agentId] })
      toast.success('Website sources deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete website sources')
    },
  })
}

// Recrawl a website
export function useRecrawlWebsite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ agentId, sourceId }: { agentId: string, sourceId: string }) => {
      const response = await fetch(
        `/api/agents/${agentId}/sources/website/${sourceId}/recrawl`,
        { method: 'POST' }
      )

      if (!response.ok) {
        throw new Error('Failed to recrawl website')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['website-sources', variables.agentId] })
      toast.success('Recrawl started')
    },
    onError: () => {
      toast.error('Failed to start recrawl')
    },
  })
}

// Update website source URL
export function useUpdateWebsiteSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      agentId,
      sourceId,
      url
    }: {
      agentId: string
      sourceId: string
      url: string
    }) => {
      const response = await fetch(`/api/agents/${agentId}/sources/website/${sourceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        throw new Error('Failed to update website source')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['website-sources', variables.agentId] })
      toast.success('Website URL updated')
    },
    onError: () => {
      toast.error('Failed to update website URL')
    },
  })
}