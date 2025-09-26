import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EmbeddingService } from '@/lib/services/embedding-service'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for embedding generation

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

    // Check if request wants to generate embeddings
    const body = await request.json().catch(() => ({}))
    const generateEmbeddings = body.generateEmbeddings !== false // Default to true

    // Mark all 'new' and 'restored' status files as 'ready'
    const { data: updatedSources, error: updateError } = await supabase
      .from('sources')
      .update({
        status: 'ready',
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

    // Generate embeddings if enabled
    let embeddingResults = {
      success: false,
      totalProcessed: 0,
      totalFailed: 0,
      totalCost: 0,
      totalTokens: 0
    }

    if (generateEmbeddings) {
      console.log('Generating embeddings for agent:', params.id)
      try {
        const embeddingService = new EmbeddingService()
        embeddingResults = await embeddingService.generateEmbeddingsForAgent(params.id)

        console.log('Embedding generation results:', embeddingResults)

        // Mark sources as trained only if embeddings were successful
        if (embeddingResults.success) {
          await supabase
            .from('sources')
            .update({
              is_trained: true,
              embedding_model: 'text-embedding-3-small',
              embedding_generated_at: new Date().toISOString(),
              total_embedding_tokens: embeddingResults.totalTokens,
              embedding_cost_usd: embeddingResults.totalCost
            })
            .eq('agent_id', params.id)
        }
      } catch (error) {
        console.error('Error generating embeddings:', error)
        // Continue even if embedding generation fails
      }
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
      totalSizeKb,
      embeddingsGenerated: embeddingResults.totalProcessed,
      embeddingCost: embeddingResults.totalCost
    })

    return NextResponse.json({
      success: true,
      message: generateEmbeddings
        ? `Training completed successfully. ${updatedSources?.length || 0} sources trained, ${embeddingResults.totalProcessed} embeddings generated.`
        : `Training completed successfully. ${updatedSources?.length || 0} sources trained.`,
      stats: {
        sourcesUpdated: updatedSources?.length || 0,
        totalSources,
        totalSizeKb,
        embeddings: generateEmbeddings ? {
          generated: embeddingResults.totalProcessed,
          failed: embeddingResults.totalFailed,
          tokens: embeddingResults.totalTokens,
          cost: embeddingResults.totalCost,
          model: 'text-embedding-3-small'
        } : null
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