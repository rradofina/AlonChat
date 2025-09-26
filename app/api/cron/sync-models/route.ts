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

    // Get all projects with API credentials
    const { data: projectsWithCreds } = await supabase
      .from('ai_provider_credentials')
      .select('project_id')
      .eq('is_active', true)

    if (!projectsWithCreds || projectsWithCreds.length === 0) {
      return NextResponse.json({
        message: 'No projects with API credentials found',
        synced: 0,
      })
    }

    // Get unique project IDs
    const uniqueProjectIds = [...new Set(projectsWithCreds.map(p => p.project_id))]
    const results = []

    // Sync models for each project
    for (const projectId of uniqueProjectIds) {
      try {
        const result = await syncDiscoveredModels(projectId)
        results.push({
          projectId,
          success: result.success,
          modelsCount: result.modelsCount,
        })
      } catch (error) {
        console.error(`Failed to sync models for project ${projectId}:`, error)
        results.push({
          projectId,
          success: false,
          error: String(error),
        })
      }
    }

    // Log the sync operation
    await supabase
      .from('system_logs')
      .insert({
        type: 'model_sync',
        data: {
          projects_synced: results.filter(r => r.success).length,
          total_models: results.reduce((acc, r) => acc + (r.modelsCount || 0), 0),
          results,
        },
        created_at: new Date().toISOString(),
      })
      .catch(console.error) // Don't fail if logging fails

    const successCount = results.filter(r => r.success).length
    const totalModels = results.reduce((acc, r) => acc + (r.modelsCount || 0), 0)

    return NextResponse.json({
      success: true,
      message: `Synced ${totalModels} models across ${successCount} projects`,
      projectsSynced: successCount,
      totalModels,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Failed to sync models', details: error },
      { status: 500 }
    )
  }
}

// Allow POST for manual triggers
export async function POST(request: Request) {
  return GET(request)
}