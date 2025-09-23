'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Plus, Save, Trash2, Database, ArrowLeft, Code } from 'lucide-react'

interface AIProvider {
  id?: string
  name: string
  display_name: string
  provider_class: string
  npm_package?: string
  api_base_url?: string
  auth_header_name: string
  auth_header_prefix: string
  required_env_vars: string[]
  features: Record<string, boolean>
  pricing: Record<string, any>
  is_active: boolean
  is_builtin: boolean
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null)
  const [newProvider, setNewProvider] = useState<AIProvider>({
    name: '',
    display_name: '',
    provider_class: 'CustomProvider',
    api_base_url: '',
    auth_header_name: 'Authorization',
    auth_header_prefix: 'Bearer',
    required_env_vars: [],
    features: {
      streaming: false,
      functions: false,
      vision: false
    },
    pricing: {},
    is_active: true,
    is_builtin: false
  })
  const [newEnvVar, setNewEnvVar] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadProviders()
  }, [])

  async function loadProviders() {
    try {
      const { data } = await supabase
        .from('ai_providers')
        .select('*')
        .order('display_name')

      setProviders(data || [])
    } catch (error) {
      console.error('Error loading providers:', error)
      toast.error('Failed to load providers')
    } finally {
      setLoading(false)
    }
  }

  async function saveProvider(provider: AIProvider) {
    try {
      if (provider.id) {
        // Update existing provider
        const { error } = await supabase
          .from('ai_providers')
          .update({
            display_name: provider.display_name,
            api_base_url: provider.api_base_url,
            auth_header_name: provider.auth_header_name,
            auth_header_prefix: provider.auth_header_prefix,
            required_env_vars: provider.required_env_vars,
            features: provider.features,
            pricing: provider.pricing,
            is_active: provider.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', provider.id)

        if (error) throw error
        toast.success('Provider updated successfully')
      } else {
        // Create new provider
        const { error } = await supabase
          .from('ai_providers')
          .insert({
            name: provider.name,
            display_name: provider.display_name,
            provider_class: provider.provider_class,
            npm_package: provider.npm_package,
            api_base_url: provider.api_base_url,
            auth_header_name: provider.auth_header_name,
            auth_header_prefix: provider.auth_header_prefix,
            required_env_vars: provider.required_env_vars,
            features: provider.features,
            pricing: provider.pricing,
            is_active: provider.is_active,
            is_builtin: false
          })

        if (error) throw error
        toast.success('Provider created successfully')

        // Reset form
        setNewProvider({
          name: '',
          display_name: '',
          provider_class: 'CustomProvider',
          api_base_url: '',
          auth_header_name: 'Authorization',
          auth_header_prefix: 'Bearer',
          required_env_vars: [],
          features: { streaming: false, functions: false, vision: false },
          pricing: {},
          is_active: true,
          is_builtin: false
        })
      }

      await loadProviders()
      setEditingProvider(null)
    } catch (error: any) {
      console.error('Error saving provider:', error)
      toast.error(error.message || 'Failed to save provider')
    }
  }

  async function deleteProvider(providerId: string) {
    if (!confirm('Are you sure? This will affect all models using this provider.')) return

    try {
      const { error } = await supabase
        .from('ai_providers')
        .delete()
        .eq('id', providerId)

      if (error) throw error
      toast.success('Provider deleted successfully')
      await loadProviders()
    } catch (error) {
      console.error('Error deleting provider:', error)
      toast.error('Failed to delete provider')
    }
  }

  function addEnvVar(provider: AIProvider, setProvider: (p: AIProvider) => void) {
    if (newEnvVar && !provider.required_env_vars.includes(newEnvVar)) {
      setProvider({
        ...provider,
        required_env_vars: [...provider.required_env_vars, newEnvVar.toUpperCase().replace(/\s+/g, '_')]
      })
      setNewEnvVar('')
    }
  }

  function removeEnvVar(provider: AIProvider, setProvider: (p: AIProvider) => void, envVar: string) {
    setProvider({
      ...provider,
      required_env_vars: provider.required_env_vars.filter(v => v !== envVar)
    })
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-purple-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Code className="h-6 w-6" />
            <h1 className="text-xl font-bold">Admin Panel - Provider Management</h1>
            <span className="bg-purple-800 px-2 py-1 rounded text-xs">RESTRICTED ACCESS</span>
          </div>
          <div className="flex gap-4">
            <Button
              className="bg-purple-700 text-white hover:bg-purple-800 border-purple-800"
              onClick={() => window.location.href = '/admin/models'}
            >
              <Database className="h-4 w-4 mr-2" />
              Manage Models
            </Button>
            <Button
              className="bg-purple-700 text-white hover:bg-purple-800 border-purple-800"
              onClick={() => window.location.href = '/dashboard'}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Add New Provider */}
        <Card className="mb-6 border-2 border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Custom AI Provider
            </CardTitle>
            <CardDescription>
              Add support for any OpenAI-compatible API endpoint
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Internal Name (unique, lowercase)</Label>
                <Input
                  value={newProvider.name}
                  onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="together-ai"
                />
              </div>
              <div>
                <Label>Display Name</Label>
                <Input
                  value={newProvider.display_name}
                  onChange={(e) => setNewProvider({ ...newProvider, display_name: e.target.value })}
                  placeholder="Together AI"
                />
              </div>
              <div className="col-span-2">
                <Label>API Base URL</Label>
                <Input
                  value={newProvider.api_base_url}
                  onChange={(e) => setNewProvider({ ...newProvider, api_base_url: e.target.value })}
                  placeholder="https://api.together.xyz/v1"
                />
              </div>
              <div>
                <Label>Auth Header Name</Label>
                <Input
                  value={newProvider.auth_header_name}
                  onChange={(e) => setNewProvider({ ...newProvider, auth_header_name: e.target.value })}
                  placeholder="Authorization"
                />
              </div>
              <div>
                <Label>Auth Header Prefix</Label>
                <Input
                  value={newProvider.auth_header_prefix}
                  onChange={(e) => setNewProvider({ ...newProvider, auth_header_prefix: e.target.value })}
                  placeholder="Bearer"
                />
              </div>
              <div className="col-span-2">
                <Label>Required Environment Variables</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newEnvVar}
                    onChange={(e) => setNewEnvVar(e.target.value)}
                    placeholder="TOGETHER_API_KEY"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addEnvVar(newProvider, setNewProvider)
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addEnvVar(newProvider, setNewProvider)}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {newProvider.required_env_vars.map(envVar => (
                    <span key={envVar} className="bg-gray-100 px-2 py-1 rounded text-sm flex items-center gap-1">
                      {envVar}
                      <button
                        onClick={() => removeEnvVar(newProvider, setNewProvider, envVar)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <Label>Features</Label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <Switch
                      checked={newProvider.features.streaming}
                      onCheckedChange={(checked) => setNewProvider({
                        ...newProvider,
                        features: { ...newProvider.features, streaming: checked }
                      })}
                    />
                    Streaming
                  </label>
                  <label className="flex items-center gap-2">
                    <Switch
                      checked={newProvider.features.functions}
                      onCheckedChange={(checked) => setNewProvider({
                        ...newProvider,
                        features: { ...newProvider.features, functions: checked }
                      })}
                    />
                    Functions
                  </label>
                  <label className="flex items-center gap-2">
                    <Switch
                      checked={newProvider.features.vision}
                      onCheckedChange={(checked) => setNewProvider({
                        ...newProvider,
                        features: { ...newProvider.features, vision: checked }
                      })}
                    />
                    Vision
                  </label>
                </div>
              </div>
              <div className="col-span-2">
                <Button
                  onClick={() => saveProvider(newProvider)}
                  disabled={!newProvider.name || !newProvider.display_name}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Provider
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Existing Providers */}
        <Card>
          <CardHeader>
            <CardTitle>Existing Providers ({providers.length})</CardTitle>
            <CardDescription>
              Manage AI provider configurations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {providers.map((provider) => (
                <div key={provider.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{provider.display_name}</h3>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{provider.name}</span>
                        {provider.is_builtin && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Built-in</span>
                        )}
                        {!provider.is_active && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Inactive</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <p>Class: {provider.provider_class}</p>
                        {provider.api_base_url && <p>URL: {provider.api_base_url}</p>}
                        <p>Auth: {provider.auth_header_name}: {provider.auth_header_prefix} [KEY]</p>
                        {provider.required_env_vars.length > 0 && (
                          <p>Env vars: {provider.required_env_vars.join(', ')}</p>
                        )}
                        <p>Features: {Object.entries(provider.features)
                          .filter(([_, v]) => v)
                          .map(([k]) => k)
                          .join(', ') || 'None'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={provider.is_active}
                        onCheckedChange={async (checked) => {
                          await supabase
                            .from('ai_providers')
                            .update({ is_active: checked })
                            .eq('id', provider.id!)
                          await loadProviders()
                        }}
                      />
                      {!provider.is_builtin && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteProvider(provider.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}