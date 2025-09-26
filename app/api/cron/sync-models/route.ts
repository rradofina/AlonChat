import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { syncDiscoveredModels } from '@/lib/ai/providers/model-discovery'
import { createClient } from '@/lib/supabase/server'

/**
 * Cron job endpoint for automatic model syncing
 * Can be called by:
 * 1. Vercel Cron (vercel.json configuration)
 * 2. External cron services (with API key)
 * 3. Manual trigger from admin panel
 */
export async function GET(request: Request) {
  try {
    // Verify the request is authorized
    const headersList = headers()
    const authHeader = headersList.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Check if this is a Vercel cron job or authorized request
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Also allow Vercel's cron to call this
      const vercelCron = headersList.get('x-vercel-cron')
      if (!vercelCron) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const supabase = await createClient()

    // Get all projects to sync models for
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .limit(10) // Limit to avoid timeout

    if (!projects || projects.length === 0) {
      return NextResponse.json({
        message: 'No projects found',
        synced: 0,
      })
    }

    const results = []

    // Sync models for each project
    for (const project of projects) {
      try {
        const synced = await syncDiscoveredModels(project.id)
        results.push({
          projectId: project.id,
          success: true,
          modelsAdded: synced,
        })
      } catch (error) {
        console.error(`Error syncing models for project ${project.id}:`, error)
        results.push({
          projectId: project.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Log the sync operation
    await supabase
      .from('system_logs')
      .insert({
        level: 'info',
        message: 'Model sync cron job completed',
        data: { results },
      })
      .catch(e => console.error('Failed to log sync operation:', e))

    return NextResponse.json({
      message: 'Model sync completed',
      projects: results.length,
      results,
    })
  } catch (error) {
    console.error('Model sync cron error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}