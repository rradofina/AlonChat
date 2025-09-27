import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/webhooks/instagram/send - Send message to Instagram
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

    // Get the Instagram integration for this agent
    const { data: integration, error: integrationError } = await supabase
      .from('instagram_integrations')
      .select('*, agents!inner(*, projects!inner(owner_id))')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Instagram integration not found' },
        { status: 404 }
      )
    }

    // Verify user owns this agent
    if (integration.agents.projects.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Send message via Instagram API (uses same Facebook Graph API endpoint)
    const messagePayload: any = {
      recipient: { id: recipientId },
      message: { text: messageText }
    }

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      messagePayload.message.attachment = attachments[0] // Instagram also supports one attachment per message
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${integration.access_token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messagePayload)
      }
    )

    const data = await response.json()

    if (data.error) {
      console.error('Instagram API error:', data.error)
      return NextResponse.json(
        { error: data.error.message || 'Failed to send message' },
        { status: 400 }
      )
    }

    // Get or create conversation
    let conversation
    const { data: existingConv } = await supabase
      .from('instagram_conversations')
      .select('*')
      .eq('agent_id', agentId)
      .eq('participant_id', recipientId)
      .single()

    if (existingConv) {
      conversation = existingConv
    } else {
      // Create new conversation if it doesn't exist
      const { data: newConv } = await supabase
        .from('instagram_conversations')
        .insert({
          agent_id: agentId,
          instagram_account_id: integration.instagram_account_id,
          participant_id: recipientId,
          participant_username: 'Instagram User',
          status: 'active'
        })
        .select()
        .single()

      conversation = newConv
    }

    // Store the sent message in database
    const { data: savedMessage, error: saveError } = await supabase
      .from('instagram_messages')
      .insert({
        conversation_id: conversation.id,
        instagram_message_id: data.message_id || `manual_${Date.now()}`,
        sender_id: integration.instagram_account_id,
        sender_type: 'business',
        recipient_id: recipientId,
        message_text: messageText,
        message_type: 'text',
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
      .from('instagram_conversations')
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
    console.error('Send Instagram message error:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}