import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UpdatePromptTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  user_prompt: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
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

    const templateId = params.id

    // Get the template
    const { data: template, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error in GET /api/admin/prompt-templates/[id]:', error)
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

    // Check admin access
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)

    if (!projects || projects.length === 0) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const templateId = params.id

    // Check if template exists and is not a system template
    const { data: existingTemplate } = await supabase
      .from('prompt_templates')
      .select('is_system')
      .eq('id', templateId)
      .single()

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (existingTemplate.is_system) {
      return NextResponse.json({ error: 'System templates cannot be modified' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = UpdatePromptTemplateSchema.parse(body)

    // Update the template
    const { data: template, error } = await supabase
      .from('prompt_templates')
      .update(validatedData)
      .eq('id', templateId)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A template with this name already exists' }, { status: 409 })
      }
      console.error('Error updating prompt template:', error)
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    console.error('Error in PATCH /api/admin/prompt-templates/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    // Check admin access
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)

    if (!projects || projects.length === 0) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const templateId = params.id

    // Check if template is system template
    const { data: existingTemplate } = await supabase
      .from('prompt_templates')
      .select('is_system')
      .eq('id', templateId)
      .single()

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (existingTemplate.is_system) {
      return NextResponse.json({ error: 'System templates cannot be deleted' }, { status: 403 })
    }

    // Check if any agents are using this template
    const { data: agents } = await supabase
      .from('agents')
      .select('id')
      .eq('prompt_template_id', templateId)
      .limit(1)

    if (agents && agents.length > 0) {
      // Soft delete instead of hard delete
      const { error } = await supabase
        .from('prompt_templates')
        .update({ is_active: false })
        .eq('id', templateId)

      if (error) {
        console.error('Error soft deleting prompt template:', error)
        return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
      }

      return NextResponse.json({
        message: 'Template deactivated (agents are using it)',
        soft_deleted: true
      })
    }

    // Hard delete if no agents are using it
    const { error } = await supabase
      .from('prompt_templates')
      .delete()
      .eq('id', templateId)

    if (error) {
      console.error('Error deleting prompt template:', error)
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Template deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/admin/prompt-templates/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}