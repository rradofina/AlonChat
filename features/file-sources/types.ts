// File source types and interfaces

export interface FileSource {
  id: string
  name: string
  type: 'file'
  status: 'pending' | 'processing' | 'ready' | 'error' | 'removed'
  size_kb?: number
  size_bytes?: number
  chunk_count?: number
  created_at: string
  updated_at?: string
  removed_at?: string | null
  metadata?: {
    file_type?: string
    file_size?: number
    mime_type?: string
    original_name?: string
    [key: string]: any
  }
  storage_path?: string
  agent_id: string
  project_id: string
}

export interface UploadingFile {
  id: string
  name: string
  size: number
  status: 'uploading' | 'processing' | 'complete' | 'error'
  progress: number
  error?: string
  file?: File
}

export interface FileUploadParams {
  agentId: string
  files: File[]
  onProgress?: (fileId: string, progress: number) => void
  onComplete?: (fileId: string) => void
  onError?: (fileId: string, error: string) => void
}

export interface FileListFilters {
  searchQuery?: string
  sortBy?: 'Default' | 'Name' | 'Date' | 'Size' | 'Type'
  includeRemoved?: boolean
  fileType?: string
}

export interface FileActionParams {
  agentId: string
  fileIds: string[]
}

export interface FileRestoreParams extends FileActionParams {}
export interface FileDeleteParams extends FileActionParams {
  permanent?: boolean
}