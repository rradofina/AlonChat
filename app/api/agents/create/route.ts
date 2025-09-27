import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { modelService } from '@/lib/services/model-service'
import { z } from 'zod'

const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  sources: z.array(z.object({
    type: z.enum(['file', 'text', 'website', 'qa']),
    name: z.string(),
    content: z.string().optional(),
    url: z.string().optional(),
    fileData: z.string().optional(), // Base64 encoded file
    fileName: z.string().optional(),
    fileType: z.string().optional(),
    size: z.number().optional(),
    qaItems: z.array(z.object({
      question: z.string(),
      answer: z.string()
    })).optional()
  }))
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's project
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'No project found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = CreateAgentSchema.parse(body)

    // Calculate total size
    let totalSizeKb = 0
    validatedData.sources.forEach(source => {
      if (source.size) {
        totalSizeKb += source.size / 1024 // Convert bytes to KB
      } else if (source.content) {
        totalSizeKb += Buffer.byteLength(source.content, 'utf8') / 1024
      }
    })

    // Get default model from the system
    const defaultModel = await modelService.getDefaultModel(true)
    if (!defaultModel) {
      return NextResponse.json({
        error: 'No AI models configured. Please contact administrator.'
      }, { status: 500 })
    }

    // Create agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert({
        name: validatedData.name,
        description: validatedData.description || '',
        project_id: project.id,
        created_by: user.id,
        status: 'training',
        total_sources: validatedData.sources.length,
        total_size_kb: Math.round(totalSizeKb),
        model: defaultModel, // Use dynamic default model
        temperature: 0.7,
        max_tokens: 500,
        system_prompt: `You are a helpful AI assistant for ${validatedData.name}. Answer questions based on the provided knowledge base.`,
        welcome_message: 'Hello! How can I help you today?'
      })
      .select()
      .single()

    if (agentError || !agent) {
      console.error('Agent creation error:', agentError)
      return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
    }

    // Create sources
    const sourcesToInsert = validatedData.sources.map(source => {
      let content = source.content || ''

      // For Q&A sources, format the content
      if (source.type === 'qa' && source.qaItems) {
        content = source.qaItems.map(item =>
          `Q: ${item.question}\nA: ${item.answer}`
        ).join('\n\n')
      }

      return {
        agent_id: agent.id,
        project_id: project.id,
        type: source.type,
        name: source.name,
        content: content,
        website_url: source.url,
        status: 'pending',
        size_kb: source.size ? Math.round(source.size / 1024) : Math.round(Buffer.byteLength(content, 'utf8') / 1024),
        metadata: {
          fileName: source.fileName,
          fileType: source.fileType
        }
      }
    })

    const { error: sourcesError } = await supabase
      .from('sources')
      .insert(sourcesToInsert)

    if (sourcesError) {
      console.error('Sources creation error:', sourcesError)
      // Rollback agent creation
      await supabase.from('agents').delete().eq('id', agent.id)
      return NextResponse.json({ error: 'Failed to create sources' }, { status: 500 })
    }

    // TODO: Trigger background job to process sources and generate embeddings
    // For now, we'll just mark the agent as ready after a delay
    setTimeout(async () => {
      await supabase
        .from('agents')
        .update({ status: 'ready' })
        .eq('id', agent.id)

      await supabase
        .from('sources')
        .update({ status: 'ready' })
        .eq('agent_id', agent.id)
    }, 3000)

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status
      }
    })

  } catch (error) {
    console.error('Create agent error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}