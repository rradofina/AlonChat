import { createServiceClient } from '@/lib/supabase/service'
import { FileProcessor } from '@/lib/sources/file-processor'
import { ChunkManager } from './chunk-manager'

export interface ProcessingResult {
  success: boolean
  chunks?: number
  error?: string
}

export class DocumentProcessor {
  /**
   * Process a document source - can be called sync or async
   * This abstraction allows easy migration to queue-based processing later
   * @param sourceId - The ID of the source to process
   * @param supabaseClient - Optional Supabase client to use (defaults to service client)
   */
  static async processDocument(sourceId: string, supabaseClient?: any): Promise<ProcessingResult> {
    const supabase = supabaseClient || createServiceClient()

    try {
      console.log(`[DocumentProcessor] Starting processing for source: ${sourceId}`)

      // Get source details
      const { data: source, error: sourceError } = await supabase
        .from('sources')
        .select('*')
        .eq('id', sourceId)
        .single()

      if (sourceError || !source) {
        throw new Error('Source not found')
      }

      // Update status to processing
      await supabase
        .from('sources')
        .update({
          status: 'processing',
          processing_started_at: new Date().toISOString()
        })
        .eq('id', sourceId)

      // Download file from storage
      if (!source.file_url) {
        throw new Error('No file URL found')
      }

      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('source-files')
        .download(source.file_url)

      if (downloadError || !fileData) {
        throw new Error(`Failed to download file: ${downloadError?.message}`)
      }

      // Convert Blob to File for processor
      const file = new File([fileData], source.name, {
        type: source.metadata?.file_type || 'application/octet-stream'
      })

      // Process the file
      console.log(`[DocumentProcessor] Processing file: ${source.name}`)
      const processedFile = await FileProcessor.processFile(file)

      // Update status to chunking
      await supabase
        .from('sources')
        .update({ status: 'chunking' })
        .eq('id', sourceId)

      // Store content as chunks
      const chunkCount = await ChunkManager.storeChunks({
        sourceId: source.id,
        agentId: source.agent_id,
        projectId: source.project_id,
        content: processedFile.content,
        metadata: {
          pageCount: processedFile.pageCount,
          ...processedFile.metadata
        },
        supabaseClient: supabase // Pass the same client
      })

      // Update source with processing complete
      await supabase
        .from('sources')
        .update({
          status: 'new', // Ready to be trained
          processing_completed_at: new Date().toISOString(),
          chunk_count: chunkCount,
          size_kb: Math.round(processedFile.content.length / 1024),
          metadata: {
            ...source.metadata,
            ...processedFile.metadata,
            processed: true,
            chunk_count: chunkCount
          }
        })
        .eq('id', sourceId)

      console.log(`[DocumentProcessor] Completed processing for source: ${sourceId}, chunks: ${chunkCount}`)

      return {
        success: true,
        chunks: chunkCount
      }

    } catch (error: any) {
      console.error(`[DocumentProcessor] Error processing source ${sourceId}:`, error)

      // Update source with error status
      await supabase
        .from('sources')
        .update({
          status: 'error',
          error_message: error.message || 'Processing failed',
          processing_completed_at: new Date().toISOString()
        })
        .eq('id', sourceId)

      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Process multiple documents in batch
   * Useful for reprocessing or bulk operations
   */
  static async processMultiple(sourceIds: string[]): Promise<Map<string, ProcessingResult>> {
    const results = new Map<string, ProcessingResult>()

    // Process sequentially to avoid overwhelming the system
    // When we add queues later, these can be processed in parallel
    for (const sourceId of sourceIds) {
      const result = await this.processDocument(sourceId)
      results.set(sourceId, result)

      // Add a small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return results
  }

  /**
   * Check if a source needs processing
   */
  static async needsProcessing(sourceId: string): Promise<boolean> {
    const supabase = await createClient()

    const { data: source } = await supabase
      .from('sources')
      .select('status, file_url, chunk_count')
      .eq('id', sourceId)
      .single()

    if (!source) return false

    // Needs processing if:
    // 1. Has a file URL but no chunks
    // 2. Status indicates it's pending
    // 3. Previous processing failed
    return (
      source.file_url &&
      (!source.chunk_count || source.chunk_count === 0) ||
      source.status === 'pending' ||
      source.status === 'pending_processing' ||
      source.status === 'error'
    )
  }
}