'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Bot, ChevronLeft, ChevronRight, Sparkles, MessageSquare, Settings, Rocket } from 'lucide-react'

interface AgentWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
}

const steps = [
  { title: 'Basic Info', description: 'Name and describe your agent', icon: Bot },
  { title: 'AI Model', description: 'Choose your AI model and settings', icon: Sparkles },
  { title: 'Behavior', description: 'Set personality and responses', icon: MessageSquare },
  { title: 'Review', description: 'Review and create your agent', icon: Rocket },
]

export function AgentWizard({ open, onOpenChange, workspaceId }: AgentWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    model: 'gpt-3.5-turbo',
    temperature: '0.7',
    maxTokens: '500',
    systemPrompt: "You are a helpful AI assistant. Answer questions accurately and concisely.",
    welcomeMessage: "Hi! How can I help you today?",
    suggestedQuestions: ['What can you help me with?', 'Tell me more about your capabilities', 'How do I get started?'],
  })

  const progress = ((currentStep + 1) / steps.length) * 100

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Not authenticated')

      const { data: agent, error } = await supabase
        .from('agents')
        .insert({
          workspace_id: workspaceId,
          name: formData.name,
          description: formData.description,
          model: formData.model,
          temperature: parseFloat(formData.temperature),
          max_tokens: parseInt(formData.maxTokens),
          system_prompt: formData.systemPrompt,
          welcome_message: formData.welcomeMessage,
          suggested_questions: formData.suggestedQuestions,
          status: 'draft',
          created_by: user.user.id,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Agent created successfully!')
      onOpenChange(false)
      router.push(`/dashboard/agents/${agent.id}`)
      router.refresh()
    } catch (error: any) {
      console.error('Failed to create agent:', error)
      toast.error(error.message || 'Failed to create agent')
    } finally {
      setIsCreating(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                placeholder="e.g., Customer Support Bot"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">Choose a descriptive name for your agent</p>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what your agent does..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1"
                rows={3}
              />
              <p className="text-sm text-gray-500 mt-1">This helps you remember the agent's purpose</p>
            </div>
          </div>
        )

      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="model">AI Model</Label>
              <Select value={formData.model} onValueChange={(value) => setFormData({ ...formData, model: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast & Affordable)</SelectItem>
                  <SelectItem value="gpt-4">GPT-4 (Most Capable)</SelectItem>
                  <SelectItem value="gpt-4-turbo-preview">GPT-4 Turbo (Latest)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">Choose based on your needs and budget</p>
            </div>
            <div>
              <Label htmlFor="temperature">Temperature: {formData.temperature}</Label>
              <input
                type="range"
                id="temperature"
                min="0"
                max="1"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                className="w-full mt-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Precise</span>
                <span>Balanced</span>
                <span>Creative</span>
              </div>
            </div>
            <div>
              <Label htmlFor="maxTokens">Max Response Length</Label>
              <Select value={formData.maxTokens} onValueChange={(value) => setFormData({ ...formData, maxTokens: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="150">Short (150 tokens)</SelectItem>
                  <SelectItem value="300">Medium (300 tokens)</SelectItem>
                  <SelectItem value="500">Long (500 tokens)</SelectItem>
                  <SelectItem value="1000">Very Long (1000 tokens)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="systemPrompt">System Prompt</Label>
              <Textarea
                id="systemPrompt"
                placeholder="Define your agent's personality and behavior..."
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                className="mt-1"
                rows={4}
              />
              <p className="text-sm text-gray-500 mt-1">This shapes how your agent responds</p>
            </div>
            <div>
              <Label htmlFor="welcomeMessage">Welcome Message</Label>
              <Textarea
                id="welcomeMessage"
                placeholder="The first message users see..."
                value={formData.welcomeMessage}
                onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label>Suggested Questions</Label>
              <div className="space-y-2 mt-1">
                {formData.suggestedQuestions.map((q, idx) => (
                  <Input
                    key={idx}
                    value={q}
                    onChange={(e) => {
                      const newQuestions = [...formData.suggestedQuestions]
                      newQuestions[idx] = e.target.value
                      setFormData({ ...formData, suggestedQuestions: newQuestions })
                    }}
                    placeholder={`Question ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Review Your Agent</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{formData.name || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Model:</span>
                  <span className="font-medium">{formData.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Temperature:</span>
                  <span className="font-medium">{formData.temperature}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Max Tokens:</span>
                  <span className="font-medium">{formData.maxTokens}</span>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Your agent will be created in <strong>Draft</strong> mode. You can add knowledge sources and test it before making it live.
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Follow these steps to create your AI agent
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Progress bar */}
          <div className="mb-6">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between mt-2">
              {steps.map((step, idx) => {
                const Icon = step.icon
                return (
                  <div
                    key={idx}
                    className={`flex flex-col items-center ${
                      idx <= currentStep ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  >
                    <Icon className="h-5 w-5 mb-1" />
                    <span className="text-xs hidden sm:block">{step.title}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step content */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">{steps[currentStep].title}</h3>
            <p className="text-sm text-gray-600 mb-4">{steps[currentStep].description}</p>
            {renderStepContent()}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            {currentStep === steps.length - 1 ? (
              <Button onClick={handleCreate} disabled={isCreating || !formData.name}>
                {isCreating ? 'Creating...' : 'Create Agent'}
                <Rocket className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}