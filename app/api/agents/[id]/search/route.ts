import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EmbeddingService } from '@/lib/services/embedding-service'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()

    // Get the agent to ensure it exists
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('project_id, name')
      .eq('id', params.id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Get search parameters from request body
    const body = await request.json()
    const { query, limit = 5, similarityThreshold = 0.7, sourceTypes } = body

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    console.log(`[Search] Agent ${params.id}: Searching for "${query}"`)

    // Initialize embedding service
    const embeddingService = new EmbeddingService()

    // Search for similar chunks
    const results = await embeddingService.searchSimilarChunks(
      params.id,
      query,
      limit,
      similarityThreshold,
      sourceTypes
    )

    console.log(`[Search] Found ${results.length} similar chunks`)

    // Get source information for each chunk
    const chunksWithSources = await Promise.all(
      results.map(async (chunk) => {
        const { data: sourceChunk } = await supabase
          .from('source_chunks')
          .select('source_id')
          .eq('id', chunk.id)
          .single()

        if (sourceChunk) {
          const { data: source } = await supabase
            .from('sources')
            .select('name, type')
            .eq('id', sourceChunk.source_id)
            .single()

          return {
            ...chunk,
            source: source || null
          }
        }

        return chunk
      })
    )

    return NextResponse.json({
      success: true,
      query,
      results: chunksWithSources,
      totalResults: results.length
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()

    // Get embedding statistics for this agent
    const { data: stats, error } = await supabase
      .from('source_chunks')
      .select('id')
      .eq('agent_id', params.id)
      .not('embedding', 'is', null)

    if (error) {
      console.error('Error fetching embedding stats:', error)
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    const totalEmbeddings = stats?.length || 0

    // Get total chunks
    const { data: allChunks } = await supabase
      .from('source_chunks')
      .select('id')
      .eq('agent_id', params.id)

    const totalChunks = allChunks?.length || 0

    return NextResponse.json({
      agentId: params.id,
      totalChunks,
      chunksWithEmbeddings: totalEmbeddings,
      embeddingCoverage: totalChunks > 0 ? (totalEmbeddings / totalChunks) * 100 : 0,
      ready: totalEmbeddings > 0
    })

  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}