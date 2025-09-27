import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: agentId } = await params
    const searchParams = request.nextUrl.searchParams
    const source = searchParams.get('source')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('conversations')
      .select(`
        *,
        messages (
          id,
          role,
          content,
          created_at,
          confidence_score,
          source_chunks,
          metadata,
          revised_at,
          original_content
        )
      `)
      .eq('agent_id', agentId)
      .order('started_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    // Apply filters
    if (source) {
      query = query.eq('source', source)
    }

    if (startDate) {
      query = query.gte('started_at', startDate)
    }

    if (endDate) {
      query = query.lte('started_at', endDate)
    }

    const { data: conversations, error } = await query

    if (error) throw error

    // Process conversations to add relative time and format data
    const processedConversations = conversations?.map(conv => ({
      ...conv,
      messages: conv.messages?.sort((a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }))

    return NextResponse.json({
      conversations: processedConversations || [],
      total: conversations?.length || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('Error fetching chat logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat logs' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, messages, source = 'playground', metadata = {} } = body
    const { id: agentId } = await params

    // Check if conversation exists
    let { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('session_id', sessionId)
      .eq('agent_id', agentId)
      .single()

    // Create conversation if it doesn't exist
    if (!conversation) {
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          session_id: sessionId,
          agent_id: agentId,
          project_id: body.projectId,
          source,
          metadata,
          user_id: user.id,
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) throw createError
      conversation = newConv
    }

    // Insert messages
    if (messages && messages.length > 0) {
      const messagesToInsert = messages.map((msg: any) => ({
        conversation_id: conversation.id,
        role: msg.role,
        content: msg.content,
        confidence_score: msg.confidence_score,
        source_chunks: msg.source_chunks,
        metadata: msg.metadata || {},
        created_at: msg.created_at || new Date().toISOString()
      }))

      const { error: msgError } = await supabase
        .from('messages')
        .insert(messagesToInsert)

      if (msgError) throw msgError
    }

    return NextResponse.json({ success: true, conversationId: conversation.id })

  } catch (error) {
    console.error('Error saving chat log:', error)
    return NextResponse.json(
      { error: 'Failed to save chat log' },
      { status: 500 }
    )
  }
}