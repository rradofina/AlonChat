import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface AIModel {
  id: string
  name: string
  display_name: string
  provider: string
  model_id: string
  description?: string
  context_window?: number
  max_tokens?: number
  supports_vision?: boolean
  supports_functions?: boolean
  supports_streaming?: boolean
  is_active: boolean
  is_available?: boolean
  sort_order: number
  message_credits?: number
  input_price_per_million?: number
  output_price_per_million?: number
  speed?: 'fast' | 'medium' | 'slow'
}

export function useAIModels(onlyActive = true) {
  const [models, setModels] = useState<AIModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoading(true)
        setError(null)

        let query = supabase
          .from('ai_models')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('display_name', { ascending: true })

        if (onlyActive) {
          query = query.eq('is_active', true)
        }

        const { data, error } = await query

        if (error) throw error

        // Map is_available from is_active for backward compatibility
        const mappedModels = (data || []).map(model => ({
          ...model,
          is_available: model.is_active
        }))

        setModels(mappedModels)
      } catch (err: any) {
        console.error('Error loading AI models:', err)
        setError(err.message || 'Failed to load models')
        // Don't use fallback hardcoded models in production
        setModels([])
      } finally {
        setLoading(false)
      }
    }

    loadModels()
  }, [onlyActive])

  const getModelById = (id: string) => {
    return models.find(m => m.model_id === id || m.name === id)
  }

  const getModelsByProvider = () => {
    return models.reduce((acc, model) => {
      const provider = model.provider || 'Other'
      if (!acc[provider]) acc[provider] = []
      acc[provider].push(model)
      return acc
    }, {} as Record<string, AIModel[]>)
  }

  return {
    models,
    loading,
    error,
    getModelById,
    getModelsByProvider
  }
}