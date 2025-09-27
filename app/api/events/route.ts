import { NextRequest, NextResponse } from 'next/server'
import { getEventBus, EventTypes } from '@/lib/infrastructure/events/EventBus'
import { createClient } from '@/lib/supabase/server'

/**
 * Server-Sent Events endpoint for real-time progress streaming
 * Clients connect to this endpoint to receive live updates about crawl/chunk/embed operations
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Get query parameters
  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId')
  const sourceId = searchParams.get('sourceId')
  const eventTypes = searchParams.get('types')?.split(',') || ['*']

  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no', // Disable Nginx buffering
  })

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const eventBus = getEventBus()

      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({
          type: 'connection',
          status: 'connected',
          timestamp: Date.now()
        })}\n\n`)
      )

      // Keep-alive interval
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        } catch (error) {
          clearInterval(keepAlive)
        }
      }, 30000)

      // Unsubscribe functions collection
      const unsubscribers: Array<() => void> = []

      try {
        // Subscribe to crawl events
        if (eventTypes.includes('*') || eventTypes.includes('crawl')) {
          const unsubCrawlProgress = await eventBus.subscribe(
            EventTypes.CRAWL_PROGRESS,
            (data) => {
              if (projectId && data.projectId !== projectId) return
              if (sourceId && data.sourceId !== sourceId) return

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: EventTypes.CRAWL_PROGRESS,
                  ...data
                })}\n\n`)
              )
            }
          )
          unsubscribers.push(unsubCrawlProgress)

          const unsubCrawlCompleted = await eventBus.subscribe(
            EventTypes.CRAWL_COMPLETED,
            (data) => {
              if (projectId && data.projectId !== projectId) return
              if (sourceId && data.sourceId !== sourceId) return

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: EventTypes.CRAWL_COMPLETED,
                  ...data
                })}\n\n`)
              )
            }
          )
          unsubscribers.push(unsubCrawlCompleted)

          const unsubCrawlFailed = await eventBus.subscribe(
            EventTypes.CRAWL_FAILED,
            (data) => {
              if (projectId && data.projectId !== projectId) return
              if (sourceId && data.sourceId !== sourceId) return

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: EventTypes.CRAWL_FAILED,
                  ...data
                })}\n\n`)
              )
            }
          )
          unsubscribers.push(unsubCrawlFailed)
        }

        // Subscribe to chunk events
        if (eventTypes.includes('*') || eventTypes.includes('chunk')) {
          const unsubChunkProgress = await eventBus.subscribe(
            EventTypes.CHUNK_PROGRESS,
            (data) => {
              if (projectId && data.projectId !== projectId) return
              if (sourceId && data.sourceId !== sourceId) return

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: EventTypes.CHUNK_PROGRESS,
                  ...data
                })}\n\n`)
              )
            }
          )
          unsubscribers.push(unsubChunkProgress)

          const unsubChunkCompleted = await eventBus.subscribe(
            EventTypes.CHUNK_COMPLETED,
            (data) => {
              if (projectId && data.projectId !== projectId) return
              if (sourceId && data.sourceId !== sourceId) return

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: EventTypes.CHUNK_COMPLETED,
                  ...data
                })}\n\n`)
              )
            }
          )
          unsubscribers.push(unsubChunkCompleted)
        }

        // Subscribe to embed events
        if (eventTypes.includes('*') || eventTypes.includes('embed')) {
          const unsubEmbedProgress = await eventBus.subscribe(
            EventTypes.EMBED_PROGRESS,
            (data) => {
              if (projectId && data.projectId !== projectId) return
              if (sourceId && data.sourceId !== sourceId) return

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: EventTypes.EMBED_PROGRESS,
                  ...data
                })}\n\n`)
              )
            }
          )
          unsubscribers.push(unsubEmbedProgress)

          const unsubEmbedCompleted = await eventBus.subscribe(
            EventTypes.EMBED_COMPLETED,
            (data) => {
              if (projectId && data.projectId !== projectId) return
              if (sourceId && data.sourceId !== sourceId) return

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: EventTypes.EMBED_COMPLETED,
                  ...data
                })}\n\n`)
              )
            }
          )
          unsubscribers.push(unsubEmbedCompleted)
        }

        // Subscribe to source events
        if (eventTypes.includes('*') || eventTypes.includes('source')) {
          const unsubSourceUpdated = await eventBus.subscribe(
            EventTypes.SOURCE_UPDATED,
            (data) => {
              if (projectId && data.projectId !== projectId) return
              if (sourceId && data.sourceId !== sourceId) return

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: EventTypes.SOURCE_UPDATED,
                  ...data
                })}\n\n`)
              )
            }
          )
          unsubscribers.push(unsubSourceUpdated)
        }

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          console.log('[SSE] Client disconnected')
          clearInterval(keepAlive)

          // Unsubscribe from all events
          unsubscribers.forEach(unsub => {
            try {
              unsub()
            } catch (error) {
              console.error('[SSE] Error unsubscribing:', error)
            }
          })

          controller.close()
        })

      } catch (error) {
        console.error('[SSE] Error setting up subscriptions:', error)
        clearInterval(keepAlive)
        controller.error(error)
      }
    },
  })

  return new Response(stream, { headers })
}

/**
 * POST endpoint to emit events (for testing or manual triggering)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type, data } = body

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing type or data' },
        { status: 400 }
      )
    }

    const eventBus = getEventBus()
    await eventBus.emit(type, data)

    return NextResponse.json({
      success: true,
      message: `Event ${type} emitted successfully`
    })
  } catch (error) {
    console.error('[SSE] Error emitting event:', error)
    return NextResponse.json(
      { error: 'Failed to emit event' },
      { status: 500 }
    )
  }
}