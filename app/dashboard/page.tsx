import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AgentCard } from '@/components/agents/agent-card'
import { NewAgentButton } from '@/components/agents/new-agent-button'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's workspace
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const workspace = workspaces?.[0]

  if (!workspace) {
    redirect('/onboarding')
  }

  // Get agents in the workspace
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
        <NewAgentButton workspaceId={workspace.id} />
      </div>

      {agents && agents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <Bot className="h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            No agents yet
          </h2>
          <p className="text-gray-500 text-center mb-6 max-w-md">
            Create your first AI agent to start building intelligent chatbots for your business.
          </p>
          <NewAgentButton workspaceId={workspace.id} />
        </div>
      )}
    </div>
  )
}

import { Bot } from 'lucide-react'