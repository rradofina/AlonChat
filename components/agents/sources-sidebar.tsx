'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, FileText, Link, HelpCircle, Type, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface SourcesSidebarProps {
  agentId: string
  showRetrainingAlert?: boolean
  refreshTrigger?: number
}

export default function SourcesSidebar({ agentId, showRetrainingAlert, refreshTrigger }: SourcesSidebarProps) {
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [isTraining, setIsTraining] = useState(false)
  const [agentData, setAgentData] = useState<{ last_trained_at?: string | null, status?: string }>({})
  const [stats, setStats] = useState({
    files: { count: 0, sizeKb: 0 },
    text: { count: 0, sizeKb: 0 },
    website: { count: 0, sizeKb: 0 },
    qa: { count: 0, sizeKb: 0 },
    total: { count: 0, sizeKb: 0 },
    storageLimitKb: 30 * 1024 // Default 30MB
  })

  useEffect(() => {
    if (agentId) {
      fetchStats()
      fetchAgentData()
    }
  }, [agentId, refreshTrigger])

  useEffect(() => {
    // Set up real-time subscription for agent status updates
    const channel = supabase
      .channel(`agent-training-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agents',
          filter: `id=eq.${agentId}`
        },
        (payload) => {
          setAgentData((prev) => ({
            ...prev,
            status: payload.new.status,
            last_trained_at: payload.new.last_trained_at
          }))
          // If status changes from training to ready/error, update local training state
          if (payload.new.status !== 'training') {
            const wasTraining = isTraining || agentData.status === 'training'
            setIsTraining(false)
            fetchStats() // Refresh stats after training

            // Show notification when training completes successfully
            if (wasTraining && payload.new.status === 'active') {
              toast({
                title: 'Training complete!',
                description: 'Your agent is ready. Go to Playground to test it.',
              })
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [agentId])

  const fetchAgentData = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('last_trained_at, status')
        .eq('id', agentId)
        .single()

      if (!error && data) {
        setAgentData(data)
        // Sync local training state with database status
        setIsTraining(data.status === 'training')
      }
    } catch (error) {
      console.error('Error fetching agent data:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}/sources/stats`)
      if (!response.ok) return

      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching source stats:', error)
    }
  }

  const formatBytes = (kb: number) => {
    const bytes = kb * 1024
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatLinkSize = (count: number) => {
    if (count === 0) return '0 B'
    // Estimate ~10KB per crawled page
    const estimatedKb = count * 10
    return formatBytes(estimatedKb)
  }

  return (
    <div className="w-96 border-l border-gray-200 bg-gray-50 p-6">
      <div className="space-y-6">
        {/* Sources Header */}
        <div className="pb-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Sources</h3>
        </div>

        {/* Source Types with Counts */}
        <div className="space-y-4">
          {/* Files */}
          <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-900">
                {stats.files.count} {stats.files.count === 1 ? 'File' : 'Files'}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {formatBytes(stats.files.sizeKb)}
            </span>
          </div>

          {/* Text */}
          <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <Type className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-900">
                {stats.text.count} Text {stats.text.count === 1 ? 'File' : 'File'}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {formatBytes(stats.text.sizeKb)}
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <Link className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-900">
                {stats.website.count} {stats.website.count === 1 ? 'Link' : 'Links'}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {stats.website.count > 0 ? 'TBD' : '0 B'}
            </span>
          </div>

          {/* Q&A */}
          <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <HelpCircle className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-900">
                {stats.qa.count} Q&A
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {formatBytes(stats.qa.sizeKb)}
            </span>
          </div>
        </div>

        {/* Total Size */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Total size</span>
            <span className="text-sm text-gray-600">
              {formatBytes(stats.total.sizeKb)} / {formatBytes(stats.storageLimitKb)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gray-900 h-2 rounded-full transition-all"
              style={{ width: `${Math.min((stats.total.sizeKb / stats.storageLimitKb) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Train/Retrain Button */}
        <Button
          className="w-full bg-gray-900 hover:bg-gray-800 text-white"
          onClick={async () => {
            if (isTraining) return

            setIsTraining(true)
            try {
              const response = await fetch(`/api/agents/${agentId}/train`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
              })

              if (!response.ok) {
                throw new Error('Failed to train agent')
              }

              const data = await response.json()
              toast({
                title: 'Success',
                description: data.message,
              })

              // Refresh stats and agent data after training
              await fetchStats()
              await fetchAgentData()

              // Trigger parent refresh if needed
              window.location.reload()
            } catch (error) {
              toast({
                title: 'Error',
                description: 'Failed to train agent',
                variant: 'destructive',
              })
            } finally {
              setIsTraining(false)
            }
          }}
          disabled={isTraining || (stats.total.count === 0 && !showRetrainingAlert)}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isTraining ? 'animate-spin' : ''}`} />
          {isTraining
            ? 'Training...'
            : agentData.last_trained_at
              ? 'Retrain agent'
              : 'Train agent'}
        </Button>

        {/* Training Progress Indicator */}
        {(isTraining || agentData.status === 'training') && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                <div className="absolute inset-0 animate-ping">
                  <RefreshCw className="h-5 w-5 text-blue-400 opacity-75" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Training in progress</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Depending on the size of your sources, this may take a while.
                </p>
              </div>
            </div>

            {/* Progress bar animation */}
            <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 rounded-full animate-pulse"
                   style={{
                     backgroundSize: '200% 100%',
                     animation: 'shimmer 2s linear infinite, pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                   }}
              />
            </div>

            <style jsx>{`
              @keyframes shimmer {
                0% { background-position: -200% center; }
                100% { background-position: 200% center; }
              }
            `}</style>
          </div>
        )}

        {/* Retraining Alert */}
        {showRetrainingAlert && !isTraining && agentData.status !== 'training' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-orange-800">
                <p className="font-medium">Retraining is required for changes to apply</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}