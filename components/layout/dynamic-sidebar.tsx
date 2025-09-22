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

  const isAgentPage = pathname.includes('/dashboard/agents/')
  const agentId = params.id as string

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