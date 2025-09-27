'use client'

import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import { Bot, ChevronRight, User, Settings, LogOut, Shield, Database, LayoutDashboard, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isAdminEmailClient } from '@/lib/utils/admin-access'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DashboardHeaderProps {
  projectName?: string
  agentName?: string
}

export function DashboardHeader({ projectName, agentName }: DashboardHeaderProps) {
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const [agent, setAgent] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      // Get user info
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        setUser(currentUser)

        // Get profile info
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single()

        if (profileData) {
          setProfile(profileData)
        }

        // Get project info if not provided
        if (!projectName) {
          const { data: projects } = await supabase
            .from('projects')
            .select('*')
            .eq('owner_id', currentUser.id)
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

  const displayProjectName = projectName || project?.name || 'My Project'
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

      {/* Right side - user menu */}
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

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="h-8 w-8 rounded-full" />
              ) : (
                <User className="h-4 w-4 text-gray-600" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{profile?.full_name || 'User'}</span>
                <span className="text-xs text-gray-500">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => router.push('/dashboard')}>
              <User className="mr-2 h-4 w-4" />
              Dashboard
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Account settings
            </DropdownMenuItem>

            {/* Admin Section - Only show if user is admin */}
            {isAdminEmailClient(user?.email) && (
              <>
                <DropdownMenuSeparator />

                <div className="px-2 py-1.5">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Admin</span>
                </div>

                <DropdownMenuItem onClick={() => router.push('/admin/dashboard')}>
                  <LayoutDashboard className="mr-2 h-4 w-4 text-red-600" />
                  <span className="text-red-600">Admin Dashboard</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => router.push('/admin/prompts')}>
                  <FileText className="mr-2 h-4 w-4 text-red-600" />
                  <span className="text-red-600">System Prompts</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => router.push('/admin/models')}>
                  <Database className="mr-2 h-4 w-4 text-red-600" />
                  <span className="text-red-600">Manage Models</span>
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
              className="text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}