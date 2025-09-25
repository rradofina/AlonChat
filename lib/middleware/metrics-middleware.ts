import { NextRequest, NextResponse } from 'next/server'
import { MetricsTracker } from '@/lib/services/metrics-tracker'
import { createClient } from '@/lib/supabase/server'

/**
 * Middleware to track API request metrics
 */
export async function withMetrics(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()

  // Start tracking
  MetricsTracker.startRequest(requestId)

  // Get request info
  const endpoint = request.nextUrl.pathname
  const method = request.method
  const requestSize = request.headers.get('content-length') || '0'

  // Extract IDs from URL
  const pathSegments = endpoint.split('/')
  const agentIndex = pathSegments.indexOf('agents')
  const agentId = agentIndex > -1 ? pathSegments[agentIndex + 1] : undefined

  // Get user info (if available)
  let userId: string | undefined
  let projectId: string | undefined

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id

    // If we have an agent ID, get the project ID
    if (agentId && userId) {
      const { data: agent } = await supabase
        .from('agents')
        .select('project_id')
        .eq('id', agentId)
        .single()

      projectId = agent?.project_id
    }
  } catch (error) {
    console.error('[Metrics Middleware] Error getting user/project info:', error)
  }

  let response: NextResponse
  let errorMessage: string | undefined

  try {
    // Execute the actual handler
    response = await handler(request)
  } catch (error: any) {
    errorMessage = error.message || 'Internal server error'

    // Create error response
    response = NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }

  // Calculate response size
  const responseSize = response.headers.get('content-length') ||
    new Blob([await response.clone().text()]).size.toString()

  // End tracking and log metrics
  await MetricsTracker.endRequest(requestId, {
    endpoint,
    method,
    userId,
    projectId,
    agentId,
    statusCode: response.status,
    errorMessage,
    requestSizeBytes: parseInt(requestSize),
    responseSizeBytes: parseInt(responseSize),
    ipAddress: request.ip || request.headers.get('x-forwarded-for') || undefined,
    userAgent: request.headers.get('user-agent') || undefined
  })

  // Add metrics headers to response
  response.headers.set('X-Request-Id', requestId)
  response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`)

  return response
}

/**
 * Wrapper to apply metrics tracking to API route handlers
 */
export function withMetricsHandler(
  handler: (request: NextRequest, context: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: any) => {
    return withMetrics(request, async (req) => handler(req, context))
  }
}