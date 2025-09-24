import { OpenAI } from 'openai'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'

export interface ChunkData {
  content: string
  metadata: {
    source: string
    source_type: string
    page_title?: string
    page_url?: string
    chunk_index: number
    total_chunks?: number
  }
  embedding?: number[]
}

export class TextChunker {
  private splitter: RecursiveCharacterTextSplitter
  private openai: OpenAI | null = null

  constructor(chunkSize: number = 512, chunkOverlap: number = 50) {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators: ['\n\n', '\n', '.', '!', '?', ';', ',', ' ', '']
    })

    // Initialize OpenAI if API key is available
    const apiKey = process.env.OPENAI_API_KEY
    if (apiKey && apiKey !== 'your_openai_api_key_here') {
      this.openai = new OpenAI({ apiKey })
    }
  }

  async chunkText(
    text: string,
    metadata: {
      source: string
      source_type: string
      page_title?: string
      page_url?: string
    }
  ): Promise<ChunkData[]> {
    // Split text into chunks
    const chunks = await this.splitter.splitText(text)

    // Create chunk data with metadata
    const chunkData: ChunkData[] = chunks.map((chunk, index) => ({
      content: chunk,
      metadata: {
        ...metadata,
        chunk_index: index,
        total_chunks: chunks.length
      }
    }))

    return chunkData
  }

  async generateEmbeddings(chunks: ChunkData[]): Promise<ChunkData[]> {
    if (!this.openai) {
      console.warn('OpenAI not configured, skipping embeddings')
      return chunks
    }

    const batchSize = 20 // Process in batches to avoid rate limits
    const results: ChunkData[] = []

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)

      try {
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: batch.map(chunk => chunk.content)
        })

        batch.forEach((chunk, index) => {
          results.push({
            ...chunk,
            embedding: response.data[index].embedding
          })
        })

        // Add delay between batches
        if (i + batchSize < chunks.length) {
          await this.delay(500)
        }
      } catch (error) {
        console.error('Error generating embeddings:', error)
        // Return chunks without embeddings on error
        results.push(...batch)
      }
    }

    return results
  }

  async processWebsiteContent(
    pages: Array<{
      url: string
      title: string
      content: string
    }>
  ): Promise<ChunkData[]> {
    const allChunks: ChunkData[] = []

    for (const page of pages) {
      if (!page.content || page.content.trim().length === 0) {
        continue
      }

      const pageChunks = await this.chunkText(page.content, {
        source: 'website',
        source_type: 'website',
        page_title: page.title,
        page_url: page.url
      })

      allChunks.push(...pageChunks)
    }

    // Generate embeddings for all chunks
    if (this.openai) {
      return this.generateEmbeddings(allChunks)
    }

    return allChunks
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export async function chunkWebsiteContent(
  pages: Array<{
    url: string
    title: string
    content: string
  }>
): Promise<ChunkData[]> {
  const chunker = new TextChunker()
  return chunker.processWebsiteContent(pages)
}