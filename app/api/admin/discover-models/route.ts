import { NextResponse } from 'next/server'
import { syncDiscoveredModels } from '@/lib/ai/providers/model-discovery'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get project ID from request or use user's default project
    const body = await request.json().catch(() => ({}))
    let projectId = body.projectId

    if (!projectId) {
      // Get user's first project
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!projects || projects.length === 0) {
        return NextResponse.json({ error: 'No project found' }, { status: 404 })
      }

      projectId = projects[0].id
    }

    // Discover and sync models
    const result = await syncDiscoveredModels(projectId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        modelsCount: result.modelsCount,
        projectId,
      })
    } else {
      return NextResponse.json({
        success: false,
        message: result.message,
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Failed to discover models:', error)
    return NextResponse.json(
      { error: 'Failed to discover models', details: error },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Get current model statistics
    const { data: stats } = await supabase
      .from('ai_models')
      .select('provider, is_active')

    const modelStats = {
      total: stats?.length || 0,
      active: stats?.filter(m => m.is_active).length || 0,
      byProvider: {} as Record<string, number>
    }

    if (stats) {
      for (const model of stats) {
        modelStats.byProvider[model.provider] = (modelStats.byProvider[model.provider] || 0) + 1
      }
    }

    // Get last update time
    const { data: lastUpdate } = await supabase
      .from('ai_models')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      stats: modelStats,
      lastUpdate: lastUpdate?.updated_at,
      providers: Object.keys(modelStats.byProvider),
    })
  } catch (error) {
    console.error('Failed to get model stats:', error)
    return NextResponse.json(
      { error: 'Failed to get model stats' },
      { status: 500 }
    )
  }
}