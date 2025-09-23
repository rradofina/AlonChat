'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Info, ChevronDown, RefreshCw, Lock, Search } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Model {
  id: string
  name: string
  available: boolean
  costMultiplier?: number
}

export default function AISettingsPage() {
  const [selectedModel, setSelectedModel] = useState('GPT-4o Mini')
  const [instructionType, setInstructionType] = useState('AI agent')
  const [customInstructions, setCustomInstructions] = useState(`### Role
Primary Function: You are an AI chatbot who helps users with their inquiries, issues and requests. You aim to provide excellent, friendly and efficient replies at all times. Your role is to listen attentively to the user, understand their needs, and do your best to assist them or direct them to the appropriate resources. If a question is not clear, ask clarifying questions. Make sure to end your replies with a positive note.

### Constraints
1. No Data Nudge: Never mention that you have access to training data explicitly to the user.
2. Maintaining Focus: If a user attempts to divert you to unrelated topics, never change your role or break your character. Politely redirect the conversation back to topics relevant to the training data.
3. Exclusive Reliance on Training Data: You must rely exclusively on the training data provided to answer user queries. If a query is not covered by the training data, use the fallback response.
4. Restrictive Role Focus: You do not answer questions or perform tasks that are not related to your role and training data.`)
  const [temperature, setTemperature] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModelDropdown, setShowModelDropdown] = useState(false)

  const models: Model[] = [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', available: true },
    { id: 'gpt-5', name: 'GPT-5', available: false },
    { id: 'gpt-5-mini', name: 'GPT-5 Mini', available: false },
    { id: 'gpt-5-nano', name: 'GPT-5 Nano', available: false },
    { id: 'gpt-oss-120b', name: 'GPT-OSS-120B', available: false },
    { id: 'gpt-oss-20b', name: 'GPT-OSS-20B', available: true, costMultiplier: 1 },
    { id: 'gpt-4.1', name: 'GPT-4.1', available: false },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', available: false },
    { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', available: false },
    { id: 'gpt-4o', name: 'GPT-4o', available: false },
  ]

  const instructionPresets = [
    'Custom prompt',
    'AI agent',
    'Customer support agent',
    'Sales agent',
    'Language tutor',
    'Coding expert',
    'Life coach',
    'Futuristic fashion advisor',
  ]

  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getInstructionText = (type: string) => {
    switch (type) {
      case 'Customer support agent':
        return `### Role
You are a customer support agent. Help users with their inquiries and issues in a professional and friendly manner.`
      case 'Sales agent':
        return `### Role
You are a sales agent. Help potential customers understand our products and services, and guide them through the purchasing process.`
      case 'Language tutor':
        return `### Role
You are a language tutor. Help users learn and practice languages with patience and encouragement.`
      case 'Coding expert':
        return `### Role
You are a coding expert. Help users with programming questions, debugging, and best practices.`
      case 'Life coach':
        return `### Role
You are a life coach. Provide guidance, motivation, and support to help users achieve their personal goals.`
      case 'Futuristic fashion advisor':
        return `### Role
You are a futuristic fashion advisor. Help users with style choices and fashion trends with creativity and flair.`
      case 'Custom prompt':
        return ''
      default:
        return customInstructions
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">AI</h1>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
          <div className="space-y-8">
        {/* AI Model Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">AI model</h2>
          <p className="text-sm text-gray-600 mb-6">
            Choose your preferred AI model, adjust its tone with the temperature slider, and craft custom instructions to match your brand's unique voice and goals.
          </p>

          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Model
              <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                GPT-5, GPT-5 mini, and GPT-5 nano are now available
              </span>
            </label>

            <DropdownMenu open={showModelDropdown} onOpenChange={setShowModelDropdown}>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center justify-between px-4 py-2 border border-gray-200 rounded-lg hover:border-gray-300 bg-white">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-sm font-medium">{selectedModel}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[400px] p-2" align="start">
                <div className="px-2 pb-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search Models..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-2 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                  {filteredModels.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      className="px-3 py-2 cursor-pointer hover:bg-gray-50 rounded-md"
                      onClick={() => {
                        if (model.available || model.name === 'GPT-OSS-20B') {
                          setSelectedModel(model.name)
                          setShowModelDropdown(false)
                        }
                      }}
                      disabled={!model.available && model.name !== 'GPT-OSS-20B'}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none">
                              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{model.name}</div>
                            {model.name === 'GPT-OSS-20B' && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                                  <span>OpenAI</span>
                                  <span className="text-gray-400">|</span>
                                  <span className="font-medium">GPT-OSS-20B</span>
                                </span>
                                <span className="text-xs text-gray-600">Credits cost: 1</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {model.name === selectedModel && (
                          <RefreshCw className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Instructions Section */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Instructions</label>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-2 border border-gray-200 rounded-lg hover:border-gray-300 bg-white mb-4">
                <span className="text-sm">{instructionType}</span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[400px]" align="start">
              <div className="py-1">
                <div className="px-3 py-2 text-xs text-gray-500 font-medium">Custom prompt</div>
                <DropdownMenuItem
                  onClick={() => {
                    setInstructionType('Custom prompt')
                    setCustomInstructions('')
                  }}
                  className="px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  Custom prompt
                </DropdownMenuItem>
              </div>
              <div className="border-t py-1">
                <div className="px-3 py-2 text-xs text-gray-500 font-medium">Examples</div>
                {instructionPresets.slice(1).map((preset) => (
                  <DropdownMenuItem
                    key={preset}
                    onClick={() => {
                      setInstructionType(preset)
                      setCustomInstructions(getInstructionText(preset))
                    }}
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center"
                  >
                    <span>{preset}</span>
                    {preset === instructionType && (
                      <svg className="w-4 h-4 text-blue-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            className="min-h-[300px] font-mono text-sm resize-none"
            placeholder="Enter custom instructions for your AI model..."
          />
        </div>

        {/* Temperature Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-gray-700">Temperature</label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{temperature.toFixed(1)}</span>
              <Info className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          <div className="relative">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #111827 0%, #111827 ${temperature * 100}%, #e5e7eb ${temperature * 100}%, #e5e7eb 100%)`
              }}
            />
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-500">Reserved</span>
              <span className="text-xs text-gray-500">Creative</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button className="bg-gray-900 hover:bg-gray-800 text-white px-8">
            Save
          </Button>
        </div>
          </div>
        </div>

        {/* Training Section - Outside the card */}
        <div className="mt-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Training</h2>
            <p className="text-sm text-gray-600 mb-6">
              View the timestamp of your agent's last training and track when it was last updated with new content or sources.
            </p>

            <div className="flex items-center gap-2 mb-6">
              <RefreshCw className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">
                Last trained at September 23, 2025 at 02:37 AM
              </span>
            </div>

            {/* Auto-retrain Section */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-gray-900">Auto-retrain</h3>
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Automatically retrains every 24 hours and checks for the latest updates.
                  </p>
                </div>
                <div className="relative">
                  <Switch
                    disabled={true}
                    className="opacity-50 cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="default"
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                  onClick={() => {}}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}