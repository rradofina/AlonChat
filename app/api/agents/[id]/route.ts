import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UpdateAgentSchema = z.object({
  name: z.string().optional(),
  system_prompt: z.string().optional(),
  prompt_template_id: z.string().uuid().nullable().optional(),
  custom_user_prompt: z.string().nullable().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).optional(),
  greeting_message: z.string().optional()
})

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const agentId = params.id

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select(`
        *,
        projects!inner(owner_id)
      `)
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Check ownership
    if (agent.projects.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({ agent })

  } catch (error) {
    console.error('Get agent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const agentId = params.id
    const body = await request.json()
    const validatedData = UpdateAgentSchema.parse(body)

    // Get agent to check ownership
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select(`
        *,
        projects!inner(owner_id)
      `)
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Check ownership
    if (agent.projects.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update agent
    const { data: updatedAgent, error: updateError } = await supabase
      .from('agents')
      .update(validatedData)
      .eq('id', agentId)
      .select()
      .single()

    if (updateError) {
      console.error('Update agent error:', updateError)
      return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 })
    }

    return NextResponse.json({ agent: updatedAgent })

  } catch (error) {
    console.error('Update agent error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}