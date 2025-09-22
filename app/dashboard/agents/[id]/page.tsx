import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bot, MessageSquare, Database, BarChart3, Settings, Rocket, ChevronRight } from 'lucide-react'

export default async function AgentDetailPage({
  params
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get the agent details
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!agent) {
    redirect('/dashboard')
  }

  // Get agent stats
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .eq('agent_id', params.id)

  const { data: sources } = await supabase
    .from('sources')
    .select('id')
    .eq('agent_id', params.id)

  const stats = {
    conversations: conversations?.length || 0,
    sources: sources?.length || 0,
    status: agent.status || 'draft'
  }

  const quickLinks = [
    {
      title: 'Playground',
      description: 'Test your agent in real-time',
      icon: MessageSquare,
      href: `/dashboard/agents/${params.id}/playground`,
      color: 'bg-blue-500'
    },
    {
      title: 'Knowledge Base',
      description: 'Manage training data sources',
      icon: Database,
      href: `/dashboard/agents/${params.id}/sources`,
      color: 'bg-green-500'
    },
    {
      title: 'Analytics',
      description: 'View usage and performance',
      icon: BarChart3,
      href: `/dashboard/agents/${params.id}/analytics`,
      color: 'bg-purple-500'
    },
    {
      title: 'Settings',
      description: 'Configure agent behavior',
      icon: Settings,
      href: `/dashboard/agents/${params.id}/settings`,
      color: 'bg-gray-600'
    }
  ]

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{agent.name}</h1>
              <p className="text-gray-600">{agent.description || 'No description'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              agent.status === 'ready'
                ? 'bg-green-100 text-green-800'
                : agent.status === 'training'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {agent.status}
            </span>
            <Link
              href={`/dashboard/agents/${params.id}/deploy`}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900"
            >
              <Rocket className="h-4 w-4" />
              Deploy
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Conversations</div>
            <div className="text-2xl font-bold">{stats.conversations}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Knowledge Sources</div>
            <div className="text-2xl font-bold">{stats.sources}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Model</div>
            <div className="text-lg font-semibold">{agent.model || 'gpt-3.5-turbo'}</div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className={`w-10 h-10 ${link.color} rounded-lg flex items-center justify-center mb-3`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-semibold mb-1">{link.title}</h3>
                    <p className="text-sm text-gray-600">{link.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-gray-500 text-center">No recent activity</p>
        </div>
      </div>
    </div>
  )
}