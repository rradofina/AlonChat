'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  RefreshCw,
  Database,
  Globe,
  Cpu,
  Eye,
  EyeOff,
  Settings,
  AlertCircle,
  CheckCircle,
  Loader2,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'

interface Model {
  id: string
  name: string
  display_name: string
  provider: string
  model_id: string
  context_window: number
  max_tokens: number
  description: string
  is_active: boolean
  updated_at: string
  request_template?: {
    capabilities?: {
      vision?: boolean
      functions?: boolean
      streaming?: boolean
    }
    metadata?: Record<string, any>
  }
}

export default function ModelsAdminPage() {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [discovering, setDiscovering] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [selectedProvider, setSelectedProvider] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadModels()
    loadStats()
  }, [])

  async function loadModels() {
    try {
      const { data } = await supabase
        .from('ai_models')
        .select('*')
        .order('provider')
        .order('sort_order')

      setModels(data || [])
    } catch (error) {
      console.error('Error loading models:', error)
      toast.error('Failed to load models')
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    try {
      const response = await fetch('/api/admin/discover-models')
      const data = await response.json()
      setStats(data.stats)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  async function discoverModels() {
    setDiscovering(true)
    try {
      const response = await fetch('/api/admin/discover-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Discovered ${result.modelsCount} models from provider APIs`)
        await loadModels()
        await loadStats()
      } else {
        toast.error(result.message || 'Failed to discover models')
      }
    } catch (error) {
      console.error('Error discovering models:', error)
      toast.error('Failed to discover models')
    } finally {
      setDiscovering(false)
    }
  }

  async function toggleModel(modelId: string, isActive: boolean) {
    try {
      const { error } = await supabase
        .from('ai_models')
        .update({ is_active: !isActive })
        .eq('id', modelId)

      if (!error) {
        toast.success(`Model ${isActive ? 'disabled' : 'enabled'}`)
        await loadModels()
      } else {
        toast.error('Failed to update model')
      }
    } catch (error) {
      console.error('Error updating model:', error)
      toast.error('Failed to update model')
    }
  }

  async function deleteModel(modelId: string) {
    if (!confirm('Are you sure you want to delete this model?')) return

    try {
      const { error } = await supabase
        .from('ai_models')
        .delete()
        .eq('id', modelId)

      if (!error) {
        toast.success('Model deleted')
        await loadModels()
      } else {
        toast.error('Failed to delete model')
      }
    } catch (error) {
      console.error('Error deleting model:', error)
      toast.error('Failed to delete model')
    }
  }

  const filteredModels = models.filter(m => {
    if (selectedProvider !== 'all' && m.provider !== selectedProvider) return false
    if (!showInactive && !m.is_active) return false
    return true
  })

  const providers = [...new Set(models.map(m => m.provider))]

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Models Management</h1>
        <p className="text-gray-600 mt-1">
          Dynamically discover and manage AI models from provider APIs
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Models</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || models.length}</div>
            <p className="text-xs text-gray-500">{stats?.active || models.filter(m => m.is_active).length} active</p>
          </CardContent>
        </Card>

        {providers.map(provider => (
          <Card key={provider}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium capitalize">{provider}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {models.filter(m => m.provider === provider).length}
              </div>
              <p className="text-xs text-gray-500">models</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions Bar */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Model Discovery</CardTitle>
              <CardDescription>
                Automatically fetch latest models from OpenAI, Google, and Anthropic APIs
              </CardDescription>
            </div>
            <Button onClick={discoverModels} disabled={discovering}>
              {discovering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Discovering...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Discover Models
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              No hardcoding - fetches directly from APIs
            </div>
            <div className="flex items-center gap-1">
              <Globe className="h-4 w-4 text-blue-500" />
              Auto-updates capabilities and limits
            </div>
            <div className="flex items-center gap-1">
              <Database className="h-4 w-4 text-purple-500" />
              Syncs to database automatically
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <select
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="all">All Providers</option>
          {providers.map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>

        <Button
          variant="outline"
          onClick={() => setShowInactive(!showInactive)}
          className="flex items-center gap-2"
        >
          {showInactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {showInactive ? 'Showing All' : 'Active Only'}
        </Button>
      </div>

      {/* Models List */}
      <div className="grid gap-4">
        {filteredModels.map((model) => (
          <Card key={model.id} className={!model.is_active ? 'opacity-60' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{model.display_name}</h3>
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                      {model.provider}
                    </span>
                    {model.is_active ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                        Inactive
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{model.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Model ID:</span>
                      <p className="font-mono text-xs mt-1">{model.model_id}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Context:</span>
                      <p className="font-semibold">{model.context_window?.toLocaleString()} tokens</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Max Output:</span>
                      <p className="font-semibold">{model.max_tokens?.toLocaleString()} tokens</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Updated:</span>
                      <p className="font-semibold">
                        {new Date(model.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {model.request_template?.capabilities && (
                    <div className="flex items-center gap-3 mt-3 text-xs">
                      {model.request_template.capabilities.vision && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded">
                          <Eye className="h-3 w-3" />
                          Vision
                        </span>
                      )}
                      {model.request_template.capabilities.functions && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded">
                          <Settings className="h-3 w-3" />
                          Functions
                        </span>
                      )}
                      {model.request_template.capabilities.streaming && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded">
                          <Cpu className="h-3 w-3" />
                          Streaming
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleModel(model.id, model.is_active)}
                  >
                    {model.is_active ? (
                      <ToggleRight className="h-5 w-5 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-gray-400" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteModel(model.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">
              No models found. Click "Discover Models" to fetch from provider APIs.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}