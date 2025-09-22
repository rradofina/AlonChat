'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Send, Bot, User, RefreshCw, Copy, Download, Save } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { configService, AIModel, PromptPreset } from '@/lib/api/config'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function PlaygroundPage() {
  const params = useParams()
  const pathname = usePathname()
  const agentId = params.id as string
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [agent, setAgent] = useState<any>(null)
  const [temperature, setTemperature] = useState(0.5)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [promptPreset, setPromptPreset] = useState<string>('')
  const [compareMode, setCompareMode] = useState(false)
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [availablePresets, setAvailablePresets] = useState<PromptPreset[]>([])
  const [loadingConfig, setLoadingConfig] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()


  useEffect(() => {
    loadConfiguration()
    loadAgent()
  }, [agentId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadConfiguration = async () => {
    try {
      setLoadingConfig(true)
      const [models, presets] = await Promise.all([
        configService.getAIModels(),
        configService.getPromptPresets()
      ])

      setAvailableModels(models)
      setAvailablePresets(presets)

      // Set default model if not already set
      if (!selectedModel && models.length > 0) {
        setSelectedModel(models[0].model_id)
      }

      // Set default preset if not already set
      if (!promptPreset && presets.length > 0) {
        setPromptPreset(presets[0].id)
        setSystemPrompt(presets[0].prompt_template)
      }
    } catch (error) {
      console.error('Error loading configuration:', error)
      toast.error('Failed to load configuration')
    } finally {
      setLoadingConfig(false)
    }
  }

  const loadAgent = async () => {
    const { data } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single()

    if (data) {
      setAgent(data)
      setTemperature(data.temperature || 0.5)

      // Use agent's system prompt if available, otherwise keep the preset
      if (data.system_prompt) {
        setSystemPrompt(data.system_prompt)
      }

      // Set model from agent if available
      if (data.model) {
        setSelectedModel(data.model)
      }

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
      const response = await fetch(`/api/agents/${agentId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          sessionId: `playground_${agentId}_${Date.now()}`
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to get response')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveAgent = async () => {
    try {
      const { error } = await supabase
        .from('agents')
        .update({
          temperature,
          system_prompt: systemPrompt,
          model: selectedModel
        })
        .eq('id', agentId)

      if (error) throw error
      toast.success('Agent settings saved')
    } catch (error) {
      toast.error('Failed to save settings')
      console.error(error)
    }
  }

  const handlePromptPresetChange = (presetId: string) => {
    const preset = availablePresets.find(p => p.id === presetId)
    if (preset) {
      setPromptPreset(presetId)
      setSystemPrompt(preset.prompt_template)
    }
  }


  return (
    <div className="flex h-[calc(100vh-180px)]">
      {/* Left Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
        {/* Agent Status */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-2">Agent status:</div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            agent?.status === 'ready'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : agent?.status === 'training'
              ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              : 'bg-gray-50 text-gray-700 border border-gray-200'
          }`}>
            <span className="mr-1.5">{agent?.status === 'ready' ? '●' : agent?.status === 'training' ? '●' : '○'}</span>
            {agent?.status === 'ready' ? 'Trained' : agent?.status === 'training' ? 'Training' : 'Draft'}
          </span>
        </div>

        <button
          onClick={handleSaveAgent}
          className="w-full mb-4 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium text-sm transition-colors"
        >
          Save to agent
        </button>

        {/* Configure & test agents */}
        <div className="mb-4">
          <button className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1">
            <span className="text-lg">⚙</span> Configure & test agents
          </button>
        </div>

        <button
          onClick={() => setCompareMode(!compareMode)}
          className="w-full mb-6 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
        >
          Compare
        </button>

        {/* Model Selection */}
        <div className="">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model
          </label>
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 text-sm"
              disabled={loadingConfig}
            >
              {loadingConfig ? (
                <option>Loading models...</option>
              ) : (
                <>
                  {/* Group models by provider */}
                  {Object.entries(
                    availableModels.reduce((acc, model) => {
                      if (!acc[model.provider]) {
                        acc[model.provider] = []
                      }
                      acc[model.provider].push(model)
                      return acc
                    }, {} as Record<string, AIModel[]>)
                  ).map(([provider, models]) => (
                    <optgroup key={provider} label={provider.charAt(0).toUpperCase() + provider.slice(1)}>
                      {models.map(model => (
                        <option key={model.id} value={model.model_id}>
                          {model.display_name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </>
              )}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Temperature Slider */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-medium text-gray-700">
              Temperature
            </label>
            <span className="text-sm font-medium text-gray-900">{temperature}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${temperature * 100}%, #e5e7eb ${temperature * 100}%, #e5e7eb 100%)`
            }}
          />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-500">Reserved</span>
            <span className="text-xs text-gray-500">Creative</span>
          </div>
        </div>

        {/* AI Actions */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">AI Actions</h3>
          <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-100">
            <p className="text-sm text-gray-500">No actions found</p>
          </div>
        </div>

        {/* System Prompt */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            System prompt
          </label>
          <div className="relative mb-3">
            <select
              value={promptPreset}
              onChange={(e) => handlePromptPresetChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-10"
              disabled={loadingConfig}
            >
              {loadingConfig ? (
                <option>Loading presets...</option>
              ) : (
                <>
                  <option value="">Custom prompt</option>
                  {availablePresets.map(preset => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </>
              )}
            </select>
            <button
              className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
              onClick={() => navigator.clipboard.writeText(systemPrompt)}
              title="Copy to clipboard"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Instructions
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Enter custom instructions for your AI agent..."
            className="w-full h-64 px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            style={{ fontSize: '12px' }}
          />
        </div>
      </div>

      {/* Chat Section */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Chat Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">PACKAGE > NOVOTEL.pdf</div>
              <div className="flex items-center gap-4 text-sm">
                <button className="flex items-center gap-1 text-gray-600 hover:text-gray-800">
                  <Download className="h-4 w-4" />
                  PACKAGE - NOVOTEL.pdf
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Hi! What can I help you with?
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No messages yet. Start a conversation!</p>
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
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-black text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-gray-200">
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
        </div>

        {/* Input */}
        <div className="bg-white px-6 py-4 border-t border-gray-200">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chatbase Watermark */}
      <div className="fixed bottom-4 right-4">
        <button className="px-3 py-1 bg-black text-white text-xs rounded-full flex items-center gap-1">
          ⚡ Powered by Chatbase
        </button>
      </div>
    </div>
  )
}