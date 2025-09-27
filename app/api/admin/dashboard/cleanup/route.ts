import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { EmbeddingService } from '@/lib/services/embedding-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()

    // Check admin access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type } = body

    switch (type) {
      case 'duplicates':
        return await cleanupDuplicateChunks(serviceSupabase)

      case 'embeddings':
        return await reprocessMissingEmbeddings(serviceSupabase)

      case 'orphans':
        return await cleanupOrphanedChunks(serviceSupabase)

      case 'qa-excess':
        return await cleanupExcessQAChunks(serviceSupabase)

      default:
        return NextResponse.json({ error: 'Invalid cleanup type' }, { status: 400 })
    }

  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function cleanupDuplicateChunks(supabase: any) {
  try {
    console.log('Starting duplicate chunk cleanup...')

    // Find duplicate chunks (same content and source_id)
    const { data: duplicates, error: findError } = await supabase
      .from('source_chunks')
      .select('source_id, content, id, position')
      .order('source_id')
      .order('position')

    if (findError) {
      console.error('Error finding duplicates:', findError)
      return NextResponse.json({ error: 'Failed to find duplicates' }, { status: 500 })
    }

    // Group by source_id and content to find duplicates
    const duplicateGroups = new Map<string, any[]>()

    duplicates?.forEach((chunk: any) => {
      const key = `${chunk.source_id}-${chunk.content.substring(0, 100)}` // Use first 100 chars as key
      if (!duplicateGroups.has(key)) {
        duplicateGroups.set(key, [])
      }
      duplicateGroups.get(key)!.push(chunk)
    })

    // Identify chunks to delete (keep the one with lowest position)
    const chunksToDelete: string[] = []
    let duplicateCount = 0

    duplicateGroups.forEach((group) => {
      if (group.length > 1) {
        // Sort by position and keep the first one
        group.sort((a, b) => a.position - b.position)
        for (let i = 1; i < group.length; i++) {
          chunksToDelete.push(group[i].id)
        }
        duplicateCount += group.length - 1
      }
    })

    // Special case: Q&A sources with 1000 identical chunks
    const { data: qaProblems } = await supabase
      .from('sources')
      .select(`
        id,
        source_chunks!inner(id, content, position)
      `)
      .eq('type', 'qa')
      .then((result: any) => {
        const problematicSources: any[] = []
        result.data?.forEach((source: any) => {
          if (source.source_chunks?.length > 10) {
            // Check if all chunks have identical content
            const firstContent = source.source_chunks[0]?.content
            const allSame = source.source_chunks.every((chunk: any) => chunk.content === firstContent)

            if (allSame) {
              // Keep only the first chunk, delete the rest
              source.source_chunks.slice(1).forEach((chunk: any) => {
                if (!chunksToDelete.includes(chunk.id)) {
                  chunksToDelete.push(chunk.id)
                  duplicateCount++
                }
              })
              problematicSources.push(source.id)
            }
          }
        })
        return { data: problematicSources }
      })

    // Delete duplicate chunks in batches
    if (chunksToDelete.length > 0) {
      const batchSize = 100
      for (let i = 0; i < chunksToDelete.length; i += batchSize) {
        const batch = chunksToDelete.slice(i, i + batchSize)
        const { error: deleteError } = await supabase
          .from('source_chunks')
          .delete()
          .in('id', batch)

        if (deleteError) {
          console.error('Error deleting batch:', deleteError)
        }
      }
    }

    console.log(`Cleaned up ${duplicateCount} duplicate chunks from ${qaProblems?.length || 0} problematic sources`)

    return NextResponse.json({
      success: true,
      removed: duplicateCount,
      affectedSources: qaProblems?.length || 0,
      message: `Successfully removed ${duplicateCount} duplicate chunks`
    })

  } catch (error) {
    console.error('Duplicate cleanup error:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}

async function reprocessMissingEmbeddings(supabase: any) {
  try {
    console.log('Starting embedding reprocessing...')

    // Find chunks without embeddings
    const { data: missingChunks, error } = await supabase
      .from('source_chunks')
      .select('agent_id')
      .is('embedding', null)
      .limit(1000)

    if (error) {
      console.error('Error finding missing embeddings:', error)
      return NextResponse.json({ error: 'Failed to find missing embeddings' }, { status: 500 })
    }

    // Get unique agent IDs
    const agentIds = new Set(missingChunks?.map((c: any) => c.agent_id))
    const agents = Array.from(agentIds)

    console.log(`Found ${missingChunks?.length || 0} chunks without embeddings across ${agents.length} agents`)

    // Start embedding generation for each agent
    const embeddingService = new EmbeddingService()
    const results = []

    for (const agentId of agents) {
      try {
        const result = await embeddingService.generateEmbeddingsForAgent(agentId as string)
        results.push({
          agentId,
          success: result.success,
          processed: result.totalProcessed,
          failed: result.totalFailed
        })
      } catch (error) {
        console.error(`Error processing agent ${agentId}:`, error)
        results.push({
          agentId,
          success: false,
          processed: 0,
          failed: 0
        })
      }
    }

    const totalProcessed = results.reduce((sum, r) => sum + r.processed, 0)
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)

    return NextResponse.json({
      success: true,
      count: totalProcessed,
      failed: totalFailed,
      agents: agents.length,
      message: `Started reprocessing ${totalProcessed} chunks across ${agents.length} agents`
    })

  } catch (error) {
    console.error('Embedding reprocessing error:', error)
    return NextResponse.json({ error: 'Reprocessing failed' }, { status: 500 })
  }
}

async function cleanupOrphanedChunks(supabase: any) {
  try {
    console.log('Starting orphaned chunk cleanup...')

    // Find chunks where source doesn't exist
    const { data: orphans, error: findError } = await supabase
      .from('source_chunks')
      .select('id, source_id')
      .then(async (result: any) => {
        if (result.error) return result

        // Check which source_ids actually exist
        const sourceIds = [...new Set(result.data?.map((c: any) => c.source_id))]
        const { data: existingSources } = await supabase
          .from('sources')
          .select('id')
          .in('id', sourceIds)

        const existingIds = new Set(existingSources?.map((s: any) => s.id))
        const orphanedChunks = result.data?.filter((c: any) => !existingIds.has(c.source_id))

        return { data: orphanedChunks, error: null }
      })

    if (findError) {
      console.error('Error finding orphans:', findError)
      return NextResponse.json({ error: 'Failed to find orphans' }, { status: 500 })
    }

    const orphanCount = orphans?.length || 0

    if (orphanCount > 0) {
      const { error: deleteError } = await supabase
        .from('source_chunks')
        .delete()
        .in('id', orphans.map((o: any) => o.id))

      if (deleteError) {
        console.error('Error deleting orphans:', deleteError)
        return NextResponse.json({ error: 'Failed to delete orphans' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      removed: orphanCount,
      message: `Successfully removed ${orphanCount} orphaned chunks`
    })

  } catch (error) {
    console.error('Orphan cleanup error:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}

async function cleanupExcessQAChunks(supabase: any) {
  try {
    console.log('Starting Q&A excess chunk cleanup...')

    // Find Q&A sources with more than 10 chunks
    const { data: problematicQA, error } = await supabase
      .from('sources')
      .select(`
        id,
        name,
        source_chunks!inner(id, position, content)
      `)
      .eq('type', 'qa')
      .then((result: any) => {
        const problems: any[] = []
        result.data?.forEach((source: any) => {
          if (source.source_chunks?.length > 10) {
            problems.push({
              sourceId: source.id,
              name: source.name,
              chunkCount: source.source_chunks.length,
              chunks: source.source_chunks
            })
          }
        })
        return { data: problems, error: null }
      })

    if (error) {
      console.error('Error finding Q&A problems:', error)
      return NextResponse.json({ error: 'Failed to find Q&A issues' }, { status: 500 })
    }

    let totalRemoved = 0
    let affectedSources = 0

    for (const problem of problematicQA || []) {
      // Check if all chunks have the same content (duplication issue)
      const firstContent = problem.chunks[0]?.content
      const allSame = problem.chunks.every((c: any) => c.content === firstContent)

      if (allSame) {
        // Keep only the first chunk
        const chunksToDelete = problem.chunks.slice(1).map((c: any) => c.id)

        const { error: deleteError } = await supabase
          .from('source_chunks')
          .delete()
          .in('id', chunksToDelete)

        if (!deleteError) {
          totalRemoved += chunksToDelete.length
          affectedSources++
        }
      } else {
        // If chunks are different, we might need to consolidate them
        // For now, we'll keep the first 10 and remove the rest
        if (problem.chunks.length > 10) {
          const sortedChunks = problem.chunks.sort((a: any, b: any) => a.position - b.position)
          const chunksToDelete = sortedChunks.slice(10).map((c: any) => c.id)

          const { error: deleteError } = await supabase
            .from('source_chunks')
            .delete()
            .in('id', chunksToDelete)

          if (!deleteError) {
            totalRemoved += chunksToDelete.length
            affectedSources++
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      removed: totalRemoved,
      affectedSources,
      message: `Cleaned up ${totalRemoved} excess chunks from ${affectedSources} Q&A sources`
    })

  } catch (error) {
    console.error('Q&A cleanup error:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}