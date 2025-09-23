'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Bot,
  BarChart3,
  LogOut,
  Activity,
  Zap,
  Users,
  Settings,
  Rocket,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'

export function DynamicSidebar() {
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [agent, setAgent] = useState<any>(null)
  const [projectSettingsExpanded, setProjectSettingsExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)

  const isAgentPage = pathname.includes('/dashboard/agents/')
  const agentId = params.id as string

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Auto-expand project settings if we're on a project settings page
    if (pathname.startsWith('/dashboard/project/settings')) {
      setProjectSettingsExpanded(true)
    }
  }, [pathname])

  useEffect(() => {
    if (isAgentPage && agentId) {
      // Fetch agent details for the sidebar
      supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single()
        .then(({ data }) => {
          if (data) setAgent(data)
        })
    }
  }, [isAgentPage, agentId])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  // Main dashboard navigation
  const mainNavigation = [
    { name: 'Agents', href: '/dashboard', icon: Bot },
    { name: 'Usage', href: '/dashboard/usage', icon: BarChart3 },
  ]

  // Project settings items
  const projectSettingsItems = [
    { name: 'General', href: '/dashboard/project/settings' },
    { name: 'Members', href: '/dashboard/project/settings/members' },
    { name: 'Plans', href: '/dashboard/project/settings/plans' },
    { name: 'Billing', href: '/dashboard/project/settings/billing' },
  ]

  // Agent detail navigation
  const agentNavigation = agentId ? [
    { name: 'Playground', href: `/dashboard/agents/${agentId}/playground`, icon: Bot },
    { name: 'Activity', href: `/dashboard/agents/${agentId}/activity`, icon: Activity },
    { name: 'Analytics', href: `/dashboard/agents/${agentId}/analytics`, icon: BarChart3 },
    { name: 'Actions', href: `/dashboard/agents/${agentId}/actions`, icon: Zap },
    { name: 'Contacts', href: `/dashboard/agents/${agentId}/contacts`, icon: Users },
    { name: 'Deploy', href: `/dashboard/agents/${agentId}/deploy`, icon: Rocket },
    { name: 'Settings', href: `/dashboard/agents/${agentId}/settings`, icon: Settings },
  ] : []

  const navigation = isAgentPage ? agentNavigation : mainNavigation

  return (
    <div className="w-64 bg-white border-r border-gray-200">
      <div className="flex flex-col h-full">
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href ||
              (item.href === '/dashboard' && pathname === '/dashboard')
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}

          {/* Project Settings Section - Only show on main dashboard */}
          {!isAgentPage && (
            <div className="mt-4">
              <button
                onClick={() => setProjectSettingsExpanded(!projectSettingsExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors"
              >
                <Settings className="h-5 w-5" />
                <span className="flex-1 text-left">Project settings</span>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform",
                    projectSettingsExpanded && "rotate-90"
                  )}
                />
              </button>

              {projectSettingsExpanded && (
                <div className="mt-1 ml-8 space-y-1">
                  {projectSettingsItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          "block px-3 py-2 text-sm rounded-md transition-colors",
                          isActive
                            ? "bg-gray-100 text-gray-900 font-medium"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User Menu */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  )
}