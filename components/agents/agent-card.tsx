'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MoreVertical, Bot, Calendar, Sparkles, Cpu, Zap, Brain } from 'lucide-react'
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

const agentIcons = [Bot, Brain, Cpu, Zap, Sparkles]
const gradients = [
  'from-violet-600 via-purple-600 to-indigo-600',
  'from-cyan-500 via-blue-600 to-indigo-700',
  'from-rose-500 via-pink-600 to-purple-700',
  'from-amber-500 via-orange-600 to-red-600',
  'from-emerald-500 via-teal-600 to-cyan-700',
]

export function AgentCard({ agent }: AgentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Generate consistent icon and gradient based on agent ID
  const iconIndex = agent.id.charCodeAt(0) % agentIcons.length
  const gradientIndex = agent.id.charCodeAt(1) % gradients.length
  const Icon = agentIcons[iconIndex]
  const gradient = gradients[gradientIndex]

  const getStatusBadge = () => {
    switch (agent.status) {
      case 'ready':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Active</span>
          </div>
        )
      case 'training':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-spin absolute inline-flex h-full w-full rounded-full border-2 border-amber-500 border-t-transparent"></span>
            </span>
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Training</span>
          </div>
        )
      case 'error':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs font-medium text-red-700 dark:text-red-400">Error</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 dark:bg-gray-500/10 border border-gray-200 dark:border-gray-500/20">
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Draft</span>
          </div>
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
      <div className="relative group cursor-pointer h-full">
        {/* Simple subtle border gradient */}
        <div className="absolute -inset-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-75 rounded-xl transition duration-300"
             style={{
               background: `linear-gradient(135deg, ${gradient.replace('from-', '').replace('via-', '').replace('to-', '').replace(/\s+/g, ', ')})`,
             }}
        />

        {/* Clean card with subtle hover */}
        <div className="relative bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 h-full">
          <div className="flex justify-between items-start mb-4">
            {/* Clean icon with subtle gradient */}
            <div className={cn(
              "relative p-3 rounded-lg bg-gradient-to-br transition-transform duration-300",
              gradient,
              "group-hover:scale-105"
            )}>
              <Icon className="h-6 w-6 text-white" />
              {agent.status === 'ready' && (
                <div className="absolute -top-1 -right-1 w-3 h-3">
                  <span className="flex h-3 w-3">
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
                  </span>
                </div>
              )}
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

          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-lg">
            {agent.name}
          </h3>

          {agent.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
              {agent.description}
            </p>
          )}

          {/* Clean stats section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1.5 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                <span>{getLastTrainedText()}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              {getStatusBadge()}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}