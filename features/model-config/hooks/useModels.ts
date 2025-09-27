import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { AIModel, ModelFormData } from '../types'

// Fetch all models
export function useModels() {
  return useQuery({
    queryKey: ['ai-models'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data as AIModel[]
    },
  })
}

// Create new model
export function useCreateModel() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (data: ModelFormData) => {
      const { data: model, error } = await supabase
        .from('ai_models')
        .insert([{
          ...data,
          is_active: true,
          sort_order: 999,
        }])
        .select()
        .single()

      if (error) throw error
      return model
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-models'] })
      toast.success('Model added successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add model')
    },
  })
}

// Update model
export function useUpdateModel() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<AIModel> & { id: string }) => {
      const { data: model, error } = await supabase
        .from('ai_models')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return model
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-models'] })
      toast.success('Model updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update model')
    },
  })
}

// Delete model
export function useDeleteModel() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_models')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-models'] })
      toast.success('Model deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete model')
    },
  })
}

// Toggle model active state
export function useToggleModel() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('ai_models')
        .update({ is_active: isActive })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-models'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to toggle model')
    },
  })
}

// Test model connection
export function useTestModel() {
  return useMutation({
    mutationFn: async (modelId: string) => {
      const response = await fetch('/api/admin/test-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to test model')
      }

      return response.json()
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Model test successful')
      } else {
        toast.error(`Model test failed: ${data.message}`)
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to test model')
    },
  })
}

// Sync models from providers
export function useSyncModels() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/sync-models', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to sync models')
      }

      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-models'] })
      toast.success(`Synced ${data.synced} models from providers`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to sync models')
    },
  })
}

// Update model order
export function useUpdateModelOrder() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (models: { id: string; sort_order: number }[]) => {
      const promises = models.map(model =>
        supabase
          .from('ai_models')
          .update({ sort_order: model.sort_order })
          .eq('id', model.id)
      )

      const results = await Promise.all(promises)
      const hasError = results.some(r => r.error)
      if (hasError) throw new Error('Failed to update order')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-models'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update model order')
    },
  })
}