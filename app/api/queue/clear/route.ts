import { NextResponse } from 'next/server'
import { initWebsiteQueue } from '@/lib/queue/website-processor'

export async function POST() {
  try {
    const queue = initWebsiteQueue()

    if (!queue) {
      return NextResponse.json({
        success: false,
        message: 'Queue not available'
      })
    }

    // Get all jobs
    const jobs = await queue.getJobs(['active', 'waiting', 'delayed', 'paused', 'failed'])

    // Clear all jobs
    let removed = 0
    for (const job of jobs) {
      await job.remove()
      removed++
    }

    // Also clean the queue
    await queue.clean(0, 1000, 'completed')
    await queue.clean(0, 1000, 'failed')

    return NextResponse.json({
      success: true,
      message: `Cleared ${removed} jobs from queue`
    })
  } catch (error: any) {
    console.error('Failed to clear queue:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to clear queue'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const queue = initWebsiteQueue()

    if (!queue) {
      return NextResponse.json({
        success: false,
        message: 'Queue not available'
      })
    }

    // Get all jobs
    const waiting = await queue.getWaitingCount()
    const active = await queue.getActiveCount()
    const completed = await queue.getCompletedCount()
    const failed = await queue.getFailedCount()
    const delayed = await queue.getDelayedCount()

    // Get job details
    const activeJobs = await queue.getActive()
    const waitingJobs = await queue.getWaiting()

    const jobDetails = [
      ...activeJobs.map(job => ({
        id: job.id,
        name: job.name,
        status: 'active',
        data: job.data,
        progress: job.progress
      })),
      ...waitingJobs.map(job => ({
        id: job.id,
        name: job.name,
        status: 'waiting',
        data: job.data
      }))
    ]

    return NextResponse.json({
      success: true,
      counts: {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed
      },
      jobs: jobDetails
    })
  } catch (error: any) {
    console.error('Failed to get queue status:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get queue status'
    }, { status: 500 })
  }
}