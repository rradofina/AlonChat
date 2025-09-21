'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface NewAgentButtonProps {
  workspaceId: string
}

export function NewAgentButton({ workspaceId }: NewAgentButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleCreateAgent = async () => {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('agents')
        .insert({
          workspace_id: workspaceId,
          name: 'New Agent',
          description: 'Configure this agent to handle your specific use case',
          system_prompt: 'You are a helpful AI assistant.',
          model: 'gpt-4o-mini',
          temperature: 0.7,
          max_tokens: 500,
          status: 'draft',
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Agent created successfully!')
      router.push(`/dashboard/agents/${data.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create agent')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleCreateAgent}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-900 transition-colors disabled:opacity-50"
    >
      <Plus className="h-5 w-5" />
      {loading ? 'Creating...' : 'New AI agent'}
    </button>
  )
}