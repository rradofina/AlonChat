import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('name, project_id, last_trained_at')
      .eq('id', params.id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Get embedding statistics by source type
    const { data: sourceStats, error: statsError } = await supabase
      .from('sources')
      .select('type, is_trained, total_embedding_tokens, embedding_cost_usd')
      .eq('agent_id', params.id)
      .neq('status', 'removed')

    if (statsError) {
      console.error('Error fetching source stats:', statsError)
      return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
    }

    // Get chunk statistics
    const { data: chunkStats } = await supabase
      .from('source_chunks')
      .select('id, embedding')
      .eq('agent_id', params.id)

    const totalChunks = chunkStats?.length || 0
    const chunksWithEmbeddings = chunkStats?.filter(c => c.embedding !== null).length || 0

    // Calculate statistics by source type
    const statsByType: Record<string, any> = {}
    let totalTokens = 0
    let totalCost = 0
    let trainedSources = 0
    let untrainedSources = 0

    if (sourceStats) {
      for (const source of sourceStats) {
        if (!statsByType[source.type]) {
          statsByType[source.type] = {
            count: 0,
            trained: 0,
            untrained: 0,
            tokens: 0,
            cost: 0
          }
        }

        statsByType[source.type].count++

        if (source.is_trained) {
          statsByType[source.type].trained++
          trainedSources++

          if (source.total_embedding_tokens) {
            statsByType[source.type].tokens += source.total_embedding_tokens
            totalTokens += source.total_embedding_tokens
          }

          if (source.embedding_cost_usd) {
            statsByType[source.type].cost += source.embedding_cost_usd
            totalCost += source.embedding_cost_usd
          }
        } else {
          statsByType[source.type].untrained++
          untrainedSources++
        }
      }
    }

    // Get recent embedding activity from usage logs
    const { data: recentActivity } = await supabase
      .from('usage_logs')
      .select('created_at, action, total_tokens, cost_usd')
      .eq('agent_id', params.id)
      .eq('type', 'embedding')
      .order('created_at', { ascending: false })
      .limit(10)

    // Check if embeddings need regeneration
    const needsRegeneration = untrainedSources > 0 || chunksWithEmbeddings === 0

    return NextResponse.json({
      agentId: params.id,
      agentName: agent.name,
      lastTrainedAt: agent.last_trained_at,
      status: {
        ready: chunksWithEmbeddings > 0,
        needsRegeneration,
        coverage: totalChunks > 0 ? (chunksWithEmbeddings / totalChunks) * 100 : 0
      },
      chunks: {
        total: totalChunks,
        withEmbeddings: chunksWithEmbeddings,
        withoutEmbeddings: totalChunks - chunksWithEmbeddings
      },
      sources: {
        total: trainedSources + untrainedSources,
        trained: trainedSources,
        untrained: untrainedSources,
        byType: statsByType
      },
      cost: {
        totalTokens,
        totalCostUSD: totalCost,
        model: 'text-embedding-3-small',
        pricePerMillionTokens: 20 // $0.02 per million tokens
      },
      recentActivity: recentActivity || [],
      recommendations: getRecommendations(chunksWithEmbeddings, totalChunks, untrainedSources, statsByType)
    })

  } catch (error) {
    console.error('Embedding status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getRecommendations(
  chunksWithEmbeddings: number,
  totalChunks: number,
  untrainedSources: number,
  statsByType: Record<string, any>
): string[] {
  const recommendations = []

  if (untrainedSources > 0) {
    recommendations.push(`Train ${untrainedSources} untrained sources to enable RAG for them`)
  }

  if (chunksWithEmbeddings === 0 && totalChunks > 0) {
    recommendations.push('Generate embeddings to enable RAG capabilities')
  }

  const coverage = totalChunks > 0 ? (chunksWithEmbeddings / totalChunks) * 100 : 0
  if (coverage > 0 && coverage < 100) {
    recommendations.push(`${(100 - coverage).toFixed(1)}% of chunks lack embeddings. Consider retraining.`)
  }

  // Check for source type imbalance
  const types = Object.keys(statsByType)
  if (types.length > 0) {
    for (const type of types) {
      const stats = statsByType[type]
      if (stats.untrained > 0) {
        recommendations.push(`${stats.untrained} ${type} sources need training`)
      }
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('All embeddings are up to date!')
  }

  return recommendations
}