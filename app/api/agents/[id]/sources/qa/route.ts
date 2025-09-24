import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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


    // Insert Q&A into database
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .insert({
        agent_id: params.id,
        project_id: agent.project_id,
        type: 'qa',
        name: name,
        content: JSON.stringify({ questions: questionsArray, answer }), // Store as array
        size_kb: sizeKb,
        status: 'ready', // Set to ready since Q&A doesn't need processing
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

    // Delete from database
    const { error } = await supabase
      .from('sources')
      .delete()
      .in('id', sourceIds)
      .eq('agent_id', params.id)

    if (error) {
      console.error('Delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete Q&A' },
        { status: 500 }
      )
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