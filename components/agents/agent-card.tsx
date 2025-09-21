'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MoreVertical, Bot, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface Agent {
  id: string
  name: string
  description?: string | null
  status: 'draft' | 'training' | 'ready' | 'error'
  last_trained_at?: string | null
  created_at: string
}

interface AgentCardProps {
  agent: Agent
}

export function AgentCard({ agent }: AgentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const getStatusBadge = () => {
    switch (agent.status) {
      case 'ready':
        return (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-700">Trained</span>
          </span>
        )
      case 'training':
        return (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-xs text-yellow-700">Training</span>
          </span>
        )
      case 'error':
        return (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs text-red-700">Error</span>
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            <span className="text-xs text-gray-600">Draft</span>
          </span>
        )
    }
  }

  const getLastTrainedText = () => {
    if (!agent.last_trained_at) {
      return 'Not trained yet'
    }
    const days = Math.floor((Date.now() - new Date(agent.last_trained_at).getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Trained today'
    if (days === 1) return 'Trained yesterday'
    return `Last trained ${days} days ago`
  }

  return (
    <Link href={`/dashboard/agents/${agent.id}`}>
      <div className="relative group cursor-pointer">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg opacity-75 group-hover:opacity-100 transition-opacity" />
        <div className="relative bg-white m-0.5 rounded-lg p-6 hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <Bot className="h-6 w-6 text-gray-600" />
            </div>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  setMenuOpen(!menuOpen)
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <MoreVertical className="h-5 w-5 text-gray-500" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      // Handle edit
                      setMenuOpen(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      // Handle duplicate
                      setMenuOpen(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      // Handle delete
                      setMenuOpen(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          <h3 className="font-semibold text-gray-900 mb-1">
            {agent.name}
          </h3>

          {agent.description && (
            <p className="text-sm text-gray-500 mb-4 line-clamp-2">
              {agent.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-gray-500">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">
                {getLastTrainedText()}
              </span>
            </div>
            {getStatusBadge()}
          </div>
        </div>
      </div>
    </Link>
  )
}