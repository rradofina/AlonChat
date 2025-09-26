import { NextResponse } from 'next/server'
import { Queue } from 'bullmq'
import { getSharedConnection } from '@/lib/queue/redis-connection'

export async function POST() {
  try {
    const connection = getSharedConnection()
    if (!connection) {
      return NextResponse.json(
        { error: 'Redis not available' },
        { status: 503 }
      )
    }

    const websiteQueue = new Queue('website-crawl', { connection })

    // Get all jobs
    const activeJobs = await websiteQueue.getActive()
    const waitingJobs = await websiteQueue.getWaiting()
    const failedJobs = await websiteQueue.getFailed()

    let removedCount = 0

    // Remove active jobs
    for (const job of activeJobs) {
      try {
        await job.remove()
        removedCount++
        console.log(`Removed active job: ${job.id}`)
      } catch (error) {
        console.error(`Failed to remove active job ${job.id}:`, error)
        // Force move to failed state first, then remove
        try {
          await job.moveToFailed(new Error('Force removed'), 'forced')
          await job.remove()
          removedCount++
        } catch (e) {
          console.error(`Could not force remove job ${job.id}`)
        }
      }
    }

    // Remove waiting jobs
    for (const job of waitingJobs) {
      await job.remove()
      removedCount++
      console.log(`Removed waiting job: ${job.id}`)
    }

    // Remove failed jobs
    for (const job of failedJobs) {
      await job.remove()
      removedCount++
      console.log(`Removed failed job: ${job.id}`)
    }

    // Also drain the queue (removes all waiting jobs)
    await websiteQueue.drain()

    // Clean completed and failed jobs
    await websiteQueue.clean(0, 1000, 'completed')
    await websiteQueue.clean(0, 1000, 'failed')

    return NextResponse.json({
      success: true,
      removed: removedCount,
      message: `Force cleared ${removedCount} jobs from queue`
    })
  } catch (error: any) {
    console.error('Force clear queue error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}