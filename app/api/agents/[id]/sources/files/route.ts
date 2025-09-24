import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get the agent to ensure it exists and get project_id
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('project_id')
      .eq('id', params.id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const uploadedSources = []

    for (const file of files) {
      // Insert source record into database
      const { data: source, error: sourceError } = await supabase
        .from('sources')
        .insert({
          agent_id: params.id,
          project_id: agent.project_id,
          type: 'file',
          name: file.name,
          size_kb: Math.round(file.size / 1024),
          status: 'processing', // Start with processing
          metadata: {
            file_type: file.type,
            original_name: file.name
          }
        })
        .select()
        .single()

      if (!sourceError && source) {
        // Convert to match frontend expected format
        uploadedSources.push({
          id: source.id,
          agent_id: source.agent_id,
          type: source.type,
          name: source.name,
          size_bytes: source.size_kb * 1024,
          status: source.status,
          created_at: source.created_at,
          metadata: source.metadata
        })

        // Simulate file processing (in production, this would be a background job)
        // After 3 seconds, mark the file as "ready"
        setTimeout(async () => {
          const supabase = await createClient()
          await supabase
            .from('sources')
            .update({ status: 'ready' })
            .eq('id', source.id)
        }, 3000)
      }
    }

    // Update agent's source count
    const { data: stats } = await supabase
      .from('sources')
      .select('type, size_kb')
      .eq('agent_id', params.id)

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
      sources: uploadedSources,
      message: `Successfully uploaded ${uploadedSources.length} file(s)`
    })

  } catch (error) {
    console.error('File upload error:', error)
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

    // Fetch file sources from database
    const { data: sources, error } = await supabase
      .from('sources')
      .select('*')
      .eq('agent_id', params.id)
      .eq('type', 'file')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching files:', error)
      return NextResponse.json({ sources: [] })
    }

    // Convert to match frontend expected format
    const formattedSources = sources.map(source => ({
      id: source.id,
      agent_id: source.agent_id,
      type: source.type,
      name: source.name,
      size_bytes: source.size_kb * 1024,
      status: source.status,
      created_at: source.created_at,
      metadata: source.metadata,
      content: source.content // Include the actual content for preview
    }))

    return NextResponse.json({ sources: formattedSources })

  } catch (error) {
    console.error('Get files error:', error)
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

    // Delete sources from database
    const { error } = await supabase
      .from('sources')
      .delete()
      .in('id', sourceIds)
      .eq('agent_id', params.id)

    if (error) {
      console.error('Delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete files' },
        { status: 500 }
      )
    }

    // Update agent's source count
    const { data: stats } = await supabase
      .from('sources')
      .select('type, size_kb')
      .eq('agent_id', params.id)

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
      message: `Deleted ${sourceIds.length} file(s)`
    })

  } catch (error) {
    console.error('Delete files error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}