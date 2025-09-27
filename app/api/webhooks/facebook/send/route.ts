import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/webhooks/facebook/send - Send message to Facebook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recipientId, messageText, agentId, attachments } = body

    if (!recipientId || !messageText || !agentId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the Facebook integration for this agent
    const { data: integration, error: integrationError } = await supabase
      .from('facebook_integrations')
      .select('*, agents!inner(*, projects!inner(owner_id))')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Facebook integration not found' },
        { status: 404 }
      )
    }

    // Verify user owns this agent
    if (integration.agents.projects.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Send message via Facebook Graph API
    const messagePayload: any = {
      recipient: { id: recipientId },
      message: { text: messageText }
    }

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      messagePayload.message.attachment = attachments[0] // FB only supports one attachment per message
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${integration.page_access_token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messagePayload)
      }
    )

    const data = await response.json()

    if (data.error) {
      console.error('Facebook API error:', data.error)
      return NextResponse.json(
        { error: data.error.message || 'Failed to send message' },
        { status: 400 }
      )
    }

    // Get or create conversation
    let conversation
    const { data: existingConv } = await supabase
      .from('facebook_conversations')
      .select('*')
      .eq('agent_id', agentId)
      .eq('participant_id', recipientId)
      .single()

    if (existingConv) {
      conversation = existingConv
    } else {
      // Create new conversation if it doesn't exist
      const { data: newConv } = await supabase
        .from('facebook_conversations')
        .insert({
          agent_id: agentId,
          page_id: integration.page_id,
          participant_id: recipientId,
          participant_name: 'Facebook User',
          status: 'active'
        })
        .select()
        .single()

      conversation = newConv
    }

    // Store the sent message in database
    const { data: savedMessage, error: saveError } = await supabase
      .from('facebook_messages')
      .insert({
        conversation_id: conversation.id,
        facebook_message_id: data.message_id || `manual_${Date.now()}`,
        sender_id: integration.page_id,
        sender_type: 'page',
        recipient_id: recipientId,
        message_text: messageText,
        attachments: attachments || [],
        is_echo: false,
        sent_at: new Date().toISOString()
      })
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save message:', saveError)
    }

    // Update conversation
    await supabase
      .from('facebook_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: messageText.substring(0, 100),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversation.id)

    return NextResponse.json({
      success: true,
      message_id: data.message_id,
      saved_message: savedMessage
    })

  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}