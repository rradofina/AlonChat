// Model configuration types and interfaces

export interface AIModel {
  id: string
  name: string
  display_name: string
  provider: string
  model_id: string
  context_window: number
  max_tokens: number
  description: string | null
  is_active: boolean
  updated_at: string
  message_credits: number
  input_price_per_million: number | null
  output_price_per_million: number | null
  supports_vision: boolean
  supports_functions: boolean
  supports_streaming: boolean
  speed: 'fast' | 'medium' | 'slow' | null
  sort_order: number
  last_test_status?: 'untested' | 'testing' | 'success' | 'error' | null
  last_test_message?: string | null
  last_tested_at?: string | null
}

export interface ModelFormData {
  name: string
  display_name: string
  provider: string
  model_id: string
  context_window: number
  max_tokens: number
  description?: string
  message_credits: number
  input_price_per_million?: number
  output_price_per_million?: number
  supports_vision: boolean
  supports_functions: boolean
  supports_streaming: boolean
  speed: 'fast' | 'medium' | 'slow'
}

export interface ModelTestResult {
  status: 'success' | 'error'
  message: string
  timestamp: string
}

export interface ModelStats {
  totalModels: number
  activeModels: number
  inactiveModels: number
  modelsByProvider: Record<string, number>
  lastSync?: string
}