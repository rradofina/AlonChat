'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FileText, Globe, MessageSquare, HelpCircle, ChevronRight, X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { FileSourceInput } from '@/components/sources/file-source-input'
import { TextSourceInput } from '@/components/sources/text-source-input'
import { WebsiteSourceInput } from '@/components/sources/website-source-input'
import { QASourceInput } from '@/components/sources/qa-source-input'

type SourceType = 'files' | 'text' | 'website' | 'qa'

interface Source {
  id: string
  type: SourceType
  name: string
  size: number
  data: any
}

export default function NewAgentPage() {
  const [activeTab, setActiveTab] = useState<SourceType>('files')
  const [sources, setSources] = useState<Source[]>([])
  const [agentName, setAgentName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const tabs = [
    { id: 'files' as SourceType, label: 'Files', icon: FileText },
    { id: 'text' as SourceType, label: 'Text', icon: MessageSquare },
    { id: 'website' as SourceType, label: 'Website', icon: Globe },
    { id: 'qa' as SourceType, label: 'Q&A', icon: HelpCircle },
  ]

  const totalSize = sources.reduce((acc, source) => acc + source.size, 0)
  const maxSize = 400 * 1024 // 400 KB
  const sizePercentage = (totalSize / maxSize) * 100

  const handleAddSource = (type: SourceType, data: any, name: string, size: number) => {
    const newSource: Source = {
      id: Date.now().toString(),
      type,
      name,
      size,
      data
    }
    setSources([...sources, newSource])
    toast.success(`Added ${name}`)
  }

  const handleRemoveSource = (id: string) => {
    setSources(sources.filter(s => s.id !== id))
  }

  const handleCreateAgent = async () => {
    if (!agentName.trim()) {
      toast.error('Please enter an agent name')
      return
    }

    if (sources.length === 0) {
      toast.error('Please add at least one source')
      return
    }

    setIsCreating(true)

    try {
      // Prepare sources data for API
      const sourcesData = sources.map(source => ({
        type: source.type === 'files' ? 'file' : source.type,
        name: source.name,
        content: source.data.content || source.data.text || '',
        url: source.data.url,
        size: source.size,
        qaItems: source.data.qaItems,
        fileName: source.data.fileName,
        fileType: source.data.fileType,
        fileData: source.data.fileData
      }))

      // Call the API route
      const response = await fetch('/api/agents/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: agentName,
          description: `AI Agent trained with ${sources.length} sources`,
          sources: sourcesData
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create agent')
      }

      toast.success('Agent created successfully!')
      router.push(`/dashboard/agents/${result.agent.id}`)
    } catch (error) {
      console.error('Error creating agent:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create agent')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-100px)]">
      {/* Left Sidebar - Source Type Tabs */}
      <div className="w-48 bg-gray-50 border-r border-gray-200">
        <div className="p-4">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 mb-1 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        <div className="flex-1 p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">
              {activeTab === 'files' && 'Files'}
              {activeTab === 'text' && 'Text'}
              {activeTab === 'website' && 'Website'}
              {activeTab === 'qa' && 'Q&A'}
            </h1>
            <p className="text-gray-600">
              {activeTab === 'files' && 'Upload documents to train your AI. Extract text from PDFs, DOCX, and TXT files.'}
              {activeTab === 'text' && 'Add plain text-based sources to train your AI Agent with precise information.'}
              {activeTab === 'website' && 'Crawl web pages or submit sitemaps to update your AI with the latest content.'}
              {activeTab === 'qa' && 'Craft responses for key questions, ensuring your AI shares relevant info.'}
            </p>
          </div>

          {/* Source Input Components */}
          <div className="bg-white border border-gray-200 rounded-lg">
            {activeTab === 'files' && (
              <FileSourceInput onAddSource={(data, name, size) => handleAddSource('files', data, name, size)} />
            )}
            {activeTab === 'text' && (
              <TextSourceInput onAddSource={(data, name, size) => handleAddSource('text', data, name, size)} />
            )}
            {activeTab === 'website' && (
              <WebsiteSourceInput onAddSource={(data, name, size) => handleAddSource('website', data, name, size)} />
            )}
            {activeTab === 'qa' && (
              <QASourceInput onAddSource={(data, name, size) => handleAddSource('qa', data, name, size)} />
            )}
          </div>

          {/* Sources List (if on current tab) */}
          {sources.filter(s => s.type === activeTab).length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium mb-3">
                {activeTab === 'files' && 'File sources'}
                {activeTab === 'text' && 'Text sources'}
                {activeTab === 'website' && 'Website sources'}
                {activeTab === 'qa' && 'Q&A sources'}
              </h3>
              <div className="space-y-2">
                {sources
                  .filter(s => s.type === activeTab)
                  .map((source) => (
                    <div key={source.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{source.name}</span>
                        <span className="text-sm text-gray-500">
                          {(source.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveSource(source.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Sources Summary */}
        <div className="w-80 bg-gray-50 border-l border-gray-200 p-6">
          <h2 className="font-semibold mb-4">Sources</h2>

          {/* Agent Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agent Name
            </label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Enter agent name..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Source Summary */}
          <div className="space-y-3 mb-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const count = sources.filter(s => s.type === tab.id).length
              const size = sources
                .filter(s => s.type === tab.id)
                .reduce((acc, s) => acc + s.size, 0)

              if (count === 0) return null

              return (
                <div key={tab.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{count} {tab.label}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {(size / 1024).toFixed(1)} KB
                  </span>
                </div>
              )
            })}
          </div>

          {/* Total Size */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Total size</span>
              <span className="text-sm">
                {(totalSize / 1024).toFixed(0)} KB / {maxSize / 1024} KB
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(sizePercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Create Agent Button */}
          <button
            onClick={handleCreateAgent}
            disabled={sources.length === 0 || !agentName.trim() || isCreating}
            className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>Creating agent...</>
            ) : (
              <>
                Create agent
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>

          {sources.length === 0 && (
            <p className="text-xs text-gray-500 text-center mt-4">
              Add at least one source to create an agent
            </p>
          )}
        </div>
      </div>
    </div>
  )
}