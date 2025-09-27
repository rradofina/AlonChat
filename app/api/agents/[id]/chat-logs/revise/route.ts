import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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
    const {
      messageId,
      originalQuestion,
      originalAnswer,
      revisedAnswer,
      confidenceScore
    } = body
    const { id: agentId } = await params

    // Get the project_id from the agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('project_id')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      throw new Error('Agent not found')
    }

    // Update the original message with revised content
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        original_content: originalAnswer,
        content: revisedAnswer,
        revised_at: new Date().toISOString(),
        revised_by: user.id,
        confidence_score: confidenceScore
      })
      .eq('id', messageId)

    if (updateError) throw updateError

    // Add to Q&A sources for training
    const qaData = {
      agent_id: agentId,
      project_id: agent.project_id,
      type: 'qa',
      name: `Revised Answer - ${new Date().toLocaleString()}`,
      content: JSON.stringify({
        questions: [originalQuestion],
        answers: [revisedAnswer]
      }),
      metadata: {
        source: 'chat_revision',
        revised_from: messageId,
        revised_by: user.id,
        revised_at: new Date().toISOString(),
        original_answer: originalAnswer,
        confidence_improvement: confidenceScore
      },
      status: 'ready',
      created_by: user.id
    }

    const { data: qaSource, error: qaError } = await supabase
      .from('sources')
      .insert(qaData)
      .select()
      .single()

    if (qaError) throw qaError

    // Process the Q&A for chunks (for training)
    const chunks = [
      {
        source_id: qaSource.id,
        agent_id: agentId,
        project_id: agent.project_id,
        content: `Q: ${originalQuestion}\nA: ${revisedAnswer}`,
        position: 0,
        metadata: {
          type: 'qa_revised',
          question: originalQuestion,
          answer: revisedAnswer
        }
      }
    ]

    const { error: chunkError } = await supabase
      .from('source_chunks')
      .insert(chunks)

    if (chunkError) throw chunkError

    return NextResponse.json({
      success: true,
      message: 'Answer revised and added to training set',
      qaSourceId: qaSource.id
    })

  } catch (error) {
    console.error('Error revising answer:', error)
    return NextResponse.json(
      { error: 'Failed to revise answer' },
      { status: 500 }
    )
  }
}