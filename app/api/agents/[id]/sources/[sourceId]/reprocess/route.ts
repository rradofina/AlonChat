import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentProcessor } from '@/lib/services/document-processor'

export const runtime = 'nodejs'

/**
 * POST /api/agents/[id]/sources/[sourceId]/reprocess
 * Reprocess a source that failed processing
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string; sourceId: string }> }
) {
  const params = await props.params

  try {
    const supabase = await createClient()

    // Verify the source exists and belongs to this agent
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .select('*')
      .eq('id', params.sourceId)
      .eq('agent_id', params.id)
      .single()

    if (sourceError || !source) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      )
    }

    // Only allow reprocessing of error or pending sources
    if (source.status !== 'error' && source.status !== 'pending') {
      return NextResponse.json(
        { error: 'Source cannot be reprocessed in current state' },
        { status: 400 }
      )
    }

    // Reset status to pending for reprocessing
    const { error: updateError } = await supabase
      .from('sources')
      .update({
        status: 'pending',
        error_message: null,
        processing_started_at: null,
        processing_completed_at: null
      })
      .eq('id', params.sourceId)

    if (updateError) {
      throw updateError
    }

    // Trigger background processing
    DocumentProcessor.processDocument(params.sourceId)
      .then(result => {
        console.log(`Reprocessing completed for ${params.sourceId}:`, result)
      })
      .catch(error => {
        console.error(`Reprocessing failed for ${params.sourceId}:`, error)
      })

    return NextResponse.json({
      success: true,
      message: 'Source is being reprocessed'
    })

  } catch (error) {
    console.error('Reprocess error:', error)
    return NextResponse.json(
      { error: 'Failed to reprocess source' },
      { status: 500 }
    )
  }
}