import pdf from 'pdf-parse'
import mammoth from 'mammoth'

export interface ProcessedFile {
  content: string
  pageCount?: number
  pages?: Array<{
    pageNumber: number
    content: string
  }>
  metadata?: {
    title?: string
    author?: string
    subject?: string
    keywords?: string
    creationDate?: Date
    modificationDate?: Date
    pages?: number
  }
}

export class FileProcessor {
  static async processFile(file: File): Promise<ProcessedFile> {
    const fileType = file.type.toLowerCase()
    const fileName = file.name.toLowerCase()

    // Handle different file types
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return await this.processPDF(file)
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      return await this.processDOCX(file)
    } else if (
      fileType === 'application/msword' ||
      fileName.endsWith('.doc')
    ) {
      return await this.processDOC(file)
    } else if (
      fileType === 'text/plain' ||
      fileName.endsWith('.txt')
    ) {
      return await this.processText(file)
    } else {
      throw new Error(`Unsupported file type: ${fileType}`)
    }
  }

  private static async processPDF(file: File): Promise<ProcessedFile> {
    try {
      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Parse PDF
      const data = await pdf(buffer)

      // Extract pages if available
      const pages = []
      if (data.numpages > 1 && data.text) {
        // Split content by page (this is a simple approach, may need refinement)
        const pageBreaks = data.text.split('\n\n')
        for (let i = 0; i < Math.min(pageBreaks.length, data.numpages); i++) {
          pages.push({
            pageNumber: i + 1,
            content: pageBreaks[i]
          })
        }
      }

      return {
        content: data.text || '',
        pageCount: data.numpages,
        pages: pages.length > 0 ? pages : undefined,
        metadata: {
          pages: data.numpages,
          title: data.info?.Title,
          author: data.info?.Author,
          subject: data.info?.Subject,
          keywords: data.info?.Keywords,
          creationDate: data.info?.CreationDate,
          modificationDate: data.info?.ModificationDate,
        }
      }
    } catch (error) {
      console.error('Error processing PDF:', error)
      throw new Error('Failed to process PDF file')
    }
  }

  private static async processDOCX(file: File): Promise<ProcessedFile> {
    try {
      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()

      // Process with mammoth
      const result = await mammoth.extractRawText({ arrayBuffer })

      if (result.messages.length > 0) {
        console.warn('DOCX processing warnings:', result.messages)
      }

      return {
        content: result.value || '',
        metadata: {
          pages: 1 // DOCX doesn't provide page count easily
        }
      }
    } catch (error) {
      console.error('Error processing DOCX:', error)
      throw new Error('Failed to process DOCX file')
    }
  }

  private static async processDOC(file: File): Promise<ProcessedFile> {
    try {
      // Try to process as DOCX first (sometimes .doc files are actually .docx)
      return await this.processDOCX(file)
    } catch (error) {
      // If that fails, return a message that .doc is not fully supported
      console.error('Error processing DOC:', error)
      return {
        content: 'Legacy .doc format is not fully supported. Please convert to .docx format for best results.',
        metadata: {
          pages: 1
        }
      }
    }
  }

  private static async processText(file: File): Promise<ProcessedFile> {
    try {
      const text = await file.text()

      // Count approximate pages (assuming ~3000 chars per page)
      const pageCount = Math.ceil(text.length / 3000)

      return {
        content: text,
        pageCount,
        metadata: {
          pages: pageCount
        }
      }
    } catch (error) {
      console.error('Error processing text file:', error)
      throw new Error('Failed to process text file')
    }
  }
}