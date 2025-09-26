import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ChunkOptions } from '@/lib/types/crawler'

export class ChunkManager {
  static readonly DEFAULT_CHUNK_SIZE = 8000 // 8KB chunks (increased for better performance)
  static readonly DEFAULT_OVERLAP = 400 // 400 char overlap
  static readonly MAX_CHUNKS = 1000 // Maximum chunks to prevent array overflow
  static readonly MAX_CONTENT_SIZE = 10 * 1024 * 1024 // 10MB max for chunking

  /**
   * Split content into chunks and store in database
   */
  static async storeChunks(options: ChunkOptions): Promise<number> {
    const {
      sourceId,
      agentId,
      projectId,
      content,
      metadata = {},
      chunkSize = this.DEFAULT_CHUNK_SIZE,
      chunkOverlap = this.DEFAULT_OVERLAP,
      supabaseClient
    } = options

    const supabase = supabaseClient || createServiceClient()

    // Check content size limits
    if (content.length > this.MAX_CONTENT_SIZE) {
      console.warn(`[ChunkManager] Content too large (${content.length} bytes), skipping chunking for source ${sourceId}`)
      // Store a single chunk with truncated content for now
      const truncatedContent = content.substring(0, this.MAX_CONTENT_SIZE)
      const { error } = await supabase
        .from('source_chunks')
        .insert({
          source_id: sourceId,
          agent_id: agentId,
          project_id: projectId,
          content: truncatedContent,
          position: 0,
          tokens: this.estimateTokens(truncatedContent),
          metadata: {
            ...metadata,
            chunk_index: 0,
            total_chunks: 1,
            truncated: true,
            original_size: content.length
          }
        })

      if (error) {
        console.error(`[ChunkManager] Error storing truncated content:`, error)
        throw new Error(`Failed to store content: ${error.message}`)
      }

      return 1
    }

    // First, delete any existing chunks for this source
    await this.deleteChunks(sourceId, supabase)

    // Split content into chunks
    const chunks = this.splitIntoChunks(content, chunkSize, chunkOverlap)

    // Safety check for chunk count
    if (chunks.length > this.MAX_CHUNKS) {
      console.warn(`[ChunkManager] Too many chunks (${chunks.length}), limiting to ${this.MAX_CHUNKS}`)
      chunks.splice(this.MAX_CHUNKS)
    }

    if (chunks.length === 0) {
      console.warn(`[ChunkManager] No chunks created for source ${sourceId}`)
      return 0
    }

    console.log(`[ChunkManager] Creating ${chunks.length} chunks for source ${sourceId}`)

    // Prepare chunk records
    const chunkRecords = chunks.map((chunk, index) => ({
      source_id: sourceId,
      agent_id: agentId,
      project_id: projectId,
      content: chunk.text,
      position: index,
      tokens: this.estimateTokens(chunk.text),
      metadata: {
        ...metadata,
        chunk_index: index,
        total_chunks: chunks.length,
        start_char: chunk.start,
        end_char: chunk.end
      }
    }))

    // Insert chunks in batches to avoid overwhelming the database
    const BATCH_SIZE = 50
    let insertedCount = 0

    for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
      const batch = chunkRecords.slice(i, i + BATCH_SIZE)

      const { error } = await supabase
        .from('source_chunks')
        .insert(batch)

      if (error) {
        console.error(`[ChunkManager] Error inserting chunks batch ${i / BATCH_SIZE}:`, error)
        throw new Error(`Failed to store chunks: ${error.message}`)
      }

      insertedCount += batch.length
      console.log(`[ChunkManager] Inserted ${insertedCount}/${chunkRecords.length} chunks`)
    }

    return chunks.length
  }

  /**
   * Append chunks without deleting existing ones (for progressive crawling)
   * This method is specifically for website crawling where we add chunks progressively
   */
  static async appendChunks(options: ChunkOptions): Promise<number> {
    const {
      sourceId,
      agentId,
      projectId,
      content,
      metadata = {},
      chunkSize = this.DEFAULT_CHUNK_SIZE,
      chunkOverlap = this.DEFAULT_OVERLAP,
      supabaseClient
    } = options

    const supabase = supabaseClient || createServiceClient()

    // Get the highest existing position to continue from
    const { data: existingChunks } = await supabase
      .from('source_chunks')
      .select('position')
      .eq('source_id', sourceId)
      .order('position', { ascending: false })
      .limit(1)

    const startPosition = existingChunks && existingChunks.length > 0
      ? existingChunks[0].position + 1
      : 0

    // Limit content to prevent memory issues (200KB max per page)
    const MAX_CONTENT_PER_PAGE = 200000
    if (content.length > MAX_CONTENT_PER_PAGE) {
      console.warn(`[ChunkManager] Content too large (${content.length} chars), truncating to ${MAX_CONTENT_PER_PAGE}`)
      content = content.substring(0, MAX_CONTENT_PER_PAGE)
    }

    // Split content into chunks - NO LIMIT for progressive crawling
    const chunks = this.splitIntoChunksNoLimit(content, chunkSize, chunkOverlap)

    if (chunks.length === 0) {
      console.warn(`[ChunkManager] No chunks created for source ${sourceId}`)
      return 0
    }

    console.log(`[ChunkManager] Appending ${chunks.length} chunks starting at position ${startPosition} for source ${sourceId}`)

    // Prepare chunk records with continued position numbering
    const chunkRecords = chunks.map((chunk, index) => ({
      source_id: sourceId,
      agent_id: agentId,
      project_id: projectId,
      content: chunk.text,
      position: startPosition + index,
      tokens: this.estimateTokens(chunk.text),
      metadata: {
        ...metadata,
        chunk_index: startPosition + index,
        start_char: chunk.start,
        end_char: chunk.end
      }
    }))

    // Insert chunks in batches
    const batchSize = 50
    let insertedCount = 0

    for (let i = 0; i < chunkRecords.length; i += batchSize) {
      const batch = chunkRecords.slice(i, i + batchSize)
      const { error } = await supabase
        .from('source_chunks')
        .insert(batch)

      if (error) {
        console.error(`[ChunkManager] Error inserting chunk batch:`, error)
        throw new Error(`Failed to insert chunks: ${error.message}`)
      }

      insertedCount += batch.length
      if (insertedCount % 200 === 0) {
        console.log(`[ChunkManager] Inserted ${insertedCount}/${chunkRecords.length} chunks`)
      }
    }

    return chunks.length
  }

  /**
   * Split text into chunks without the 1000 limit (for progressive crawling)
   */
  private static splitIntoChunksNoLimit(
    text: string,
    chunkSize: number,
    overlap: number
  ): Array<{ text: string; start: number; end: number }> {
    if (!text || text.length === 0) {
      return []
    }

    const chunks: Array<{ text: string; start: number; end: number }> = []
    let start = 0

    while (start < text.length) {
      let end = start + chunkSize

      // If this isn't the last chunk, try to break at a sentence boundary
      if (end < text.length) {
        const sentenceEnders = ['. ', '.\n', '! ', '!\n', '? ', '?\n']
        let bestBreak = end

        for (const ender of sentenceEnders) {
          const lastIndex = text.lastIndexOf(ender, end)
          if (lastIndex > start + chunkSize * 0.8) {
            bestBreak = lastIndex + ender.length
            break
          }
        }
        end = bestBreak
      }

      const chunkText = text.substring(start, Math.min(end, text.length)).trim()
      if (chunkText) {
        chunks.push({
          text: chunkText,
          start,
          end: Math.min(end, text.length)
        })
      }

      // Move to next chunk with overlap
      start = end - overlap
      if (start <= chunks[chunks.length - 1]?.start) {
        start = end
      }
    }

    return chunks
  }

  /**
   * Retrieve chunks for a source
   */
  static async getChunks(sourceId: string): Promise<any[]> {
    const supabase = createServiceClient()

    const { data: chunks, error } = await supabase
      .from('source_chunks')
      .select('*')
      .eq('source_id', sourceId)
      .order('position', { ascending: true })

    if (error) {
      console.error(`[ChunkManager] Error fetching chunks:`, error)
      return []
    }

    return chunks || []
  }

  /**
   * Delete all chunks for a source
   */
  static async deleteChunks(sourceId: string, supabaseClient?: any): Promise<void> {
    const supabase = supabaseClient || createServiceClient()

    const { error } = await supabase
      .from('source_chunks')
      .delete()
      .eq('source_id', sourceId)

    if (error) {
      console.error(`[ChunkManager] Error deleting chunks:`, error)
    }
  }

  /**
   * Split text into overlapping chunks
   */
  private static splitIntoChunks(
    text: string,
    chunkSize: number,
    overlap: number
  ): Array<{ text: string; start: number; end: number }> {
    if (!text || text.length === 0) {
      return []
    }

    // Pre-calculate how many chunks we'd create to prevent array overflow
    const estimatedChunks = Math.ceil(text.length / (chunkSize - overlap))
    if (estimatedChunks > this.MAX_CHUNKS) {
      console.warn(`[ChunkManager] Text would create ${estimatedChunks} chunks, exceeding limit of ${this.MAX_CHUNKS}`)
      // Return a single truncated chunk
      return [{
        text: text.substring(0, this.MAX_CONTENT_SIZE).trim(),
        start: 0,
        end: Math.min(text.length, this.MAX_CONTENT_SIZE)
      }]
    }

    const chunks: Array<{ text: string; start: number; end: number }> = []
    let start = 0
    let chunkCount = 0

    while (start < text.length && chunkCount < this.MAX_CHUNKS) {
      // Calculate end position
      let end = start + chunkSize

      // If this isn't the last chunk, try to break at a sentence boundary
      if (end < text.length) {
        // Look for sentence endings
        const sentenceEnders = ['. ', '.\n', '! ', '!\n', '? ', '?\n']
        let bestBreak = -1

        // Search backward for a sentence boundary
        for (let i = end; i > start + chunkSize * 0.5; i--) {
          for (const ender of sentenceEnders) {
            if (text.substring(i - ender.length, i) === ender) {
              bestBreak = i
              break
            }
          }
          if (bestBreak !== -1) break
        }

        if (bestBreak !== -1) {
          end = bestBreak
        } else {
          // If no sentence boundary, try to break at word boundary
          const lastSpace = text.lastIndexOf(' ', end)
          if (lastSpace > start + chunkSize * 0.5) {
            end = lastSpace
          }
        }
      } else {
        end = text.length
      }

      // Extract chunk
      const chunkText = text.substring(start, end).trim()
      if (chunkText.length > 0) {
        chunks.push({
          text: chunkText,
          start,
          end
        })
        chunkCount++
      }

      // Move to next chunk with overlap
      start = end - overlap
      if (start < 0) start = 0
    }

    return chunks
  }

  /**
   * Estimate token count (rough approximation)
   * OpenAI's rule of thumb: 1 token ≈ 4 characters in English
   */
  private static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  /**
   * Reconstruct full text from chunks
   * Useful for displaying or exporting
   */
  static async reconstructContent(sourceId: string): Promise<string> {
    const chunks = await this.getChunks(sourceId)

    if (chunks.length === 0) {
      return ''
    }

    // Sort by position and concatenate
    // Since we have overlap, we need to be careful about deduplication
    chunks.sort((a, b) => a.position - b.position)

    let fullText = ''
    let lastEnd = 0

    for (const chunk of chunks) {
      const meta = chunk.metadata || {}
      const start = meta.start_char || 0

      // If this chunk starts after where the last ended, add it
      if (start >= lastEnd || fullText === '') {
        fullText += (fullText ? ' ' : '') + chunk.content
        lastEnd = meta.end_char || start + chunk.content.length
      } else {
        // There's overlap, only add the non-overlapping part
        const overlapAmount = lastEnd - start
        const newContent = chunk.content.substring(overlapAmount)
        if (newContent) {
          fullText += ' ' + newContent
          lastEnd = meta.end_char || start + chunk.content.length
        }
      }
    }

    return fullText.trim()
  }

  /**
   * Search chunks by similarity (placeholder for vector search)
   * This will be implemented when we add embeddings
   */
  static async searchChunks(
    agentId: string,
    query: string,
    limit: number = 5
  ): Promise<any[]> {
    const supabase = createServiceClient()

    // For now, just return recent chunks
    // TODO: Implement vector similarity search when embeddings are added
    const { data: chunks } = await supabase
      .from('source_chunks')
      .select('*')
      .eq('agent_id', agentId)
      .limit(limit)

    return chunks || []
  }
}