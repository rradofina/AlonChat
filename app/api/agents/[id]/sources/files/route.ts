import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StorageManager } from '@/lib/services/storage-manager'
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
        // Validate file
        console.log('Uploading file:', file.name, 'Type:', file.type, 'Size:', file.size)

        if (file.size > StorageManager.MAX_FILE_SIZE) {
          throw new Error(`File size exceeds ${StorageManager.MAX_FILE_SIZE / 1024 / 1024}MB limit`)
        }

        // Upload file to storage
        const uploadResult = await StorageManager.uploadFile({
          file,
          agentId: params.id,
          projectId: agent.project_id
        })

        console.log('File uploaded to storage:', uploadResult)

        // Process the file to extract content immediately
        let extractedContent = ''
        try {
          const processedFile = await FileProcessor.processFile(file)
          extractedContent = processedFile.content || ''
          console.log(`Processed ${file.name}: ${extractedContent.length} characters extracted`)
        } catch (processError) {
          console.log(`Could not process ${file.name}, will store without content extraction`)
        }

        // Prepare the insert data WITH PROCESSED CONTENT
        const insertData = {
          agent_id: params.id,
          project_id: agent.project_id,
          type: 'file',
          name: file.name,
          content: extractedContent, // Store processed content for instant viewing
          size_kb: Math.round(file.size / 1024),
          status: 'ready', // Mark as ready immediately since content is processed
          is_trained: false, // Explicitly set to false - files are not trained until training is run
          file_url: uploadResult.path, // Store file path reference
          metadata: {
            file_type: file.type,
            original_name: file.name,
            storage_path: uploadResult.path,
            storage_size: uploadResult.size,
            content_extracted: extractedContent.length > 0
          }
        }


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
          console.log('File record saved to database:', {
            id: source.id,
            name: source.name,
            status: source.status,
            file_url: source.file_url
          })

          // Skip processing during upload - just mark as ready
          // Files can be viewed directly from storage
          console.log(`File ${source.id} uploaded and processed successfully`)

          // Convert to match frontend expected format
          uploadedSources.push({
            id: source.id,
            agent_id: source.agent_id,
            type: source.type,
            name: source.name,
            size_bytes: source.size_kb * 1024,
            status: 'success', // Show as success immediately
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

    // Check if we should include removed files
    const url = new URL(request.url)
    const includeRemoved = url.searchParams.get('includeRemoved') === 'true'

    // Build query
    let query = supabase
      .from('sources')
      .select('*')
      .eq('agent_id', params.id)
      .eq('type', 'file')

    // By default, exclude removed files unless specifically requested
    if (!includeRemoved) {
      query = query.neq('status', 'removed')
    }

    // Fetch file sources from database
    const { data: sources, error } = await query
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
      metadata: source.metadata
      // Content is now stored in chunks, not directly on source
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
          { error: 'Failed to remove trained files' },
          { status: 500 }
        )
      }
      console.log(`Soft deleted ${trainedIds.length} trained sources`)
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
        // Continue anyway - chunks might not exist
      }

      const { error: hardDeleteError } = await supabase
        .from('sources')
        .delete()
        .in('id', untrainedIds)
        .eq('agent_id', params.id)

      if (hardDeleteError) {
        console.error('Hard delete error:', hardDeleteError)
        return NextResponse.json(
          { error: 'Failed to delete untrained files' },
          { status: 500 }
        )
      }
      console.log(`Hard deleted ${untrainedIds.length} untrained sources`)
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

