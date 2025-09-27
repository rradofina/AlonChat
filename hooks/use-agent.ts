import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Agent {
  id: string
  name: string
  description?: string
  model: string
  temperature: number
  system_prompt?: string
  prompt_template_id?: string
  custom_user_prompt?: string
  greeting_message?: string
  status?: string
  last_trained_at?: string
  created_at: string
  updated_at: string
  project_id: string
}

export function useAgent(agentId: string) {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!agentId) {
      setLoading(false)
      return
    }

    const loadAgent = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .eq('id', agentId)
          .single()

        if (error) throw error

        setAgent(data)
      } catch (err: any) {
        console.error('Error loading agent:', err)
        setError(err.message || 'Failed to load agent')
      } finally {
        setLoading(false)
      }
    }

    loadAgent()

    // Set up real-time subscription for agent updates
    const channel = supabase
      .channel(`agent-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agents',
          filter: `id=eq.${agentId}`
        },
        (payload) => {
          setAgent((prev) => ({
            ...prev,
            ...payload.new
          } as Agent))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [agentId])

  const updateAgent = async (updates: Partial<Agent>) => {
    if (!agentId) return { error: 'No agent ID provided' }

    try {
      const { data, error } = await supabase
        .from('agents')
        .update(updates)
        .eq('id', agentId)
        .select()
        .single()

      if (error) throw error

      setAgent(data)
      return { data, error: null }
    } catch (err: any) {
      console.error('Error updating agent:', err)
      return { data: null, error: err.message || 'Failed to update agent' }
    }
  }

  return {
    agent,
    loading,
    error,
    updateAgent,
    refetch: () => {
      if (agentId) {
        setLoading(true)
        loadAgent()
      }
    }
  }
}