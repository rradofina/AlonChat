'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Search, Calendar, Filter, ChevronDown, Download, X } from 'lucide-react'

interface Conversation {
  id: string
  started_at: string
  ended_at: string | null
  messages_count: number
  session_id: string
  first_message?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export default function ActivityPage() {
  const params = useParams()
  const agentId = params.id as string
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'chat' | 'details'>('chat')
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [conversationMessages, setConversationMessages] = useState<Message[]>([])
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const supabase = createClient()

  useEffect(() => {
    loadActivity()
  }, [agentId, dateRange])

  const loadActivity = async () => {
    try {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('agent_id', agentId)
        .gte('started_at', dateRange.start)
        .lte('started_at', dateRange.end + 'T23:59:59')
        .order('started_at', { ascending: false })
        .limit(50)

      if (data) {
        // Get first message and count for each conversation
        const conversationsWithDetails = await Promise.all(
          data.map(async (conv) => {
            const { data: messages, count } = await supabase
              .from('messages')
              .select('*', { count: 'exact' })
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: true })
              .limit(1)

            return {
              ...conv,
              messages_count: count || 0,
              first_message: messages?.[0]?.content || 'No messages'
            }
          })
        )
        setConversations(conversationsWithDetails)
      }
    } catch (error) {
      console.error('Error loading activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadConversationMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (data) {
      setConversationMessages(data)
    }
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - d.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
      if (diffHours === 0) {
        const diffMins = Math.floor(diffTime / (1000 * 60))
        return `${diffMins} minutes ago`
      }
      return `${diffHours} hours ago`
    } else if (diffDays === 1) {
      return 'yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-180px)]">
      {/* Left Sidebar - Chat Logs List */}
      <div className="w-96 bg-white rounded-lg border border-gray-200 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Chat logs</h2>
            <div className="flex gap-2">
              <button className="p-1.5 hover:bg-gray-100 rounded">
                <Search className="h-4 w-4 text-gray-600" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded">
                <Download className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <Filter className="h-4 w-4" />
            <span>Filter by</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        {/* Date Filter Modal */}
        {showDateFilter && (
          <div className="absolute z-50 mt-12 ml-4 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Filter by</h3>
              <button
                onClick={() => setShowDateFilter(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date range</label>
              <div className="text-sm text-gray-600 mb-2">
                {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded text-sm"
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded text-sm"
                />
              </div>
            </div>

            <button
              onClick={() => {
                loadActivity()
                setShowDateFilter(false)
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Apply
            </button>
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading chat logs...</div>
          ) : conversations.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">No conversations found</p>
              <p className="text-sm text-gray-400 mt-1">
                It looks like you're testing the system. If you have any questions or need assistance, feel free to ask!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => {
                    setSelectedConversation(conv.id)
                    loadConversationMessages(conv.id)
                  }}
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedConversation === conv.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                      {conv.first_message}
                    </p>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                      {formatDate(conv.started_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{conv.messages_count} messages</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      test
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Conversation View */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200">
        {selectedConversation ? (
          <>
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                    activeTab === 'chat'
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setActiveTab('details')}
                  className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                    activeTab === 'details'
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  Details
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'chat' ? (
                <div className="space-y-4">
                  {conversationMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        msg.role === 'user'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.role === 'assistant' && (
                          <button className="text-xs text-blue-600 mt-2 hover:text-blue-700">
                            Revise answer
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Session Details</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Session ID</span>
                        <span className="font-mono text-xs">
                          {conversations.find(c => c.id === selectedConversation)?.session_id}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Started at</span>
                        <span>
                          {new Date(conversations.find(c => c.id === selectedConversation)?.started_at || '').toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Messages</span>
                        <span>{conversationMessages.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Select a conversation to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}