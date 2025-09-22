'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AgentWizard } from './agent-wizard'

interface NewAgentButtonProps {
  workspaceId: string
}

export function NewAgentButton({ workspaceId }: NewAgentButtonProps) {
  const [showWizard, setShowWizard] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowWizard(true)}
        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-900 transition-colors"
      >
        <Plus className="h-5 w-5" />
        New AI agent
      </button>
      <AgentWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        workspaceId={workspaceId}
      />
    </>
  )
}