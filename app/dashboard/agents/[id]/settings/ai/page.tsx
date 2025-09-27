'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useParams } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

// Import shared hooks
import { useAgent } from '@/hooks/use-agent'
import { useAIModels } from '@/hooks/use-ai-models'
import { usePromptTemplates } from '@/hooks/use-prompt-templates'

// Import reusable components
import { ModelSelector } from '@/components/ai/model-selector'
import { TemplateSelector } from '@/components/ai/template-selector'
import { TemperatureSlider } from '@/components/ai/temperature-slider'
import { PromptEditor } from '@/components/ai/prompt-editor'

export default function AISettingsPage() {
  const params = useParams()
  const { toast } = useToast()
  const agentId = params.id as string

  // Use shared hooks
  const { agent, loading: agentLoading, updateAgent } = useAgent(agentId)
  const { models, loading: modelsLoading } = useAIModels()
  const { templates, loading: templatesLoading, getTemplateById } = usePromptTemplates()

  // Local state for form
  const [saving, setSaving] = useState(false)
  const [selectedModel, setSelectedModel] = useState('')
  const [temperature, setTemperature] = useState(0)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [customMode, setCustomMode] = useState(false)
  const [customUserPrompt, setCustomUserPrompt] = useState('')
  const [showCustomOverrides, setShowCustomOverrides] = useState(false)

  // Initialize form from agent data
  useEffect(() => {
    if (agent) {
      setSelectedModel(agent.model || 'gemini-1.5-flash')
      setTemperature(agent.temperature || 0)

      if (agent.prompt_template_id) {
        setSelectedTemplateId(agent.prompt_template_id)
        setCustomMode(false)

        // Check if there are custom overrides
        if (agent.custom_user_prompt) {
          setCustomUserPrompt(agent.custom_user_prompt)
          setShowCustomOverrides(true)
        } else {
          // Use template default
          const template = templates.find(t => t.id === agent.prompt_template_id)
          if (template) {
            setCustomUserPrompt(template.user_prompt)
          }
        }
      } else {
        // Custom mode
        setCustomMode(true)
        setCustomUserPrompt(agent.system_prompt || '')
      }
    }
  }, [agent, templates])

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

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates: any = {
        model: selectedModel,
        temperature: temperature,
      }

      if (customMode) {
        // Save custom prompts directly
        updates.prompt_template_id = null
        updates.system_prompt = customUserPrompt
        updates.custom_user_prompt = null
      } else {
        // Save template reference
        updates.prompt_template_id = selectedTemplateId

        // Handle custom overrides
        if (showCustomOverrides) {
          const template = getTemplateById(selectedTemplateId!)
          if (customUserPrompt !== template?.user_prompt) {
            updates.custom_user_prompt = customUserPrompt
          } else {
            updates.custom_user_prompt = null
          }
        } else {
          updates.custom_user_prompt = null
          updates.system_prompt = null
        }
      }

      const { error } = await updateAgent(updates)

      if (error) {
        throw new Error(error)
      }

      toast({
        title: 'Success',
        description: 'AI settings saved successfully',
      })
    } catch (error: any) {
      console.error('Failed to save settings:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const loading = agentLoading || modelsLoading || templatesLoading

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const currentTemplate = getTemplateById(selectedTemplateId || '')

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">AI Settings</h1>
          <p className="text-gray-600">Configure AI model and behavior for your agent</p>
        </div>

        <div className="space-y-6">
          {/* Model Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Model Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
            </CardContent>
          </Card>

          {/* Prompt Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Prompt Configuration</CardTitle>
              <CardDescription>
                Select a pre-configured template or create custom prompts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              className="bg-gray-900 hover:bg-gray-800 text-white px-8"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>

        {/* Training Status Card */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <RefreshCw className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">
                Last trained: {agent?.last_trained_at
                  ? new Date(agent.last_trained_at).toLocaleString()
                  : 'Never trained'}
              </span>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                toast({
                  title: 'Training Started',
                  description: 'Your agent is being trained with the latest settings.',
                })
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retrain Agent
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}