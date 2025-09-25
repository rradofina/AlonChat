import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * POST /api/agents/[id]/sources/restore
 * Restore soft-deleted (removed) files back to ready status
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params

  try {
    const supabase = await createClient()
    const { sourceIds } = await request.json()

    if (!sourceIds || !Array.isArray(sourceIds)) {
      return NextResponse.json(
        { error: 'Source IDs required' },
        { status: 400 }
      )
    }

    // First, verify that all sources belong to this agent and are in 'removed' status
    const { data: sources, error: fetchError } = await supabase
      .from('sources')
      .select('id, name, status, is_trained')
      .in('id', sourceIds)
      .eq('agent_id', params.id)
      .eq('status', 'removed')

    if (fetchError) {
      console.error('Error fetching removed sources:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch sources' },
        { status: 500 }
      )
    }

    if (!sources || sources.length === 0) {
      return NextResponse.json(
        { error: 'No removed sources found with the provided IDs' },
        { status: 404 }
      )
    }

    // Check if any requested IDs were not found
    const foundIds = sources.map(s => s.id)
    const notFoundIds = sourceIds.filter(id => !foundIds.includes(id))

    if (notFoundIds.length > 0) {
      console.warn(`Some source IDs were not found or not in removed status: ${notFoundIds.join(', ')}`)
    }

    // Restore the sources by updating their status back to 'ready'
    const { error: restoreError } = await supabase
      .from('sources')
      .update({
        status: 'ready',
        updated_at: new Date().toISOString()
      })
      .in('id', foundIds)
      .eq('agent_id', params.id)

    if (restoreError) {
      console.error('Restore error:', restoreError)
      return NextResponse.json(
        { error: 'Failed to restore sources' },
        { status: 500 }
      )
    }

    console.log(`Restored ${sources.length} sources:`, sources.map(s => s.name).join(', '))

    // Update agent's source count (removed files are excluded from count)
    const { data: stats } = await supabase
      .from('sources')
      .select('type, size_kb')
      .eq('agent_id', params.id)
      .neq('status', 'removed')

    if (stats) {
      const totalSources = stats.length
      const totalSizeKb = stats.reduce((sum, s) => sum + s.size_kb, 0)

      await supabase
        .from('agents')
        .update({
          total_sources: totalSources,
          total_size_kb: totalSizeKb
        })
        .eq('id', params.id)
    }

    return NextResponse.json({
      success: true,
      restored: sources.length,
      message: `Successfully restored ${sources.length} file(s)`,
      restoredSources: sources.map(s => ({
        id: s.id,
        name: s.name,
        is_trained: s.is_trained
      })),
      notFound: notFoundIds.length > 0 ? notFoundIds : undefined
    })

  } catch (error) {
    console.error('Restore sources error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/agents/[id]/sources/restore
 * Get all removed (soft-deleted) files that can be restored
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params

  try {
    const supabase = await createClient()

    // Fetch all removed sources for this agent
    const { data: sources, error } = await supabase
      .from('sources')
      .select('id, name, type, size_kb, is_trained, created_at, updated_at, metadata')
      .eq('agent_id', params.id)
      .eq('status', 'removed')
      .eq('type', 'file')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching removed files:', error)
      return NextResponse.json({ sources: [] })
    }

    // Convert to match frontend expected format
    const formattedSources = sources.map(source => ({
      id: source.id,
      name: source.name,
      type: source.type,
      size_bytes: source.size_kb * 1024,
      is_trained: source.is_trained,
      status: 'removed',
      created_at: source.created_at,
      updated_at: source.updated_at,
      metadata: source.metadata
    }))

    return NextResponse.json({
      sources: formattedSources,
      total: formattedSources.length
    })

  } catch (error) {
    console.error('Get removed files error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}