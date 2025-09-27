'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import {
  Shield,
  Save,
  AlertTriangle,
  Info,
  RefreshCw,
  Lock
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

export default function SystemSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [adminPrompt, setAdminPrompt] = useState('')
  const [originalPrompt, setOriginalPrompt] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const defaultAdminPrompt = `## CRITICAL INSTRUCTIONS - DO NOT IGNORE

You are an AI assistant with access to a specific knowledge base. You MUST follow these rules WITHOUT EXCEPTION:

1. **ONLY USE PROVIDED CONTEXT**: You may ONLY answer questions using information explicitly found in the provided context/knowledge base.
2. **NO EXTERNAL KNOWLEDGE**: Do NOT use any information that is not explicitly stated in the context, even if you know it to be true.
3. **ADMIT WHEN YOU DON'T KNOW**: If the answer is not in the provided context, you MUST say: "I don't have information about that in my knowledge base."
4. **BE PRECISE**: Only provide information that directly answers the question. Do not add extra details not asked for.
5. **CITE SOURCES**: When possible, mention which source or context section your answer comes from.
6. **NO ASSUMPTIONS**: Never assume or infer information. Only state what is explicitly written.
7. **STAY ON TOPIC**: Only discuss topics related to the provided knowledge base. Politely decline off-topic questions.
8. **MAINTAIN PROFESSIONALISM**: Always be courteous, helpful within your constraints, and professional.

Remember: Your role is to be a reliable source of information based SOLELY on the provided knowledge base. Accuracy is more important than being helpful.`

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/system-settings')
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        throw new Error('Failed to load settings')
      }
      const data = await response.json()

      if (data.settings?.admin_system_prompt) {
        setAdminPrompt(data.settings.admin_system_prompt.value || '')
        setOriginalPrompt(data.settings.admin_system_prompt.value || '')
        setLastUpdated(data.settings.admin_system_prompt.updated_at ? new Date(data.settings.admin_system_prompt.updated_at) : null)
      }
    } catch (error: any) {
      console.error('Failed to load settings:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load system settings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/system-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_system_prompt: adminPrompt
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save settings')
      }

      setOriginalPrompt(adminPrompt)
      setLastUpdated(new Date())

      toast({
        title: 'Success',
        description: 'Global admin prompt updated successfully. All agents will now use this prompt.'
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setAdminPrompt(defaultAdminPrompt)
  }

  const hasChanges = adminPrompt !== originalPrompt

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-orange-600" />
          <h1 className="text-3xl font-bold">System Settings</h1>
        </div>
        <p className="text-gray-600">
          Configure global system settings that apply to all agents in your platform
        </p>
      </div>

      <Alert className="mb-6 border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900">Important: System-Wide Impact</AlertTitle>
        <AlertDescription className="text-amber-800">
          Changes to these settings will affect ALL agents immediately. The global admin prompt
          enforces anti-hallucination rules and security boundaries across your entire platform.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Global Admin System Prompt
              </CardTitle>
              <CardDescription className="mt-2">
                This hidden prompt is prepended to ALL agent conversations to enforce strict
                anti-hallucination and security rules. It takes precedence over all user-defined prompts.
              </CardDescription>
            </div>
            {lastUpdated && (
              <div className="text-right">
                <Badge variant="outline" className="mb-1">Production Setting</Badge>
                <p className="text-xs text-gray-500">
                  Last updated: {lastUpdated.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>This prompt is invisible to end users and agent owners</li>
                  <li>It's automatically prepended to every AI conversation</li>
                  <li>Ensures consistent behavior across all agents</li>
                  <li>Prevents AI from using knowledge outside the provided context</li>
                  <li>Changes take effect immediately for all agents</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Admin Prompt Instructions
              </label>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reset to Default
              </Button>
            </div>

            <Textarea
              value={adminPrompt}
              onChange={(e) => setAdminPrompt(e.target.value)}
              placeholder="Enter the global admin system prompt..."
              className="min-h-[400px] font-mono text-sm"
            />

            <p className="text-xs text-gray-500">
              This prompt should contain strict instructions about using only provided context,
              admitting when information is not available, and maintaining security boundaries.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  Unsaved changes
                </Badge>
              )}
            </div>

            <div className="flex gap-2">
              {hasChanges && (
                <Button
                  variant="outline"
                  onClick={() => setAdminPrompt(originalPrompt)}
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="min-w-[100px]"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></div>
              <span>Always emphasize using ONLY the provided context/knowledge base</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></div>
              <span>Include clear instructions to admit when information is not available</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></div>
              <span>Set boundaries for staying on-topic and declining inappropriate requests</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></div>
              <span>Use strong, unambiguous language like "MUST", "NEVER", "ALWAYS"</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></div>
              <span>Test thoroughly after changes as this affects ALL agents</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}