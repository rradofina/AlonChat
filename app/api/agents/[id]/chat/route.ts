import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatWithProjectCredentials } from '@/lib/ai/server-utils'
import { ChatMessage } from '@/lib/ai/providers/base'
import { EmbeddingService } from '@/lib/services/embedding-service'
import { z } from 'zod'

const ChatRequestSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().optional(),
  useRAG: z.boolean().optional().default(true),
  maxContextChunks: z.number().optional().default(5),
  similarityThreshold: z.number().optional().default(0.7),
  sourceTypes: z.array(z.string()).optional()
})


export async function POST(
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
    const body = await request.json()
    const validatedData = ChatRequestSchema.parse(body)

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select(`
        *,
        projects!inner(owner_id)
      `)
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Build context using RAG if enabled
    let context = ''
    let contextChunks: any[] = []
    let ragEnabled = validatedData.useRAG
    let qaImages: string[] = []

    // Check if agent has embeddings
    if (ragEnabled) {
      const { data: embeddingCheck } = await supabase
        .from('source_chunks')
        .select('id')
        .eq('agent_id', agentId)
        .not('embedding', 'is', null)
        .limit(1)

      ragEnabled = !!(embeddingCheck && embeddingCheck.length > 0)
    }

    if (ragEnabled) {
      console.log(`[Chat] Using RAG for agent ${agentId}`)

      try {
        // Use embedding service to find relevant chunks
        const embeddingService = new EmbeddingService()
        const similarChunks = await embeddingService.searchSimilarChunks(
          agentId,
          validatedData.message,
          validatedData.maxContextChunks,
          validatedData.similarityThreshold,
          validatedData.sourceTypes
        )

        if (similarChunks.length > 0) {
          // Get source information for each chunk
          const chunksWithSources = await Promise.all(
            similarChunks.map(async (chunk) => {
              const { data: sourceChunk } = await supabase
                .from('source_chunks')
                .select('source_id, position')
                .eq('id', chunk.id)
                .single()

              if (sourceChunk) {
                const { data: source } = await supabase
                  .from('sources')
                  .select('name, type, metadata')
                  .eq('id', sourceChunk.source_id)
                  .single()

                return {
                  ...chunk,
                  source: source,
                  sourceMetadata: source?.metadata,
                  position: sourceChunk.position
                }
              }
              return chunk
            })
          )

          // Build context from relevant chunks
          context = chunksWithSources.map((chunk: any, index) => {
            const sourceName = chunk.source?.name || 'Unknown'
            const sourceType = chunk.source?.type || 'unknown'

            // Collect images from Q&A sources
            if (sourceType === 'qa' && chunk.sourceMetadata?.images?.length > 0) {
              // Add unique images (avoid duplicates)
              chunk.sourceMetadata.images.forEach((img: string) => {
                if (!qaImages.includes(img)) {
                  qaImages.push(img)
                }
              })
            }

            return `[Context ${index + 1} - ${sourceName} (${sourceType}), Relevance: ${(chunk.similarity * 100).toFixed(1)}%]\n${chunk.content}`
          }).join('\n\n')

          contextChunks = chunksWithSources.map((c: any) => ({
            id: c.id,
            similarity: c.similarity,
            source: c.source?.name
          }))

          console.log(`[Chat] Found ${similarChunks.length} relevant chunks`)
        } else {
          console.log('[Chat] No relevant chunks found')
        }
      } catch (error) {
        console.error('[Chat] RAG error, falling back to traditional context:', error)
        ragEnabled = false
      }
    }

    // Fallback to traditional context loading if RAG is not available
    if (!ragEnabled) {
      console.log(`[Chat] Using traditional context for agent ${agentId}`)
      const { data: sources } = await supabase
        .from('sources')
        .select('content, name, type')
        .eq('agent_id', agentId)
        .eq('status', 'ready')
        .limit(5) // Limit sources to prevent context overflow

      if (sources && sources.length > 0) {
        context = sources.map(s => {
          return `[Source: ${s.name} (${s.type})]\n${s.content?.substring(0, 2000) || ''}` // Limit content length
        }).join('\n\n')
      }
    }

    // Create session if needed
    const sessionId = validatedData.sessionId || `session_${Date.now()}`

    // Get or create conversation
    let conversation
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('*')
      .eq('agent_id', agentId)
      .eq('session_id', sessionId)
      .single()

    if (existingConv) {
      conversation = existingConv
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          agent_id: agentId,
          project_id: agent.project_id,
          session_id: sessionId
        })
        .select()
        .single()
      conversation = newConv

      // Log conversation start
      if (conversation) {
        await supabase
          .from('usage_logs')
          .insert({
            project_id: agent.project_id,
            agent_id: agentId,
            type: 'event',
            model: agent.model || 'gpt-3.5-turbo',
            action: 'conversation_start',
            credits_used: 0,
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0,
            cost_usd: 0,
            conversation_id: conversation.id
          })
      }
    }

    // Store user message
    if (conversation) {
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          agent_id: agentId,
          project_id: agent.project_id,
          role: 'user',
          content: validatedData.message,
          rag_enabled: ragEnabled
        })
    }

    // Prepare messages
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: agent.system_prompt || `You are a helpful AI assistant. Use the following knowledge base to answer questions:\n\n${context}`
      }
    ]

    // Get conversation history
    if (conversation) {
      const { data: history } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })
        .limit(10)

      if (history) {
        history.forEach(msg => {
          if (msg.role !== 'system') {
            messages.push({
              role: msg.role,
              content: msg.content
            })
          }
        })
      }
    }

    // Add current message if not already in history
    if (!messages.find(m => m.role === 'user' && m.content === validatedData.message)) {
      messages.push({
        role: 'user',
        content: validatedData.message
      })
    }

    // Call AI service with project-specific credentials
    let response = ''
    let tokensUsed = 0
    let costUsd = 0
    const modelName = agent.model || 'gemini-1.5-flash'

    try {
      const result = await chatWithProjectCredentials(
        agent.project_id,
        modelName,
        messages,
        {
          temperature: agent.temperature,
          maxTokens: agent.max_tokens
        }
      )

      response = result.content
      tokensUsed = result.usage?.totalTokens || 0
      costUsd = result.estimatedCost || 0

      // Log usage
      const creditsUsed = Math.max(1, Math.ceil(tokensUsed / 100))
      await supabase
        .from('usage_logs')
        .insert({
          project_id: agent.project_id,
          agent_id: agentId,
          type: 'completion',
          model: modelName,
          action: 'message',
          credits_used: creditsUsed,
          input_tokens: result.usage?.promptTokens || 0,
          output_tokens: result.usage?.completionTokens || 0,
          total_tokens: tokensUsed,
          cost_usd: costUsd,
          conversation_id: conversation?.id
        })
    } catch (error: any) {
      console.error('AI Service error:', error)

      // Check if it's a configuration error
      if (error.message?.includes('not configured')) {
        // Provide helpful fallback for unconfigured models
        response = await getFallbackResponse(validatedData.message)
      } else {
        response = 'I apologize, but I encountered an error. Please try again later.'
      }
    }

    // Store assistant response with context metadata
    if (conversation) {
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          agent_id: agentId,
          project_id: agent.project_id,
          role: 'assistant',
          content: response,
          rag_enabled: ragEnabled,
          context_chunks: contextChunks.length > 0 ? contextChunks : null,
          embedding_search_query: ragEnabled ? validatedData.message : null,
          metadata: {
            tokensUsed,
            costUsd,
            model: modelName,
            contextChunksCount: contextChunks.length
          }
        })
    }

    return NextResponse.json({
      response,
      images: qaImages, // Include Q&A images if found
      sessionId,
      tokensUsed,
      ragEnabled,
      contextUsed: contextChunks.length
    })

  } catch (error) {
    console.error('Chat error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Fallback responses when AI is not configured
async function getFallbackResponse(message: string): Promise<string> {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('business hours') || lowerMessage.includes('hours')) {
    return 'We are open Monday to Friday, 9 AM to 6 PM Philippine Time.'
  }

  if (lowerMessage.includes('shipping')) {
    return 'Yes, we offer free shipping for orders over ₱1,500 within Metro Manila.'
  }

  if (lowerMessage.includes('payment')) {
    return 'We accept GCash, PayMaya, bank transfers, and cash on delivery.'
  }

  if (lowerMessage.includes('track') || lowerMessage.includes('order')) {
    return 'You will receive a tracking number via SMS once your order is shipped.'
  }

  return `I understand you're asking about "${message}". Based on my knowledge base, I can help with business hours, shipping, payment methods, and order tracking. What would you like to know?`
}