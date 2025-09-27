'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MessageSquare,
  Send,
  Search,
  Filter,
  MoreVertical,
  CheckCheck,
  Clock,
  Link,
  Settings,
  RefreshCw,
  AlertCircle,
  Facebook,
  Instagram,
  User,
  Bot,
  Image as ImageIcon,
  Paperclip
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { RealtimeChannel } from '@supabase/supabase-js'

interface Conversation {
  id: string
  participant_id: string
  participant_name: string
  participant_username?: string
  participant_profile_pic?: string
  last_message_at: string
  last_message_preview?: string
  unread_count: number
  status: 'active' | 'archived' | 'resolved'
  platform: 'facebook' | 'instagram'
}

interface Message {
  id: string
  conversation_id: string
  facebook_message_id?: string
  instagram_message_id?: string
  sender_id: string
  sender_type: 'user' | 'page' | 'business'
  recipient_id: string
  message_text?: string
  message_type?: string
  attachments?: any[]
  quick_replies?: any[]
  is_echo: boolean
  is_read?: boolean
  delivered_at?: string
  read_at?: string
  sent_at: string
  platform: 'facebook' | 'instagram'
}

interface FacebookIntegration {
  page_id: string
  page_name: string
  page_picture_url?: string
  is_active: boolean
  webhook_verified: boolean
}

interface InstagramIntegration {
  instagram_account_id: string
  instagram_username: string
  instagram_name?: string
  instagram_profile_pic?: string
  is_active: boolean
  webhook_verified: boolean
}

export default function MessengerInbox({
  params
}: {
  params: { id: string }
}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'archived'>('all')
  const [facebookIntegration, setFacebookIntegration] = useState<FacebookIntegration | null>(null)
  const [instagramIntegration, setInstagramIntegration] = useState<InstagramIntegration | null>(null)
  const [activeTab, setActiveTab] = useState<'facebook' | 'instagram'>('facebook')

  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null)

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load Facebook and Instagram integration status
  useEffect(() => {
    const loadIntegrations = async () => {
      try {
        // Load Facebook integration
        const fbResponse = await fetch(`/api/agents/${params.id}/facebook`)
        const fbData = await fbResponse.json()
        if (fbData.connected && fbData.integration) {
          setFacebookIntegration(fbData.integration)
        }

        // Load Instagram integration
        const igResponse = await fetch(`/api/agents/${params.id}/instagram`)
        const igData = await igResponse.json()
        if (igData.connected && igData.integration) {
          setInstagramIntegration(igData.integration)
        }
      } catch (error) {
        console.error('Failed to load integrations:', error)
      }
    }

    loadIntegrations()
  }, [params.id])

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      try {
        let allConversations: Conversation[] = []

        // Load Facebook conversations
        if (activeTab === 'facebook' && facebookIntegration) {
          const { data: fbConvs, error: fbError } = await supabase
            .from('facebook_conversations')
            .select('*')
            .eq('agent_id', params.id)
            .order('last_message_at', { ascending: false })

          if (fbError) throw fbError
          allConversations = (fbConvs || []).map(c => ({ ...c, platform: 'facebook' as const }))
        }

        // Load Instagram conversations
        if (activeTab === 'instagram' && instagramIntegration) {
          const { data: igConvs, error: igError } = await supabase
            .from('instagram_conversations')
            .select('*')
            .eq('agent_id', params.id)
            .order('last_message_at', { ascending: false })

          if (igError) throw igError
          allConversations = (igConvs || []).map(c => ({
            ...c,
            platform: 'instagram' as const,
            participant_name: c.participant_username || c.participant_name || 'Instagram User'
          }))
        }

        setConversations(allConversations)
      } catch (error) {
        console.error('Failed to load conversations:', error)
        toast.error('Failed to load conversations')
      } finally {
        setLoading(false)
      }
    }

    loadConversations()
  }, [params.id, supabase, activeTab, facebookIntegration, instagramIntegration])

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) return

    const loadMessages = async () => {
      try {
        const tableName = selectedConversation.platform === 'instagram'
          ? 'instagram_messages'
          : 'facebook_messages'
        const conversationTable = selectedConversation.platform === 'instagram'
          ? 'instagram_conversations'
          : 'facebook_conversations'

        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('conversation_id', selectedConversation.id)
          .order('sent_at', { ascending: true })

        if (error) throw error
        setMessages((data || []).map(m => ({ ...m, platform: selectedConversation.platform })))

        // Mark messages as read
        if (selectedConversation.unread_count > 0) {
          await supabase
            .from(conversationTable)
            .update({ unread_count: 0 })
            .eq('id', selectedConversation.id)

          // Update local state
          setConversations(prev =>
            prev.map(c =>
              c.id === selectedConversation.id
                ? { ...c, unread_count: 0 }
                : c
            )
          )
        }
      } catch (error) {
        console.error('Failed to load messages:', error)
        toast.error('Failed to load messages')
      }
    }

    loadMessages()
  }, [selectedConversation, supabase])

  // Set up realtime subscriptions
  useEffect(() => {
    if (!selectedConversation) return

    // Clean up previous subscription
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current)
    }

    // Subscribe to new messages
    const channel = supabase
      .channel(`messenger-${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'facebook_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message])
          scrollToBottom()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'facebook_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        (payload) => {
          setMessages(prev =>
            prev.map(m => m.id === payload.new.id ? payload.new as Message : m)
          )
        }
      )
      .subscribe()

    realtimeChannelRef.current = channel

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current)
      }
    }
  }, [selectedConversation, supabase])

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    const integration = selectedConversation.platform === 'instagram'
      ? instagramIntegration
      : facebookIntegration

    if (!integration) return

    setSendingMessage(true)
    try {
      // Send message via API
      const endpoint = selectedConversation.platform === 'instagram'
        ? '/api/webhooks/instagram/send'
        : '/api/webhooks/facebook/send'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: selectedConversation.participant_id,
          messageText: newMessage,
          agentId: params.id,
          platform: selectedConversation.platform
        })
      })

      if (!response.ok) throw new Error('Failed to send message')

      // Clear input
      setNewMessage('')

      toast.success('Message sent')
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!conv.participant_name.toLowerCase().includes(query) &&
          !conv.last_message_preview?.toLowerCase().includes(query)) {
        return false
      }
    }

    if (filter === 'unread' && conv.unread_count === 0) return false
    if (filter === 'archived' && conv.status !== 'archived') return false
    if (filter === 'all' && conv.status === 'archived') return false

    return true
  })

  // Format message time
  const formatMessageTime = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  }

  if (!facebookIntegration && !instagramIntegration) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="flex justify-center gap-4 mb-4">
            <Facebook className="h-12 w-12 text-gray-300" />
            <Instagram className="h-12 w-12 text-gray-300" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Social Media Connected
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Connect Facebook or Instagram to start receiving messages
          </p>
          <Button onClick={() => window.location.href = `/dashboard/agents/${params.id}/deploy`}>
            Go to Deploy Settings
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-white rounded-lg shadow">
      {/* Conversations List */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          {/* Platform Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'facebook' | 'instagram')} className="mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="facebook" disabled={!facebookIntegration}>
                <Facebook className="h-4 w-4 mr-1" />
                Facebook
              </TabsTrigger>
              <TabsTrigger value="instagram" disabled={!instagramIntegration}>
                <Instagram className="h-4 w-4 mr-1" />
                Instagram
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {activeTab === 'facebook' ? (
                <Facebook className="h-5 w-5 text-blue-600" />
              ) : (
                <Instagram className="h-5 w-5 text-pink-600" />
              )}
              <h2 className="font-semibold">
                {activeTab === 'facebook' ? 'Messenger' : 'Instagram DMs'}
              </h2>
            </div>
            {(activeTab === 'facebook' ? facebookIntegration : instagramIntegration) && (
              <Badge variant={
                (activeTab === 'facebook' ? facebookIntegration?.webhook_verified : instagramIntegration?.webhook_verified)
                  ? 'default' : 'destructive'
              }>
                {(activeTab === 'facebook' ? facebookIntegration?.webhook_verified : instagramIntegration?.webhook_verified)
                  ? 'Connected' : 'Not Verified'}
              </Badge>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filter === 'unread' ? 'default' : 'outline'}
              onClick={() => setFilter('unread')}
            >
              Unread
              {conversations.filter(c => c.unread_count > 0).length > 0 && (
                <Badge className="ml-1" variant="secondary">
                  {conversations.filter(c => c.unread_count > 0).length}
                </Badge>
              )}
            </Button>
            <Button
              size="sm"
              variant={filter === 'archived' ? 'default' : 'outline'}
              onClick={() => setFilter('archived')}
            >
              Archived
            </Button>
          </div>
        </div>

        {/* Conversations */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No conversations found
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={cn(
                    "w-full p-4 hover:bg-gray-50 transition-colors text-left",
                    selectedConversation?.id === conv.id && "bg-blue-50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conv.participant_profile_pic} />
                      <AvatarFallback>
                        {conv.participant_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 truncate">
                          {conv.participant_name}
                        </p>
                        <span className="text-xs text-gray-500">
                          {formatMessageTime(conv.last_message_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {conv.last_message_preview || 'No messages yet'}
                      </p>
                      {conv.unread_count > 0 && (
                        <Badge className="mt-2" variant="default">
                          {conv.unread_count} new
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Message Thread */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Message Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedConversation.participant_profile_pic} />
                <AvatarFallback>
                  {selectedConversation.participant_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium text-gray-900">
                  {selectedConversation.participant_name}
                </h3>
                <p className="text-sm text-gray-500">
                  Facebook Messenger
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => {
                const isUser = message.sender_type === 'user'
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      !isUser && "flex-row-reverse"
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      {isUser ? (
                        <AvatarImage src={selectedConversation.participant_profile_pic} />
                      ) : (
                        <Bot className="h-5 w-5" />
                      )}
                      <AvatarFallback>
                        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "flex flex-col gap-1 max-w-[70%]",
                      !isUser && "items-end"
                    )}>
                      <div className={cn(
                        "rounded-lg px-3 py-2",
                        isUser
                          ? "bg-gray-100 text-gray-900"
                          : "bg-blue-600 text-white"
                      )}>
                        {message.message_text && (
                          <p className="text-sm">{message.message_text}</p>
                        )}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {message.attachments.map((attachment: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2">
                                {attachment.type === 'image' ? (
                                  <ImageIcon className="h-4 w-4" />
                                ) : (
                                  <Paperclip className="h-4 w-4" />
                                )}
                                <span className="text-xs">
                                  {attachment.title || 'Attachment'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatMessageTime(message.sent_at)}</span>
                        {!isUser && message.delivered_at && (
                          <CheckCheck className="h-3 w-3" />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                disabled={sendingMessage}
              />
              <Button
                onClick={sendMessage}
                disabled={sendingMessage || !newMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              Select a conversation to view messages
            </p>
          </div>
        </div>
      )}
    </div>
  )
}