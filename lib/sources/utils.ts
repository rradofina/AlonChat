import { createClient } from '@/lib/supabase/server'
import { planService } from '@/lib/plans/plan-service'

export interface SourceStats {
  totalSources: number
  totalSizeBytes: number
  sourcesByType: Record<string, number>
  pendingProcessing: number
  processed: number
  failed: number
}

export async function getAgentSourceStats(
  agentId: string
): Promise<SourceStats | null> {
  const supabase = await createClient()

  const { data: sources, error } = await supabase
    .from('agent_sources')
    .select('type, size_bytes, status')
    .eq('agent_id', agentId)

  if (error || !sources) {
    console.error('Failed to fetch source stats:', error)
    return null
  }

  const stats: SourceStats = {
    totalSources: sources.length,
    totalSizeBytes: 0,
    sourcesByType: {},
    pendingProcessing: 0,
    processed: 0,
    failed: 0
  }

  sources.forEach(source => {
    stats.totalSizeBytes += source.size_bytes || 0

    if (!stats.sourcesByType[source.type]) {
      stats.sourcesByType[source.type] = 0
    }
    stats.sourcesByType[source.type]++

    switch (source.status) {
      case 'pending':
      case 'processing':
        stats.pendingProcessing++
        break
      case 'processed':
        stats.processed++
        break
      case 'failed':
        stats.failed++
        break
    }
  })

  return stats
}

export async function calculateStorageUsage(
  projectId: string
): Promise<{ used: number; limit: number; percentage: number }> {
  const supabase = await createClient()

  // Get user from project
  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .single()

  if (!project) {
    return { used: 0, limit: 0, percentage: 0 }
  }

  // Get user's subscription with plan details
  const subscription = await planService.getUserSubscriptionWithPlan(project.user_id)

  // Default to starter plan if no subscription
  const limit = subscription?.plan
    ? planService.getStorageLimitBytes(subscription.plan)
    : 100 * 1024 * 1024 // Default 100MB for starter

  // Get all agents in project
  const { data: agents } = await supabase
    .from('agents')
    .select('id')
    .eq('project_id', projectId)

  if (!agents || agents.length === 0) {
    return { used: 0, limit, percentage: 0 }
  }

  // Get total size of all sources
  const agentIds = agents.map(a => a.id)
  const { data: sources } = await supabase
    .from('agent_sources')
    .select('size_bytes')
    .in('agent_id', agentIds)

  const used = sources?.reduce((sum, s) => sum + (s.size_bytes || 0), 0) || 0
  const percentage = limit > 0 ? (used / limit) * 100 : 0

  return { used, limit, percentage }
}

export async function getStorageLimit(userId: string): Promise<number> {
  const subscription = await planService.getUserSubscriptionWithPlan(userId)

  if (subscription?.plan) {
    return planService.getStorageLimitBytes(subscription.plan)
  }

  // Default to starter plan storage if no subscription
  return 100 * 1024 * 1024 // 100MB
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export async function checkStorageQuota(
  projectId: string,
  additionalBytes: number = 0
): Promise<{ allowed: boolean; message?: string }> {
  const usage = await calculateStorageUsage(projectId)
  const newTotal = usage.used + additionalBytes
  
  if (newTotal > usage.limit) {
    return {
      allowed: false,
      message: `Storage limit exceeded. Used: ${formatBytes(usage.used)}, Limit: ${formatBytes(usage.limit)}`
    }
  }
  
  return { allowed: true }
}

export async function validateSourceAccess(
  sourceId: string,
  userId: string
): Promise<boolean> {
  const supabase = createClient()
  
  const { data } = await supabase
    .from('agent_sources')
    .select(`
      id,
      agent:agents!inner(
        id,
        project:projects!inner(
          id,
          user_id
        )
      )
    `)
    .eq('id', sourceId)
    .single()

  return data?.agent?.project?.user_id === userId
}

export function getSourceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    file: 'Files',
    text: 'Text',
    website: 'Website',
    qa: 'Q&A'
  }
  return labels[type] || type
}

export function getSourceStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    processed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export async function retriggerProcessing(
  sourceId: string
): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('agent_sources')
    .update({ 
      status: 'pending',
      metadata: {
        retriggered_at: new Date().toISOString()
      }
    })
    .eq('id', sourceId)

  return !error
}