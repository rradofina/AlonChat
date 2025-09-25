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
    const requestBody = await request.json()
    const { question, questions, answer, images, title } = requestBody


    // Support both single question (backward compat) and questions array
    const questionsArray = questions || (question ? [question] : [])

    if (!questionsArray.length || !answer) {
      return NextResponse.json(
        { error: 'At least one question and answer are required' },
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
    const sizeBytes = new TextEncoder().encode(questionsArray.join(' ') + answer).length
    const sizeKb = Math.round(sizeBytes / 1024) || 1

    // Use title or first question as name
    const name = title || questionsArray[0]

    // Prepare metadata with images
    const metadata = {
      title: title || questionsArray[0],
      has_images: images && Array.isArray(images) && images.length > 0,
      images: images && Array.isArray(images) ? images : []
    }


    // Insert Q&A into database (without content for chunking)
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .insert({
        agent_id: params.id,
        project_id: agent.project_id,
        type: 'qa',
        name: name,
        content: '', // Don't store content directly - will use chunks
        size_kb: sizeKb,
        status: 'chunking', // Mark as chunking while we process
        is_trained: false, // Explicitly set to false - Q&As are not trained until training is run
        chunk_count: 0,
        metadata: metadata
      })
      .select()
      .single()

    if (sourceError) {
      console.error('Error creating Q&A:', sourceError)
      console.error('Failed insert data:', {
        agent_id: params.id,
        project_id: agent.project_id,
        images: images,
        metadata: {
          title: title || questionsArray[0],
          has_images: images && images.length > 0,
          images: images || []
        }
      })
      return NextResponse.json(
        { error: 'Failed to create Q&A: ' + sourceError.message },
        { status: 500 }
      )
    }

    // Store Q&A content in chunks for RAG
    const qaContent = JSON.stringify({ questions: questionsArray, answer })
    try {
      const chunkCount = await ChunkManager.storeChunks({
        sourceId: source.id,
        agentId: params.id,
        projectId: agent.project_id,
        content: qaContent,
        metadata: {
          title: name,
          type: 'qa',
          questions: questionsArray,
          has_images: metadata.has_images
        },
        chunkSize: 2000, // Smaller chunks for Q&A
        chunkOverlap: 200 // Less overlap for Q&A
      })

      console.log(`Created ${chunkCount} chunks for Q&A source ${source.id}`)

      // Update source with chunk count and mark as ready
      const { error: updateError } = await supabase
        .from('sources')
        .update({
          chunk_count: chunkCount,
          status: 'ready',
          content: qaContent // Store Q&A content for backward compatibility
        })
        .eq('id', source.id)

      if (updateError) {
        console.error('Error updating Q&A source status:', updateError)
        // Don't fail the whole operation, source is created
      }
    } catch (chunkError) {
      console.error('Error creating chunks for Q&A:', chunkError)
      // Update status to indicate chunking failed but source exists
      await supabase
        .from('sources')
        .update({
          status: 'ready', // Mark as ready anyway since Q&A can work without chunks
          content: qaContent, // Store content directly as fallback
          error_message: 'Chunking failed but Q&A is available'
        })
        .eq('id', source.id)
    }

    // Format for frontend
    const formattedSource = {
      id: source.id,
      agent_id: source.agent_id,
      type: 'qa',
      title: source.metadata?.title || title || questionsArray[0],
      question: questionsArray.join(' | '), // Keep for backward compatibility
      questions: questionsArray, // New array format
      answer: answer,
      images: source.metadata?.images || images || [],
      size_bytes: sizeBytes,
      status: source.status,
      created_at: source.created_at,
      metadata: source.metadata
    }

    return NextResponse.json({
      success: true,
      source: formattedSource,
      message: 'Q&A pair added successfully'
    })

  } catch (error) {
    console.error('Q&A creation error:', error)
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

    // Fetch Q&A sources from database
    const { data: sources, error } = await supabase
      .from('sources')
      .select('*')
      .eq('agent_id', params.id)
      .eq('type', 'qa')
      .neq('status', 'removed') // Don't show soft-deleted Q&As
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching Q&A:', error)
      return NextResponse.json({ sources: [] })
    }

    // Format for frontend
    const formattedSources = sources.map(source => {
      let questionsArray = []
      let answer = ''

      // Parse Q&A from content field
      if (source.content) {
        try {
          const parsed = JSON.parse(source.content)

          // Handle new format (questions array)
          if (parsed.questions && Array.isArray(parsed.questions)) {
            questionsArray = parsed.questions
          }
          // Handle old format (single question string, might have pipe separators)
          else if (parsed.question) {
            questionsArray = parsed.question.includes(' | ')
              ? parsed.question.split(' | ')
              : [parsed.question]
          }
          // Fallback to name
          else {
            questionsArray = [source.name]
          }

          answer = parsed.answer || ''
        } catch (e) {
          // Fallback if parsing fails
          questionsArray = [source.name]
        }
      }

      return {
        id: source.id,
        agent_id: source.agent_id,
        type: 'qa',
        title: source.metadata?.title || source.name || questionsArray[0],
        question: questionsArray.join(' | '), // Keep for backward compatibility
        questions: questionsArray, // New array format
        answer: answer,
        images: source.metadata?.images || [],
        size_bytes: source.size_kb * 1024,
        status: source.status,
        created_at: source.created_at,
        metadata: source.metadata
      }
    })

    return NextResponse.json({ sources: formattedSources })

  } catch (error) {
    console.error('Get Q&A error:', error)
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
    const requestBody = await request.json()
    const { sourceId, question, questions, answer, images, title } = requestBody


    // Support both single question (backward compat) and questions array
    const questionsArray = questions || (question ?
      (question.includes(' | ') ? question.split(' | ') : [question])
      : [])

    if (!sourceId || !questionsArray.length || !answer) {
      return NextResponse.json(
        { error: 'Source ID, at least one question and answer are required' },
        { status: 400 }
      )
    }

    const sizeBytes = new TextEncoder().encode(questionsArray.join(' ') + answer).length
    const sizeKb = Math.round(sizeBytes / 1024) || 1

    // Get existing metadata to preserve title if not provided
    const { data: existing } = await supabase
      .from('sources')
      .select('metadata')
      .eq('id', sourceId)
      .single()

    // Prepare updated metadata
    const updatedMetadata = {
      ...existing?.metadata, // Preserve existing metadata
      title: title || existing?.metadata?.title || questionsArray[0],
      has_images: images && Array.isArray(images) && images.length > 0,
      images: images && Array.isArray(images) ? images : (existing?.metadata?.images || [])
    }


    // Update in database
    const { data: source, error } = await supabase
      .from('sources')
      .update({
        name: title || questionsArray[0], // Use title or first question as name
        content: JSON.stringify({ questions: questionsArray, answer }), // Store as array
        size_kb: sizeKb,
        metadata: updatedMetadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', sourceId)
      .eq('agent_id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating Q&A:', error)
      return NextResponse.json(
        { error: 'Failed to update Q&A' },
        { status: 500 }
      )
    }

    // Format for frontend
    const formattedSource = {
      id: source.id,
      agent_id: source.agent_id,
      type: 'qa',
      title: source.metadata?.title || questionsArray[0],
      question: questionsArray.join(' | '), // Keep for backward compatibility
      questions: questionsArray, // New array format
      answer: answer,
      images: source.metadata?.images || images || [],
      size_bytes: sizeBytes,
      status: source.status,
      created_at: source.created_at, // Include created_at for date display
      updated_at: source.updated_at,
      metadata: source.metadata
    }

    return NextResponse.json({
      success: true,
      source: formattedSource,
      message: 'Q&A pair updated successfully'
    })

  } catch (error) {
    console.error('Q&A update error:', error)
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
          { error: 'Failed to remove trained Q&A pairs' },
          { status: 500 }
        )
      }
      console.log(`Soft deleted ${trainedIds.length} trained Q&A sources`)
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
          { error: 'Failed to delete untrained Q&A pairs' },
          { status: 500 }
        )
      }
      console.log(`Hard deleted ${untrainedIds.length} untrained Q&A sources`)
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
      message: `Deleted ${sourceIds.length} Q&A pair(s)`
    })

  } catch (error) {
    console.error('Delete Q&A error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}