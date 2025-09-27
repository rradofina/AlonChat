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

interface EditingModel {
  id: string
  field: string
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

export default function ModelsAdminPage() {
  const router = useRouter()
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [discovering, setDiscovering] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<string>('all')
  const [editingCell, setEditingCell] = useState<EditingModel | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [testingAll, setTestingAll] = useState(false)
  const [testProgress, setTestProgress] = useState({ current: 0, total: 0 })
  const supabase = createClient()

  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .order('provider')
        .order('message_credits')
        .order('sort_order')

      if (error) throw error
      setModels(data || [])
    } catch (error) {
      console.error('Error loading models:', error)
      toast.error('Failed to load models')
    } finally {
      setLoading(false)
    }
  }

  const testModelConnection = async (model: Model) => {
    // Update local state to show testing
    setModels(prev => prev.map(m =>
      m.id === model.id ? { ...m, last_test_status: 'testing' as const } : m
    ))

    try {
      const response = await fetch('/api/admin/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: model.provider,
          modelId: model.model_id
        })
      })

      const result = await response.json()

      const testStatus = result.success ? 'success' : 'error'
      const testMessage = result.success ? result.message : result.error
      const testedAt = new Date().toISOString()

      // Update database
      const { error: updateError } = await supabase
        .from('ai_models')
        .update({
          last_test_status: testStatus,
          last_test_message: testMessage,
          last_tested_at: testedAt
        })
        .eq('id', model.id)

      if (updateError) {
        console.error('Failed to save test status:', updateError)
      }

      // Update local state
      setModels(prev => prev.map(m =>
        m.id === model.id
          ? { ...m, last_test_status: testStatus, last_test_message: testMessage, last_tested_at: testedAt }
          : m
      ))

      if (result.success) {
        toast.success(`${model.display_name} test successful`)
      } else {
        toast.error(result.error || `${model.display_name} test failed`)
      }
    } catch (error) {
      console.error('Model test error:', error)

      // Update database with error
      const testMessage = 'Test failed'
      const testedAt = new Date().toISOString()

      await supabase
        .from('ai_models')
        .update({
          last_test_status: 'error',
          last_test_message: testMessage,
          last_tested_at: testedAt
        })
        .eq('id', model.id)

      // Update local state
      setModels(prev => prev.map(m =>
        m.id === model.id
          ? { ...m, last_test_status: 'error' as const, last_test_message: testMessage, last_tested_at: testedAt }
          : m
      ))

      toast.error('Model test failed')
    }
  }

  const discoverModels = async () => {
    try {
      setDiscovering(true)
      const response = await fetch('/api/admin/discover-models', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to discover models')
      }

      const result = await response.json()
      toast.success(`Discovered ${result.discovered} models from ${result.providers} providers`)
      await loadModels()
    } catch (error) {
      console.error('Error discovering models:', error)
      toast.error('Failed to discover models')
    } finally {
      setDiscovering(false)
    }
  }

  const toggleModel = async (modelId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_models')
        .update({ is_active: isActive })
        .eq('id', modelId)

      if (error) throw error

      setModels(prev => prev.map(m =>
        m.id === modelId ? { ...m, is_active: isActive } : m
      ))

      toast.success(`Model ${isActive ? 'enabled' : 'disabled'}`)
    } catch (error) {
      console.error('Error toggling model:', error)
      toast.error('Failed to update model')
    }
  }

  const deleteModel = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return

    try {
      const { error } = await supabase
        .from('ai_models')
        .delete()
        .eq('id', modelId)

      if (error) throw error

      setModels(prev => prev.filter(m => m.id !== modelId))
      toast.success('Model deleted')
    } catch (error) {
      console.error('Error deleting model:', error)
      toast.error('Failed to delete model')
    }
  }

  const duplicateModel = async (model: Model) => {
    try {
      // Generate a unique name by appending a number
      const existingNames = models.filter(m => m.name.startsWith(model.name)).map(m => m.name)
      let copyNumber = 1
      let newName = `${model.name}-copy`
      while (existingNames.includes(newName)) {
        copyNumber++
        newName = `${model.name}-copy-${copyNumber}`
      }

      // Create the duplicate with modified name and model_id
      const newModel = {
        ...model,
        name: newName,
        model_id: `${model.model_id}-copy`,
        display_name: `${model.display_name} (Copy)`,
        is_active: false // Start as inactive
      }

      // Remove the id field so a new one is generated
      delete (newModel as any).id
      delete (newModel as any).created_at
      delete (newModel as any).updated_at

      const { data, error } = await supabase
        .from('ai_models')
        .insert([newModel])
        .select()
        .single()

      if (error) throw error

      setModels(prev => [...prev, data])
      toast.success(`Created copy: ${newName}`)
    } catch (error) {
      console.error('Error duplicating model:', error)
      toast.error('Failed to duplicate model')
    }
  }

  const toggleBooleanField = async (modelId: string, field: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_models')
        .update({ [field]: !currentValue })
        .eq('id', modelId)

      if (error) throw error

      setModels(prev => prev.map(m =>
        m.id === modelId ? { ...m, [field]: !currentValue } : m
      ))

      toast.success('Model updated')
    } catch (error) {
      console.error('Error updating model:', error)
      toast.error('Failed to update model')
    }
  }

  const startEdit = (modelId: string, field: string, currentValue: any) => {
    setEditingCell({ id: modelId, field })
    setEditValues({ [`${modelId}-${field}`]: currentValue ?? '' })
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValues({})
  }

  const saveEdit = async (modelId: string, field: string) => {
    const value = editValues[`${modelId}-${field}`]

    try {
      setSaving(`${modelId}-${field}`)

      // Convert values based on field type
      let finalValue = value
      if (['message_credits', 'context_window', 'max_tokens'].includes(field)) {
        finalValue = parseInt(value) || 0
      } else if (['input_price_per_million', 'output_price_per_million'].includes(field)) {
        finalValue = parseFloat(value) || null
      } else if (['supports_vision', 'supports_functions', 'supports_streaming'].includes(field)) {
        finalValue = value === 'true'
      }

      const { error } = await supabase
        .from('ai_models')
        .update({ [field]: finalValue })
        .eq('id', modelId)

      if (error) throw error

      setModels(prev => prev.map(m =>
        m.id === modelId ? { ...m, [field]: finalValue } : m
      ))

      setEditingCell(null)
      setEditValues({})
      toast.success('Model updated')
    } catch (error) {
      console.error('Error saving model:', error)
      toast.error('Failed to save changes')
    } finally {
      setSaving(null)
    }
  }

  const renderEditableCell = (model: Model, field: string, value: any) => {
    const isEditing = editingCell?.id === model.id && editingCell?.field === field
    const editKey = `${model.id}-${field}`

    if (isEditing) {
      const inputType = ['message_credits', 'context_window', 'max_tokens', 'input_price_per_million', 'output_price_per_million'].includes(field) ? 'number' : 'text'

      if (field === 'speed') {
        return (
          <div className="flex items-center gap-2">
            <Select
              value={editValues[editKey] || ''}
              onValueChange={(val) => setEditValues({ ...editValues, [editKey]: val })}
            >
              <SelectTrigger className="h-8 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fast">Fast</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="slow">Slow</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => saveEdit(model.id, field)}
              disabled={saving === editKey}
            >
              {saving === editKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={cancelEdit}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )
      }

      if (['supports_vision', 'supports_functions', 'supports_streaming'].includes(field)) {
        return (
          <div className="flex items-center gap-2">
            <Select
              value={editValues[editKey]?.toString() || ''}
              onValueChange={(val) => setEditValues({ ...editValues, [editKey]: val })}
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => saveEdit(model.id, field)}
              disabled={saving === editKey}
            >
              {saving === editKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={cancelEdit}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )
      }

      if (field === 'description') {
        return (
          <div className="flex items-center gap-2">
            <Textarea
              value={editValues[editKey] || ''}
              onChange={(e) => setEditValues({ ...editValues, [editKey]: e.target.value })}
              className="min-h-[60px] text-xs"
              placeholder="Enter description..."
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => saveEdit(model.id, field)}
              disabled={saving === editKey}
            >
              {saving === editKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={cancelEdit}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )
      }

      // Determine input width based on field type
      const inputWidth = field === 'model_id' ? 'w-48' : field === 'display_name' ? 'w-32' : 'w-24'

      return (
        <div className="flex items-center gap-2">
          <Input
            type={inputType}
            value={editValues[editKey] || ''}
            onChange={(e) => setEditValues({ ...editValues, [editKey]: e.target.value })}
            className={`h-8 ${inputWidth}`}
            step={inputType === 'number' ? '0.01' : undefined}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => saveEdit(model.id, field)}
            disabled={saving === editKey}
          >
            {saving === editKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={cancelEdit}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )
    }

    return (
      <div
        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
        onClick={() => startEdit(model.id, field, value)}
      >
        {field === 'description' ? (
          <span className="text-xs text-muted-foreground truncate max-w-[300px]">
            {value || 'No description'}
          </span>
        ) : field === 'speed' ? (
          <Badge variant={value === 'fast' ? 'default' : value === 'medium' ? 'secondary' : 'outline'}>
            {value || 'Not set'}
          </Badge>
        ) : ['supports_vision', 'supports_functions', 'supports_streaming'].includes(field) ? (
          value ? <CheckCircle className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-gray-400" />
        ) : (
          <span className="text-sm">{value ?? '-'}</span>
        )}
        <Edit2 className="h-3 w-3 text-gray-400" />
      </div>
    )
  }

  const filteredModels = selectedProvider === 'all'
    ? models
    : models.filter(m => m.provider === selectedProvider)

  // Fixed list of available providers (not dependent on existing models)
  const availableProviders = ['openai', 'google', 'anthropic', 'xai']

  // Providers that have models (for the filter tabs)
  const providers = [...new Set(models.map(m => m.provider))]

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai': return <Brain className="h-4 w-4" />
      case 'google': return <Globe className="h-4 w-4" />
      case 'anthropic': return <Cpu className="h-4 w-4" />
      case 'xai': return <Zap className="h-4 w-4" />
      default: return <Database className="h-4 w-4" />
    }
  }

  const getCreditBadgeColor = (credits: number) => {
    if (credits === 1) return 'bg-green-100 text-green-700'
    if (credits <= 5) return 'bg-yellow-100 text-yellow-700'
    if (credits <= 10) return 'bg-orange-100 text-orange-700'
    return 'bg-red-100 text-red-700'
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const bulkToggleModels = async (action: 'enable-all' | 'disable-all' | 'enable-tested-only' | 'disable-untested') => {
    let modelsToEnable: Model[] = []
    let modelsToDisable: Model[] = []
    let actionMessage = ''

    switch (action) {
      case 'enable-all':
        modelsToEnable = filteredModels.filter(m => !m.is_active)
        actionMessage = `Enabled ${modelsToEnable.length} models`
        break
      case 'disable-all':
        modelsToDisable = filteredModels.filter(m => m.is_active)
        actionMessage = `Disabled ${modelsToDisable.length} models`
        break
      case 'enable-tested-only':
        // Enable models that passed testing, disable all others
        modelsToEnable = filteredModels.filter(m => !m.is_active && m.last_test_status === 'success')
        modelsToDisable = filteredModels.filter(m => m.is_active && m.last_test_status !== 'success')
        actionMessage = `Enabled ${modelsToEnable.length} tested models, disabled ${modelsToDisable.length} untested/failed models`
        break
      case 'disable-untested':
        // Disable models that haven't been tested or failed testing
        modelsToDisable = filteredModels.filter(m => {
          return m.is_active && (m.last_test_status === 'error' || m.last_test_status === 'untested' || !m.last_test_status)
        })
        actionMessage = `Disabled ${modelsToDisable.length} untested/failed models`
        break
    }

    if (modelsToEnable.length === 0 && modelsToDisable.length === 0) {
      toast.info('No models to update')
      return
    }

    try {
      // Update all models in parallel
      const promises = [
        ...modelsToEnable.map(model =>
          supabase
            .from('ai_models')
            .update({ is_active: true })
            .eq('id', model.id)
        ),
        ...modelsToDisable.map(model =>
          supabase
            .from('ai_models')
            .update({ is_active: false })
            .eq('id', model.id)
        )
      ]

      await Promise.all(promises)

      // Update local state
      setModels(prev => prev.map(m => {
        const shouldEnable = modelsToEnable.some(em => em.id === m.id)
        const shouldDisable = modelsToDisable.some(dm => dm.id === m.id)

        if (shouldEnable) return { ...m, is_active: true }
        if (shouldDisable) return { ...m, is_active: false }
        return m
      }))

      toast.success(actionMessage)
    } catch (error) {
      console.error('Error bulk updating models:', error)
      toast.error('Failed to update models')
    }
  }

  const testAllModels = async () => {
    // Get models to test based on current provider filter
    const modelsToTest = filteredModels.filter(m => m.is_active)

    if (modelsToTest.length === 0) {
      toast.error('No active models to test')
      return
    }

    setTestingAll(true)
    setTestProgress({ current: 0, total: modelsToTest.length })

    let tested = 0
    let passed = 0
    let failed = 0

    // Test in batches of 3 to avoid rate limits
    const batchSize = 3
    for (let i = 0; i < modelsToTest.length; i += batchSize) {
      const batch = modelsToTest.slice(i, i + batchSize)

      // Test batch in parallel
      const promises = batch.map(async (model) => {
        try {
          // Mark as testing in local state
          setModels(prev => prev.map(m =>
            m.id === model.id ? { ...m, last_test_status: 'testing' as const } : m
          ))

          const response = await fetch('/api/admin/test-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: model.provider,
              modelId: model.model_id
            })
          })

          const result = await response.json()

          const testStatus = result.success ? 'success' : 'error'
          const testMessage = result.success ? 'Test passed' : result.error
          const testedAt = new Date().toISOString()

          // Update database
          await supabase
            .from('ai_models')
            .update({
              last_test_status: testStatus,
              last_test_message: testMessage,
              last_tested_at: testedAt
            })
            .eq('id', model.id)

          // Update local state
          setModels(prev => prev.map(m =>
            m.id === model.id
              ? { ...m, last_test_status: testStatus, last_test_message: testMessage, last_tested_at: testedAt }
              : m
          ))

          if (result.success) passed++
          else failed++
        } catch (error) {
          failed++

          const testMessage = 'Test failed'
          const testedAt = new Date().toISOString()

          // Update database with error
          await supabase
            .from('ai_models')
            .update({
              last_test_status: 'error',
              last_test_message: testMessage,
              last_tested_at: testedAt
            })
            .eq('id', model.id)

          // Update local state
          setModels(prev => prev.map(m =>
            m.id === model.id
              ? { ...m, last_test_status: 'error' as const, last_test_message: testMessage, last_tested_at: testedAt }
              : m
          ))
        } finally {
          tested++
          setTestProgress({ current: tested, total: modelsToTest.length })
        }
      })

      await Promise.all(promises)

      // Small delay between batches to avoid rate limits
      if (i + batchSize < modelsToTest.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    setTestingAll(false)
    setTestProgress({ current: 0, total: 0 })

    // Show summary
    const providerName = selectedProvider === 'all' ? '' : ` ${selectedProvider}`
    toast.success(`Tested ${tested}${providerName} models: ✅ ${passed} passed, ❌ ${failed} failed`)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = filteredModels.findIndex(m => m.id === active.id)
      const newIndex = filteredModels.findIndex(m => m.id === over.id)

      const reorderedModels = arrayMove(filteredModels, oldIndex, newIndex)

      // Update sort_order for all affected models
      const updates = reorderedModels.map((model, index) => ({
        ...model,
        sort_order: (index + 1) * 10
      }))

      setModels(prevModels => {
        const otherModels = prevModels.filter(m =>
          selectedProvider === 'all' ? false : m.provider !== selectedProvider
        )
        return [...otherModels, ...updates].sort((a, b) => a.sort_order - b.sort_order)
      })

      // Update in database
      for (const model of updates) {
        await supabase
          .from('ai_models')
          .update({ sort_order: model.sort_order })
          .eq('id', model.id)
      }

      toast.success('Model order updated')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard')}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Model Management</h1>
            <p className="text-muted-foreground">Configure AI models, pricing, and capabilities</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={loadModels}
            variant="outline"
            className="h-10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <AddModelDialog
            onModelAdded={loadModels}
            providers={availableProviders}
          />
          <Button
            onClick={discoverModels}
            disabled={discovering}
            className="h-10"
          >
            {discovering ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            Discover Models
          </Button>
          <Button
            onClick={testAllModels}
            disabled={testingAll}
            variant="secondary"
            className="h-10"
          >
            {testingAll ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing {testProgress.current}/{testProgress.total}...
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 mr-2" />
                Test All {selectedProvider !== 'all' && selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)}
                {' '}({filteredModels.filter(m => m.is_active).length})
              </>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10">
                <ToggleRight className="h-4 w-4 mr-2" />
                Bulk Toggle
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => bulkToggleModels('enable-all')}>
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                Enable All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkToggleModels('disable-all')}>
                <X className="h-4 w-4 mr-2 text-red-500" />
                Disable All
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => bulkToggleModels('enable-tested-only')}>
                <Wifi className="h-4 w-4 mr-2 text-green-500" />
                Enable Tested Only (Disable Others)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkToggleModels('disable-untested')}>
                <WifiOff className="h-4 w-4 mr-2 text-red-500" />
                Disable Untested/Failed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Models</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{models.length}</div>
            <p className="text-xs text-muted-foreground">
              {models.filter(m => m.is_active).length} active
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
              {providers.join(', ')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vision Models</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {models.filter(m => m.supports_vision).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Support image inputs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Range</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.min(...models.map(m => m.message_credits || 1))}-{Math.max(...models.map(m => m.message_credits || 1))}
            </div>
            <p className="text-xs text-muted-foreground">
              Credits per message
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Provider Tabs */}
      <Tabs value={selectedProvider} onValueChange={setSelectedProvider}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Models</TabsTrigger>
          {providers.map(provider => (
            <TabsTrigger key={provider} value={provider}>
              <div className="flex items-center gap-2">
                {getProviderIcon(provider)}
                {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedProvider}>
          <Card>
            <CardHeader>
              <CardTitle>Model Configuration</CardTitle>
              <CardDescription>
                Click on any field to edit. Drag rows to reorder. Changes are saved automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                      <TableHead>Input $/M</TableHead>
                      <TableHead>Output $/M</TableHead>
                      <TableHead>Speed</TableHead>
                      <TableHead>Vision</TableHead>
                      <TableHead>Functions</TableHead>
                      <TableHead>Streaming</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Test</TableHead>
                      <TableHead>Actions</TableHead>
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
                            <TableCell className="font-mono text-xs">{renderEditableCell(model, 'model_id', model.model_id)}</TableCell>
                            <TableCell>{renderEditableCell(model, 'display_name', model.display_name)}</TableCell>
                            <TableCell>
                              <div className={cn('inline-flex px-2 py-1 rounded text-sm font-semibold', getCreditBadgeColor(model.message_credits || 1))}>
                                {renderEditableCell(model, 'message_credits', model.message_credits)}
                              </div>
                            </TableCell>
                            <TableCell>{renderEditableCell(model, 'input_price_per_million', model.input_price_per_million)}</TableCell>
                            <TableCell>{renderEditableCell(model, 'output_price_per_million', model.output_price_per_million)}</TableCell>
                            <TableCell>{renderEditableCell(model, 'speed', model.speed)}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="p-1"
                                onClick={() => toggleBooleanField(model.id, 'supports_vision', model.supports_vision)}
                                title="Supports Vision"
                              >
                                {model.supports_vision ?
                                  <Eye className="h-4 w-4 text-green-500" /> :
                                  <EyeOff className="h-4 w-4 text-gray-400" />
                                }
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="p-1"
                                onClick={() => toggleBooleanField(model.id, 'supports_functions', model.supports_functions)}
                                title="Supports Functions"
                              >
                                {model.supports_functions ?
                                  <Settings className="h-4 w-4 text-green-500" /> :
                                  <Settings className="h-4 w-4 text-gray-400" />
                                }
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="p-1"
                                onClick={() => toggleBooleanField(model.id, 'supports_streaming', model.supports_streaming)}
                                title="Supports Streaming"
                              >
                                {model.supports_streaming ?
                                  <Zap className="h-4 w-4 text-green-500" /> :
                                  <Zap className="h-4 w-4 text-gray-400" />
                                }
                              </Button>
                            </TableCell>
                            <TableCell className="max-w-[300px]">{renderEditableCell(model, 'description', model.description)}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant={
                                  model.last_test_status === 'success' ? 'outline' :
                                  model.last_test_status === 'error' ? 'destructive' :
                                  'ghost'
                                }
                                onClick={() => testModelConnection(model)}
                                disabled={model.last_test_status === 'testing'}
                                className="w-16"
                                title={model.last_test_message || 'Click to test'}
                              >
                                {model.last_test_status === 'testing' ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : model.last_test_status === 'success' ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : model.last_test_status === 'error' ? (
                                  <WifiOff className="h-4 w-4" />
                                ) : (
                                  <Wifi className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => duplicateModel(model)}
                              title="Duplicate model"
                            >
                              <Copy className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteModel(model.id)}
                              title="Delete model"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </SortableRow>
                        ))}
                      </SortableContext>
                    </TableBody>
                  </Table>
                </DndContext>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}