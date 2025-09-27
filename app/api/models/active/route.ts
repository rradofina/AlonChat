import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active models
    const { data: models, error } = await supabase
      .from('ai_models')
      .select('id, name, display_name, provider, is_default, capabilities')
      .eq('is_active', true)
      .order('display_name')

    if (error) throw error

    return NextResponse.json({ models: models || [] })
  } catch (error) {
    console.error('Failed to fetch active models:', error)
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 })
  }
}