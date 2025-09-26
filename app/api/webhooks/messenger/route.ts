import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MessengerService } from '@/lib/services/messenger-service'
import { EmbeddingService } from '@/lib/services/embedding-service'
import { chatWithProjectCredentials } from '@/lib/ai/server-utils'
import { ChatMessage } from '@/lib/ai/providers/base'

// Webhook verification (Facebook will send GET request to verify)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Check if this is a valid verification request
  if (mode === 'subscribe' && token === process.env.MESSENGER_VERIFY_TOKEN) {
    console.log('Webhook verified successfully!')
    return new NextResponse(challenge, { status: 200 })
  } else {
    console.error('Webhook verification failed')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

// Handle incoming messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    // Facebook can send multiple entries
    for (const entry of body.entry) {
      const webhookEvent = entry.messaging[0]

      if (!webhookEvent) continue

      const senderId = webhookEvent.sender.id
      const recipientId = webhookEvent.recipient.id

      // Get agent by page ID
      const { data: agent } = await supabase
        .from('agents')
        .select('*')
        .eq('messenger_page_id', recipientId)
        .single()

      if (!agent) {
        console.error('No agent found for page ID:', recipientId)
        continue
      }

      // Initialize Messenger service with page access token
      const messenger = new MessengerService(agent.messenger_page_token)

      // Handle different event types
      if (webhookEvent.message) {
        // Mark as seen and show typing
        await messenger.markSeen(senderId)
        await messenger.showTyping(senderId)

        // Handle text messages
        if (webhookEvent.message.text) {
          await handleTextMessage(
            senderId,
            webhookEvent.message.text,
            agent,
            messenger
          )
        }

        // Handle attachments (images, etc.)
        if (webhookEvent.message.attachments) {
          await handleAttachments(
            senderId,
            webhookEvent.message.attachments,
            agent,
            messenger
          )
        }

        // Hide typing indicator
        await messenger.hideTyping(senderId)
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function handleTextMessage(
  senderId: string,
  text: string,
  agent: any,
  messenger: MessengerService
) {
  try {
    const supabase = await createClient()

    // Get or create conversation
    let conversation
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('*')
      .eq('agent_id', agent.id)
      .eq('messenger_sender_id', senderId)
      .single()

    if (existingConv) {
      conversation = existingConv
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          agent_id: agent.id,
          project_id: agent.project_id,
          messenger_sender_id: senderId,
          platform: 'messenger'
        })
        .select()
        .single()
      conversation = newConv
    }

    // Store user message
    if (conversation) {
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          agent_id: agent.id,
          project_id: agent.project_id,
          role: 'user',
          content: text,
          platform: 'messenger'
        })
    }

    // Use RAG to find relevant context
    let context = ''
    let qaImages: string[] = []

    // Initialize embedding service
    const embeddingService = new EmbeddingService()
    const similarChunks = await embeddingService.searchSimilarChunks(
      agent.id,
      text,
      5,
      0.7
    )

    if (similarChunks.length > 0) {
      // Get source information and images
      const supabase = await createClient()

      for (const chunk of similarChunks) {
        const { data: sourceChunk } = await supabase
          .from('source_chunks')
          .select('source_id')
          .eq('id', chunk.id)
          .single()

        if (sourceChunk) {
          const { data: source } = await supabase
            .from('sources')
            .select('name, type, metadata')
            .eq('id', sourceChunk.source_id)
            .single()

          // Collect Q&A images
          if (source?.type === 'qa' && source?.metadata?.images?.length > 0) {
            source.metadata.images.forEach((img: string) => {
              if (!qaImages.includes(img)) {
                qaImages.push(img)
              }
            })
          }
        }
      }

      // Build context
      context = similarChunks.map((chunk: any, index) => {
        return `[Context ${index + 1}]\n${chunk.content}`
      }).join('\n\n')
    }

    // Prepare messages for AI
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: agent.system_prompt || `You are a helpful AI assistant. Use the following knowledge base to answer questions:\n\n${context}`
      },
      {
        role: 'user',
        content: text
      }
    ]

    // Get AI response
    const result = await chatWithProjectCredentials(
      agent.project_id,
      agent.model || 'gpt-3.5-turbo',
      messages,
      {
        temperature: agent.temperature,
        maxTokens: agent.max_tokens
      }
    )

    // Send text response
    await messenger.sendTextMessage(senderId, result.content)

    // Send images if found
    if (qaImages.length > 0) {
      await messenger.sendMultipleImages(senderId, qaImages)
    }

    // Store assistant response
    if (conversation) {
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          agent_id: agent.id,
          project_id: agent.project_id,
          role: 'assistant',
          content: result.content,
          platform: 'messenger',
          metadata: {
            images: qaImages,
            tokensUsed: result.usage?.totalTokens || 0
          }
        })
    }
  } catch (error) {
    console.error('Error handling text message:', error)
    await messenger.sendTextMessage(
      senderId,
      'Sorry, I encountered an error. Please try again later.'
    )
  }
}

async function handleAttachments(
  senderId: string,
  attachments: any[],
  agent: any,
  messenger: MessengerService
) {
  // For now, just acknowledge image attachments
  for (const attachment of attachments) {
    if (attachment.type === 'image') {
      await messenger.sendTextMessage(
        senderId,
        'Thank you for the image. I can see it but currently I can only respond to text messages. How can I help you today?'
      )
      break
    }
  }
}