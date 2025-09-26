import { NextResponse } from 'next/server'
import { syncModelsToDatabase } from '@/lib/ai/model-sync'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    // Check if user is admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Sync models to database
    const result = await syncModelsToDatabase()

    if (result.success) {
      return NextResponse.json({
        message: `Successfully synced ${result.syncedCount} of ${result.totalModels} models`,
        ...result
      })
    } else {
      return NextResponse.json({
        message: 'Model sync completed with errors',
        ...result
      }, { status: 207 })
    }
  } catch (error) {
    console.error('Failed to sync models:', error)
    return NextResponse.json(
      { error: 'Failed to sync models' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current model count and info
    const { data: models, count } = await supabase
      .from('ai_models')
      .select('*', { count: 'exact' })
      .order('provider')
      .order('sort_order')

    const modelsByProvider = models?.reduce((acc, model) => {
      if (!acc[model.provider]) acc[model.provider] = []
      acc[model.provider].push(model.display_name)
      return acc
    }, {} as Record<string, string[]>)

    return NextResponse.json({
      totalModels: count,
      providers: Object.keys(modelsByProvider || {}),
      modelsByProvider,
      lastSync: models?.[0]?.updated_at
    })
  } catch (error) {
    console.error('Failed to get model info:', error)
    return NextResponse.json(
      { error: 'Failed to get model info' },
      { status: 500 }
    )
  }
}