import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Insert text source into database
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .insert({
        agent_id: params.id,
        project_id: agent.project_id,
        type: 'text',
        name: title,
        content: content,
        size_kb: sizeKb,
        status: 'pending',
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
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching text sources:', error)
      return NextResponse.json({ sources: [] })
    }

    // Format for frontend
    const formattedSources = sources.map(source => ({
      id: source.id,
      agent_id: source.agent_id,
      type: 'text',
      name: source.name,
      content: source.content,
      size_bytes: source.size_kb * 1024,
      status: source.status,
      created_at: source.created_at,
      metadata: source.metadata
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

    const sizeBytes = new TextEncoder().encode(content).length
    const sizeKb = Math.round(sizeBytes / 1024) || 1

    // Update in database
    const { data: source, error } = await supabase
      .from('sources')
      .update({
        name: title,
        content: content,
        size_kb: sizeKb,
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

    // Delete from database
    const { error } = await supabase
      .from('sources')
      .delete()
      .in('id', sourceIds)
      .eq('agent_id', params.id)

    if (error) {
      console.error('Delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete text' },
        { status: 500 }
      )
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