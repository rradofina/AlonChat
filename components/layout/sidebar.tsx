'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Bot,
  BarChart3,
  Settings,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useState } from 'react'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [projectSettingsExpanded, setProjectSettingsExpanded] = useState(
    pathname.startsWith('/dashboard/project/settings')
  )

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

  const projectSettingsItems = [
    { name: 'General', href: '/dashboard/project/settings' },
    { name: 'Members', href: '/dashboard/project/settings/members' },
    { name: 'Plans', href: '/dashboard/project/settings/plans' },
    { name: 'Billing', href: '/dashboard/project/settings/billing' },
  ]

  return (
    <div className="w-64 bg-white border-r border-gray-200">
      <div className="flex flex-col h-full">
        {/* Main Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href ||
              (item.href === '/dashboard' && pathname.startsWith('/dashboard/agents'))
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

          {/* Project Settings Section */}
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