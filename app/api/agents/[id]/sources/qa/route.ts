import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { question, answer, images } = await request.json()

    if (!question || !answer) {
      return NextResponse.json(
        { error: 'Question and answer are required' },
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
    const sizeBytes = new TextEncoder().encode(question + answer).length
    const sizeKb = Math.round(sizeBytes / 1024) || 1

    // Insert Q&A into database
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .insert({
        agent_id: params.id,
        project_id: agent.project_id,
        type: 'qa',
        name: question, // Use question as name
        content: JSON.stringify({ question, answer }), // Store Q&A in content field
        size_kb: sizeKb,
        status: 'pending',
        metadata: {
          has_images: images && images.length > 0,
          images: images || []
        }
      })
      .select()
      .single()

    if (sourceError) {
      console.error('Error creating Q&A:', sourceError)
      return NextResponse.json(
        { error: 'Failed to create Q&A' },
        { status: 500 }
      )
    }

    // Format for frontend
    const formattedSource = {
      id: source.id,
      agent_id: source.agent_id,
      type: 'qa',
      question: question,
      answer: answer,
      images: images || [],
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
  { params }: { params: { id: string } }
) {
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
      let question = source.name
      let answer = ''

      // Parse Q&A from content field
      if (source.content) {
        try {
          const parsed = JSON.parse(source.content)
          question = parsed.question || source.name
          answer = parsed.answer || ''
        } catch (e) {
          // Fallback if parsing fails
        }
      }

      return {
        id: source.id,
        agent_id: source.agent_id,
        type: 'qa',
        question: question,
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
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { sourceId, question, answer, images } = await request.json()

    if (!sourceId || !question || !answer) {
      return NextResponse.json(
        { error: 'Source ID, question and answer are required' },
        { status: 400 }
      )
    }

    const sizeBytes = new TextEncoder().encode(question + answer).length
    const sizeKb = Math.round(sizeBytes / 1024) || 1

    // Update in database
    const { data: source, error } = await supabase
      .from('sources')
      .update({
        name: question,
        content: JSON.stringify({ question, answer }),
        size_kb: sizeKb,
        metadata: {
          has_images: images && images.length > 0,
          images: images || []
        },
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
      question: question,
      answer: answer,
      images: images || [],
      size_bytes: sizeBytes,
      status: source.status,
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
  { params }: { params: { id: string } }
) {
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