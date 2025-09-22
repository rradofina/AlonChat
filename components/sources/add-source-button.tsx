'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AddSourceModal } from './add-source-modal'

interface AddSourceButtonProps {
  agentId: string
}

export function AddSourceButton({ agentId }: AddSourceButtonProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900"
      >
        <Plus className="h-4 w-4" />
        Add Source
      </button>

      <AddSourceModal
        agentId={agentId}
        open={showModal}
        onOpenChange={setShowModal}
      />
    </>
  )
}