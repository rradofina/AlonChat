'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Send, Bot, User, RefreshCw, Copy, Lightbulb } from 'lucide-react'
import { toast } from 'sonner'

// Import shared hooks
import { useAgent } from '@/hooks/use-agent'
import { useAIModels } from '@/hooks/use-ai-models'
import { usePromptTemplates } from '@/hooks/use-prompt-templates'

// Import reusable components
import { ModelSelector } from '@/components/ai/model-selector'
import { TemplateSelector } from '@/components/ai/template-selector'
import { TemperatureSlider } from '@/components/ai/temperature-slider'
import { PromptEditor } from '@/components/ai/prompt-editor'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function PlaygroundPage() {
  const params = useParams()
  const agentId = params.id as string
  const supabase = createClient()

  // Use shared hooks
  const { agent, loading: agentLoading, updateAgent } = useAgent(agentId)
  const { models, loading: modelsLoading } = useAIModels()
  const { templates, loading: templatesLoading, getTemplateById } = usePromptTemplates()

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Configuration state - aligned with new system
  const [temperature, setTemperature] = useState(0.5)
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [customMode, setCustomMode] = useState(false)
  const [customUserPrompt, setCustomUserPrompt] = useState('')
  const [showCustomOverrides, setShowCustomOverrides] = useState(false)

  // Initialize from agent data
  useEffect(() => {
    if (agent) {
      setSelectedModel(agent.model || 'gemini-1.5-flash')
      setTemperature(agent.temperature || 0.5)

      // Use the same prompt configuration as the agent
      if (agent.prompt_template_id) {
        setSelectedTemplateId(agent.prompt_template_id)
        setCustomMode(false)

        if (agent.custom_user_prompt) {
          setCustomUserPrompt(agent.custom_user_prompt)
          setShowCustomOverrides(true)
        } else {
          const template = templates.find(t => t.id === agent.prompt_template_id)
          if (template) {
            setCustomUserPrompt(template.user_prompt)
          }
        }
      } else {
        setCustomMode(true)
        setCustomUserPrompt(agent.system_prompt || '')
      }

      // Add greeting message if exists
      if (agent.greeting_message && messages.length === 0) {
        setMessages([{
          id: Date.now().toString(),
          role: 'assistant',
          content: agent.greeting_message,
          timestamp: new Date()
        }])
      }
    }
  }, [agent, templates])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleTemplateSelect = (templateId: string | null) => {
    setSelectedTemplateId(templateId)

    if (templateId) {
      const template = templates.find(t => t.id === templateId)
      if (template) {
        setCustomUserPrompt(template.user_prompt)
        setShowCustomOverrides(false)
      }
    }
  }

  const saveConfiguration = async () => {
    try {
      const updates: any = {
        temperature,
        model: selectedModel,
      }

      if (customMode) {
        updates.system_prompt = customUserPrompt
        updates.prompt_template_id = null
        updates.custom_user_prompt = null
      } else {
        updates.prompt_template_id = selectedTemplateId
        if (showCustomOverrides) {
          const template = getTemplateById(selectedTemplateId!)
          if (customUserPrompt !== template?.user_prompt) {
            updates.custom_user_prompt = customUserPrompt
          }
        }
      }

      await updateAgent(updates)
      toast.success('Configuration saved successfully')
    } catch (error) {
      toast.error('Failed to save configuration')
    }
  }

  const handleSendMessage = async () => {
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
      const response = await fetch(`/api/agents/${agentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId: 'playground-session',
          temperature,
          model: selectedModel,
          // The chat API will use the agent's prompt configuration
          // We don't need to send system_prompt anymore
        })
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      toast.error('Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  const clearConversation = () => {
    setMessages([])
    if (agent?.greeting_message) {
      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        content: agent.greeting_message,
        timestamp: new Date()
      }])
    }
  }

  const loading = agentLoading || modelsLoading || templatesLoading
  const currentTemplate = getTemplateById(selectedTemplateId || '')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Left Panel - Configuration */}
      <div className="w-96 border-r border-gray-200 bg-gray-50 p-6 overflow-y-auto">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Configuration</h2>

            {/* Model Selection */}
            <div className="space-y-4">
              <ModelSelector
                models={models}
                selectedModelId={selectedModel}
                onModelSelect={setSelectedModel}
                loading={modelsLoading}
              />

              <TemperatureSlider
                value={temperature}
                onChange={setTemperature}
              />

              <TemplateSelector
                templates={templates}
                selectedTemplateId={selectedTemplateId}
                onTemplateSelect={handleTemplateSelect}
                customMode={customMode}
                onCustomModeToggle={setCustomMode}
                loading={templatesLoading}
              />

              <PromptEditor
                template={currentTemplate}
                customMode={customMode}
                customPrompt={customUserPrompt}
                onCustomPromptChange={setCustomUserPrompt}
                showOverride={showCustomOverrides}
                onOverrideToggle={setShowCustomOverrides}
              />

              <button
                onClick={saveConfiguration}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Chat */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="h-6 w-6 text-gray-700" />
            <div>
              <h3 className="font-semibold text-gray-900">{agent?.name || 'AI Assistant'}</h3>
              <p className="text-xs text-gray-500">Test your agent configuration</p>
            </div>
          </div>
          <button
            onClick={clearConversation}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Clear Chat
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Lightbulb className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">Start a conversation</p>
              <p className="text-sm mt-1">Test your agent with different prompts and settings</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-5 w-5 text-gray-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] px-4 py-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="bg-white border border-gray-200 px-4 py-3 rounded-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}