'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Eye, EyeOff, Save, AlertCircle } from 'lucide-react'

interface ProviderCredential {
  provider_id: string
  provider_name: string
  provider_display: string
  required_env_vars: string[]
  credentials: Record<string, string>
  is_configured: boolean
}

export default function ApiKeysPage() {
  const [providers, setProviders] = useState<ProviderCredential[]>([])
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const supabase = createClient()

  useEffect(() => {
    loadProviders()
  }, [])

  async function loadProviders() {
    try {
      // Get current project
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!projects) return

      // Get all providers and their credentials
      const { data: allProviders } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('is_active', true)
        .order('display_name')

      // Get existing credentials for this project
      const { data: existingCreds } = await supabase
        .from('ai_provider_credentials')
        .select('*')
        .eq('project_id', projects.id)

      // Merge provider info with credentials
      const providerList = allProviders?.map(provider => {
        const creds = existingCreds?.find(c => c.provider_id === provider.id)
        return {
          provider_id: provider.id,
          provider_name: provider.name,
          provider_display: provider.display_name,
          required_env_vars: provider.required_env_vars || [],
          credentials: creds?.credentials || {},
          is_configured: !!creds
        }
      }) || []

      setProviders(providerList)
    } catch (error) {
      console.error('Error loading providers:', error)
      toast.error('Failed to load API providers')
    } finally {
      setLoading(false)
    }
  }

  async function saveCredentials(providerId: string, credentials: Record<string, string>) {
    setSaving({ ...saving, [providerId]: true })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!projects) throw new Error('No project found')

      // Check if credentials already exist
      const { data: existing } = await supabase
        .from('ai_provider_credentials')
        .select('id')
        .eq('project_id', projects.id)
        .eq('provider_id', providerId)
        .single()

      if (existing) {
        // Update existing credentials
        await supabase
          .from('ai_provider_credentials')
          .update({
            credentials,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
      } else {
        // Insert new credentials
        await supabase
          .from('ai_provider_credentials')
          .insert({
            project_id: projects.id,
            provider_id: providerId,
            credentials,
            is_active: true
          })
      }

      toast.success('API keys saved successfully')
      await loadProviders()
    } catch (error) {
      console.error('Error saving credentials:', error)
      toast.error('Failed to save API keys')
    } finally {
      setSaving({ ...saving, [providerId]: false })
    }
  }

  function updateCredential(providerId: string, key: string, value: string) {
    setProviders(providers.map(p =>
      p.provider_id === providerId
        ? { ...p, credentials: { ...p.credentials, [key]: value } }
        : p
    ))
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
        <p className="text-gray-600 mt-1">
          Configure your AI provider API keys. These are stored securely per project.
        </p>
      </div>

      <div className="grid gap-6">
        {providers.map((provider) => (
          <Card key={provider.provider_id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{provider.provider_display}</span>
                {provider.is_configured && (
                  <span className="text-sm font-normal text-green-600 flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-600 rounded-full" />
                    Configured
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                {provider.provider_name === 'openai' && 'For GPT-4, GPT-3.5, and other OpenAI models'}
                {provider.provider_name === 'google' && 'For Gemini Flash, Gemini Pro, and other Google AI models'}
                {provider.provider_name === 'anthropic' && 'For Claude 3 Opus, Sonnet, and Haiku models'}
                {provider.provider_name === 'custom' && 'For custom OpenAI-compatible APIs'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {provider.required_env_vars.length === 0 ? (
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  This provider doesn't require API keys (configure per model if needed)
                </div>
              ) : (
                <>
                  {provider.required_env_vars.map((envVar) => (
                    <div key={envVar}>
                      <Label htmlFor={`${provider.provider_id}-${envVar}`}>
                        {envVar.replace(/_/g, ' ').replace(/API KEY/i, 'API Key')}
                      </Label>
                      <div className="flex gap-2 mt-1">
                        <div className="relative flex-1">
                          <Input
                            id={`${provider.provider_id}-${envVar}`}
                            type={showKeys[`${provider.provider_id}-${envVar}`] ? 'text' : 'password'}
                            value={provider.credentials[envVar] || ''}
                            onChange={(e) => updateCredential(provider.provider_id, envVar, e.target.value)}
                            placeholder="Enter your API key"
                          />
                          <button
                            type="button"
                            onClick={() => setShowKeys({
                              ...showKeys,
                              [`${provider.provider_id}-${envVar}`]: !showKeys[`${provider.provider_id}-${envVar}`]
                            })}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showKeys[`${provider.provider_id}-${envVar}`] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <Button
                          onClick={() => saveCredentials(provider.provider_id, provider.credentials)}
                          disabled={saving[provider.provider_id]}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {provider.provider_name === 'openai' &&
                          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            Get your OpenAI API key →
                          </a>
                        }
                        {provider.provider_name === 'google' &&
                          <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            Get your Google AI API key →
                          </a>
                        }
                        {provider.provider_name === 'anthropic' &&
                          <a href="https://console.anthropic.com/account/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            Get your Anthropic API key →
                          </a>
                        }
                      </p>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}