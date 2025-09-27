import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const SystemSettingsSchema = z.object({
  master_system_prompt: z.string().min(1).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (owns at least one project)
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)

    if (!projects || projects.length === 0) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get system settings
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('setting_key', 'master_system_prompt')

    if (error) {
      console.error('Error fetching system settings:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Return settings as array (to match frontend expectations)
    return NextResponse.json({ settings: settings || [] })
  } catch (error) {
    console.error('Error in GET /api/admin/system-settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json()
    const validatedData = SystemSettingsSchema.parse(body)

    // Update or insert master system prompt
    if (validatedData.master_system_prompt !== undefined) {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'master_system_prompt',
          setting_value: validatedData.master_system_prompt,
          setting_type: 'text',
          category: 'prompts',
          description: 'Master system prompt prepended to all agent conversations',
          is_public: false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'setting_key'
        })

      if (error) {
        console.error('Error updating system settings:', error)
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, message: 'Settings updated successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    console.error('Error in PATCH /api/admin/system-settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}