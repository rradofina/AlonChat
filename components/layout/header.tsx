'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronRight, ChevronDown, Check, FileText, HelpCircle, User, LogOut, Settings, Plus, Search, Building2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Project {
  id: string
  name: string
  url_slug: string
  plan_tier: string
}

interface HeaderProps {
  user: any
  projects?: Project[]
  currentProject?: Project | null
}

export function Header({ user, projects = [], currentProject }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const projectDropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setProjectDropdownOpen(false)
        setSearchQuery('') // Clear search when closing
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  const handleProjectSwitch = (projectId: string) => {
    // Store selected project in localStorage or state management
    localStorage.setItem('selectedProjectId', projectId)
    setProjectDropdownOpen(false)
    setSearchQuery('')
    // Refresh the page to load the new project
    router.refresh()
  }

  const handleCreateProject = () => {
    setProjectDropdownOpen(false)
    router.push('/dashboard/projects/new')
  }

  // Filter projects based on search
  const filteredProjects = projects.filter(proj =>
    proj.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean)
    const breadcrumbs = []
    let currentPath = ''

    paths.forEach((path, index) => {
      currentPath += `/${path}`
      const name = path.charAt(0).toUpperCase() + path.slice(1).replace('-', ' ')
      breadcrumbs.push({
        name,
        href: currentPath,
        current: index === paths.length - 1,
      })
    })

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  const getPlanBadge = (tier: string) => {
    switch (tier) {
      case 'free':
        return 'Free'
      case 'hobby':
        return 'Hobby'
      case 'standard':
        return 'Standard'
      case 'pro':
        return 'Pro'
      case 'enterprise':
        return 'Enterprise'
      default:
        return 'Free'
    }
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side with project selector and breadcrumbs */}
          <div className="flex items-center gap-4">
            {/* Project Selector */}
            <div className="relative" ref={projectDropdownRef}>
              <button
                onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 border border-gray-200"
              >
                <Building2 className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">
                  {currentProject?.name || 'Select Project'}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                  {getPlanBadge(currentProject?.plan_tier || 'free')}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {projectDropdownOpen && (
                <div className="absolute left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                  {/* Search Bar */}
                  <div className="p-3 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search project..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Project List */}
                  <div className="max-h-64 overflow-y-auto">
                    {filteredProjects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleProjectSwitch(project.id)}
                        className={`w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 ${
                          currentProject?.id === project.id ? 'bg-gray-50' : ''
                        }`}
                      >
                        <span className="text-sm font-medium text-gray-900">
                          {project.name}
                        </span>
                        {currentProject?.id === project.id && (
                          <Check className="h-4 w-4 text-black" />
                        )}
                      </button>
                    ))}

                    {filteredProjects.length === 0 && (
                      <div className="px-3 py-4 text-center text-sm text-gray-500">
                        No projects found
                      </div>
                    )}
                  </div>

                  {/* Create Project */}
                  <div className="border-t border-gray-100 p-3">
                    <button
                      onClick={handleCreateProject}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                    >
                      <Plus className="h-4 w-4" />
                      Create or join project
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Breadcrumbs */}
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                {breadcrumbs.map((item, index) => (
                  <li key={item.name} className="flex items-center">
                    {index > 0 && (
                      <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />
                    )}
                    {item.current ? (
                      <span className="text-sm font-medium text-gray-900">
                        {item.name}
                      </span>
                    ) : (
                      <Link
                        href={item.href}
                        className="text-sm font-medium text-gray-500 hover:text-gray-700"
                      >
                        {item.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>

          {/* Right side menu */}
          <div className="flex items-center space-x-4">
            <Link
              href="/changelog"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Changelog
            </Link>

            <Link
              href="/docs"
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <FileText className="h-4 w-4" />
              Docs
            </Link>

            <Link
              href="/help"
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <HelpCircle className="h-4 w-4" />
              Help
            </Link>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100"
              >
                <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs text-gray-500">Signed in as</p>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.email}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/dashboard"
                      className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Account settings
                    </Link>
                  </div>
                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}