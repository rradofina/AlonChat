'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  Bot,
  BarChart3,
  Settings,
  CreditCard,
  Users,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Workspace {
  id: string
  name: string
  url_slug: string
  plan_tier: string
}

interface SidebarProps {
  workspaces: Workspace[]
  user: any
}

export function Sidebar({ workspaces, user }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [workspaceDropdown, setWorkspaceDropdown] = useState(false)
  const [selectedWorkspace, setSelectedWorkspace] = useState(workspaces[0] || null)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  const navigation = [
    { name: 'Agents', href: '/dashboard', icon: Bot },
    { name: 'Usage', href: '/dashboard/usage', icon: BarChart3 },
  ]

  const settingsNav = [
    { name: 'General', href: '/dashboard/settings', icon: Settings },
    { name: 'Members', href: '/dashboard/settings/members', icon: Users },
    { name: 'Plans', href: '/dashboard/settings/plans', icon: CreditCard },
  ]

  const getPlanBadgeColor = (tier: string) => {
    switch (tier) {
      case 'free':
        return 'bg-gray-500'
      case 'starter':
        return 'bg-blue-500'
      case 'pro':
        return 'bg-purple-500'
      case 'enterprise':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className={cn(
      "bg-white border-r border-gray-200 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex flex-col h-full">
        {/* Logo and Workspace Selector */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className={cn("flex items-center gap-2", collapsed && "hidden")}>
              <Bot className="h-8 w-8" />
              <span className="font-bold text-xl">AlonChat</span>
            </div>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
            </button>
          </div>

          {!collapsed && (
            <div className="mt-4">
              <button
                onClick={() => setWorkspaceDropdown(!workspaceDropdown)}
                className="w-full flex items-center justify-between p-2 hover:bg-gray-100 rounded"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {selectedWorkspace?.name || 'No workspace'}
                  </span>
                  {selectedWorkspace && (
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded text-white",
                      getPlanBadgeColor(selectedWorkspace.plan_tier)
                    )}>
                      {selectedWorkspace.plan_tier}
                    </span>
                  )}
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  workspaceDropdown && "transform rotate-180"
                )} />
              </button>

              {workspaceDropdown && (
                <div className="absolute z-10 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg">
                  {workspaces.map((workspace) => (
                    <button
                      key={workspace.id}
                      onClick={() => {
                        setSelectedWorkspace(workspace)
                        setWorkspaceDropdown(false)
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{workspace.name}</span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded text-white",
                          getPlanBadgeColor(workspace.plan_tier)
                        )}>
                          {workspace.plan_tier}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  collapsed && "justify-center"
                )}
              >
                <Icon className="h-5 w-5" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )
          })}

          {!collapsed && (
            <>
              <div className="pt-4">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Workspace Settings
                </h3>
              </div>
              {settingsNav.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
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
            </>
          )}
        </nav>

        {/* User Menu */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    </div>
  )
}