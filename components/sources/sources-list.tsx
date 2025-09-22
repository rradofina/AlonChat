'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Globe, FileText, MessageSquare, Clock, CheckCircle, AlertCircle, Loader, Trash2, RefreshCw, Database } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface Source {
  id: string
  agent_id: string
  type: 'website' | 'file' | 'fb_export'
  name: string
  config: any
  status: 'pending' | 'processing' | 'ready' | 'error'
  error_message?: string
  created_at: string
  updated_at: string
}

interface SourcesListProps {
  sources: Source[]
  agentId: string
}

export function SourcesList({ sources, agentId }: SourcesListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reprocessingId, setReprocessingId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const getIcon = (type: string) => {
    switch (type) {
      case 'website':
        return <Globe className="h-5 w-5 text-blue-600" />
      case 'file':
        return <FileText className="h-5 w-5 text-green-600" />
      case 'fb_export':
        return <MessageSquare className="h-5 w-5 text-purple-600" />
      default:
        return <FileText className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'processing':
        return <Loader className="h-5 w-5 text-blue-500 animate-spin" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ready':
        return 'Ready'
      case 'processing':
        return 'Processing...'
      case 'error':
        return 'Error'
      default:
        return 'Pending'
    }
  }

  const handleDelete = async (sourceId: string) => {
    if (!confirm('Are you sure you want to delete this source?')) return

    setDeletingId(sourceId)
    try {
      const { error } = await supabase
        .from('sources')
        .delete()
        .eq('id', sourceId)

      if (error) throw error

      toast.success('Source deleted successfully')
      router.refresh()
    } catch (error) {
      console.error('Error deleting source:', error)
      toast.error('Failed to delete source')
    } finally {
      setDeletingId(null)
    }
  }

  const handleReprocess = async (sourceId: string) => {
    setReprocessingId(sourceId)
    try {
      const { error } = await supabase
        .from('sources')
        .update({
          status: 'pending',
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', sourceId)

      if (error) throw error

      toast.success('Source queued for reprocessing')
      router.refresh()
    } catch (error) {
      console.error('Error reprocessing source:', error)
      toast.error('Failed to reprocess source')
    } finally {
      setReprocessingId(null)
    }
  }

  if (sources.length === 0) {
    return (
      <div className="p-8 text-center">
        <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium mb-2">No sources yet</h3>
        <p className="text-gray-500">Add your first knowledge source to start training your agent</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200">
      {sources.map((source) => (
        <div key={source.id} className="p-6 hover:bg-gray-50">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                {getIcon(source.type)}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{source.name}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="capitalize">{source.type.replace('_', ' ')}</span>
                  {source.config?.url && (
                    <a
                      href={source.config.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {source.config.url}
                    </a>
                  )}
                  {source.config?.file_name && (
                    <span>{source.config.file_name}</span>
                  )}
                  <span>Added {format(new Date(source.created_at), 'MMM d, yyyy')}</span>
                </div>
                {source.error_message && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    {source.error_message}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {getStatusIcon(source.status)}
                <span className="text-sm font-medium">{getStatusText(source.status)}</span>
              </div>

              {source.status === 'error' && (
                <button
                  onClick={() => handleReprocess(source.id)}
                  disabled={reprocessingId === source.id}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Reprocess"
                >
                  <RefreshCw className={`h-4 w-4 ${reprocessingId === source.id ? 'animate-spin' : ''}`} />
                </button>
              )}

              <button
                onClick={() => handleDelete(source.id)}
                disabled={deletingId === source.id}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                title="Delete"
              >
                <Trash2 className={`h-4 w-4 ${deletingId === source.id ? 'animate-pulse' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}