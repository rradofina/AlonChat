'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { modelService } from '@/lib/services/model-service'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function NewAgentPage() {
  const [isCreating, setIsCreating] = useState(false)
  const [agentName, setAgentName] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleCreateAgent = async () => {
    if (!agentName.trim()) {
      toast.error('Please enter an agent name')
      return
    }

    setIsCreating(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please log in first')
        return
      }

      // Get user's project
      const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)

      if (projectError || !projects || projects.length === 0) {
        toast.error('No project found. Please refresh and try again.')
        setIsCreating(false)
        return
      }

      const project = projects[0]

      // Create the agent

      // Fetch the default AI Agent template from database
      let systemPrompt = ''
      try {
        const response = await fetch('/api/prompt-templates')
        const data = await response.json()
        if (data.templates && data.templates.length > 0) {
          // Find the AI Agent template or use the first one
          const aiAgentTemplate = data.templates.find((t: any) => t.name === 'AI Agent') || data.templates[0]
          systemPrompt = aiAgentTemplate.user_prompt
        }
      } catch (error) {
        // Fallback to a basic prompt
        systemPrompt = 'You are a helpful AI assistant. Answer questions accurately and concisely.'
      }

      // Get default model dynamically
      const defaultModel = await modelService.getDefaultModel(false)
      if (!defaultModel) {
        toast.error('No AI models configured. Please contact administrator.')
        setIsCreating(false)
        return
      }

      const insertData = {
        name: agentName,
        description: `New AI agent - add sources to get started`,
        project_id: project.id,
        model: defaultModel,
        temperature: 0.7,
        max_tokens: 500,
        system_prompt: systemPrompt,
        welcome_message: 'Hello! How can I help you today?',
        suggested_questions: ['What can you help me with?'],
        status: 'draft',
        config: {},
        widget_settings: {
          position: 'bottom-right',
          placeholder: 'Type your message...',
          primaryColor: '#6366f1',
          showPoweredBy: true,
          welcomeMessage: 'Hello! How can I help you today?'
        }
      }

      const { data: agent, error: createError } = await supabase
        .from('agents')
        .insert(insertData)
        .select()
        .single()

      if (createError) {
        throw new Error(createError.message || createError?.details || createError?.hint || 'Failed to create agent')
      }

      if (!agent) {
        throw new Error('No agent returned from insert')
      }

      toast.success('Agent created! Add files to start training.')

      // Redirect directly to the Files tab
      router.push(`/dashboard/agents/${agent.id}/sources/files`)
    } catch (error) {
      console.error('Error details:', JSON.stringify(error, null, 2))
      toast.error(error instanceof Error ? error.message : 'Failed to create agent')
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-100px)] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold mb-2">Create New Agent</h1>
          <p className="text-gray-600 mb-6">
            Name your agent and we'll help you set it up
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Name
              </label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g., Customer Support Bot"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && agentName.trim()) {
                    handleCreateAgent()
                  }
                }}
              />
            </div>

            <button
              onClick={handleCreateAgent}
              disabled={!agentName.trim() || isCreating}
              className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating agent...
                </>
              ) : (
                'Create Agent'
              )}
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              disabled={isCreating}
              className="w-full px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}