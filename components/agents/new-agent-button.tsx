'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'

interface NewAgentButtonProps {
  workspaceId: string
}

export function NewAgentButton({ workspaceId }: NewAgentButtonProps) {
  return (
    <Link
      href="/dashboard/agents/new"
      className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-900 transition-colors"
    >
      <Plus className="h-5 w-5" />
      New AI agent
    </Link>
  )
}