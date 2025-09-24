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
  ChevronDown,
  MessageSquare,
  UserPlus,
  LineChart,
  Hash,
  Heart,
  FileText,
  Type,
  Globe,
  HelpCircle,
  BookOpen,
  Shield,
  Link2,
  Webhook,
  Bell,
  Puzzle,
  Brain,
  Palette,
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
  const [activityExpanded, setActivityExpanded] = useState(false)
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false)
  const [sourcesExpanded, setSourcesExpanded] = useState(false)
  const [settingsExpanded, setSettingsExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [sourceStats, setSourceStats] = useState<any>(null)

  const isAgentPage = pathname.includes('/dashboard/agents/')
  const agentId = params.id as string

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Auto-expand sections based on current path
    if (pathname.startsWith('/dashboard/project/settings')) {
      setProjectSettingsExpanded(true)
    }
    if (pathname.includes('/activity/')) {
      setActivityExpanded(true)
    }
    if (pathname.includes('/analytics/')) {
      setAnalyticsExpanded(true)
    }
    if (pathname.includes('/sources/')) {
      setSourcesExpanded(true)
    }
    if (pathname.includes('/settings')) {
      setSettingsExpanded(true)
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

      // Fetch source statistics if on a sources page
      if (pathname.includes('/sources')) {
        fetch(`/api/agents/${agentId}/sources/stats`)
          .then(res => res.json())
          .then(data => setSourceStats(data))
          .catch(console.error)
      }
    }
  }, [isAgentPage, agentId, pathname])

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

  // Activity subsections
  const activityItems = [
    { name: 'Chat logs', href: `/dashboard/agents/${agentId}/activity/chat-logs`, icon: MessageSquare },
    { name: 'Leads', href: `/dashboard/agents/${agentId}/activity/leads`, icon: UserPlus },
  ]

  // Analytics subsections
  const analyticsItems = [
    { name: 'Chats', href: `/dashboard/agents/${agentId}/analytics/chats`, icon: LineChart },
    { name: 'Topics', href: `/dashboard/agents/${agentId}/analytics/topics`, icon: Hash },
    { name: 'Sentiment', href: `/dashboard/agents/${agentId}/analytics/sentiment`, icon: Heart },
  ]

  // Sources subsections with counts
  const sourcesItems = [
    {
      name: 'Files',
      href: `/dashboard/agents/${agentId}/sources/files`,
      icon: FileText,
      count: sourceStats?.byType?.files?.count || 0
    },
    {
      name: 'Text',
      href: `/dashboard/agents/${agentId}/sources/text`,
      icon: Type,
      count: sourceStats?.byType?.text?.count || 0
    },
    {
      name: 'Website',
      href: `/dashboard/agents/${agentId}/sources/website`,
      icon: Globe,
      count: sourceStats?.byType?.website?.count || 0
    },
    {
      name: 'Q&A',
      href: `/dashboard/agents/${agentId}/sources/qa`,
      icon: HelpCircle,
      count: sourceStats?.byType?.qa?.count || 0
    },
  ]

  // Settings subsections
  const settingsItems = [
    { name: 'General', href: `/dashboard/agents/${agentId}/settings/general` },
    { name: 'AI', href: `/dashboard/agents/${agentId}/settings/ai` },
    { name: 'Security', href: `/dashboard/agents/${agentId}/settings/security` },
    { name: 'Custom domains', href: `/dashboard/agents/${agentId}/settings/custom-domains` },
    { name: 'Webhooks', href: `/dashboard/agents/${agentId}/settings/webhooks` },
    { name: 'Notifications', href: `/dashboard/agents/${agentId}/settings/notifications` },
    { name: 'Integrations', href: `/dashboard/agents/${agentId}/settings/integrations` },
  ]

  // Agent detail navigation
  const agentNavigation = agentId ? [
    { name: 'Playground', href: `/dashboard/agents/${agentId}/playground`, icon: Bot },
    { name: 'Activity', href: `/dashboard/agents/${agentId}/activity`, icon: Activity, hasSubitems: true },
    { name: 'Analytics', href: `/dashboard/agents/${agentId}/analytics`, icon: BarChart3, hasSubitems: true },
    {
      name: 'Sources',
      href: `/dashboard/agents/${agentId}/sources`,
      icon: FileText,
      hasSubitems: true,
      badge: sourceStats?.totalSources || 0
    },
    { name: 'Actions', href: `/dashboard/agents/${agentId}/actions`, icon: Zap },
    { name: 'Contacts', href: `/dashboard/agents/${agentId}/contacts`, icon: Users },
    { name: 'Deploy', href: `/dashboard/agents/${agentId}/deploy`, icon: Rocket },
    { name: 'Settings', href: `/dashboard/agents/${agentId}/settings`, icon: Settings, hasSubitems: true },
  ] : []

  const navigation = isAgentPage ? agentNavigation : mainNavigation

  return (
    <div className="w-64 bg-white border-r border-gray-200">
      <div className="flex flex-col h-full">
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href)
            const isExpanded =
              item.name === 'Activity' ? activityExpanded :
              item.name === 'Analytics' ? analyticsExpanded :
              item.name === 'Sources' ? sourcesExpanded :
              item.name === 'Settings' ? settingsExpanded : false

            return (
              <div key={item.name}>
                {item.hasSubitems ? (
                  <>
                    <button
                      onClick={() => {
                        if (item.name === 'Activity') setActivityExpanded(!activityExpanded)
                        else if (item.name === 'Analytics') setAnalyticsExpanded(!analyticsExpanded)
                        else if (item.name === 'Sources') setSourcesExpanded(!sourcesExpanded)
                        else if (item.name === 'Settings') setSettingsExpanded(!settingsExpanded)
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        isActive
                          ? "bg-gray-100 text-gray-900"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="flex-1 text-left">{item.name}</span>
                      {'badge' in item && item.badge > 0 && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full mr-1">
                          {item.badge}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="mt-1 ml-8 space-y-1">
                        {item.name === 'Activity' && activityItems.map((subitem) => {
                          const SubIcon = subitem.icon
                          const isSubActive = pathname === subitem.href
                          return (
                            <Link
                              key={subitem.name}
                              href={subitem.href}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                                isSubActive
                                  ? "bg-gray-100 text-gray-900 font-medium"
                                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                              )}
                            >
                              <SubIcon className="h-4 w-4" />
                              <span>{subitem.name}</span>
                            </Link>
                          )
                        })}
                        {item.name === 'Analytics' && analyticsItems.map((subitem) => {
                          const SubIcon = subitem.icon
                          const isSubActive = pathname === subitem.href
                          return (
                            <Link
                              key={subitem.name}
                              href={subitem.href}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                                isSubActive
                                  ? "bg-gray-100 text-gray-900 font-medium"
                                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                              )}
                            >
                              <SubIcon className="h-4 w-4" />
                              <span>{subitem.name}</span>
                            </Link>
                          )
                        })}
                        {item.name === 'Sources' && sourcesItems.map((subitem) => {
                          const SubIcon = subitem.icon
                          const isSubActive = pathname === subitem.href
                          return (
                            <Link
                              key={subitem.name}
                              href={subitem.href}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                                isSubActive
                                  ? "bg-gray-100 text-gray-900 font-medium"
                                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                              )}
                            >
                              <SubIcon className="h-4 w-4" />
                              <span className="flex-1">{subitem.name}</span>
                              {subitem.count > 0 && (
                                <span className="text-xs text-gray-500">{subitem.count}</span>
                              )}
                            </Link>
                          )
                        })}
                        {item.name === 'Settings' && settingsItems.map((subitem) => {
                          const isSubActive = pathname === subitem.href
                          return (
                            <Link
                              key={subitem.name}
                              href={subitem.href}
                              className={cn(
                                "block px-3 py-2 text-sm rounded-md transition-colors",
                                isSubActive
                                  ? "bg-gray-100 text-gray-900 font-medium"
                                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                              )}
                            >
                              {subitem.name}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
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
                )}
              </div>
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