'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, FileText, HelpCircle, User } from 'lucide-react'
import { useState } from 'react'

interface HeaderProps {
  user: any
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname()
  const [dropdownOpen, setDropdownOpen] = useState(false)

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

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
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

            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100"
              >
                <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">
                      {user.email}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/dashboard/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Profile Settings
                    </Link>
                    <Link
                      href="/dashboard/api-keys"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setDropdownOpen(false)}
                    >
                      API Keys
                    </Link>
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