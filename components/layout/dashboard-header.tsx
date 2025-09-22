'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { Bot, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DashboardHeaderProps {
  projectName?: string
  agentName?: string
}

export function DashboardHeader({ projectName, agentName }: DashboardHeaderProps) {
  const pathname = usePathname()
  const params = useParams()
  const [agent, setAgent] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      // Get project info if not provided
      if (!projectName) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: projects } = await supabase
            .from('projects')
            .select('*')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)

          if (projects && projects.length > 0) {
            setProject(projects[0])
          }
        }
      }

      // Get agent info if we're on an agent page
      if (params.id && !agentName) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('*')
          .eq('id', params.id)
          .single()

        if (agentData) {
          setAgent(agentData)
        }
      }
    }

    fetchData()
  }, [params.id, projectName, agentName])

  const displayProjectName = projectName || project?.name || 'Raymond Adofina\'s Workspace'
  const displayPlan = 'Free' // You can get this from project data later
  const displayAgentName = agentName || agent?.name

  return (
    <div className="h-14 bg-white border-b border-gray-200 px-4 flex items-center">
      <div className="flex items-center gap-2 text-sm">
        {/* Logo - goes to home page */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900 hover:text-gray-700">
          <Bot className="h-5 w-5" />
          <span>AlonChat</span>
        </Link>

        {/* Project Name */}
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <span className="font-medium">{displayProjectName}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
            {displayPlan}
          </span>
        </Link>

        {/* Agent Name (if on agent page) */}
        {displayAgentName && (
          <>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <Link
              href={`/dashboard/agents/${params.id}`}
              className="text-gray-900 font-medium"
            >
              {displayAgentName}
            </Link>
          </>
        )}
      </div>

      {/* Right side - user menu can go here */}
      <div className="ml-auto flex items-center gap-4">
        <Link href="/changelog" className="text-sm text-gray-600 hover:text-gray-900">
          Changelog
        </Link>
        <Link href="/docs" className="text-sm text-gray-600 hover:text-gray-900">
          Docs
        </Link>
        <Link href="/help" className="text-sm text-gray-600 hover:text-gray-900">
          Help
        </Link>
      </div>
    </div>
  )
}