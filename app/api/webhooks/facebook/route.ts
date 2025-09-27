import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// Facebook webhook verification token (should be in env)
const WEBHOOK_VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'alonchat_webhook_token_2024'

// GET /api/webhooks/facebook - Facebook webhook verification
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Facebook sends these params for verification
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Check if this is a subscribe request with the correct token
  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('Facebook webhook verified successfully')
    // Return the challenge to verify the webhook
    return new NextResponse(challenge, { status: 200 })
  } else {
    console.error('Facebook webhook verification failed')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

// POST /api/webhooks/facebook - Handle incoming Facebook messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const signature = request.headers.get('x-hub-signature-256')

    // Verify webhook signature for security
    if (process.env.FACEBOOK_APP_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.FACEBOOK_APP_SECRET)
        .update(JSON.stringify(body))
        .digest('hex')

      if (signature !== `sha256=${expectedSignature}`) {
        console.error('Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    }

    // Handle different types of webhook events
    if (body.object === 'page') {
      const supabase = await createClient()

      for (const entry of body.entry) {
        const pageId = entry.id
        const timeStamp = entry.time

        // Handle messaging events (Facebook Messenger)
        if (entry.messaging) {
          for (const messagingEvent of entry.messaging) {
            await handleMessagingEvent(supabase, pageId, messagingEvent, 'facebook')
          }
        }

        // Handle changes (like comments, etc.)
        if (entry.changes) {
          for (const change of entry.changes) {
            await handleChangeEvent(supabase, pageId, change)
          }
        }
      }
    } else if (body.object === 'instagram') {
      // Handle Instagram webhook events
      const supabase = await createClient()

      for (const entry of body.entry) {
        const instagramId = entry.id
        const timeStamp = entry.time

        // Handle Instagram messaging
        if (entry.messaging) {
          for (const messagingEvent of entry.messaging) {
            await handleInstagramMessagingEvent(supabase, instagramId, messagingEvent)
          }
        }

        // Handle Instagram comments/mentions
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'comments' || change.field === 'mentions') {
              await handleInstagramCommentOrMention(supabase, instagramId, change)
            }
          }
        }
      }
    }

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 })

  } catch (error) {
    console.error('Facebook webhook error:', error)
    // Still return 200 to avoid Facebook retrying
    return NextResponse.json({ received: true }, { status: 200 })
  }
}

// Handle messaging events (messages, postbacks, etc.)
async function handleMessagingEvent(
  supabase: any,
  pageId: string,
  event: any,
  platform: 'facebook' | 'instagram' = 'facebook'
) {
  const senderId = event.sender.id
  const recipientId = event.recipient.id

  try {
    // Find the agent associated with this Facebook page
    const { data: integration } = await supabase
      .from('facebook_integrations')
      .select('*, agents(*)')
      .eq('page_id', pageId)
      .eq('is_active', true)
      .single()

    if (!integration) {
      console.error(`No active integration found for page ${pageId}`)
      return
    }

    // Get or create conversation
    let conversation
    const { data: existingConv } = await supabase
      .from('facebook_conversations')
      .select('*')
      .eq('agent_id', integration.agent_id)
      .eq('participant_id', senderId)
      .single()

    if (existingConv) {
      conversation = existingConv
    } else {
      // Get user info from Facebook
      const userInfo = await getUserInfo(senderId, integration.page_access_token)

      const { data: newConv } = await supabase
        .from('facebook_conversations')
        .insert({
          agent_id: integration.agent_id,
          page_id: pageId,
          participant_id: senderId,
          participant_name: userInfo?.name || 'Facebook User',
          participant_profile_pic: userInfo?.profile_pic,
          status: 'active'
        })
        .select()
        .single()

      conversation = newConv
    }

    // Handle different event types
    if (event.message) {
      await handleMessage(supabase, integration, conversation, event.message, senderId, recipientId)
    } else if (event.postback) {
      await handlePostback(supabase, integration, conversation, event.postback, senderId)
    } else if (event.read) {
      await handleRead(supabase, conversation, event.read)
    } else if (event.delivery) {
      await handleDelivery(supabase, conversation, event.delivery)
    }

    // Update webhook timestamp
    await supabase
      .from('facebook_integrations')
      .update({ last_webhook_at: new Date().toISOString() })
      .eq('id', integration.id)

  } catch (error) {
    console.error('Error handling messaging event:', error)
  }
}

// Handle incoming messages
async function handleMessage(
  supabase: any,
  integration: any,
  conversation: any,
  message: any,
  senderId: string,
  recipientId: string
) {
  const isEcho = message.is_echo || false
  const messageText = message.text
  const messageId = message.mid
  const attachments = message.attachments || []
  const quickReply = message.quick_reply

  // Store message in database
  const { data: savedMessage } = await supabase
    .from('facebook_messages')
    .insert({
      conversation_id: conversation.id,
      facebook_message_id: messageId,
      sender_id: senderId,
      sender_type: senderId === integration.page_id ? 'page' : 'user',
      recipient_id: recipientId,
      message_text: messageText,
      attachments: attachments,
      quick_replies: quickReply ? [quickReply] : [],
      is_echo: isEcho,
      sent_at: new Date().toISOString()
    })
    .select()
    .single()

  // Update conversation
  await supabase
    .from('facebook_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: messageText?.substring(0, 100),
      unread_count: isEcho ? 0 : conversation.unread_count + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversation.id)

  // If not an echo and from user, generate AI response
  if (!isEcho && senderId !== integration.page_id) {
    await generateAIResponse(supabase, integration, conversation, messageText, senderId)
  }
}

// Generate AI response using the agent
async function generateAIResponse(
  supabase: any,
  integration: any,
  conversation: any,
  userMessage: string,
  recipientId: string
) {
  try {
    // Get recent conversation history for context
    const { data: recentMessages } = await supabase
      .from('facebook_messages')
      .select('sender_type, message_text')
      .eq('conversation_id', conversation.id)
      .order('sent_at', { ascending: false })
      .limit(10)

    // Build conversation context
    const messages = recentMessages?.reverse().map((msg: any) => ({
      role: msg.sender_type === 'user' ? 'user' : 'assistant',
      content: msg.message_text
    })) || []

    // Call the agent's chat endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agents/${integration.agent_id}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        sessionId: `facebook_${conversation.id}`,
        messages: messages
      })
    })

    const data = await response.json()

    if (data.response) {
      // Send response back to Facebook
      await sendMessageToFacebook(
        recipientId,
        data.response,
        integration.page_access_token
      )

      // Store AI response in database
      await supabase
        .from('facebook_messages')
        .insert({
          conversation_id: conversation.id,
          facebook_message_id: `ai_${Date.now()}`,
          sender_id: integration.page_id,
          sender_type: 'page',
          recipient_id: recipientId,
          message_text: data.response,
          is_echo: false,
          sent_at: new Date().toISOString()
        })

      // Update conversation
      await supabase
        .from('facebook_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: data.response.substring(0, 100),
          unread_count: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversation.id)
    }
  } catch (error) {
    console.error('Failed to generate AI response:', error)
  }
}

// Send message to Facebook
async function sendMessageToFacebook(
  recipientId: string,
  messageText: string,
  pageAccessToken: string
) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: messageText }
        })
      }
    )

    const data = await response.json()
    if (data.error) {
      throw new Error(data.error.message)
    }

    return data
  } catch (error) {
    console.error('Failed to send message to Facebook:', error)
    throw error
  }
}

// Get user info from Facebook
async function getUserInfo(userId: string, pageAccessToken: string) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${userId}?fields=name,profile_pic&access_token=${pageAccessToken}`
    )

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to get user info:', error)
    return null
  }
}

// Handle postback events (button clicks)
async function handlePostback(
  supabase: any,
  integration: any,
  conversation: any,
  postback: any,
  senderId: string
) {
  const payload = postback.payload
  const title = postback.title

  // Store as a message
  await supabase
    .from('facebook_messages')
    .insert({
      conversation_id: conversation.id,
      facebook_message_id: `postback_${Date.now()}`,
      sender_id: senderId,
      sender_type: 'user',
      recipient_id: integration.page_id,
      message_text: `[Button Click: ${title}]`,
      metadata: { payload },
      sent_at: new Date().toISOString()
    })

  // Generate AI response for the postback
  await generateAIResponse(supabase, integration, conversation, title, senderId)
}

// Handle message read events
async function handleRead(supabase: any, conversation: any, read: any) {
  if (!conversation) return

  // Mark messages as read
  await supabase
    .from('facebook_messages')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('conversation_id', conversation.id)
    .lte('sent_at', new Date(read.watermark).toISOString())
}

// Handle message delivery events
async function handleDelivery(supabase: any, conversation: any, delivery: any) {
  if (!conversation) return

  // Update delivery status
  const messageIds = delivery.mids || []
  for (const mid of messageIds) {
    await supabase
      .from('facebook_messages')
      .update({
        delivered_at: new Date(delivery.watermark).toISOString()
      })
      .eq('facebook_message_id', mid)
  }
}

// Handle change events (comments, etc.)
async function handleChangeEvent(supabase: any, pageId: string, change: any) {
  // Handle different change types as needed
  console.log('Change event:', change)
  // For now, we'll focus on messaging events
}

// Handle Instagram messaging events
async function handleInstagramMessagingEvent(
  supabase: any,
  instagramId: string,
  event: any
) {
  const senderId = event.sender.id
  const recipientId = event.recipient.id

  try {
    // Find the agent associated with this Instagram account
    const { data: integration } = await supabase
      .from('instagram_integrations')
      .select('*, agents(*)')
      .eq('instagram_account_id', instagramId)
      .eq('is_active', true)
      .single()

    if (!integration) {
      console.error(`No active Instagram integration found for account ${instagramId}`)
      return
    }

    // Get or create conversation
    let conversation
    const { data: existingConv } = await supabase
      .from('instagram_conversations')
      .select('*')
      .eq('agent_id', integration.agent_id)
      .eq('participant_id', senderId)
      .single()

    if (existingConv) {
      conversation = existingConv
    } else {
      // Get user info from Instagram
      const userInfo = await getInstagramUserInfo(senderId, integration.access_token)

      const { data: newConv } = await supabase
        .from('instagram_conversations')
        .insert({
          agent_id: integration.agent_id,
          instagram_account_id: instagramId,
          participant_id: senderId,
          participant_username: userInfo?.username || 'Instagram User',
          participant_name: userInfo?.name,
          participant_profile_pic: userInfo?.profile_picture,
          thread_id: event.message?.mid,
          status: 'active'
        })
        .select()
        .single()

      conversation = newConv
    }

    // Handle different event types
    if (event.message) {
      await handleInstagramMessage(supabase, integration, conversation, event.message, senderId, recipientId)
    } else if (event.postback) {
      await handleInstagramPostback(supabase, integration, conversation, event.postback, senderId)
    } else if (event.read) {
      await handleInstagramRead(supabase, conversation, event.read)
    }

    // Update webhook timestamp
    await supabase
      .from('instagram_integrations')
      .update({ last_webhook_at: new Date().toISOString() })
      .eq('id', integration.id)

  } catch (error) {
    console.error('Error handling Instagram messaging event:', error)
  }
}

// Handle Instagram messages
async function handleInstagramMessage(
  supabase: any,
  integration: any,
  conversation: any,
  message: any,
  senderId: string,
  recipientId: string
) {
  const messageText = message.text
  const messageId = message.mid
  const attachments = message.attachments || []

  // Store message in database
  const { data: savedMessage } = await supabase
    .from('instagram_messages')
    .insert({
      conversation_id: conversation.id,
      instagram_message_id: messageId,
      sender_id: senderId,
      sender_type: senderId === integration.instagram_account_id ? 'business' : 'user',
      recipient_id: recipientId,
      message_text: messageText,
      message_type: attachments.length > 0 ? attachments[0].type : 'text',
      attachments: attachments,
      is_echo: message.is_echo || false,
      sent_at: new Date().toISOString()
    })
    .select()
    .single()

  // Update conversation
  await supabase
    .from('instagram_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: messageText?.substring(0, 100),
      unread_count: message.is_echo ? 0 : conversation.unread_count + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversation.id)

  // If not an echo and from user, generate AI response
  if (!message.is_echo && senderId !== integration.instagram_account_id) {
    await generateInstagramAIResponse(supabase, integration, conversation, messageText, senderId)
  }
}

// Generate AI response for Instagram
async function generateInstagramAIResponse(
  supabase: any,
  integration: any,
  conversation: any,
  userMessage: string,
  recipientId: string
) {
  try {
    // Get recent conversation history for context
    const { data: recentMessages } = await supabase
      .from('instagram_messages')
      .select('sender_type, message_text')
      .eq('conversation_id', conversation.id)
      .order('sent_at', { ascending: false })
      .limit(10)

    // Build conversation context
    const messages = recentMessages?.reverse().map((msg: any) => ({
      role: msg.sender_type === 'user' ? 'user' : 'assistant',
      content: msg.message_text
    })) || []

    // Call the agent's chat endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agents/${integration.agent_id}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        sessionId: `instagram_${conversation.id}`,
        messages: messages
      })
    })

    const data = await response.json()

    if (data.response) {
      // Send response back to Instagram
      await sendMessageToInstagram(
        recipientId,
        data.response,
        integration.access_token
      )

      // Store AI response in database
      await supabase
        .from('instagram_messages')
        .insert({
          conversation_id: conversation.id,
          instagram_message_id: `ai_${Date.now()}`,
          sender_id: integration.instagram_account_id,
          sender_type: 'business',
          recipient_id: recipientId,
          message_text: data.response,
          is_echo: false,
          sent_at: new Date().toISOString()
        })

      // Update conversation
      await supabase
        .from('instagram_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: data.response.substring(0, 100),
          unread_count: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversation.id)
    }
  } catch (error) {
    console.error('Failed to generate Instagram AI response:', error)
  }
}

// Send message to Instagram
async function sendMessageToInstagram(
  recipientId: string,
  messageText: string,
  accessToken: string
) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: messageText }
        })
      }
    )

    const data = await response.json()
    if (data.error) {
      throw new Error(data.error.message)
    }

    return data
  } catch (error) {
    console.error('Failed to send message to Instagram:', error)
    throw error
  }
}

// Get Instagram user info
async function getInstagramUserInfo(userId: string, accessToken: string) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${userId}?fields=username,name,profile_picture&access_token=${accessToken}`
    )

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to get Instagram user info:', error)
    return null
  }
}

// Handle Instagram postback
async function handleInstagramPostback(
  supabase: any,
  integration: any,
  conversation: any,
  postback: any,
  senderId: string
) {
  const payload = postback.payload
  const title = postback.title

  // Store as a message
  await supabase
    .from('instagram_messages')
    .insert({
      conversation_id: conversation.id,
      instagram_message_id: `postback_${Date.now()}`,
      sender_id: senderId,
      sender_type: 'user',
      recipient_id: integration.instagram_account_id,
      message_text: `[Button Click: ${title}]`,
      metadata: { payload },
      sent_at: new Date().toISOString()
    })

  // Generate AI response for the postback
  await generateInstagramAIResponse(supabase, integration, conversation, title, senderId)
}

// Handle Instagram read receipts
async function handleInstagramRead(supabase: any, conversation: any, read: any) {
  if (!conversation) return

  // Mark messages as read
  await supabase
    .from('instagram_messages')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('conversation_id', conversation.id)
    .lte('sent_at', new Date(read.watermark).toISOString())
}

// Handle Instagram comments and mentions
async function handleInstagramCommentOrMention(supabase: any, instagramId: string, change: any) {
  // Handle Instagram comments and mentions
  console.log('Instagram comment/mention:', change)
  // This can be expanded to handle comments as messages
  // For now, we focus on direct messages
}