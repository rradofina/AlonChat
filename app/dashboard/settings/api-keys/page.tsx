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
  const [currentProject, setCurrentProject] = useState<{ id: string, name: string } | null>(null)
  const [currentUser, setCurrentUser] = useState<{ email: string, id: string } | null>(null)
  const [allProjects, setAllProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadProviders()
  }, [])

  async function loadProviders(projectId?: string) {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      console.log('Current user:', user.email)
      setCurrentUser({ email: user.email || '', id: user.id })

      // Get ALL projects with their API key status
      const { data: allProjectsData } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          owner_id,
          created_at,
          ai_provider_credentials(id)
        `)
        .order('created_at', { ascending: false })

      console.log('All projects found:', allProjectsData)

      if (allProjectsData) {
        const projectsWithInfo = allProjectsData.map(p => ({
          ...p,
          hasApiKeys: (p.ai_provider_credentials && p.ai_provider_credentials.length > 0),
          isOwner: p.owner_id === user.id
        }))
        setAllProjects(projectsWithInfo)

        // Select a project to use
        let activeProject = null
        if (projectId) {
          // Use specified project
          activeProject = projectsWithInfo.find(p => p.id === projectId)
        } else if (selectedProjectId) {
          // Use previously selected project
          activeProject = projectsWithInfo.find(p => p.id === selectedProjectId)
        } else {
          // Auto-select: prefer owned projects with API keys, then any with API keys, then owned, then any
          activeProject =
            projectsWithInfo.find(p => p.isOwner && p.hasApiKeys) ||
            projectsWithInfo.find(p => p.hasApiKeys) ||
            projectsWithInfo.find(p => p.isOwner) ||
            projectsWithInfo[0]
        }

        if (!activeProject) {
          console.error('No projects available')
          return
        }

        console.log('Using project:', activeProject.name, activeProject.id)
        setCurrentProject({ id: activeProject.id, name: activeProject.name })
        setSelectedProjectId(activeProject.id)

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
          .eq('project_id', activeProject.id)

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
      }
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
      if (!currentProject) throw new Error('No project selected')

      const activeProject = currentProject

      // Check if credentials already exist
      const { data: existing } = await supabase
        .from('ai_provider_credentials')
        .select('id')
        .eq('project_id', activeProject.id)
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
            project_id: activeProject.id,
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

        {/* Debug info */}
        {currentUser && (
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md space-y-2">
            <p className="text-sm text-gray-700">
              Logged in as: <strong>{currentUser.email}</strong>
            </p>
            {allProjects.length > 1 && (
              <div>
                <Label className="text-sm">Select Project:</Label>
                <select
                  value={selectedProjectId || ''}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value)
                    loadProviders(e.target.value)
                  }}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {allProjects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.hasApiKeys ? '(Has API Keys)' : '(No API Keys)'} {p.isOwner ? '- Your Project' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {currentProject && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              Managing API keys for project: <strong>{currentProject.name}</strong>
              {providers.filter(p => p.is_configured).length > 0 &&
                ` (${providers.filter(p => p.is_configured).length} providers configured)`
              }
            </p>
          </div>
        )}
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