import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all active providers with their models
    const { data: providers, error } = await supabase
      .from('ai_providers')
      .select(`
        *,
        ai_models!ai_models_provider_id_fkey(
          id,
          name,
          display_name,
          model_id,
          is_active
        )
      `)
      .eq('is_active', true)
      .order('display_name')

    if (error) throw error

    return NextResponse.json({ providers })
  } catch (error) {
    console.error('Failed to fetch providers:', error)
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Create new provider configuration
    const { data: provider, error } = await supabase
      .from('ai_providers')
      .insert({
        name: body.name,
        display_name: body.displayName,
        provider_class: 'CustomProvider',
        api_base_url: body.apiBaseUrl,
        auth_header_name: body.authHeaderName || 'Authorization',
        auth_header_prefix: body.authHeaderPrefix || 'Bearer',
        required_env_vars: body.requiredEnvVars || [],
        config_schema: body.configSchema || {},
        features: body.features || {},
        pricing: body.pricing || {},
        is_builtin: false
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ provider })
  } catch (error) {
    console.error('Failed to create provider:', error)
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 })
  }
}