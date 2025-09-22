'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Plus, Save, Trash2, Settings, Key, Database } from 'lucide-react'

interface AIModel {
  id?: string
  name: string
  display_name: string
  provider: string
  model_id: string
  description?: string
  context_window?: number
  max_tokens?: number
  is_active: boolean
  sort_order: number
}

interface AIProvider {
  id: string
  name: string
  display_name: string
  provider_class: string
  api_base_url?: string
  required_env_vars: string[]
  is_active: boolean
  is_builtin: boolean
}

export default function AdminModelsPage() {
  const [models, setModels] = useState<AIModel[]>([])
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [editingModel, setEditingModel] = useState<AIModel | null>(null)
  const [newModel, setNewModel] = useState<AIModel>({
    name: '',
    display_name: '',
    provider: '',
    model_id: '',
    description: '',
    context_window: 128000,
    max_tokens: 4096,
    is_active: true,
    sort_order: 999
  })
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  async function checkAdminAccess() {
    const { data: { user } } = await supabase.auth.getUser()

    // Add your admin user IDs here
    const adminUserIds = [
      'your-user-id-here', // Replace with your actual user ID
    ]

    // For development, allow all authenticated users
    // Remove this in production
    if (user) {
      loadData()
    } else {
      window.location.href = '/login'
    }
  }

  async function loadData() {
    try {
      // Load models
      const { data: modelsData } = await supabase
        .from('ai_models')
        .select('*')
        .order('sort_order')

      // Load providers
      const { data: providersData } = await supabase
        .from('ai_providers')
        .select('*')
        .order('display_name')

      setModels(modelsData || [])
      setProviders(providersData || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function saveModel(model: AIModel) {
    try {
      if (model.id) {
        // Update existing model
        const { error } = await supabase
          .from('ai_models')
          .update({
            display_name: model.display_name,
            provider: model.provider,
            model_id: model.model_id,
            description: model.description,
            context_window: model.context_window,
            max_tokens: model.max_tokens,
            is_active: model.is_active,
            sort_order: model.sort_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', model.id)

        if (error) throw error
        toast.success('Model updated successfully')
      } else {
        // Create new model
        const { error } = await supabase
          .from('ai_models')
          .insert({
            name: model.name,
            display_name: model.display_name,
            provider: model.provider,
            model_id: model.model_id,
            description: model.description,
            context_window: model.context_window,
            max_tokens: model.max_tokens,
            is_active: model.is_active,
            sort_order: model.sort_order
          })

        if (error) throw error
        toast.success('Model created successfully')

        // Reset new model form
        setNewModel({
          name: '',
          display_name: '',
          provider: '',
          model_id: '',
          description: '',
          context_window: 128000,
          max_tokens: 4096,
          is_active: true,
          sort_order: 999
        })
      }

      await loadData()
      setEditingModel(null)
    } catch (error: any) {
      console.error('Error saving model:', error)
      toast.error(error.message || 'Failed to save model')
    }
  }

  async function deleteModel(modelId: string) {
    if (!confirm('Are you sure you want to delete this model?')) return

    try {
      const { error } = await supabase
        .from('ai_models')
        .delete()
        .eq('id', modelId)

      if (error) throw error
      toast.success('Model deleted successfully')
      await loadData()
    } catch (error) {
      console.error('Error deleting model:', error)
      toast.error('Failed to delete model')
    }
  }

  async function toggleModelStatus(modelId: string, isActive: boolean) {
    try {
      const { error } = await supabase
        .from('ai_models')
        .update({ is_active: isActive })
        .eq('id', modelId)

      if (error) throw error
      await loadData()
    } catch (error) {
      console.error('Error updating model status:', error)
      toast.error('Failed to update model status')
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-red-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6" />
            <h1 className="text-xl font-bold">Admin Panel - Model Management</h1>
            <span className="bg-red-800 px-2 py-1 rounded text-xs">RESTRICTED ACCESS</span>
          </div>
          <div className="flex gap-4">
            <Button
              variant="outline"
              className="text-white border-white hover:bg-red-700"
              onClick={() => window.location.href = '/admin/providers'}
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Providers
            </Button>
            <Button
              variant="outline"
              className="text-white border-white hover:bg-red-700"
              onClick={() => window.location.href = '/dashboard'}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Add New Model */}
        <Card className="mb-6 border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New AI Model
            </CardTitle>
            <CardDescription>
              Add a new model to the system. Users will be able to select this model if they have the required API keys.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Internal Name (unique, lowercase)</Label>
                <Input
                  value={newModel.name}
                  onChange={(e) => setNewModel({ ...newModel, name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="gpt-4-turbo"
                />
              </div>
              <div>
                <Label>Display Name</Label>
                <Input
                  value={newModel.display_name}
                  onChange={(e) => setNewModel({ ...newModel, display_name: e.target.value })}
                  placeholder="GPT-4 Turbo"
                />
              </div>
              <div>
                <Label>Provider</Label>
                <Select value={newModel.provider} onValueChange={(v) => setNewModel({ ...newModel, provider: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map(p => (
                      <SelectItem key={p.id} value={p.name}>{p.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Model ID (API identifier)</Label>
                <Input
                  value={newModel.model_id}
                  onChange={(e) => setNewModel({ ...newModel, model_id: e.target.value })}
                  placeholder="gpt-4-1106-preview"
                />
              </div>
              <div>
                <Label>Context Window</Label>
                <Input
                  type="number"
                  value={newModel.context_window}
                  onChange={(e) => setNewModel({ ...newModel, context_window: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Max Tokens</Label>
                <Input
                  type="number"
                  value={newModel.max_tokens}
                  onChange={(e) => setNewModel({ ...newModel, max_tokens: parseInt(e.target.value) })}
                />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Input
                  value={newModel.description}
                  onChange={(e) => setNewModel({ ...newModel, description: e.target.value })}
                  placeholder="Advanced model for complex tasks"
                />
              </div>
              <div className="col-span-2">
                <Button
                  onClick={() => saveModel(newModel)}
                  disabled={!newModel.name || !newModel.display_name || !newModel.provider || !newModel.model_id}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Model
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Existing Models */}
        <Card>
          <CardHeader>
            <CardTitle>Existing Models ({models.length})</CardTitle>
            <CardDescription>
              Manage all AI models available in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {models.map((model) => (
                <div key={model.id} className="border rounded-lg p-4">
                  {editingModel?.id === model.id ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Display Name</Label>
                        <Input
                          value={editingModel.display_name}
                          onChange={(e) => setEditingModel({ ...editingModel, display_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Model ID</Label>
                        <Input
                          value={editingModel.model_id}
                          onChange={(e) => setEditingModel({ ...editingModel, model_id: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Context Window</Label>
                        <Input
                          type="number"
                          value={editingModel.context_window}
                          onChange={(e) => setEditingModel({ ...editingModel, context_window: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Max Tokens</Label>
                        <Input
                          type="number"
                          value={editingModel.max_tokens}
                          onChange={(e) => setEditingModel({ ...editingModel, max_tokens: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Sort Order</Label>
                        <Input
                          type="number"
                          value={editingModel.sort_order}
                          onChange={(e) => setEditingModel({ ...editingModel, sort_order: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Description</Label>
                        <Input
                          value={editingModel.description}
                          onChange={(e) => setEditingModel({ ...editingModel, description: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2 flex gap-2">
                        <Button onClick={() => saveModel(editingModel)}>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button variant="outline" onClick={() => setEditingModel(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{model.display_name}</h3>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">{model.name}</span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{model.provider}</span>
                          {!model.is_active && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Inactive</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{model.description}</p>
                        <div className="flex gap-4 text-xs text-gray-500 mt-1">
                          <span>Model ID: {model.model_id}</span>
                          <span>Context: {model.context_window?.toLocaleString()}</span>
                          <span>Max Tokens: {model.max_tokens?.toLocaleString()}</span>
                          <span>Order: {model.sort_order}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={model.is_active}
                          onCheckedChange={(checked) => toggleModelStatus(model.id!, checked)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingModel(model)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteModel(model.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{models.filter(m => m.is_active).length}</div>
              <p className="text-xs text-gray-500">Active Models</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{providers.length}</div>
              <p className="text-xs text-gray-500">Providers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{models.filter(m => m.provider === 'openai').length}</div>
              <p className="text-xs text-gray-500">OpenAI Models</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{models.filter(m => m.provider === 'google').length}</div>
              <p className="text-xs text-gray-500">Google Models</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}