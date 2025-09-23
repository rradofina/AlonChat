'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Settings, Users, CreditCard, Package } from 'lucide-react'

export default function ProjectSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const navigation = [
    { name: 'General', href: '/dashboard/project/settings', icon: Settings },
    { name: 'Members', href: '/dashboard/project/settings/members', icon: Users },
    { name: 'Plans', href: '/dashboard/project/settings/plans', icon: Package },
    { name: 'Billing', href: '/dashboard/project/settings/billing', icon: CreditCard },
  ]

  return (
    <div className="p-8">
      {children}
    </div>
  )
}