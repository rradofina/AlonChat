'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Send, Bot, User, RefreshCw, Settings2 } from 'lucide-react'
import { toast } from 'sonner'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function PlaygroundPage() {
  const params = useParams()
  const agentId = params.id as string
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [agent, setAgent] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadAgent()
  }, [agentId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadAgent = async () => {
    const { data } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single()

    if (data) {
      setAgent(data)
      // Add welcome message if it exists
      if (data.welcome_message) {
        setMessages([{
          id: '1',
          role: 'assistant',
          content: data.welcome_message,
          timestamp: new Date()
        }])
      }
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // TODO: Replace with actual API call to your RAG system
      // For now, we'll use a mock response
      const response = await mockAgentResponse(input, agent)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to get response')
    } finally {
      setIsLoading(false)
    }
  }

  // Mock function - replace with actual RAG implementation
  const mockAgentResponse = async (query: string, agentData: any) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Use agent's system prompt to craft a response
    if (query.toLowerCase().includes('hello') || query.toLowerCase().includes('hi')) {
      return agentData?.welcome_message || "Hello! I'm your AI assistant. How can I help you today?"
    }

    return `I understand you're asking about "${query}". As an AI assistant configured for ${agentData?.name || 'this task'}, I'm here to help. However, I'm currently in training mode and don't have access to my full knowledge base yet. Please add training data sources to enable full functionality.`
  }

  const handleReset = () => {
    setMessages(agent?.welcome_message ? [{
      id: '1',
      role: 'assistant',
      content: agent.welcome_message,
      timestamp: new Date()
    }] : [])
  }

  return (
    <div className="h-[calc(100vh-200px)] flex">
      {/* Chat Section */}
      <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-semibold">{agent?.name || 'Loading...'}</h2>
                <p className="text-sm text-gray-500">Test your agent in real-time</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No messages yet. Start a conversation!</p>
              {agent?.suggested_questions && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm">Try asking:</p>
                  {agent.suggested_questions.map((q: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setInput(q)}
                      className="block mx-auto px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[70%] px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="w-80 ml-4 bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Agent Settings
        </h3>

        <div className="space-y-4 text-sm">
          <div>
            <label className="text-gray-600">Model</label>
            <p className="font-medium">{agent?.model || 'gpt-3.5-turbo'}</p>
          </div>

          <div>
            <label className="text-gray-600">Temperature</label>
            <p className="font-medium">{agent?.temperature || 0.7}</p>
          </div>

          <div>
            <label className="text-gray-600">Max Tokens</label>
            <p className="font-medium">{agent?.max_tokens || 500}</p>
          </div>

          <div>
            <label className="text-gray-600">Status</label>
            <p className="font-medium capitalize">{agent?.status || 'draft'}</p>
          </div>

          <div className="pt-4 border-t">
            <p className="text-gray-500 text-xs">
              Note: This is a test environment. Responses are simulated until you connect your knowledge base and configure the RAG system.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}