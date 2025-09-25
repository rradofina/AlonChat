import { createClient } from '@/lib/supabase/server'

export interface UploadOptions {
  file: File
  agentId: string
  projectId: string
  bucket?: string
}

export interface UploadResult {
  url: string
  path: string
  size: number
}

export class StorageManager {
  static readonly BUCKET_NAME = 'source-files'
  static readonly MAX_FILE_SIZE = 30 * 1024 * 1024 // 30MB

  /**
   * Upload a file to Supabase Storage
   */
  static async uploadFile(options: UploadOptions): Promise<UploadResult> {
    const {
      file,
      agentId,
      projectId,
      bucket = this.BUCKET_NAME
    } = options

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds ${this.MAX_FILE_SIZE / 1024 / 1024}MB limit`)
    }

    const supabase = await createClient()

    // Generate unique file path
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const fileExt = this.getFileExtension(file.name)
    const fileName = `${timestamp}-${randomStr}${fileExt}`
    const filePath = `${projectId}/${agentId}/${fileName}`

    console.log(`[StorageManager] Uploading file: ${filePath}, size: ${file.size} bytes`)

    // Upload to Supabase Storage
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('[StorageManager] Upload error:', error)
      throw new Error(`Failed to upload file: ${error.message}`)
    }

    console.log(`[StorageManager] File uploaded successfully: ${filePath}`)

    return {
      url: data.path,
      path: filePath,
      size: file.size
    }
  }

  /**
   * Download a file from storage
   */
  static async downloadFile(
    filePath: string,
    bucket: string = this.BUCKET_NAME
  ): Promise<Blob | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .storage
      .from(bucket)
      .download(filePath)

    if (error) {
      console.error(`[StorageManager] Download error for ${filePath}:`, error)
      return null
    }

    return data
  }

  /**
   * Delete a file from storage
   */
  static async deleteFile(
    filePath: string,
    bucket: string = this.BUCKET_NAME
  ): Promise<boolean> {
    const supabase = await createClient()

    const { error } = await supabase
      .storage
      .from(bucket)
      .remove([filePath])

    if (error) {
      console.error(`[StorageManager] Delete error for ${filePath}:`, error)
      return false
    }

    console.log(`[StorageManager] File deleted: ${filePath}`)
    return true
  }

  /**
   * Get public URL for a file
   * Note: This only works if the bucket is public or if you use signed URLs
   */
  static async getPublicUrl(
    filePath: string,
    bucket: string = this.BUCKET_NAME
  ): Promise<string> {
    const supabase = await createClient()

    const { data } = supabase
      .storage
      .from(bucket)
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  /**
   * Get a signed URL for temporary access
   */
  static async getSignedUrl(
    filePath: string,
    expiresIn: number = 3600, // 1 hour default
    bucket: string = this.BUCKET_NAME
  ): Promise<string | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn)

    if (error) {
      console.error(`[StorageManager] Signed URL error for ${filePath}:`, error)
      return null
    }

    return data.signedUrl
  }

  /**
   * List files in a directory
   */
  static async listFiles(
    path: string,
    bucket: string = this.BUCKET_NAME
  ): Promise<any[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .storage
      .from(bucket)
      .list(path)

    if (error) {
      console.error(`[StorageManager] List error for ${path}:`, error)
      return []
    }

    return data || []
  }

  /**
   * Move a file to a different location
   */
  static async moveFile(
    fromPath: string,
    toPath: string,
    bucket: string = this.BUCKET_NAME
  ): Promise<boolean> {
    const supabase = await createClient()

    const { error } = await supabase
      .storage
      .from(bucket)
      .move(fromPath, toPath)

    if (error) {
      console.error(`[StorageManager] Move error from ${fromPath} to ${toPath}:`, error)
      return false
    }

    console.log(`[StorageManager] File moved from ${fromPath} to ${toPath}`)
    return true
  }

  /**
   * Check if a file exists
   */
  static async fileExists(
    filePath: string,
    bucket: string = this.BUCKET_NAME
  ): Promise<boolean> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .storage
      .from(bucket)
      .download(filePath)

    // If download succeeds, file exists
    return !error && data !== null
  }

  /**
   * Get file metadata
   */
  static async getFileMetadata(
    filePath: string,
    bucket: string = this.BUCKET_NAME
  ): Promise<any | null> {
    const supabase = await createClient()

    // Parse directory and filename from path
    const lastSlash = filePath.lastIndexOf('/')
    const dir = lastSlash > 0 ? filePath.substring(0, lastSlash) : ''
    const fileName = filePath.substring(lastSlash + 1)

    const { data, error } = await supabase
      .storage
      .from(bucket)
      .list(dir)

    if (error || !data) {
      return null
    }

    return data.find(file => file.name === fileName) || null
  }

  /**
   * Validate file type
   */
  static isValidFileType(fileName: string, allowedTypes: string[]): boolean {
    const ext = this.getFileExtension(fileName).toLowerCase()
    return allowedTypes.some(type => ext.endsWith(type.toLowerCase()))
  }

  /**
   * Get file extension
   */
  private static getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.')
    return lastDot > 0 ? fileName.substring(lastDot) : ''
  }

  /**
   * Clean up old files (for maintenance)
   */
  static async cleanupOldFiles(
    projectId: string,
    daysOld: number = 30,
    bucket: string = this.BUCKET_NAME
  ): Promise<number> {
    const supabase = await createClient()

    // List all files in project directory
    const { data: files } = await supabase
      .storage
      .from(bucket)
      .list(projectId, {
        limit: 1000
      })

    if (!files) return 0

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    let deletedCount = 0
    const filesToDelete: string[] = []

    for (const file of files) {
      if (file.created_at && new Date(file.created_at) < cutoffDate) {
        filesToDelete.push(`${projectId}/${file.name}`)
      }
    }

    if (filesToDelete.length > 0) {
      const { error } = await supabase
        .storage
        .from(bucket)
        .remove(filesToDelete)

      if (!error) {
        deletedCount = filesToDelete.length
        console.log(`[StorageManager] Cleaned up ${deletedCount} old files`)
      }
    }

    return deletedCount
  }
}