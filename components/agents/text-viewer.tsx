'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Edit2, CheckCircle, AlertCircle, Loader2, MoreHorizontal, Trash2, Edit, Save, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'

interface TextViewerProps {
  text: any
  onBack: () => void
  onDelete?: (id: string) => void
  onUpdate?: () => void
}

export function TextViewer({ text, onBack, onDelete, onUpdate }: TextViewerProps) {
  const { toast } = useToast()
  const [isEditMode, setIsEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState(text.name || '')
  const [editContent, setEditContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [content, setContent] = useState('')
  const [isLoadingContent, setIsLoadingContent] = useState(true)

  // Fetch content from chunks on mount
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(`/api/agents/${text.agent_id}/sources/${text.id}/content`)
        if (response.ok) {
          const data = await response.json()
          setContent(data.content || '')
          setEditContent(data.content || '')
        } else {
          console.error('Failed to fetch content')
          setContent('')
          setEditContent('')
        }
      } catch (error) {
        console.error('Error fetching content:', error)
        setContent('')
        setEditContent('')
      } finally {
        setIsLoadingContent(false)
      }
    }

    fetchContent()
  }, [text.agent_id, text.id])

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  const getStatusIcon = () => {
    switch (text.status) {
      case 'ready':
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'failed':
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusText = () => {
    switch (text.status) {
      case 'ready':
      case 'processed':
        return 'Ready'
      case 'new':
      case 'pending':
        return 'New'
      case 'processing':
        return 'Processing...'
      case 'failed':
        return 'Failed'
      case 'error':
        return 'Error'
      default:
        return 'New'
    }
  }

  const statusBadgeClasses = (() => {
    switch (text.status) {
      case 'ready':
      case 'processed':
        return 'bg-green-50 text-green-700 border border-green-300'
      case 'new':
      case 'pending':
        return 'bg-blue-50 text-blue-700 border border-blue-300'
      case 'processing':
        return 'bg-blue-50 text-blue-700 border border-blue-300'
      case 'failed':
      case 'error':
        return 'bg-red-50 text-red-700 border border-red-300'
      default:
        return 'bg-blue-50 text-blue-700 border border-blue-300'
    }
  })()

  const handleSave = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      toast({
        title: 'Error',
        description: 'Title and content are required',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/agents/${text.agent_id}/sources/text`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: text.id,
          title: editTitle.trim(),
          content: editContent.trim()
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update text')
      }

      toast({
        title: 'Success',
        description: 'Text snippet updated successfully',
      })

      // Update local state
      text.name = editTitle.trim()
      setContent(editContent.trim())
      setIsEditMode(false)

      // Notify parent to refresh if needed
      if (onUpdate) {
        onUpdate()
      }
    } catch (error: any) {
      console.error('Error updating text:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update text snippet',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditTitle(text.name || '')
    setEditContent(content || '')
    setIsEditMode(false)
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(text.id)
    }
  }

  return (
    <div className="flex h-full bg-white">
      <div className="flex-1 flex flex-col">
        {/* Header Bar */}
        <div className="bg-white border-b px-6 py-3">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-3">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors w-fit"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to text sources
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-gray-400" />
                  <span className="text-lg font-semibold text-gray-900 break-all">{text.name}</span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                  <span>{formatBytes(text.size_bytes || 0)}</span>
                  <span>•</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClasses}`}>
                    {getStatusIcon()}
                    {getStatusText()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditMode && (
                <Button
                  onClick={() => setIsEditMode(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-gray-900">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Text actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete text
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
          <div className="w-full">
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              {isEditMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
                      placeholder="Enter title..."
                      disabled={isSaving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 min-h-[400px] resize-y"
                      placeholder="Enter content..."
                      disabled={isSaving}
                    />
                    <div className="text-right text-xs text-gray-500 mt-1">
                      {formatBytes(new TextEncoder().encode(editContent).length)}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving || !editTitle.trim() || !editContent.trim()}
                      className="border-gray-300"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 text-xs uppercase tracking-wide text-gray-400">
                    {text.name}
                  </div>
                  <div>
                    {isLoadingContent ? (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/6" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : (
                      <pre className="leading-7 text-gray-800 whitespace-pre-wrap font-sans text-[0.95rem]">
                        {content || 'No content available'}
                      </pre>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details Sidebar */}
      <div className="w-80 border-l bg-gray-50 flex flex-col px-6 py-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Details</h3>
        </div>
        <div className="space-y-5 text-sm">
          <div>
            <p className="text-gray-500">Created</p>
            <p className="text-gray-900">{text.created_at ? new Date(text.created_at).toLocaleString() : '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Last updated</p>
            <p className="text-gray-900">
              {text.updated_at
                ? new Date(text.updated_at).toLocaleString()
                : text.created_at
                  ? formatDistanceToNow(new Date(text.created_at), { addSuffix: true })
                  : '—'}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Size</p>
            <p className="text-gray-900">{formatBytes(text.size_bytes || 0)}</p>
          </div>
          {text.metadata?.character_count && (
            <div>
              <p className="text-gray-500">Character count</p>
              <p className="text-gray-900">{text.metadata.character_count.toLocaleString()}</p>
            </div>
          )}
          <div>
            <p className="text-gray-500">Type</p>
            <p className="text-gray-900">Text snippet</p>
          </div>
        </div>
      </div>
    </div>
  )
}