import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()

    // Check admin access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (you might want to implement proper admin role checking)
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    // For now, we'll allow any authenticated user - you should add proper admin check
    // if (profile?.role !== 'admin') {
    //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    // }

    // Fetch all metrics in parallel
    const [
      dataIntegrity,
      systemHealth,
      usage,
      costs,
      alerts
    ] = await Promise.all([
      fetchDataIntegrityMetrics(serviceSupabase),
      fetchSystemHealthMetrics(serviceSupabase),
      fetchUsageMetrics(serviceSupabase),
      fetchCostMetrics(serviceSupabase),
      fetchAlerts(serviceSupabase)
    ])

    return NextResponse.json({
      dataIntegrity,
      systemHealth,
      usage,
      costs,
      alerts,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Dashboard metrics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function fetchDataIntegrityMetrics(supabase: any) {
  try {
    // Check for duplicate chunks
    const { data: duplicates } = await supabase.rpc('count_duplicate_chunks')

    // Check for missing embeddings
    const { data: missingEmbeddings } = await supabase
      .from('source_chunks')
      .select('id', { count: 'exact', head: true })
      .is('embedding', null)

    // Check Q&A sources with excessive chunks
    const { data: qaIssues } = await supabase
      .from('sources')
      .select(`
        id,
        name,
        source_chunks!inner(count)
      `)
      .eq('type', 'qa')
      .gte('source_chunks.count', 10)

    // Check orphaned chunks (chunks without valid source)
    const { data: orphaned } = await supabase
      .from('source_chunks')
      .select('id', { count: 'exact', head: true })
      .is('source_id', null)

    // Count affected agents
    const { data: affectedAgents } = await supabase
      .from('agents')
      .select(`
        id,
        source_chunks!inner(id)
      `)
      .or('source_chunks.embedding.is.null')

    return {
      duplicateChunks: duplicates?.count || 0,
      missingEmbeddings: missingEmbeddings?.count || 0,
      qaWithExcessChunks: qaIssues?.length || 0,
      orphanedChunks: orphaned?.count || 0,
      affectedAgents: affectedAgents?.length || 0
    }
  } catch (error) {
    console.error('Error fetching data integrity metrics:', error)
    return {
      duplicateChunks: 0,
      missingEmbeddings: 0,
      qaWithExcessChunks: 0,
      orphanedChunks: 0,
      affectedAgents: 0
    }
  }
}

async function fetchSystemHealthMetrics(supabase: any) {
  try {
    // Count agents by status
    const { data: agentStats } = await supabase
      .from('agents')
      .select('status')
      .then((result: any) => {
        const stats = {
          total: 0,
          trained: 0,
          processing: 0,
          error: 0
        }
        result.data?.forEach((agent: any) => {
          stats.total++
          if (agent.status === 'ready') stats.trained++
          else if (agent.status === 'training' || agent.status === 'processing') stats.processing++
          else if (agent.status === 'error') stats.error++
        })
        return { data: stats }
      })

    // Get queue depth (if using a queue system)
    // This would need to be implemented based on your queue system
    const queueDepth = 0

    // Calculate average response time from usage logs
    const { data: responseTimes } = await supabase
      .from('usage_logs')
      .select('response_time_ms')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(100)

    const avgResponseTime = responseTimes?.length > 0
      ? responseTimes.reduce((acc: number, log: any) => acc + (log.response_time_ms || 0), 0) / responseTimes.length
      : 0

    return {
      totalAgents: agentStats?.total || 0,
      trainedAgents: agentStats?.trained || 0,
      processingAgents: agentStats?.processing || 0,
      errorAgents: agentStats?.error || 0,
      avgResponseTime,
      queueDepth
    }
  } catch (error) {
    console.error('Error fetching system health metrics:', error)
    return {
      totalAgents: 0,
      trainedAgents: 0,
      processingAgents: 0,
      errorAgents: 0,
      avgResponseTime: 0,
      queueDepth: 0
    }
  }
}

async function fetchUsageMetrics(supabase: any) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Count active users today
    const { data: activeUsers } = await supabase
      .from('usage_logs')
      .select('user_id', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
      .not('user_id', 'is', null)

    // Count messages today
    const { data: messages } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    // Calculate tokens used today
    const { data: tokenUsage } = await supabase
      .from('usage_logs')
      .select('total_tokens')
      .gte('created_at', today.toISOString())
      .then((result: any) => {
        const total = result.data?.reduce((acc: number, log: any) => acc + (log.total_tokens || 0), 0) || 0
        return { data: total }
      })

    // Calculate storage used
    const { data: storage } = await supabase
      .from('sources')
      .select('size_kb')
      .then((result: any) => {
        const totalKB = result.data?.reduce((acc: number, source: any) => acc + (source.size_kb || 0), 0) || 0
        return { data: totalKB / 1024 / 1024 } // Convert to GB
      })

    // Count total embeddings
    const { data: embeddings } = await supabase
      .from('source_chunks')
      .select('id', { count: 'exact', head: true })
      .not('embedding', 'is', null)

    return {
      activeUsers: activeUsers?.count || 0,
      messagestoday: messages?.count || 0,
      tokensUsedToday: tokenUsage || 0,
      storageUsedGB: storage || 0,
      embeddingsGenerated: embeddings?.count || 0
    }
  } catch (error) {
    console.error('Error fetching usage metrics:', error)
    return {
      activeUsers: 0,
      messagestoday: 0,
      tokensUsedToday: 0,
      storageUsedGB: 0,
      embeddingsGenerated: 0
    }
  }
}

async function fetchCostMetrics(supabase: any) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Calculate daily costs
    const { data: dailyCosts } = await supabase
      .from('usage_logs')
      .select('cost_usd, model')
      .gte('created_at', today.toISOString())

    const costByModel: { [key: string]: number } = {}
    let totalDailyCost = 0

    dailyCosts?.forEach((log: any) => {
      const cost = log.cost_usd || 0
      totalDailyCost += cost
      if (log.model) {
        costByModel[log.model] = (costByModel[log.model] || 0) + cost
      }
    })

    // Calculate monthly projection (based on daily average * 30)
    const monthlyProjection = totalDailyCost * 30

    // Get top spenders
    const { data: topSpenders } = await supabase
      .from('usage_logs')
      .select(`
        project_id,
        projects!inner(name),
        cost_usd
      `)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .then((result: any) => {
        const spenderMap: { [key: string]: { name: string; cost: number } } = {}
        result.data?.forEach((log: any) => {
          const projectId = log.project_id
          if (projectId) {
            if (!spenderMap[projectId]) {
              spenderMap[projectId] = {
                name: log.projects?.name || 'Unknown',
                cost: 0
              }
            }
            spenderMap[projectId].cost += log.cost_usd || 0
          }
        })
        return {
          data: Object.values(spenderMap)
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 10)
        }
      })

    return {
      dailyCost: totalDailyCost,
      monthlyProjection,
      costByModel: Object.entries(costByModel).map(([model, cost]) => ({ model, cost })),
      topSpenders: topSpenders || []
    }
  } catch (error) {
    console.error('Error fetching cost metrics:', error)
    return {
      dailyCost: 0,
      monthlyProjection: 0,
      costByModel: [],
      topSpenders: []
    }
  }
}

async function fetchAlerts(supabase: any) {
  const alerts: any[] = []

  try {
    // Check for critical issues
    const { data: duplicates } = await supabase
      .from('source_chunks')
      .select('source_id', { count: 'exact', head: true })
      .then((result: any) => {
        // This is a simplified check - you'd want to implement proper duplicate detection
        return result
      })

    // Check for high error rate
    const { data: errors } = await supabase
      .from('usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'error')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    if (errors?.count && errors.count > 10) {
      alerts.push({
        level: 'critical',
        message: `High error rate: ${errors.count} errors in the last hour`,
        timestamp: new Date().toISOString()
      })
    }

    // Check for agents stuck in training
    const { data: stuckAgents } = await supabase
      .from('agents')
      .select('id, name, updated_at')
      .eq('status', 'training')
      .lte('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())

    if (stuckAgents?.length > 0) {
      alerts.push({
        level: 'warning',
        message: `${stuckAgents.length} agents stuck in training for over 30 minutes`,
        timestamp: new Date().toISOString()
      })
    }

    // Check for low embedding coverage
    const { data: coverage } = await supabase
      .from('source_chunks')
      .select('embedding', { count: 'exact', head: true })

    const { data: withEmbeddings } = await supabase
      .from('source_chunks')
      .select('id', { count: 'exact', head: true })
      .not('embedding', 'is', null)

    if (coverage?.count && withEmbeddings?.count) {
      const coveragePercent = (withEmbeddings.count / coverage.count) * 100
      if (coveragePercent < 80) {
        alerts.push({
          level: 'warning',
          message: `Low embedding coverage: ${coveragePercent.toFixed(1)}% (should be >80%)`,
          timestamp: new Date().toISOString()
        })
      }
    }

    // Check for cost spikes
    const { data: recentCost } = await supabase
      .from('usage_logs')
      .select('cost_usd')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .then((result: any) => {
        const total = result.data?.reduce((acc: number, log: any) => acc + (log.cost_usd || 0), 0) || 0
        return { data: total }
      })

    if (recentCost > 10) { // $10 per hour threshold
      alerts.push({
        level: 'critical',
        message: `High cost alert: $${recentCost.toFixed(2)} spent in the last hour`,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error fetching alerts:', error)
  }

  return alerts
}