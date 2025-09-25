import { NextRequest, NextResponse } from 'next/server'
import { MetricsTracker } from '@/lib/services/metrics-tracker'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated (in production, check for admin role)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get system health from metrics tracker
    const health = await MetricsTracker.getSystemHealth()

    return NextResponse.json(health)

  } catch (error: any) {
    console.error('Error fetching system health:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system health' },
      { status: 500 }
    )
  }
}