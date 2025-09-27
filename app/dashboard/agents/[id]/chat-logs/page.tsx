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
  MoreVertical,
  Edit3,
  FileJson,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  X
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
  const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set())
  const [showReviseModal, setShowReviseModal] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<{
    message: Message
    userMessage: string
    conversationId: string
  } | null>(null)
  const [revisedAnswer, setRevisedAnswer] = useState('')
  const [isRevising, setIsRevising] = useState(false)

  // Source options with icons
  const sources = [
    { value: 'all', label: 'All Sources', icon: Filter },
    { value: 'playground', label: 'Playground', icon: MessageSquare },
    { value: 'website', label: 'Embedded Website', icon: Globe },
    { value: 'messenger', label: 'Messenger', icon: Send },
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
      }
    } catch (error) {
      console.error('Error fetching chat logs:', error)
      toast.error('Failed to load chat logs')
    } finally {
      setLoading(false)
    }
  }

  const toggleConversation = (id: string) => {
    setExpandedConversations(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    try {
      if (format === 'pdf') {
        // Generate PDF client-side
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
        // Fetch from API for JSON and CSV
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
          confidenceScore: 0.95 // Higher confidence for human-revised answers
        })
      })

      if (response.ok) {
        toast.success('Answer revised and added to training set')
        setShowReviseModal(false)
        fetchChatLogs() // Refresh the logs
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chat Logs</h1>
            <p className="text-sm text-gray-500 mt-1">
              View and manage all conversations with your agent
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Source Filter */}
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sources.map(source => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </select>

            {/* Refresh Button */}
            <button
              onClick={fetchChatLogs}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-5 w-5 text-gray-600" />
            </button>

            {/* Export Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                <Download className="h-4 w-4" />
                <span className="text-sm">Export</span>
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

      {/* Chat Logs List */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white p-4 rounded-lg border border-gray-200 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No chat logs yet</h3>
            <p className="text-sm text-gray-500">
              Start a conversation in the Playground to see chat logs here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.map(conversation => (
              <div
                key={conversation.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Conversation Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleConversation(conversation.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {expandedConversations.has(conversation.id) ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                      {sources.find(s => s.value === conversation.source)?.icon &&
                        (() => {
                          const Icon = sources.find(s => s.value === conversation.source)?.icon
                          return Icon ? <Icon className="h-4 w-4 text-gray-500" /> : null
                        })()
                      }
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {conversation.messages?.[0]?.content.substring(0, 50)}...
                      </div>
                      <div className="text-sm text-gray-500">
                        {conversation.source} • {getTimeAgo(conversation.started_at)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {conversation.messages?.length || 0} messages
                  </div>
                </div>

                {/* Expanded Messages */}
                {expandedConversations.has(conversation.id) && (
                  <div className="border-t border-gray-200 p-4 space-y-3">
                    {conversation.messages?.map((message, idx) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] ${
                            message.role === 'user'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          } rounded-lg p-3`}
                        >
                          <div className="text-sm">{message.content}</div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              {message.confidence_score && (
                                <span className="text-xs opacity-75">
                                  {(message.confidence_score * 100).toFixed(1)}%
                                </span>
                              )}
                              <span className="text-xs opacity-75">
                                {getTimeAgo(message.created_at)}
                              </span>
                            </div>
                            {message.role === 'assistant' && (
                              <button
                                onClick={() => handleReviseAnswer(message, conversation.id)}
                                className="text-xs opacity-75 hover:opacity-100 underline"
                              >
                                Revise answer
                              </button>
                            )}
                          </div>
                          {message.revised_at && (
                            <div className="text-xs opacity-75 mt-1">
                              Revised {getTimeAgo(message.revised_at)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revise Answer Modal */}
      {showReviseModal && selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Improve Answer</h3>
              <button
                onClick={() => setShowReviseModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* User Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User message
                </label>
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                  {selectedMessage.userMessage || 'No user message available'}
                </div>
              </div>

              {/* Bot Response */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bot response
                </label>
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                  {selectedMessage.message.content}
                </div>
              </div>

              {/* Revised Response */}
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

            {/* Modal Footer */}
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