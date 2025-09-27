// Q&A source types and interfaces

export interface QASource {
  id: string
  name: string
  type: 'qa'
  status: 'pending' | 'processing' | 'ready' | 'error'
  size_kb?: number
  size_bytes?: number
  chunk_count?: number
  created_at: string
  updated_at?: string
  metadata?: {
    questions?: string[]
    answer?: string
    images?: string[]
    [key: string]: any
  }
  agent_id: string
  project_id: string
}

export interface QAFormData {
  title: string
  questions: string[]
  answer: string
  images?: File[]
}

export interface CreateQAParams {
  agentId: string
  data: QAFormData
}

export interface UpdateQAParams {
  agentId: string
  sourceId: string
  data: Partial<QAFormData>
}

export interface DeleteQAParams {
  agentId: string
  sourceIds: string[]
}

export interface QAListFilters {
  searchQuery?: string
  sortBy?: 'Default' | 'Title' | 'Date' | 'Size'
}