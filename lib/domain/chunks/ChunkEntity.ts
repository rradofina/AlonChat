import { z } from 'zod'
import crypto from 'crypto'

/**
 * Chunk metadata structure
 */
export interface ChunkMetadata {
  chunkIndex: number
  totalChunks: number
  startChar: number
  endChar: number
  url?: string
  filePage?: number
  namespace?: 'standard' | 'qna' | 'advanced' | 'media'
  mediaHashes?: string[]
  qnaAnswerId?: string
  [key: string]: any
}

/**
 * Chunk validation schema
 */
export const ChunkSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  projectId: z.string().uuid(),
  agentId: z.string().uuid(),
  content: z.string().min(1),
  position: z.number().min(0),
  tokens: z.number().min(0),
  hash: z.string(),
  metadata: z.object({
    chunkIndex: z.number(),
    totalChunks: z.number(),
    startChar: z.number(),
    endChar: z.number(),
    url: z.string().optional(),
    filePage: z.number().optional(),
    namespace: z.enum(['standard', 'qna', 'advanced', 'media']).optional(),
    mediaHashes: z.array(z.string()).optional(),
    qnaAnswerId: z.string().optional(),
  }).passthrough(),
  createdAt: z.date(),
})

export type ChunkData = z.infer<typeof ChunkSchema>

/**
 * Chunking strategy configuration
 */
export interface ChunkStrategy {
  maxSize: number
  overlap: number
  splitOn?: 'sentence' | 'paragraph' | 'page' | 'token'
  preserveFormatting?: boolean
  minSize?: number
}

/**
 * Domain entity for Content Chunks
 * Encapsulates business logic for content chunking and management
 */
export class ChunkEntity {
  private data: ChunkData

  constructor(data: ChunkData) {
    this.data = ChunkSchema.parse(data)
  }

  /**
   * Factory method to create a new Chunk
   */
  static create(params: {
    sourceId: string
    projectId: string
    agentId: string
    content: string
    position: number
    metadata: ChunkMetadata
  }): ChunkEntity {
    const hash = ChunkEntity.generateHash(params.content)
    const tokens = ChunkEntity.estimateTokens(params.content)

    return new ChunkEntity({
      id: crypto.randomUUID(),
      sourceId: params.sourceId,
      projectId: params.projectId,
      agentId: params.agentId,
      content: params.content,
      position: params.position,
      tokens,
      hash,
      metadata: params.metadata,
      createdAt: new Date(),
    })
  }

  /**
   * Split text into chunks using the specified strategy
   */
  static splitIntoChunks(
    text: string,
    strategy: ChunkStrategy = {
      maxSize: 8000,
      overlap: 400,
      splitOn: 'sentence'
    }
  ): Array<{ text: string; start: number; end: number }> {
    const chunks: Array<{ text: string; start: number; end: number }> = []

    if (!text || text.length === 0) {
      return chunks
    }

    // Clean text
    const cleanedText = ChunkEntity.cleanText(text)

    // Handle different splitting strategies
    switch (strategy.splitOn) {
      case 'paragraph':
        return ChunkEntity.splitByParagraph(cleanedText, strategy)
      case 'page':
        return ChunkEntity.splitByPage(cleanedText, strategy)
      case 'token':
        return ChunkEntity.splitByToken(cleanedText, strategy)
      case 'sentence':
      default:
        return ChunkEntity.splitBySentence(cleanedText, strategy)
    }
  }

  /**
   * Split text by sentences with overlap
   */
  private static splitBySentence(
    text: string,
    strategy: ChunkStrategy
  ): Array<{ text: string; start: number; end: number }> {
    const chunks: Array<{ text: string; start: number; end: number }> = []
    const sentences = ChunkEntity.extractSentences(text)

    let currentChunk = ''
    let currentStart = 0
    let overlapBuffer: string[] = []

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i]
      const potentialChunk = currentChunk + sentence

      if (potentialChunk.length <= strategy.maxSize) {
        currentChunk = potentialChunk
      } else {
        // Save current chunk
        if (currentChunk.length >= (strategy.minSize || 100)) {
          chunks.push({
            text: currentChunk.trim(),
            start: currentStart,
            end: currentStart + currentChunk.length
          })

          // Calculate overlap
          const overlapSize = Math.min(strategy.overlap, currentChunk.length)
          overlapBuffer = ChunkEntity.getOverlapText(currentChunk, overlapSize, sentences, i)

          currentStart += currentChunk.length - overlapSize
          currentChunk = overlapBuffer.join(' ') + sentence
        } else {
          // Chunk too small, force add sentence
          currentChunk = potentialChunk
        }
      }
    }

    // Add remaining chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        start: currentStart,
        end: currentStart + currentChunk.length
      })
    }

    return chunks
  }

  /**
   * Split text by paragraphs
   */
  private static splitByParagraph(
    text: string,
    strategy: ChunkStrategy
  ): Array<{ text: string; start: number; end: number }> {
    const chunks: Array<{ text: string; start: number; end: number }> = []
    const paragraphs = text.split(/\n\n+/)

    let currentChunk = ''
    let currentStart = 0

    for (const paragraph of paragraphs) {
      const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph

      if (potentialChunk.length <= strategy.maxSize) {
        currentChunk = potentialChunk
      } else {
        if (currentChunk.length > 0) {
          chunks.push({
            text: currentChunk.trim(),
            start: currentStart,
            end: currentStart + currentChunk.length
          })
          currentStart += currentChunk.length + 2 // Account for \n\n
        }
        currentChunk = paragraph
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        start: currentStart,
        end: currentStart + currentChunk.length
      })
    }

    return chunks
  }

  /**
   * Split text by pages (for PDFs)
   */
  private static splitByPage(
    text: string,
    strategy: ChunkStrategy
  ): Array<{ text: string; start: number; end: number }> {
    const chunks: Array<{ text: string; start: number; end: number }> = []
    const pages = text.split(/\f/) // Form feed character for page breaks

    let currentStart = 0

    for (const page of pages) {
      if (page.length <= strategy.maxSize) {
        chunks.push({
          text: page.trim(),
          start: currentStart,
          end: currentStart + page.length
        })
      } else {
        // Page too large, fall back to sentence splitting
        const subChunks = ChunkEntity.splitBySentence(page, strategy)
        for (const subChunk of subChunks) {
          chunks.push({
            text: subChunk.text,
            start: currentStart + subChunk.start,
            end: currentStart + subChunk.end
          })
        }
      }
      currentStart += page.length + 1 // Account for form feed
    }

    return chunks
  }

  /**
   * Split text by token count
   */
  private static splitByToken(
    text: string,
    strategy: ChunkStrategy
  ): Array<{ text: string; start: number; end: number }> {
    const chunks: Array<{ text: string; start: number; end: number }> = []
    const words = text.split(/\s+/)
    const maxTokens = Math.floor(strategy.maxSize / 4) // Rough estimate: 1 token ≈ 4 chars

    let currentChunk: string[] = []
    let currentStart = 0
    let currentCharCount = 0

    for (const word of words) {
      const estimatedTokens = ChunkEntity.estimateTokens(currentChunk.join(' ') + ' ' + word)

      if (estimatedTokens <= maxTokens) {
        currentChunk.push(word)
        currentCharCount += word.length + 1
      } else {
        if (currentChunk.length > 0) {
          const chunkText = currentChunk.join(' ')
          chunks.push({
            text: chunkText,
            start: currentStart,
            end: currentStart + chunkText.length
          })
          currentStart += currentCharCount

          // Add overlap
          const overlapWords = Math.floor(strategy.overlap / 20) // Rough word count
          currentChunk = currentChunk.slice(-overlapWords)
          currentChunk.push(word)
          currentCharCount = currentChunk.join(' ').length
        } else {
          currentChunk = [word]
          currentCharCount = word.length
        }
      }
    }

    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join(' ')
      chunks.push({
        text: chunkText,
        start: currentStart,
        end: currentStart + chunkText.length
      })
    }

    return chunks
  }

  /**
   * Extract sentences from text
   */
  private static extractSentences(text: string): string[] {
    // Improved sentence splitting regex
    const sentenceRegex = /[^.!?]+[.!?]+/g
    const sentences = text.match(sentenceRegex) || []

    // Handle edge cases
    if (sentences.length === 0 && text.trim().length > 0) {
      return [text]
    }

    return sentences.map(s => s.trim())
  }

  /**
   * Get overlap text for chunking
   */
  private static getOverlapText(
    chunk: string,
    overlapSize: number,
    sentences: string[],
    currentIndex: number
  ): string[] {
    const overlapText = chunk.slice(-overlapSize)
    const overlapSentences: string[] = []

    // Find sentences that make up the overlap
    for (let i = currentIndex - 1; i >= 0; i--) {
      const sentence = sentences[i]
      if (overlapText.includes(sentence)) {
        overlapSentences.unshift(sentence)
      }
      if (overlapSentences.join(' ').length >= overlapSize) {
        break
      }
    }

    return overlapSentences
  }

  /**
   * Clean text for chunking
   */
  private static cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, '  ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  /**
   * Generate hash for content deduplication
   */
  static generateHash(content: string): string {
    return crypto
      .createHash('sha256')
      .update(content.trim().toLowerCase())
      .digest('hex')
      .substring(0, 16)
  }

  /**
   * Estimate token count for content
   */
  static estimateTokens(content: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    // More accurate would be to use tiktoken library
    const charCount = content.length
    const wordCount = content.split(/\s+/).length

    // Use average of character and word-based estimates
    const charEstimate = Math.ceil(charCount / 4)
    const wordEstimate = Math.ceil(wordCount * 1.3)

    return Math.ceil((charEstimate + wordEstimate) / 2)
  }

  /**
   * Check if chunk is duplicate based on hash
   */
  isDuplicate(other: ChunkEntity): boolean {
    return this.data.hash === other.data.hash
  }

  /**
   * Check if chunk needs re-embedding
   */
  needsReEmbedding(): boolean {
    // Chunks always need embedding if they don't have vectors
    // This would typically check against a vector database
    return true
  }

  /**
   * Calculate similarity score with another chunk
   */
  calculateSimilarity(other: ChunkEntity): number {
    // Simple Jaccard similarity for text
    const words1 = new Set(this.data.content.toLowerCase().split(/\s+/))
    const words2 = new Set(other.data.content.toLowerCase().split(/\s+/))

    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])

    return intersection.size / union.size
  }

  /**
   * Get chunk size category
   */
  getSizeCategory(): 'small' | 'medium' | 'large' | 'xlarge' {
    const size = this.data.content.length

    if (size < 500) return 'small'
    if (size < 2000) return 'medium'
    if (size < 5000) return 'large'
    return 'xlarge'
  }

  /**
   * Validate chunk content
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (this.data.content.trim().length === 0) {
      errors.push('Chunk content cannot be empty')
    }

    if (this.data.tokens === 0) {
      errors.push('Chunk must contain at least one token')
    }

    if (this.data.content.length > 10000) {
      errors.push('Chunk content exceeds maximum size of 10,000 characters')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Convert to plain object for persistence
   */
  toJSON(): ChunkData {
    return { ...this.data }
  }

  /**
   * Create from database record
   */
  static fromDatabase(record: any): ChunkEntity {
    return new ChunkEntity({
      id: record.id,
      sourceId: record.source_id,
      projectId: record.project_id,
      agentId: record.agent_id,
      content: record.content || record.chunk_text,
      position: record.position,
      tokens: record.tokens,
      hash: record.hash || ChunkEntity.generateHash(record.content || record.chunk_text),
      metadata: record.metadata || {},
      createdAt: new Date(record.created_at),
    })
  }

  // Getters
  get id(): string { return this.data.id }
  get sourceId(): string { return this.data.sourceId }
  get projectId(): string { return this.data.projectId }
  get agentId(): string { return this.data.agentId }
  get content(): string { return this.data.content }
  get position(): number { return this.data.position }
  get tokens(): number { return this.data.tokens }
  get hash(): string { return this.data.hash }
  get metadata(): ChunkMetadata { return this.data.metadata }
  get createdAt(): Date { return this.data.createdAt }
}