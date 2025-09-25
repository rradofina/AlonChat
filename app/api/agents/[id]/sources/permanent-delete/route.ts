import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * DELETE /api/agents/[id]/sources/permanent-delete
 * Permanently delete soft-deleted (removed) files
 * This is irreversible and will completely remove the files from the database
 */
export async function DELETE(
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
    // This ensures users can only permanently delete already soft-deleted files
    const { data: sources, error: fetchError } = await supabase
      .from('sources')
      .select('id, name, status')
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

    // Permanently delete the sources
    const { error: deleteError } = await supabase
      .from('sources')
      .delete()
      .in('id', foundIds)
      .eq('agent_id', params.id)

    if (deleteError) {
      console.error('Permanent delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to permanently delete sources' },
        { status: 500 }
      )
    }

    console.log(`Permanently deleted ${sources.length} sources:`, sources.map(s => s.name).join(', '))

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
      deleted: sources.length,
      message: `Permanently deleted ${sources.length} file(s)`,
      deletedSources: sources.map(s => ({
        id: s.id,
        name: s.name
      })),
      notFound: notFoundIds.length > 0 ? notFoundIds : undefined
    })

  } catch (error) {
    console.error('Permanent delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}