import mammoth from 'mammoth'

let pdfjsLoader: Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')> | null = null

async function getPdfJs() {
  if (!pdfjsLoader) {
    pdfjsLoader = import('pdfjs-dist/legacy/build/pdf.mjs').then((mod) => {
      // Disable workers in the Node.js environment
      mod.GlobalWorkerOptions.disableWorker = true
      return mod
    })
  }
  return pdfjsLoader
}

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
      console.log('Processing PDF with pdfjs-dist:', file.name, 'Size:', file.size, 'bytes')

      const pdfjs = await getPdfJs()

      // Convert File to typed array for pdf.js
      const arrayBuffer = await file.arrayBuffer()
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Uploaded PDF has 0 bytes')
      }

      const uint8Array = new Uint8Array(arrayBuffer)

      const loadingTask = pdfjs.getDocument({
        data: uint8Array,
        useSystemFonts: true,
        isEvalSupported: false,
        disableCreateObjectURL: true
      })

      const pdfDoc = await loadingTask.promise
      const numPages = pdfDoc.numPages

      const pageTexts: string[] = []

      const cleanPageText = (text: string) => {
        return text
          .replace(/[-–—\s]*Page\s+\d+[-–—\s]*/gi, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim()
      }

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum)
        const textContent = await page.getTextContent()

        const rawPageText = textContent.items
          .map((item: any) => {
            if (typeof item.str === 'string') return item.str
            if (item?.unicode) return item.unicode
            return ''
          })
          .join(' ')

        const pageText = cleanPageText(rawPageText)
        pageTexts.push(pageText)
      }

      const metadataResult = await pdfDoc.getMetadata().catch(() => null)
      const info = metadataResult?.info ?? {}

      const pageSections = pageTexts.map((text, index) => {
        const header = `--- Page ${index + 1} ---`
        if (!text) return header
        return `${header}\n\n${text}`
      })

      const fullText = pageSections.join('\n\n').trim()

      return {
        content: fullText,
        pageCount: numPages,
        metadata: {
          title: info.Title || file.name,
          author: info.Author,
          subject: info.Subject,
          keywords: info.Keywords,
          creationDate: info.CreationDate ? new Date(info.CreationDate) : undefined,
          modificationDate: info.ModDate ? new Date(info.ModDate) : undefined,
          pages: numPages
        }
      }
    } catch (error: any) {
      console.error('Error processing PDF:', error)
      throw new Error(`Failed to process PDF file: ${error.message}`)
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
    } catch (error: any) {
      console.error('Error processing DOCX:', error)
      throw new Error(`Failed to process DOCX file: ${error.message}`)
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