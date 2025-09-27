import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const SystemSettingsSchema = z.object({
  admin_system_prompt: z.string().min(1).optional(),
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

    // Get global settings
    const { data: settings, error } = await supabase
      .from('global_settings')
      .select('*')
      .in('key', ['admin_system_prompt'])

    if (error) {
      console.error('Error fetching global settings:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Format settings as key-value object
    const formattedSettings = settings?.reduce((acc, setting) => {
      acc[setting.key] = {
        value: setting.value,
        description: setting.description,
        updated_at: setting.updated_at,
        is_sensitive: setting.is_sensitive
      }
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({ settings: formattedSettings || {} })
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

    // Update settings
    const updates = []

    if (validatedData.admin_system_prompt !== undefined) {
      updates.push(
        supabase
          .from('global_settings')
          .upsert({
            key: 'admin_system_prompt',
            value: validatedData.admin_system_prompt,
            updated_by: user.id
          }, {
            onConflict: 'key'
          })
      )
    }

    // Execute all updates
    const results = await Promise.all(updates)

    // Check for errors
    for (const result of results) {
      if (result.error) {
        console.error('Error updating global settings:', result.error)
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