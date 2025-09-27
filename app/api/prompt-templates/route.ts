import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // No authentication required - these are public templates

    // Get only active system templates
    const { data: templates, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('is_system', true)
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching prompt templates:', error)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error in GET /api/prompt-templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}