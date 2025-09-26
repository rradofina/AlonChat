import { NextResponse } from 'next/server'
import { initWebsiteQueue, initWebsiteWorker } from '@/lib/queue/website-processor'

// This initializes queue workers on first API call
let initialized = false

export async function GET() {
  if (!initialized) {
    console.log('Initializing queue system...')

    const queue = initWebsiteQueue()
    const worker = initWebsiteWorker()

    if (queue && worker) {
      console.log('✅ Queue system initialized with Redis')
      initialized = true
      return NextResponse.json({
        status: 'initialized',
        redis: true,
        message: 'Queue system ready with Redis'
      })
    } else {
      console.log('⚠️ Queue system running in fallback mode (Redis not available)')
      return NextResponse.json({
        status: 'fallback',
        redis: false,
        message: 'Running without queue (Redis not available)'
      })
    }
  }

  return NextResponse.json({
    status: 'already_initialized',
    message: 'Queue system already running'
  })
}