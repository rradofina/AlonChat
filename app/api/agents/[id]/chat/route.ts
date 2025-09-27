import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatWithProjectCredentials } from '@/lib/ai/server-utils'
import { ChatMessage } from '@/lib/ai/providers/base'
import { EmbeddingService } from '@/lib/services/embedding-service'
import { modelService } from '@/lib/services/model-service'
import { z } from 'zod'
import { injectLinksIntoResponse, extractLinksFromText, type ExtractedLink } from '@/lib/utils/link-extractor'
import { getProviderManager } from '@/lib/ai/provider-manager'

const ChatRequestSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().optional(),
  useRAG: z.boolean().optional().default(true),
  maxContextChunks: z.number().optional().default(5),
  similarityThreshold: z.number().optional().default(0.7),
  sourceTypes: z.array(z.string()).optional(),
  model: z.string().optional(),
  temperature: z.number().optional()
})


/**
 * RAG-Enhanced Chat Endpoint
 *
 * WORKFLOW:
 * 1. User sends a question
 * 2. Backend embeds the question using EmbeddingService
 * 3. Search vector database (pgvector) for top N similar chunks
 * 4. Stack prompts in this specific order:
 *    - Hidden prompt (master system rules - not visible to clients)
 *    - Client prompt (agent's custom prompt/persona - visible to clients)
 *    - RAG context (retrieved knowledge chunks)
 *    - User message (the actual question)
 * 5. Send everything to LLM (OpenAI, Anthropic, etc.)
 * 6. Return ONLY the assistant's reply to user
 *
 * The hidden prompt acts as a "constitution" for safety and core rules,
 * the client prompt provides brand/tone customization,
 * and the RAG context provides the knowledge base.
 */
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

    // Get agent details with prompt template
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select(`
        *,
        projects!inner(owner_id),
        prompt_templates (
          id,
          name,
          user_prompt
        )
      `)
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Get master system prompt
    const { data: globalSettings } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'master_system_prompt')
      .single()

    // Build context using RAG if enabled
    let context = ''
    let contextChunks: any[] = []
    let ragEnabled = validatedData.useRAG
    let qaImages: string[] = []
    let contextLinks: ExtractedLink[] = [] // Collect all links from context

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
                  .select('name, type, metadata, links')
                  .eq('id', sourceChunk.source_id)
                  .single()

                return {
                  ...chunk,
                  source: source,
                  sourceMetadata: source?.metadata,
                  sourceLinks: source?.links,
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

            // Collect links from sources
            if (chunk.sourceLinks && Array.isArray(chunk.sourceLinks)) {
              chunk.sourceLinks.forEach((link: ExtractedLink) => {
                // Add link if not already in contextLinks (avoid duplicates)
                if (!contextLinks.find(l => l.url === link.url)) {
                  contextLinks.push(link)
                }
              })
            }

            // Format each chunk cleanly for LLM consumption
            // Only include high-quality content (similarity > threshold)
            if (chunk.similarity >= validatedData.similarityThreshold) {
              return `### Context ${index + 1} (Source: ${sourceName})\n${chunk.content}`
            }
            return null
          }).filter(Boolean).join('\n\n')

          contextChunks = chunksWithSources
            .filter((c: any) => c.similarity >= validatedData.similarityThreshold)
            .slice(0, 5) // Keep only top 5 chunks
            .map((c: any) => ({
              id: c.id,
              content: c.content,
              similarity: c.similarity,
              source: c.source?.name,
              type: c.source?.type,
              position: c.position
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

    // Build proper prompt stack in the correct order:
    // 1. Hidden prompt (master system rules)
    // 2. Client-facing prompt (agent's custom prompt)
    // 3. RAG context (retrieved knowledge)
    // 4. User message (handled separately in messages array)

    // 1. HIDDEN PROMPT - Master system rules from admin
    const hiddenPrompt = globalSettings?.setting_value || ''

    // 2. CLIENT-FACING PROMPT - Agent's custom prompt/persona
    let clientPrompt = ''
    if (agent.prompt_template_id && agent.prompt_templates) {
      // Use template user prompt with optional custom override
      clientPrompt = agent.custom_user_prompt || agent.prompt_templates.user_prompt || ''
    } else {
      // Use direct custom prompt
      clientPrompt = agent.system_prompt || `You are a helpful AI assistant. Answer questions accurately and concisely.`
    }

    // 3. RAG CONTEXT - Retrieved knowledge from vector search
    let ragContext = ''
    if (context) {
      ragContext = `## RELEVANT KNOWLEDGE BASE CONTEXT:\n${context}`

      // Add link information if available
      if (contextLinks.length > 0) {
        ragContext += `\n\n## AVAILABLE LINKS:\nWhen you need to reference links in your response, use the exact link text and URL as provided below:\n${contextLinks.map(link => `- "${link.text}": ${link.url}`).join('\n')}\n\nAlways preserve the exact link text and URL when referencing them.`
      }
    }

    // Stack everything in the correct order
    let systemPrompt = ''

    // Layer 1: Hidden prompt (constitutional rules)
    if (hiddenPrompt) {
      systemPrompt = hiddenPrompt
    }

    // Layer 2: Client-facing prompt (branding/tone)
    if (clientPrompt) {
      systemPrompt += `\n\n## ASSISTANT INSTRUCTIONS:\n${clientPrompt}`
    }

    // Layer 3: RAG context (knowledge base)
    if (ragContext) {
      systemPrompt += `\n\n${ragContext}`
    }

    // Add final RAG instruction for clarity
    if (ragEnabled && contextChunks.length > 0) {
      systemPrompt += `\n\n## RAG INSTRUCTIONS:\n1. Base your answers on the provided context above\n2. If the answer is in the context, provide it accurately\n3. If the answer is NOT in the context, say "I don't have that information in my knowledge base"\n4. Never make up information not present in the context\n5. When citing information, reference the source when possible`
    }

    // Log prompt stacking for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Chat] Prompt Stack Order:')
      console.log('  1. Hidden Prompt:', hiddenPrompt ? '✓' : '✗')
      console.log('  2. Client Prompt:', clientPrompt ? '✓' : '✗')
      console.log('  3. RAG Context:', ragContext ? `✓ (${contextChunks.length} chunks)` : '✗')
      console.log('  4. User Message:', validatedData.message.substring(0, 50) + '...')
    }

    // Prepare messages
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      }
    ]

    // Get conversation history (all previous messages)
    if (conversation) {
      const { data: history } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })
        .limit(20) // Increased limit for better context

      console.log(`[Chat] Loading conversation history for session ${sessionId}:`, {
        conversationId: conversation.id,
        messageCount: history?.length || 0,
        sessionId
      })

      if (history && history.length > 0) {
        // Add all previous messages to context
        history.forEach(msg => {
          if (msg.role !== 'system') {
            messages.push({
              role: msg.role as 'user' | 'assistant',
              content: msg.content
            })
          }
        })
      }
    }

    // Always add the current user message
    messages.push({
      role: 'user',
      content: validatedData.message
    })

    console.log(`[Chat] Final messages array for AI:`, {
      messageCount: messages.length,
      messages: messages.map(m => ({ role: m.role, length: m.content.length }))
    })

    // Call AI service with project-specific credentials
    let response = ''
    let tokensUsed = 0
    let costUsd = 0

    // Get model name - use request model, then agent's model, then system default
    let modelName = validatedData.model || agent.model

    // If no model specified, get the system default
    if (!modelName) {
      modelName = await modelService.getDefaultModel(true)

      // If still no model (system has no models configured), return error
      if (!modelName) {
        return NextResponse.json({
          error: 'No AI models configured. Please contact administrator.'
        }, { status: 500 })
      }
    }

    // Validate the model is still active
    const isModelValid = await modelService.isModelValid(modelName, true)
    if (!isModelValid) {
      // Model no longer valid, try to get default
      modelName = await modelService.getDefaultModel(true)
      if (!modelName) {
        return NextResponse.json({
          error: 'Selected model is no longer available and no fallback model configured.'
        }, { status: 500 })
      }
    }

    try {
      // First try the normal chat with project credentials
      let result
      let usedFallback = false

      try {
        result = await chatWithProjectCredentials(
          agent.project_id,
          modelName,
          messages,
          {
            temperature: validatedData.temperature ?? agent.temperature,
            maxTokens: agent.max_tokens
          }
        )
      } catch (primaryError: any) {
        console.error('Primary provider failed:', primaryError.message)

        // Try fallback providers
        const providerManager = getProviderManager()
        const providerName = modelName.includes('gpt') ? 'openai' : modelName.includes('gemini') ? 'google' : 'openai'

        try {
          const fallbackResult = await providerManager.chatWithFallback(
            {
              model: modelName,
              messages,
              temperature: validatedData.temperature ?? agent.temperature,
              maxTokens: agent.max_tokens
            },
            providerName
          )

          result = {
            content: fallbackResult.content,
            usage: fallbackResult.usage,
            estimatedCost: 0
          }
          usedFallback = true
          console.log(`Successfully used fallback provider: ${fallbackResult.provider}`)
        } catch (fallbackError: any) {
          console.error('All providers failed:', fallbackError.message)
          throw fallbackError
        }
      }

      response = result.content

      // Process response to inject links if any were found in context
      if (contextLinks.length > 0) {
        response = injectLinksIntoResponse(response, contextLinks)
      }

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

      // Provide specific error messages based on error type
      if (error.message?.includes('not configured')) {
        response = '⚠️ The AI service is not properly configured. Please check your API keys in the settings.'
      } else if (error.message?.includes('503') || error.message?.includes('Service Unavailable')) {
        response = '⚠️ The AI service is temporarily unavailable. This is usually a temporary issue with the AI provider. Please try again in a few moments.'
      } else if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        response = '⚠️ Rate limit reached. Please wait a moment before trying again.'
      } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        response = '⚠️ Authentication failed. Please check your API credentials.'
      } else if (error.message?.includes('All AI providers are currently unavailable')) {
        response = '⚠️ All AI services are currently unavailable. This may be due to service outages. Please try again later or contact support if the issue persists.'
      } else {
        // Generic error with helpful context
        response = `⚠️ I encountered an error while processing your request. Error details: ${error.message || 'Unknown error'}. Please try again or contact support if this continues.`
      }
    }

    // Store both user message and assistant response
    if (conversation) {
      // Store user message first
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

      // Store assistant response with context metadata
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

      // Always store chat session with source chunks for easy retrieval
      console.log('[Chat] Storing chat session with chunks:', {
        agentId,
        sessionId,
        chunksCount: contextChunks.length,
        chunks: contextChunks
      })

      const { data: chatSession, error: chatSessionError } = await supabase
        .from('chat_sessions')
        .insert({
          agent_id: agentId,
          session_id: sessionId,
          user_message: validatedData.message,
          assistant_response: response,
          source_chunks: contextChunks.length > 0 ? contextChunks : null,
          model: modelName,
          temperature: validatedData.temperature ?? agent.temperature,
          user_id: user.id
        })
        .select()
        .single()

      if (chatSessionError) {
        console.error('[Chat] Failed to store chat session:', chatSessionError)
      } else {
        console.log('[Chat] Chat session stored successfully:', chatSession?.id)
      }
    }

    return NextResponse.json({
      response,
      images: qaImages, // Include Q&A images if found
      sessionId,
      tokensUsed,
      ragEnabled,
      contextUsed: contextChunks.length
      // Removed sourceChunks from response - will fetch separately
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