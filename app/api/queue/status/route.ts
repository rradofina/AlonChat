import { NextResponse } from 'next/server'
import { getQueueStatus, isQueueAvailable } from '@/lib/queue/website-processor'

export async function GET() {
  try {
    const isAvailable = isQueueAvailable()

    if (!isAvailable) {
      return NextResponse.json({
        available: false,
        message: 'Queue system not available (Redis not running)'
      })
    }

    const status = await getQueueStatus()

    return NextResponse.json({
      available: true,
      ...status
    })
  } catch (error: any) {
    console.error('Failed to get queue status:', error)
    return NextResponse.json({
      available: false,
      error: error.message || 'Failed to get queue status'
    })
  }
}