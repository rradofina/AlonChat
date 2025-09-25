import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PlanService } from '@/lib/plans/plan-service'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()

    // Get the agent's project and user to fetch plan info
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('project_id, projects!inner(owner_id)')
      .eq('id', params.id)
      .single()

    if (agentError || !agent) {
      console.error('Error fetching agent:', agentError)
      return NextResponse.json({
        files: { count: 0, sizeKb: 0 },
        text: { count: 0, sizeKb: 0 },
        website: { count: 0, sizeKb: 0 },
        qa: { count: 0, sizeKb: 0 },
        total: { count: 0, sizeKb: 0 },
        storageLimitKb: 30 * 1024 // Default 30MB
      })
    }

    // Get user's subscription and plan
    const planService = new PlanService(supabase)
    const subscription = await planService.getUserSubscriptionWithPlan(agent.projects.owner_id)
    const storageLimitKb = subscription?.plan
      ? subscription.plan.storage_limit_mb * 1024
      : 30 * 1024 // Default 30MB

    // Fetch all sources for this agent
    const { data: sources, error } = await supabase
      .from('sources')
      .select('type, size_kb, metadata')
      .eq('agent_id', params.id)

    if (error) {
      console.error('Error fetching stats:', error)
      return NextResponse.json({
        files: { count: 0, sizeKb: 0 },
        text: { count: 0, sizeKb: 0 },
        website: { count: 0, sizeKb: 0 },
        qa: { count: 0, sizeKb: 0 },
        total: { count: 0, sizeKb: 0 },
        storageLimitKb
      })
    }

    // Initialize stats with the format expected by SourcesSidebar
    const stats = {
      files: { count: 0, sizeKb: 0 },
      text: { count: 0, sizeKb: 0 },
      website: { count: 0, sizeKb: 0 },
      qa: { count: 0, sizeKb: 0 },
      total: { count: 0, sizeKb: 0 },
      storageLimitKb
    }

    // Aggregate data by type
    sources?.forEach(source => {
      if (source.type === 'file') {
        stats.files.count++
        stats.files.sizeKb += source.size_kb || 0
      } else if (source.type === 'text') {
        stats.text.count++
        stats.text.sizeKb += source.size_kb || 0
      } else if (source.type === 'website') {
        stats.website.count++
        stats.website.sizeKb += source.size_kb || 0
      } else if (source.type === 'qa') {
        stats.qa.count++
        stats.qa.sizeKb += source.size_kb || 0
      }
    })

    // Calculate totals
    stats.total.count = sources?.length || 0
    stats.total.sizeKb =
      stats.files.sizeKb +
      stats.text.sizeKb +
      stats.website.sizeKb +
      stats.qa.sizeKb

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}