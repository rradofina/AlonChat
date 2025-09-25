import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ChunkManager } from '@/lib/services/chunk-manager'

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()
    const { title, content } = await request.json()

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    // Get the agent to ensure it exists and get project_id
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('project_id')
      .eq('id', params.id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Calculate size
    const sizeBytes = new TextEncoder().encode(content).length
    const sizeKb = Math.round(sizeBytes / 1024) || 1

    // Insert text source into database (without content for now)
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .insert({
        agent_id: params.id,
        project_id: agent.project_id,
        type: 'text',
        name: title,
        content: '', // Don't store content directly - will use chunks
        size_kb: sizeKb,
        status: 'chunking', // Mark as chunking while we process
        is_trained: false, // Explicitly set to false - texts are not trained until training is run
        chunk_count: 0,
        metadata: {
          title,
          character_count: content.length
        }
      })
      .select()
      .single()

    if (sourceError) {
      console.error('Error creating text:', sourceError)
      return NextResponse.json(
        { error: 'Failed to create text' },
        { status: 500 }
      )
    }

    // Store content in chunks for RAG
    try {
      const chunkCount = await ChunkManager.storeChunks({
        sourceId: source.id,
        agentId: params.id,
        projectId: agent.project_id,
        content: content,
        metadata: {
          title,
          type: 'text'
        },
        chunkSize: 2000, // Smaller chunks for text snippets
        chunkOverlap: 200 // Less overlap for text
      })

      console.log(`Created ${chunkCount} chunks for text source ${source.id}`)

      // Update source with chunk count and mark as ready
      const { error: updateError } = await supabase
        .from('sources')
        .update({
          chunk_count: chunkCount,
          status: 'ready'
        })
        .eq('id', source.id)

      if (updateError) {
        console.error('Error updating text source status:', updateError)
        // Don't fail the whole operation, source is created
      }
    } catch (chunkError) {
      console.error('Error creating chunks for text:', chunkError)
      // Update status to indicate chunking failed but source exists
      await supabase
        .from('sources')
        .update({ status: 'error', error_message: 'Failed to create chunks' })
        .eq('id', source.id)
    }

    // Format for frontend
    const formattedSource = {
      id: source.id,
      agent_id: source.agent_id,
      type: 'text',
      name: source.name,
      content: source.content,
      size_bytes: sizeBytes,
      status: source.status,
      created_at: source.created_at,
      metadata: source.metadata
    }

    return NextResponse.json({
      success: true,
      source: formattedSource,
      message: 'Text snippet added successfully'
    })

  } catch (error) {
    console.error('Text upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()

    // Fetch text sources from database
    const { data: sources, error } = await supabase
      .from('sources')
      .select('*')
      .eq('agent_id', params.id)
      .eq('type', 'text')
      .neq('status', 'removed') // Don't show soft-deleted texts
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching text sources:', error)
      return NextResponse.json({ sources: [] })
    }

    // Format for frontend - don't include content since it's now in chunks
    const formattedSources = sources.map(source => ({
      id: source.id,
      agent_id: source.agent_id,
      type: 'text',
      name: source.name,
      // Don't include content - will be fetched from chunks when needed
      size_bytes: source.size_kb * 1024,
      status: source.status,
      created_at: source.created_at,
      metadata: source.metadata,
      chunk_count: source.chunk_count,
      is_trained: source.is_trained
    }))

    return NextResponse.json({ sources: formattedSources })

  } catch (error) {
    console.error('Get text sources error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()
    const { sourceId, title, content } = await request.json()

    if (!sourceId || !title || !content) {
      return NextResponse.json(
        { error: 'Source ID, title and content are required' },
        { status: 400 }
      )
    }

    // Get the source to ensure it exists and get project_id
    const { data: existingSource, error: fetchError } = await supabase
      .from('sources')
      .select('project_id')
      .eq('id', sourceId)
      .eq('agent_id', params.id)
      .single()

    if (fetchError || !existingSource) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    }

    const sizeBytes = new TextEncoder().encode(content).length
    const sizeKb = Math.round(sizeBytes / 1024) || 1

    // Update in database (without content for now)
    const { data: source, error } = await supabase
      .from('sources')
      .update({
        name: title,
        content: '', // Don't store content directly - will use chunks
        size_kb: sizeKb,
        status: 'chunking', // Mark as chunking while we process
        metadata: {
          title,
          character_count: content.length
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', sourceId)
      .eq('agent_id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating text:', error)
      return NextResponse.json(
        { error: 'Failed to update text' },
        { status: 500 }
      )
    }

    // Delete existing chunks
    const { error: deleteChunksError } = await supabase
      .from('source_chunks')
      .delete()
      .eq('source_id', sourceId)

    if (deleteChunksError) {
      console.error('Error deleting old chunks:', deleteChunksError)
    }

    // Store new content in chunks
    try {
      const chunkCount = await ChunkManager.storeChunks({
        sourceId: source.id,
        agentId: params.id,
        projectId: existingSource.project_id,
        content: content,
        metadata: {
          title,
          type: 'text'
        },
        chunkSize: 2000, // Smaller chunks for text snippets
        chunkOverlap: 200 // Less overlap for text
      })

      console.log(`Updated ${chunkCount} chunks for text source ${source.id}`)

      // Update source with chunk count and mark as ready
      const { error: updateError } = await supabase
        .from('sources')
        .update({
          chunk_count: chunkCount,
          status: 'ready'
        })
        .eq('id', source.id)

      if (updateError) {
        console.error('Error updating text source status:', updateError)
        // Don't fail the whole operation, source is updated
      }
    } catch (chunkError) {
      console.error('Error creating chunks for text:', chunkError)
      // Update status to indicate chunking failed but source is updated
      await supabase
        .from('sources')
        .update({ status: 'error', error_message: 'Failed to create chunks' })
        .eq('id', source.id)
    }

    // Format for frontend
    const formattedSource = {
      id: source.id,
      agent_id: source.agent_id,
      type: 'text',
      name: source.name,
      content: source.content,
      size_bytes: sizeBytes,
      status: source.status,
      updated_at: source.updated_at,
      metadata: source.metadata
    }

    return NextResponse.json({
      success: true,
      source: formattedSource,
      message: 'Text snippet updated successfully'
    })

  } catch (error) {
    console.error('Text update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // Get sources to check if they're trained
    const { data: sources, error: fetchError } = await supabase
      .from('sources')
      .select('id, is_trained')
      .in('id', sourceIds)
      .eq('agent_id', params.id)

    if (fetchError) {
      console.error('Error fetching sources:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch sources' },
        { status: 500 }
      )
    }

    if (!sources || sources.length === 0) {
      return NextResponse.json(
        { error: 'No sources found' },
        { status: 404 }
      )
    }

    // Separate trained and untrained sources
    const trainedIds = sources.filter(s => s.is_trained).map(s => s.id)
    const untrainedIds = sources.filter(s => !s.is_trained).map(s => s.id)

    // Soft delete trained sources (mark as 'removed')
    if (trainedIds.length > 0) {
      const { error: softDeleteError } = await supabase
        .from('sources')
        .update({
          status: 'removed',
          updated_at: new Date().toISOString()
        })
        .in('id', trainedIds)
        .eq('agent_id', params.id)

      if (softDeleteError) {
        console.error('Soft delete error:', softDeleteError)
        return NextResponse.json(
          { error: 'Failed to remove trained texts' },
          { status: 500 }
        )
      }
      console.log(`Soft deleted ${trainedIds.length} trained text sources`)
    }

    // Hard delete untrained sources
    if (untrainedIds.length > 0) {
      // First delete any associated chunks to avoid foreign key constraint issues
      const { error: chunkDeleteError } = await supabase
        .from('source_chunks')
        .delete()
        .in('source_id', untrainedIds)

      if (chunkDeleteError) {
        console.error('Error deleting chunks:', chunkDeleteError)
        // Continue anyway - chunks might not exist yet
      }

      const { error: hardDeleteError } = await supabase
        .from('sources')
        .delete()
        .in('id', untrainedIds)
        .eq('agent_id', params.id)

      if (hardDeleteError) {
        console.error('Hard delete error:', hardDeleteError)
        return NextResponse.json(
          { error: 'Failed to delete untrained texts' },
          { status: 500 }
        )
      }
      console.log(`Hard deleted ${untrainedIds.length} untrained text sources`)
    }

    // Update agent's source count
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
      message: `Deleted ${sourceIds.length} text snippet(s)`
    })

  } catch (error) {
    console.error('Delete text error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}