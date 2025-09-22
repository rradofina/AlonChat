import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OpenAI } from 'openai'
import { z } from 'zod'

const ChatRequestSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().optional()
})

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get agent's sources for context
    const { data: sources } = await supabase
      .from('sources')
      .select('content, name, type')
      .eq('agent_id', agentId)
      .eq('status', 'ready')

    // Build context from sources
    let context = ''
    if (sources && sources.length > 0) {
      context = sources.map(s => {
        return `Source: ${s.name}\nType: ${s.type}\nContent: ${s.content}`
      }).join('\n\n---\n\n')
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
          content: validatedData.message
        })
    }

    // Prepare messages for OpenAI
    const messages: any[] = [
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

    // Call OpenAI
    let response = ''
    let tokensUsed = 0

    if (process.env.OPENAI_API_KEY) {
      try {
        const completion = await openai.chat.completions.create({
          model: agent.model || 'gpt-3.5-turbo',
          messages: messages,
          temperature: agent.temperature || 0.7,
          max_tokens: agent.max_tokens || 500,
        })

        response = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.'
        tokensUsed = completion.usage?.total_tokens || 0

        // Log usage
        const creditsUsed = Math.ceil(tokensUsed / 10) // 1 credit per 10 tokens
        await supabase
          .from('usage_logs')
          .insert({
            project_id: agent.project_id,
            agent_id: agentId,
            type: 'completion',
            model: agent.model || 'gpt-3.5-turbo',
            action: 'message',
            credits_used: creditsUsed,
            input_tokens: completion.usage?.prompt_tokens || 0,
            output_tokens: completion.usage?.completion_tokens || 0,
            total_tokens: tokensUsed,
            cost_usd: (tokensUsed * 0.002) / 1000, // Approximate cost
            conversation_id: conversation?.id
          })
      } catch (error) {
        console.error('OpenAI error:', error)
        response = 'I apologize, but I encountered an error. Please try again later.'
      }
    } else {
      // Fallback response when no API key
      if (validatedData.message.toLowerCase().includes('business hours') ||
          validatedData.message.toLowerCase().includes('hours')) {
        response = 'We are open Monday to Friday, 9 AM to 6 PM Philippine Time.'
      } else if (validatedData.message.toLowerCase().includes('shipping')) {
        response = 'Yes, we offer free shipping for orders over ₱1,500 within Metro Manila.'
      } else if (validatedData.message.toLowerCase().includes('payment')) {
        response = 'We accept GCash, PayMaya, bank transfers, and cash on delivery.'
      } else if (validatedData.message.toLowerCase().includes('track') ||
                 validatedData.message.toLowerCase().includes('order')) {
        response = 'You will receive a tracking number via SMS once your order is shipped.'
      } else {
        response = `I understand you're asking about "${validatedData.message}". Based on my knowledge base, I can help with business hours, shipping, payment methods, and order tracking. What would you like to know?`
      }
    }

    // Store assistant response
    if (conversation) {
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          agent_id: agentId,
          project_id: agent.project_id,
          role: 'assistant',
          content: response
        })
    }

    return NextResponse.json({
      response,
      sessionId,
      tokensUsed
    })

  } catch (error) {
    console.error('Chat error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}