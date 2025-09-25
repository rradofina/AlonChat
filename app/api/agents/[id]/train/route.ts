import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()

    // Get the agent to ensure it exists
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('project_id, name')
      .eq('id', params.id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    console.log('Starting training for agent:', params.id, agent.name)

    // Mark all 'new' and 'restored' status files as 'ready' and set is_trained to true
    const { data: updatedSources, error: updateError } = await supabase
      .from('sources')
      .update({
        status: 'ready',
        is_trained: true,
        updated_at: new Date().toISOString()
      })
      .eq('agent_id', params.id)
      .in('status', ['new', 'restored'])
      .select()

    if (updateError) {
      console.error('Error updating sources:', updateError)
      return NextResponse.json(
        { error: 'Failed to update source training status' },
        { status: 500 }
      )
    }

    // Permanently delete (hard delete) any 'removed' sources
    const { error: deleteError } = await supabase
      .from('sources')
      .delete()
      .eq('agent_id', params.id)
      .eq('status', 'removed')

    if (deleteError) {
      console.error('Error deleting removed sources:', deleteError)
      // Don't fail the whole operation if delete fails
    }

    // Update agent's last_trained_at timestamp
    const { error: agentUpdateError } = await supabase
      .from('agents')
      .update({
        last_trained_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (agentUpdateError) {
      console.error('Error updating agent last_trained_at:', agentUpdateError)
      // Don't fail the whole operation if this update fails
    }

    // Get updated statistics
    const { data: stats } = await supabase
      .from('sources')
      .select('type, size_kb')
      .eq('agent_id', params.id)

    let totalSources = 0
    let totalSizeKb = 0
    if (stats) {
      totalSources = stats.length
      totalSizeKb = stats.reduce((sum, s) => sum + s.size_kb, 0)

      // Update agent's statistics
      await supabase
        .from('agents')
        .update({
          total_sources: totalSources,
          total_size_kb: totalSizeKb
        })
        .eq('id', params.id)
    }

    console.log('Training completed:', {
      agentId: params.id,
      sourcesUpdated: updatedSources?.length || 0,
      totalSources,
      totalSizeKb
    })

    return NextResponse.json({
      success: true,
      message: `Training completed successfully. ${updatedSources?.length || 0} sources trained.`,
      stats: {
        sourcesUpdated: updatedSources?.length || 0,
        totalSources,
        totalSizeKb
      }
    })

  } catch (error) {
    console.error('Training error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}