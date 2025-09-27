import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AgentCard } from '@/components/agents/agent-card'
import { NewAgentButton } from '@/components/agents/new-agent-button'
import { Bot, Plus } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Get user's project - now guaranteed to be unique due to constraint
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (projectError || !project) {
    // If no project exists, create one instead of redirecting
    const { data: newProject } = await supabase
      .from('projects')
      .insert({
        name: `${user.email?.split('@')[0]}'s Project`,
        owner_id: user.id
      })
      .select()
      .single()

    if (newProject) {
      redirect('/dashboard')
    } else {
      redirect('/onboarding')
    }
  }

  // Get agents - now optimized with indexes
  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('*')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })

  // Handle errors gracefully
  if (agentsError) {
    console.error('Failed to fetch agents:', agentsError)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
        <NewAgentButton projectId={project.id} />
      </div>

      {agents && agents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          {/* Colorful gradient cards illustration */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-yellow-400 to-pink-400 opacity-20 blur-3xl" />
            <div className="relative flex gap-4">
              <div className="w-32 h-40 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-lg transform rotate-[-8deg] shadow-lg">
                <div className="p-4">
                  <Plus className="h-6 w-6 text-white bg-black/20 rounded-full p-1" />
                </div>
              </div>
              <div className="w-32 h-40 bg-gradient-to-br from-yellow-400 to-pink-400 rounded-lg transform rotate-[8deg] shadow-lg">
                <div className="p-4">
                  <Plus className="h-6 w-6 text-white bg-black/20 rounded-full p-1" />
                </div>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            No agents yet
          </h2>
          <p className="text-gray-600 text-center mb-8 max-w-md">
            Create your first AI Agent to start automating support, generating leads, and answering customer questions.
          </p>
          <NewAgentButton projectId={project.id} />
        </div>
      )}
    </div>
  )
}