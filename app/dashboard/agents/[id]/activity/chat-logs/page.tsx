'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  RefreshCw,
  Download,
  Filter,
  MessageSquare,
  Globe,
  Send,
  Edit3,
  FileJson,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  X,
  Instagram,
  Hash
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import jsPDF from 'jspdf'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  confidence_score?: number
  metadata?: any
  revised_at?: string
  original_content?: string
  source_chunks?: any[]
}

interface Conversation {
  id: string
  session_id: string
  source: string
  started_at: string
  ended_at?: string
  metadata?: any
  messages: Message[]
}

export default function ChatLogsPage() {
  const params = useParams()
  const agentId = params.id as string
  const supabase = createClient()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [showReviseModal, setShowReviseModal] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<{
    message: Message
    userMessage: string
    conversationId: string
  } | null>(null)
  const [revisedAnswer, setRevisedAnswer] = useState('')
  const [isRevising, setIsRevising] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [confidenceFilter, setConfidenceFilter] = useState('Show All')

  // Source options with icons
  const sources = [
    { value: 'all', label: 'Show All', icon: Filter },
    { value: 'playground', label: 'Playground', icon: MessageSquare },
    { value: 'website', label: 'Widget or Iframe', icon: Globe },
    { value: 'messenger', label: 'Messenger', icon: Send },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { value: 'instagram', label: 'Instagram', icon: Instagram },
    { value: 'api', label: 'API', icon: Hash },
  ]

  const confidenceOptions = [
    '< 0.1', '< 0.2', '< 0.3', '< 0.4', '< 0.5',
    '< 0.6', '< 0.7', '< 0.8', '< 0.9', 'Show All'
  ]

  useEffect(() => {
    fetchChatLogs()
  }, [agentId, selectedSource])

  const fetchChatLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedSource !== 'all') {
        params.append('source', selectedSource)
      }

      const response = await fetch(`/api/agents/${agentId}/chat-logs?${params}`)
      const data = await response.json()

      if (response.ok) {
        setConversations(data.conversations || [])
        if (data.conversations?.length > 0 && !selectedConversation) {
          setSelectedConversation(data.conversations[0])
        }
      }
    } catch (error) {
      console.error('Error fetching chat logs:', error)
      toast.error('Failed to load chat logs')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    try {
      if (format === 'pdf') {
        const pdf = new jsPDF()
        let yPosition = 20

        pdf.setFontSize(16)
        pdf.text('Chat Logs Export', 20, yPosition)
        yPosition += 10

        conversations.forEach(conv => {
          if (yPosition > 250) {
            pdf.addPage()
            yPosition = 20
          }

          pdf.setFontSize(12)
          pdf.text(`Session: ${conv.session_id}`, 20, yPosition)
          yPosition += 6
          pdf.setFontSize(10)
          pdf.text(`Source: ${conv.source} | Started: ${new Date(conv.started_at).toLocaleString()}`, 20, yPosition)
          yPosition += 10

          conv.messages?.forEach(msg => {
            if (yPosition > 250) {
              pdf.addPage()
              yPosition = 20
            }

            pdf.setFontSize(10)
            const roleLabel = msg.role === 'user' ? 'User: ' : 'Bot: '
            const lines = pdf.splitTextToSize(roleLabel + msg.content, 170)
            lines.forEach((line: string) => {
              if (yPosition > 280) {
                pdf.addPage()
                yPosition = 20
              }
              pdf.text(line, 20, yPosition)
              yPosition += 5
            })
            yPosition += 5
          })

          yPosition += 10
        })

        pdf.save(`chat-logs-${new Date().toISOString().split('T')[0]}.pdf`)
      } else {
        const response = await fetch(`/api/agents/${agentId}/chat-logs/export?format=${format}`)
        const blob = await response.blob()

        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `chat-logs-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }

      toast.success(`Exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Error exporting:', error)
      toast.error('Failed to export chat logs')
    }
  }

  const handleReviseAnswer = (message: Message, conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId)
    const messageIndex = conv?.messages.findIndex(m => m.id === message.id) || -1
    const userMessage = messageIndex > 0 ? conv?.messages[messageIndex - 1]?.content : ''

    setSelectedMessage({
      message,
      userMessage: userMessage || '',
      conversationId
    })
    setRevisedAnswer(message.content)
    setShowReviseModal(true)
  }

  const submitRevisedAnswer = async () => {
    if (!selectedMessage) return

    try {
      setIsRevising(true)
      const response = await fetch(`/api/agents/${agentId}/chat-logs/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: selectedMessage.message.id,
          originalQuestion: selectedMessage.userMessage,
          originalAnswer: selectedMessage.message.content,
          revisedAnswer,
          confidenceScore: 0.95
        })
      })

      if (response.ok) {
        toast.success('Answer revised and added to training set')
        setShowReviseModal(false)
        fetchChatLogs()
      } else {
        throw new Error('Failed to revise answer')
      }
    } catch (error) {
      console.error('Error revising answer:', error)
      toast.error('Failed to revise answer')
    } finally {
      setIsRevising(false)
    }
  }

  const getTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / 60000)
    const diffInHours = Math.floor(diffInMs / 3600000)
    const diffInDays = Math.floor(diffInMs / 86400000)

    if (diffInMinutes < 1) return 'just now'
    if (diffInMinutes < 60) return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`
    if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`
  }

  const getSourceIcon = (source: string) => {
    const sourceConfig = sources.find(s => s.value === source)
    return sourceConfig?.icon || MessageSquare
  }

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* Chat List Panel */}
      <div className="w-[500px] border-r border-gray-200 bg-white flex flex-col">
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Chat logs</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Filter"
              >
                <Filter className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={fetchChatLogs}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4 text-gray-600" />
              </button>
              <div className="relative group">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Download className="h-4 w-4 text-gray-600" />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 hidden group-hover:block z-10">
                  <button
                    onClick={() => handleExport('json')}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <FileJson className="h-4 w-4" />
                    Export as JSON
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <FileText className="h-4 w-4" />
                    Export as PDF
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Export as CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-3 border border-gray-200 rounded-lg animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-sm font-medium text-gray-900 mb-2">No chat logs yet</h3>
              <p className="text-xs text-gray-500">
                Start a conversation in the Playground to see chat logs here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map(conversation => {
                const firstMessage = conversation.messages?.find(m => m.role === 'user')
                const SourceIcon = getSourceIcon(conversation.source)

                return (
                  <div
                    key={conversation.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedConversation?.id === conversation.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="flex items-start gap-2">
                      <SourceIcon className="h-4 w-4 text-gray-400 mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 truncate">
                          {firstMessage?.content || 'Empty conversation'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <span>{conversation.source}</span>
                          <span>•</span>
                          <span>{getTimeAgo(conversation.started_at)}</span>
                          <span>•</span>
                          <span>{conversation.messages?.length || 0} messages</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Details Panel */}
      <div className="flex-1 bg-gray-50 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="border-b border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold capitalize">{selectedConversation.source}</h2>
                  <p className="text-sm text-gray-500">
                    Started {getTimeAgo(selectedConversation.started_at)}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 mt-4">
                <button className="pb-2 border-b-2 border-gray-900 font-medium">Chat</button>
                <button className="pb-2 text-gray-500">Details</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {selectedConversation.messages?.map((message, idx) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] ${
                        message.role === 'user'
                          ? 'bg-gray-100 text-gray-900'
                          : 'bg-white shadow-sm'
                      } rounded-lg p-4`}
                    >
                      <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-3">
                          {message.confidence_score && (
                            <span className="inline-flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                              <span>🎯</span>
                              {(message.confidence_score).toFixed(3)}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {getTimeAgo(message.created_at)}
                          </span>
                        </div>
                        {message.role === 'assistant' && (
                          <button
                            onClick={() => handleReviseAnswer(message, selectedConversation.id)}
                            className="text-xs text-gray-500 hover:text-gray-700 underline"
                          >
                            Revise answer
                          </button>
                        )}
                      </div>
                      {message.revised_at && (
                        <div className="text-xs text-gray-400 mt-2">
                          Revised {getTimeAgo(message.revised_at)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-sm text-gray-500">
                Choose a chat from the list to view details
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filter Dialog */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Filter by</h3>
              <button
                onClick={() => setFilterOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source
                </label>
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {sources.map(source => (
                    <option key={source.value} value={source.value}>
                      {source.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confidence score
                </label>
                <select
                  value={confidenceFilter}
                  onChange={(e) => setConfidenceFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {confidenceOptions.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setSelectedSource('all')
                  setConfidenceFilter('Show All')
                }}
                className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
              >
                Clear all
              </button>
              <button
                onClick={() => setFilterOpen(false)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revise Answer Modal */}
      {showReviseModal && selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Improve answer</h3>
              <button
                onClick={() => setShowReviseModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User message
                </label>
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                  {selectedMessage.userMessage || 'No user message available'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bot response
                </label>
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                  {selectedMessage.message.content}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected response
                </label>
                <textarea
                  value={revisedAnswer}
                  onChange={(e) => setRevisedAnswer(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={6}
                  placeholder="Enter the improved response here..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowReviseModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitRevisedAnswer}
                disabled={isRevising || revisedAnswer === selectedMessage.message.content}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isRevising ? 'Updating...' : 'Update Answer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}