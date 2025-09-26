import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initWebsiteQueue } from '@/lib/queue/website-processor'

export async function POST() {
  try {
    const supabase = await createClient()
    const queue = initWebsiteQueue()

    if (!queue) {
      return NextResponse.json({
        success: false,
        message: 'Queue not available'
      })
    }

    // Get all jobs currently in queue
    const activeJobs = await queue.getJobs(['active', 'waiting', 'delayed', 'paused'])
    const queuedSourceIds = new Set(activeJobs.map(job => job.data.sourceId))

    // Find all sources marked as processing or queued in database
    const { data: sources, error } = await supabase
      .from('sources')
      .select('id, status, website_url')
      .in('status', ['processing', 'queued'])
      .eq('type', 'website')

    if (error) {
      throw error
    }

    // Find orphaned sources (in DB but not in queue)
    const orphanedSources = sources?.filter(source => !queuedSourceIds.has(source.id)) || []

    // Reset orphaned sources to 'error' status
    if (orphanedSources.length > 0) {
      const orphanedIds = orphanedSources.map(s => s.id)

      const { error: updateError } = await supabase
        .from('sources')
        .update({
          status: 'error',
          metadata: {
            error: 'Orphaned from queue failure - please delete and re-add'
          }
        })
        .in('id', orphanedIds)

      if (updateError) {
        throw updateError
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${orphanedSources.length} orphaned sources`,
      orphaned: orphanedSources.map(s => ({
        id: s.id,
        url: s.website_url
      })),
      activeInQueue: Array.from(queuedSourceIds)
    })
  } catch (error: any) {
    console.error('Failed to cleanup orphaned sources:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to cleanup'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const queue = initWebsiteQueue()

    if (!queue) {
      return NextResponse.json({
        success: false,
        message: 'Queue not available'
      })
    }

    // Get all jobs currently in queue
    const activeJobs = await queue.getJobs(['active', 'waiting', 'delayed', 'paused'])
    const queuedSourceIds = new Set(activeJobs.map(job => job.data.sourceId))

    // Find all sources marked as processing or queued in database
    const { data: sources, error } = await supabase
      .from('sources')
      .select('id, status, website_url, created_at')
      .in('status', ['processing', 'queued'])
      .eq('type', 'website')

    if (error) {
      throw error
    }

    // Find orphaned sources
    const orphanedSources = sources?.filter(source => !queuedSourceIds.has(source.id)) || []
    const validSources = sources?.filter(source => queuedSourceIds.has(source.id)) || []

    return NextResponse.json({
      success: true,
      orphaned: orphanedSources,
      validInQueue: validSources,
      queueJobIds: Array.from(queuedSourceIds)
    })
  } catch (error: any) {
    console.error('Failed to check orphaned sources:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to check'
    }, { status: 500 })
  }
}