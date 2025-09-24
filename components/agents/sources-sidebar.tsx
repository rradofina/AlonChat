'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, FileText, Link, HelpCircle, Type, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

interface SourcesSidebarProps {
  agentId: string
  showRetrainingAlert?: boolean
  refreshTrigger?: number
}

export default function SourcesSidebar({ agentId, showRetrainingAlert, refreshTrigger }: SourcesSidebarProps) {
  const { toast } = useToast()
  const [stats, setStats] = useState({
    files: { count: 0, sizeKb: 0 },
    text: { count: 0, sizeKb: 0 },
    website: { count: 0, sizeKb: 0 },
    qa: { count: 0, sizeKb: 0 },
    total: { count: 0, sizeKb: 0 }
  })

  useEffect(() => {
    if (agentId) {
      fetchStats()
    }
  }, [agentId, refreshTrigger])

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
              {formatBytes(stats.total.sizeKb)} / 400 KB
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gray-900 h-2 rounded-full transition-all"
              style={{ width: `${Math.min((stats.total.sizeKb / 400) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Retrain Button */}
        <Button
          className="w-full bg-gray-900 hover:bg-gray-800 text-white"
          onClick={() => {
            toast({
              title: 'Info',
              description: 'Retraining will be implemented with processing pipeline',
            })
          }}
          disabled={!showRetrainingAlert}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retrain agent
        </Button>

        {/* Retraining Alert */}
        {showRetrainingAlert && (
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