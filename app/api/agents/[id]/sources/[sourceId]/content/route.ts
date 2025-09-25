import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ChunkManager } from '@/lib/services/chunk-manager'

export const runtime = 'nodejs'

/**
 * GET /api/agents/[id]/sources/[sourceId]/content
 * Retrieve content for a source (reconstructed from chunks)
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string; sourceId: string }> }
) {
  const params = await props.params

  try {
    const supabase = await createClient()

    // Get source with its pre-processed content
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .select('id, agent_id, name, status, content, chunk_count, file_url, metadata')
      .eq('id', params.sourceId)
      .eq('agent_id', params.id)
      .single()

    if (sourceError || !source) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      )
    }

    // Return pre-processed content instantly
    if (source.content) {
      return NextResponse.json({
        content: source.content,
        status: source.status,
        metadata: source.metadata
      })
    }

    // Fall back to chunks if no file_url
    if (source.chunk_count && source.chunk_count > 0) {
      const content = await ChunkManager.reconstructContent(params.sourceId)
      return NextResponse.json({
        content,
        status: source.status,
        chunks: source.chunk_count
      })
    }

    // No content available
    return NextResponse.json({
      content: '',
      status: source.status,
      chunks: 0,
      message: source.status === 'processing'
        ? 'Content is being processed...'
        : source.status === 'pending_processing'
        ? 'File is queued for processing...'
        : 'No content available. Please re-upload the file.'
    })

  } catch (error) {
    console.error('Error fetching source content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    )
  }
}