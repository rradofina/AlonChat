import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FileProcessor } from '@/lib/sources/file-processor'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
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
      try {
        // Process file to extract content
        console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size)
        const processedFile = await FileProcessor.processFile(file)
        console.log('File processed successfully:', {
          fileName: file.name,
          contentLength: processedFile.content?.length || 0,
          pageCount: processedFile.pageCount
        })

        // Prepare the insert data
        const insertData = {
          agent_id: params.id,
          project_id: agent.project_id,
          type: 'file',
          name: file.name,
          size_kb: Math.round(file.size / 1024),
          status: 'ready',
          content: processedFile.content,
          metadata: {
            file_type: file.type,
            original_name: file.name,
            page_count: processedFile.pageCount,
            pdf_metadata: processedFile.metadata
          }
        }

        console.log('Attempting to insert source with data:', {
          agent_id: insertData.agent_id,
          project_id: insertData.project_id,
          name: insertData.name,
          size_kb: insertData.size_kb,
          contentPreview: insertData.content?.substring(0, 100) + '...'
        })

        // Insert source record into database with extracted content
        const { data: source, error: sourceError } = await supabase
          .from('sources')
          .insert(insertData)
          .select()
          .single()

        if (sourceError) {
          console.error('Database insert error:', {
            error: sourceError,
            message: sourceError.message,
            details: sourceError.details,
            hint: sourceError.hint,
            code: sourceError.code
          })
          // Don't throw here, continue with error status
          uploadedSources.push({
            id: crypto.randomUUID(),
            agent_id: params.id,
            type: 'file',
            name: file.name,
            size_bytes: file.size,
            status: 'error',
            error: `Database error: ${sourceError.message}`,
            created_at: new Date().toISOString(),
            metadata: {
              file_type: file.type,
              original_name: file.name,
              db_error: sourceError
            }
          })
        } else if (source) {
          console.log('File saved successfully to database:', {
            id: source.id,
            name: source.name,
            status: source.status
          })
          // Convert to match frontend expected format
          uploadedSources.push({
            id: source.id,
            agent_id: source.agent_id,
            type: source.type,
            name: source.name,
            size_bytes: source.size_kb * 1024,
            status: source.status,
            content: source.content,
            created_at: source.created_at,
            metadata: source.metadata
          })
        } else {
          console.error('Unexpected: No error but also no source data returned')
          uploadedSources.push({
            id: crypto.randomUUID(),
            agent_id: params.id,
            type: 'file',
            name: file.name,
            size_bytes: file.size,
            status: 'error',
            error: 'No data returned from database',
            created_at: new Date().toISOString(),
            metadata: {
              file_type: file.type,
              original_name: file.name
            }
          })
        }
      } catch (error: any) {
        console.error('Error processing file:', file.name, error)
        console.error('Error details:', {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          errorMessage: error.message,
          errorStack: error.stack
        })
        // Add failed file to response with error info
        uploadedSources.push({
          id: crypto.randomUUID(),
          agent_id: params.id,
          type: 'file',
          name: file.name,
          size_bytes: file.size,
          status: 'error',
          error: error.message || 'Failed to process file',
          created_at: new Date().toISOString(),
          metadata: {
            file_type: file.type,
            original_name: file.name
          }
        })
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
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
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