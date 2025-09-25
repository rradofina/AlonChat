import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get daily usage data for the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: usage, error } = await supabase
      .from('resource_usage_daily')
      .select('*')
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching usage data:', error)
      return NextResponse.json({ usage: [] })
    }

    // Format the data
    const formattedUsage = (usage || []).map(day => ({
      date: day.date,
      totalUsers: day.total_users,
      activeUsers: day.active_users,
      newUsers: day.new_users,
      totalStorageGb: day.total_storage_gb,
      filesCount: day.files_count,
      chunksCount: day.chunks_count,
      totalApiCalls: day.total_api_calls,
      storageCostUsd: day.storage_cost_usd,
      computeCostUsd: day.compute_cost_usd,
      bandwidthCostUsd: day.bandwidth_cost_usd,
      totalCostUsd: day.total_cost_usd
    }))

    return NextResponse.json({ usage: formattedUsage })

  } catch (error: any) {
    console.error('Error fetching usage data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    )
  }
}