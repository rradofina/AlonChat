import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SourcesList } from '@/components/sources/sources-list'
import { AddSourceButton } from '@/components/sources/add-source-button'
import { Database, FileText, Globe, MessageSquare } from 'lucide-react'

export default async function SourcesPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id: agentId } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get the agent
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single()

  if (!agent) {
    redirect('/dashboard')
  }

  // Get sources for this agent
  const { data: sources } = await supabase
    .from('sources')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })

  // Get source stats
  const stats = {
    total: sources?.length || 0,
    websites: sources?.filter(s => s.type === 'website').length || 0,
    files: sources?.filter(s => s.type === 'file').length || 0,
    fbExports: sources?.filter(s => s.type === 'fb_export').length || 0,
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Knowledge Base</h1>
            <p className="text-gray-600 mt-1">Manage training data sources for {agent.name}</p>
          </div>
          <AddSourceButton agentId={agentId} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-600">Total Sources</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Globe className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.websites}</p>
                <p className="text-sm text-gray-600">Websites</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.files}</p>
                <p className="text-sm text-gray-600">Files</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <MessageSquare className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.fbExports}</p>
                <p className="text-sm text-gray-600">FB Exports</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sources List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <SourcesList sources={sources || []} agentId={agentId} />
      </div>
    </div>
  )
}