'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AddModelDialog } from '@/components/admin/add-model-dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
  Save,
  Edit2,
  X,
  DollarSign,
  Copy,
  Zap,
  FileText,
  Hash,
  Brain,
  GripVertical,
  Wifi,
  WifiOff,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Model {
  id: string
  name: string
  display_name: string
  provider: string
  model_id: string
  context_window: number
  max_tokens: number
  description: string | null
  is_active: boolean
  updated_at: string
  message_credits: number
  input_price_per_million: number | null
  output_price_per_million: number | null
  supports_vision: boolean
  supports_functions: boolean
  supports_streaming: boolean
  speed: 'fast' | 'medium' | 'slow' | null
  sort_order: number
  last_test_status?: 'untested' | 'testing' | 'success' | 'error' | null
  last_test_message?: string | null
  last_tested_at?: string | null
}


// SortableRow component for drag and drop
function SortableRow({ model, children }: { model: Model; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: model.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-gray-50' : ''}>
      <TableCell className="w-12">
        <div {...attributes} {...listeners} className="cursor-move p-1 hover:bg-gray-100 rounded">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      </TableCell>
      {children}
    </TableRow>
  )
}

import { useRouter } from 'next/navigation'

export default function ModelsPage() {
  const router = useRouter()
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterProvider, setFilterProvider] = useState<string>('all')
  const [testingModels, setTestingModels] = useState<Set<string>>(new Set())
  const [editingRow, setEditingRow] = useState<string | null>(null)
  const [editingValues, setEditingValues] = useState<Model | null>(null)
  const [showInactive, setShowInactive] = useState(true)
  const supabase = createClient()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchModels = async () => {
    const { data, error } = await supabase
      .from('ai_models')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('provider')
      .order('display_name')

    if (error) {
      console.error('Error fetching models:', error)
      toast.error('Failed to fetch models')
      return
    }

    setModels(data || [])
  }

  useEffect(() => {
    fetchModels().finally(() => setLoading(false))
  }, [])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = models.findIndex((model) => model.id === active.id)
      const newIndex = models.findIndex((model) => model.id === over?.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newModels = arrayMove(models, oldIndex, newIndex)
        setModels(newModels)

        // Update sort_order in the database
        const updates = newModels.map((model, index) => ({
          id: model.id,
          sort_order: index
        }))

        for (const update of updates) {
          await supabase
            .from('ai_models')
            .update({ sort_order: update.sort_order })
            .eq('id', update.id)
        }

        toast.success('Model order updated')
      }
    }
  }

  const syncModels = async () => {
    setSyncing(true)

    try {
      const response = await fetch('/api/cron/sync-models', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Models synced: ${data.discovered} discovered, ${data.added} added, ${data.updated} updated`)
        await fetchModels()
      } else {
        toast.error(data.error || 'Failed to sync models')
      }
    } catch (error) {
      console.error('Error syncing models:', error)
      toast.error('Failed to sync models')
    } finally {
      setSyncing(false)
    }
  }

  const toggleModel = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('ai_models')
      .update({ is_active: isActive })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update model')
      return
    }

    setModels(prev => prev.map(model =>
      model.id === id ? { ...model, is_active: isActive } : model
    ))

    toast.success(`Model ${isActive ? 'enabled' : 'disabled'}`)
  }

  const deleteModel = async (id: string) => {
    const { error } = await supabase
      .from('ai_models')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete model')
      return
    }

    setModels(prev => prev.filter(model => model.id !== id))
    toast.success('Model deleted')
  }

  const testConnection = async (model: Model) => {
    setTestingModels(prev => new Set(prev).add(model.id))

    // Update model status to testing
    setModels(prev => prev.map(m =>
      m.id === model.id ? { ...m, last_test_status: 'testing' } : m
    ))

    try {
      const response = await fetch('/api/admin/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      })

      const result = await response.json()

      const testStatus = result.success ? 'success' : 'error'
      const testMessage = result.success ? 'Connection successful' : (result.error || 'Connection failed')
      const now = new Date().toISOString()

      // Update database with test result
      const { error: updateError } = await supabase
        .from('ai_models')
        .update({
          last_test_status: testStatus,
          last_test_message: testMessage,
          last_tested_at: now
        })
        .eq('id', model.id)

      if (updateError) {
        console.error('Failed to update test status:', updateError)
      }

      // Update local state
      setModels(prev => prev.map(m =>
        m.id === model.id
          ? { ...m, last_test_status: testStatus, last_test_message: testMessage, last_tested_at: now }
          : m
      ))

      if (result.success) {
        toast.success(`${model.display_name} connected successfully`)
      } else {
        toast.error(`${model.display_name} failed: ${result.error}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed'

      // Update database with error
      await supabase
        .from('ai_models')
        .update({
          last_test_status: 'error',
          last_test_message: errorMessage,
          last_tested_at: new Date().toISOString()
        })
        .eq('id', model.id)

      setModels(prev => prev.map(m =>
        m.id === model.id
          ? { ...m, last_test_status: 'error', last_test_message: errorMessage }
          : m
      ))

      toast.error(`Test failed: ${errorMessage}`)
    } finally {
      setTestingModels(prev => {
        const next = new Set(prev)
        next.delete(model.id)
        return next
      })
    }
  }

  const testAllModels = async () => {
    // Get unique providers from active models
    const activeModels = filteredModels.filter(m => m.is_active)
    const providers = [...new Set(activeModels.map(m => m.provider))]

    // Create selection dialog
    const selectedProviders = await new Promise<string[] | null>((resolve) => {
      const dialog = document.createElement('div')
      dialog.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50'
      dialog.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold mb-4">Select Providers to Test</h3>
          <div class="space-y-2 mb-4">
            ${providers.map(p => `
              <label class="flex items-center space-x-2">
                <input type="checkbox" value="${p}" checked class="rounded border-gray-300" />
                <span class="capitalize">${p}</span>
              </label>
            `).join('')}
          </div>
          <div class="flex justify-end gap-2">
            <button class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" onclick="this.closest('div').remove(); window.testProvidersResolve(null)">
              Cancel
            </button>
            <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onclick="
              const checkboxes = this.closest('div').querySelectorAll('input[type=checkbox]:checked');
              const selected = Array.from(checkboxes).map(cb => cb.value);
              this.closest('div').remove();
              window.testProvidersResolve(selected);
            ">
              Test Selected
            </button>
          </div>
        </div>
      `

      document.body.appendChild(dialog)

      // Store resolver globally temporarily
      ;(window as any).testProvidersResolve = resolve
    })

    // Clean up global resolver
    delete (window as any).testProvidersResolve

    if (!selectedProviders || selectedProviders.length === 0) {
      return
    }

    // Filter models to test
    const modelsToTest = activeModels.filter(m => selectedProviders.includes(m.provider))

    toast.info(`Testing ${modelsToTest.length} models from ${selectedProviders.join(', ')}...`)

    // Test each model sequentially
    for (const model of modelsToTest) {
      await testConnection(model)
    }

    toast.success('All tests completed')
  }

  const duplicateModel = async (model: Model) => {
    const newModel = {
      ...model,
      id: undefined,
      display_name: `${model.display_name} (Copy)`,
      model_id: `${model.model_id}-copy`,
      is_active: false,
    }

    delete (newModel as any).id
    delete (newModel as any).created_at
    delete (newModel as any).updated_at
    delete (newModel as any).last_test_status
    delete (newModel as any).last_test_message
    delete (newModel as any).last_tested_at

    const { data, error } = await supabase
      .from('ai_models')
      .insert([newModel])
      .select()
      .single()

    if (error) {
      toast.error('Failed to duplicate model')
      return
    }

    setModels(prev => [...prev, data])
    toast.success('Model duplicated')
  }

  const startEditingRow = (model: Model) => {
    setEditingRow(model.id)
    setEditingValues({ ...model })
  }

  const saveRowEdit = async () => {
    if (!editingRow || !editingValues) return

    const { error } = await supabase
      .from('ai_models')
      .update({
        model_id: editingValues.model_id,
        display_name: editingValues.display_name,
        message_credits: editingValues.message_credits,
        input_price_per_million: editingValues.input_price_per_million,
        output_price_per_million: editingValues.output_price_per_million,
        context_window: editingValues.context_window,
      })
      .eq('id', editingRow)

    if (error) {
      toast.error('Failed to update model')
      return
    }

    setModels(prev => prev.map(model =>
      model.id === editingRow ? editingValues : model
    ))

    setEditingRow(null)
    setEditingValues(null)
    toast.success('Model updated')
  }

  const cancelRowEdit = () => {
    setEditingRow(null)
    setEditingValues(null)
  }

  const renderEditableCell = (model: Model, field: keyof Model, type: 'text' | 'number' = 'text') => {
    const isEditingThisRow = editingRow === model.id
    const value = isEditingThisRow && editingValues ? editingValues[field] : model[field]

    if (isEditingThisRow && editingValues) {
      return (
        <Input
          type={type}
          value={value as any || ''}
          onChange={(e) => {
            const newValue = type === 'number' ?
              (e.target.value === '' ? null : Number(e.target.value)) :
              e.target.value
            setEditingValues({ ...editingValues, [field]: newValue })
          }}
          className="h-7 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveRowEdit()
            if (e.key === 'Escape') cancelRowEdit()
          }}
        />
      )
    }

    return <span className="text-sm">{value as any || '-'}</span>
  }

  const renderBooleanToggle = (model: Model, field: keyof Model, icon: React.ReactNode, offIcon?: React.ReactNode) => {
    const value = model[field] as boolean

    return (
      <button
        onClick={async () => {
          const newValue = !value
          const { error } = await supabase
            .from('ai_models')
            .update({ [field]: newValue })
            .eq('id', model.id)

          if (!error) {
            setModels(prev => prev.map(m =>
              m.id === model.id ? { ...m, [field]: newValue } : m
            ))
            toast.success(`${field.replace(/_/g, ' ')} ${newValue ? 'enabled' : 'disabled'}`)
          }
        }}
        className="p-1 hover:bg-gray-100 rounded transition-colors"
      >
        {value ? icon : (offIcon || <span className="opacity-30">{icon}</span>)}
      </button>
    )
  }

  const bulkToggle = async (action: 'enable_all' | 'disable_all' | 'enable_tested' | 'disable_untested') => {
    let updates: { id: string; is_active: boolean }[] = []

    switch (action) {
      case 'enable_all':
        updates = filteredModels.map(m => ({ id: m.id, is_active: true }))
        break
      case 'disable_all':
        updates = filteredModels.map(m => ({ id: m.id, is_active: false }))
        break
      case 'enable_tested':
        updates = filteredModels
          .filter(m => m.last_test_status === 'success')
          .map(m => ({ id: m.id, is_active: true }))
        break
      case 'disable_untested':
        updates = filteredModels
          .filter(m => !m.last_test_status || m.last_test_status === 'error')
          .map(m => ({ id: m.id, is_active: false }))
        break
    }

    if (updates.length === 0) {
      toast.info('No models to update')
      return
    }

    // Update each model
    for (const update of updates) {
      await supabase
        .from('ai_models')
        .update({ is_active: update.is_active })
        .eq('id', update.id)
    }

    // Update local state
    setModels(prev => {
      const updateMap = new Map(updates.map(u => [u.id, u.is_active]))
      return prev.map(model => {
        if (updateMap.has(model.id)) {
          return { ...model, is_active: updateMap.get(model.id)! }
        }
        return model
      })
    })

    toast.success(`Updated ${updates.length} models`)
  }

  const getTestStatusIcon = (model: Model) => {
    if (!model.last_test_status || model.last_test_status === 'untested') {
      return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
    if (model.last_test_status === 'testing') {
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
    }
    if (model.last_test_status === 'success') {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return <AlertCircle className="h-4 w-4 text-red-500" />
  }

  const getCreditBadgeColor = (credits: number) => {
    if (credits === 1) return 'bg-green-100 text-green-800'
    if (credits <= 5) return 'bg-yellow-100 text-yellow-800'
    if (credits <= 10) return 'bg-orange-100 text-orange-800'
    return 'bg-red-100 text-red-800'
  }

  // Filter models based on search and provider
  const filteredModels = models.filter(model => {
    const matchesSearch = searchQuery === '' ||
      model.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.model_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.provider.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesProvider = filterProvider === 'all' || model.provider === filterProvider
    const matchesActive = showInactive || model.is_active

    return matchesSearch && matchesProvider && matchesActive
  })

  // Get unique providers
  const providers = [...new Set(models.map(m => m.provider))]

  // Stats
  const activeModels = models.filter(m => m.is_active).length
  const totalModels = models.length
  const testedModels = models.filter(m => m.last_test_status === 'success').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Model Management</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={syncModels}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Models
          </Button>
          <AddModelDialog onModelAdded={fetchModels} providers={providers} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Models</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalModels}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Models</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeModels}</div>
            <p className="text-xs text-muted-foreground">
              {((activeModels / totalModels) * 100).toFixed(0)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tested Models</CardTitle>
            <Zap className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{testedModels}</div>
            <p className="text-xs text-muted-foreground">
              Successfully connected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Providers</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{providers.length}</div>
            <p className="text-xs text-muted-foreground">
              Unique providers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select value={filterProvider} onValueChange={setFilterProvider}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All providers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All providers</SelectItem>
              {providers.map(provider => (
                <SelectItem key={provider} value={provider}>
                  <span className="capitalize">{provider}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 px-3 border rounded-md">
            <Switch
              checked={showInactive}
              onCheckedChange={setShowInactive}
              id="show-inactive"
            />
            <Label htmlFor="show-inactive" className="text-sm cursor-pointer">
              Show inactive
            </Label>
          </div>
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <ToggleLeft className="h-4 w-4 mr-2" />
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => bulkToggle('enable_all')}>
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                Enable All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkToggle('disable_all')}>
                <X className="h-4 w-4 mr-2 text-red-500" />
                Disable All
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => bulkToggle('enable_tested')}>
                <CheckCircle className="h-4 w-4 mr-2 text-blue-500" />
                Enable Tested Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkToggle('disable_untested')}>
                <AlertCircle className="h-4 w-4 mr-2 text-orange-500" />
                Disable Untested/Failed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            onClick={testAllModels}
            disabled={filteredModels.filter(m => m.is_active).length === 0}
          >
            <Brain className="h-4 w-4 mr-2" />
            Test All
          </Button>
        </div>
      </div>

      {/* Models Table */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b">
              <TabsTrigger value="table">Table View</TabsTrigger>
              <TabsTrigger value="grid">Grid View</TabsTrigger>
            </TabsList>

            <TabsContent value="table" className="mt-0">
              <div className="overflow-x-auto">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="w-[50px]">Active</TableHead>
                        <TableHead>Model Code (API)</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Credits</TableHead>
                        <TableHead className="text-center">$/M In</TableHead>
                        <TableHead className="text-center">$/M Out</TableHead>
                        <TableHead>Speed</TableHead>
                        <TableHead className="text-center">Vision</TableHead>
                        <TableHead className="text-center">Functions</TableHead>
                        <TableHead className="text-center">Stream</TableHead>
                        <TableHead>Context</TableHead>
                        <TableHead className="text-center">Test</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                      <SortableContext
                        items={filteredModels.map(m => m.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {filteredModels.map((model) => (
                          <SortableRow key={model.id} model={model}>
                            <TableCell>
                              <Switch
                                checked={model.is_active}
                                onCheckedChange={(checked) => toggleModel(model.id, checked)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {renderEditableCell(model, 'model_id')}
                            </TableCell>
                            <TableCell>
                              {renderEditableCell(model, 'display_name')}
                            </TableCell>
                            <TableCell className="text-center">
                              {editingRow === model.id && editingValues ? (
                                <Input
                                  type="number"
                                  value={editingValues.message_credits || ''}
                                  onChange={(e) => setEditingValues({ ...editingValues, message_credits: Number(e.target.value) })}
                                  className="h-7 text-sm w-16 text-center"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveRowEdit()
                                    if (e.key === 'Escape') cancelRowEdit()
                                  }}
                                />
                              ) : (
                                <Badge className={getCreditBadgeColor(model.message_credits)}>
                                  {model.message_credits}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {renderEditableCell(model, 'input_price_per_million', 'number')}
                            </TableCell>
                            <TableCell className="text-center">
                              {renderEditableCell(model, 'output_price_per_million', 'number')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={model.speed === 'fast' ? 'default' : model.speed === 'slow' ? 'secondary' : 'outline'}>
                                {model.speed || 'medium'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {renderBooleanToggle(model, 'supports_vision',
                                <Eye className="h-4 w-4 text-green-500" />,
                                <EyeOff className="h-4 w-4 text-gray-300" />
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {renderBooleanToggle(model, 'supports_functions',
                                <Settings className="h-4 w-4 text-green-500" />,
                                <Settings className="h-4 w-4 text-gray-300" />
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {renderBooleanToggle(model, 'supports_streaming',
                                <Wifi className="h-4 w-4 text-green-500" />,
                                <WifiOff className="h-4 w-4 text-gray-300" />
                              )}
                            </TableCell>
                            <TableCell>
                              {renderEditableCell(model, 'context_window', 'number')}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => testConnection(model)}
                                disabled={testingModels.has(model.id)}
                                title={model.last_test_message || 'Test connection'}
                              >
                                {testingModels.has(model.id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  getTestStatusIcon(model)
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {editingRow === model.id ? (
                                    <>
                                      <DropdownMenuItem onClick={saveRowEdit}>
                                        <Save className="h-4 w-4 mr-2" />
                                        Save Changes
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={cancelRowEdit}>
                                        <X className="h-4 w-4 mr-2" />
                                        Cancel Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                  ) : (
                                    <DropdownMenuItem onClick={() => startEditingRow(model)}>
                                      <Edit2 className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => duplicateModel(model)}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => testConnection(model)}>
                                    <Brain className="h-4 w-4 mr-2" />
                                    Test Connection
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => deleteModel(model.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </SortableRow>
                        ))}
                      </SortableContext>
                    </TableBody>
                  </Table>
                </DndContext>
              </div>
            </TabsContent>

            <TabsContent value="grid" className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredModels.map((model) => (
                  <Card key={model.id} className={!model.is_active ? 'opacity-60' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            {model.display_name}
                            {testingModels.has(model.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              getTestStatusIcon(model)
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs mt-1">
                            <span className="font-mono">{model.model_id}</span>
                            <Badge variant="outline" className="ml-2 capitalize">
                              {model.provider}
                            </Badge>
                          </CardDescription>
                        </div>
                        <Switch
                          checked={model.is_active}
                          onCheckedChange={(checked) => toggleModel(model.id, checked)}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Features */}
                      <div className="flex gap-2">
                        {model.supports_vision && (
                          <Badge variant="secondary" className="text-xs">
                            <Eye className="h-3 w-3 mr-1" />
                            Vision
                          </Badge>
                        )}
                        {model.supports_functions && (
                          <Badge variant="secondary" className="text-xs">
                            <Settings className="h-3 w-3 mr-1" />
                            Functions
                          </Badge>
                        )}
                        {model.supports_streaming && (
                          <Badge variant="secondary" className="text-xs">
                            <Wifi className="h-3 w-3 mr-1" />
                            Streaming
                          </Badge>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Context:</span>
                          <span className="ml-1 font-medium">
                            {model.context_window?.toLocaleString() || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Speed:</span>
                          <Badge variant="outline" className="ml-1 text-xs">
                            {model.speed || 'medium'}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Credits:</span>
                          <Badge className={`ml-1 text-xs ${getCreditBadgeColor(model.message_credits)}`}>
                            {model.message_credits}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Price:</span>
                          <span className="ml-1 font-medium">
                            ${model.input_price_per_million || 0}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => testConnection(model)}
                          disabled={testingModels.has(model.id)}
                        >
                          {testingModels.has(model.id) ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <Brain className="h-3 w-3 mr-1" />
                              Test
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => duplicateModel(model)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteModel(model.id)}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}