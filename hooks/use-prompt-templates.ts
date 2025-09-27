import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface PromptTemplate {
  id: string
  name: string
  description?: string
  category: string
  user_prompt: string
  is_system: boolean
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export function usePromptTemplates(includeInactive = false) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true)
        setError(null)

        let query = supabase
          .from('prompt_templates')
          .select('*')
          .order('category', { ascending: true })
          .order('name', { ascending: true })

        if (!includeInactive) {
          query = query.eq('is_active', true)
        }

        const { data, error } = await query

        if (error) throw error

        setTemplates(data || [])
      } catch (err: any) {
        console.error('Error loading prompt templates:', err)
        setError(err.message || 'Failed to load templates')
      } finally {
        setLoading(false)
      }
    }

    loadTemplates()
  }, [includeInactive])

  const getTemplateById = (id: string) => {
    return templates.find(t => t.id === id)
  }

  const getTemplatesByCategory = () => {
    return templates.reduce((acc, template) => {
      const category = template.category || 'Other'
      if (!acc[category]) acc[category] = []
      acc[category].push(template)
      return acc
    }, {} as Record<string, PromptTemplate[]>)
  }

  return {
    templates,
    loading,
    error,
    getTemplateById,
    getTemplatesByCategory
  }
}