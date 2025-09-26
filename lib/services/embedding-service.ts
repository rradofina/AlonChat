import { createServiceClient } from '@/lib/supabase/service'
import { OpenAIProvider } from '@/lib/ai/providers/openai'
import { EmbeddingOptions, EmbeddingResult } from '@/lib/ai/providers/base'

export interface EmbeddingChunk {
  id: string
  content: string
  agent_id: string
  source_id: string
  position: number
}

export interface EmbeddingProgress {
  total: number
  completed: number
  failed: number
  percentage: number
  currentBatch: number
  totalBatches: number
}

export class EmbeddingService {
  private provider: OpenAIProvider
  private supabase: any
  private BATCH_SIZE = 20 // Process 20 chunks at a time to optimize API calls
  private MAX_RETRIES = 3
  private RETRY_DELAY = 1000 // 1 second

  constructor(apiKey?: string) {
    this.provider = new OpenAIProvider()
    this.supabase = createServiceClient()

    // Initialize provider with API key
    this.provider.initialize({ apiKey: apiKey || process.env.OPENAI_API_KEY })
  }

  /**
   * Generate embeddings for all chunks of an agent
   */
  async generateEmbeddingsForAgent(
    agentId: string,
    onProgress?: (progress: EmbeddingProgress) => void
  ): Promise<{
    success: boolean
    totalProcessed: number
    totalFailed: number
    totalCost: number
    totalTokens: number
  }> {
    console.log(`[EmbeddingService] Starting embedding generation for agent ${agentId}`)

    // Fetch all chunks without embeddings
    const { data: chunks, error: fetchError } = await this.supabase
      .from('source_chunks')
      .select('id, content, agent_id, source_id, position')
      .eq('agent_id', agentId)
      .is('embedding', null)
      .order('source_id', { ascending: true })
      .order('position', { ascending: true })

    if (fetchError) {
      console.error('[EmbeddingService] Error fetching chunks:', fetchError)
      throw new Error(`Failed to fetch chunks: ${fetchError.message}`)
    }

    if (!chunks || chunks.length === 0) {
      console.log('[EmbeddingService] No chunks to process')
      return {
        success: true,
        totalProcessed: 0,
        totalFailed: 0,
        totalCost: 0,
        totalTokens: 0
      }
    }

    console.log(`[EmbeddingService] Found ${chunks.length} chunks to process`)

    let totalProcessed = 0
    let totalFailed = 0
    let totalCost = 0
    let totalTokens = 0

    // Process in batches
    const totalBatches = Math.ceil(chunks.length / this.BATCH_SIZE)

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * this.BATCH_SIZE
      const endIdx = Math.min(startIdx + this.BATCH_SIZE, chunks.length)
      const batch = chunks.slice(startIdx, endIdx)

      console.log(`[EmbeddingService] Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} chunks)`)

      // Report progress
      if (onProgress) {
        onProgress({
          total: chunks.length,
          completed: totalProcessed,
          failed: totalFailed,
          percentage: Math.round((totalProcessed / chunks.length) * 100),
          currentBatch: batchIndex + 1,
          totalBatches
        })
      }

      // Generate embeddings for batch
      const batchResults = await this.processBatch(batch)

      totalProcessed += batchResults.processed
      totalFailed += batchResults.failed
      totalCost += batchResults.cost
      totalTokens += batchResults.tokens

      // Add a small delay between batches to avoid rate limiting
      if (batchIndex < totalBatches - 1) {
        await this.delay(500)
      }
    }

    // Final progress report
    if (onProgress) {
      onProgress({
        total: chunks.length,
        completed: totalProcessed,
        failed: totalFailed,
        percentage: 100,
        currentBatch: totalBatches,
        totalBatches
      })
    }

    // Update source metadata with embedding info
    await this.updateSourceEmbeddingMetadata(agentId, totalTokens, totalCost)

    console.log(`[EmbeddingService] Completed embedding generation:`, {
      totalProcessed,
      totalFailed,
      totalCost,
      totalTokens
    })

    return {
      success: totalFailed === 0,
      totalProcessed,
      totalFailed,
      totalCost,
      totalTokens
    }
  }

  /**
   * Process a batch of chunks
   */
  private async processBatch(chunks: EmbeddingChunk[]): Promise<{
    processed: number
    failed: number
    cost: number
    tokens: number
  }> {
    let processed = 0
    let failed = 0
    let cost = 0
    let tokens = 0

    try {
      // Prepare batch input
      const contents = chunks.map(c => c.content)

      // Generate embeddings for the batch
      const result = await this.generateEmbeddingsWithRetry(contents)

      if (result && result.embeddings.length === chunks.length) {
        // Store embeddings in database
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i]
          const embedding = result.embeddings[i]

          // Convert to pgvector format
          const vectorString = `[${embedding.join(',')}]`

          const { error: updateError } = await this.supabase
            .from('source_chunks')
            .update({
              embedding: vectorString,
              updated_at: new Date().toISOString()
            })
            .eq('id', chunk.id)

          if (updateError) {
            console.error(`[EmbeddingService] Failed to update chunk ${chunk.id}:`, updateError)
            failed++
          } else {
            processed++
          }
        }

        // Calculate cost and tokens
        tokens += result.usage.totalTokens
        cost += this.provider.estimateCost(result.usage.totalTokens, result.model)
      } else {
        failed += chunks.length
      }
    } catch (error) {
      console.error('[EmbeddingService] Batch processing error:', error)
      failed += chunks.length
    }

    return { processed, failed, cost, tokens }
  }

  /**
   * Generate embeddings with retry logic
   */
  private async generateEmbeddingsWithRetry(
    contents: string[],
    retries = 0
  ): Promise<EmbeddingResult | null> {
    try {
      const result = await this.provider.embed({
        input: contents,
        model: 'text-embedding-3-small'
      })
      return result
    } catch (error: any) {
      console.error(`[EmbeddingService] Embedding generation failed (attempt ${retries + 1}):`, error)

      if (retries < this.MAX_RETRIES) {
        await this.delay(this.RETRY_DELAY * (retries + 1))
        return this.generateEmbeddingsWithRetry(contents, retries + 1)
      }

      return null
    }
  }

  /**
   * Update source metadata with embedding information
   */
  private async updateSourceEmbeddingMetadata(
    agentId: string,
    totalTokens: number,
    totalCost: number
  ) {
    const { error } = await this.supabase
      .from('sources')
      .update({
        embedding_model: 'text-embedding-3-small',
        embedding_generated_at: new Date().toISOString(),
        total_embedding_tokens: totalTokens,
        embedding_cost_usd: totalCost,
        is_trained: true
      })
      .eq('agent_id', agentId)

    if (error) {
      console.error('[EmbeddingService] Failed to update source metadata:', error)
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const result = await this.provider.embed({
        input: text,
        model: 'text-embedding-3-small'
      })

      return result.embeddings[0] || null
    } catch (error) {
      console.error('[EmbeddingService] Failed to generate embedding:', error)
      return null
    }
  }

  /**
   * Search for similar chunks using vector similarity
   */
  async searchSimilarChunks(
    agentId: string,
    query: string,
    limit: number = 5,
    similarityThreshold: number = 0.7
  ): Promise<Array<{
    id: string
    content: string
    similarity: number
    metadata: any
  }>> {
    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(query)
    if (!queryEmbedding) {
      console.error('[EmbeddingService] Failed to generate query embedding')
      return []
    }

    // Convert to pgvector format
    const vectorString = `[${queryEmbedding.join(',')}]`

    // Use the database function for similarity search
    const { data, error } = await this.supabase.rpc('search_similar_chunks', {
      query_embedding: vectorString,
      agent_uuid: agentId,
      limit_count: limit,
      similarity_threshold: similarityThreshold
    })

    if (error) {
      console.error('[EmbeddingService] Search error:', error)
      return []
    }

    return data.map((item: any) => ({
      id: item.chunk_id,
      content: item.content,
      similarity: item.similarity,
      metadata: item.metadata
    }))
  }

  /**
   * Helper function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Estimate tokens for text (rough estimation)
   */
  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }
}