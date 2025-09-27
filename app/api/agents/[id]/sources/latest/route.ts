import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const agentId = params.id
    const sessionId = request.nextUrl.searchParams.get('sessionId')

    console.log('[Sources] Fetching latest sources:', {
      agentId,
      sessionId,
      userId: user.id
    })

    // Get the most recent chat session for this agent and session
    let query = supabase
      .from('chat_sessions')
      .select('source_chunks, created_at, session_id')
      .eq('agent_id', agentId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    // If sessionId provided, filter by it
    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    const { data: session, error } = await query.maybeSingle()

    console.log('[Sources] Query result:', {
      hasSession: !!session,
      hasChunks: !!(session?.source_chunks),
      chunksCount: session?.source_chunks?.length || 0,
      sessionId: session?.session_id,
      error
    })

    if (error) {
      console.error('[Sources] Error fetching sources:', error)
      return NextResponse.json({ sourceChunks: [] })
    }

    // If no session found, return empty array
    if (!session) {
      console.log('[Sources] No chat session found')
      return NextResponse.json({ sourceChunks: [] })
    }

    return NextResponse.json({
      sourceChunks: session?.source_chunks || [],
      timestamp: session?.created_at
    })

  } catch (error) {
    console.error('Sources fetch error:', error)
    return NextResponse.json({ sourceChunks: [] })
  }
}