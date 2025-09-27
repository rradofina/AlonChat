'use client'

import { useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Eye,
  EyeOff,
  Settings,
  Trash2,
  Save,
  Edit2,
  X,
  GripVertical,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Brain,
  FileText,
  Zap,
} from 'lucide-react'
import type { AIModel } from '@/features/model-config/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ModelTableProps {
  models: AIModel[]
  onToggle: (id: string, isActive: boolean) => void
  onTest: (id: string) => void
  onEdit: (model: AIModel) => void
  onDelete: (id: string) => void
  onUpdateOrder?: (models: AIModel[]) => void
  onUpdateField?: (id: string, field: string, value: any) => void
  isUpdating?: boolean
}

interface EditingCell {
  modelId: string
  field: string
  value: any
}

// SortableRow component for drag and drop
function SortableRow({ model, children }: { model: AIModel; children: React.ReactNode }) {
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

export function ModelTable({
  models,
  onToggle,
  onTest,
  onEdit,
  onDelete,
  onUpdateOrder,
  onUpdateField,
  isUpdating = false
}: ModelTableProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState<any>('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id && onUpdateOrder) {
      const oldIndex = models.findIndex((model) => model.id === active.id)
      const newIndex = models.findIndex((model) => model.id === over?.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newModels = arrayMove(models, oldIndex, newIndex)
        // Update sort_order for each model
        const modelsWithOrder = newModels.map((model, index) => ({
          ...model,
          sort_order: index
        }))
        onUpdateOrder(modelsWithOrder)
      }
    }
  }

  const startEditing = (modelId: string, field: string, value: any) => {
    setEditingCell({ modelId, field, value })
    setEditValue(value)
  }

  const saveEdit = async () => {
    if (!editingCell || !onUpdateField) return

    try {
      await onUpdateField(editingCell.modelId, editingCell.field, editValue)
      setEditingCell(null)
      toast.success('Model updated successfully')
    } catch (error) {
      toast.error('Failed to update model')
    }
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const renderEditableCell = (model: AIModel, field: string, value: any) => {
    const isEditing = editingCell?.modelId === model.id && editingCell?.field === field

    if (isEditing) {
      if (field === 'description') {
        return (
          <div className="flex items-center gap-2">
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="min-w-[200px] text-sm"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Escape') cancelEdit()
                if (e.key === 'Enter' && e.ctrlKey) saveEdit()
              }}
            />
            <div className="flex flex-col gap-1">
              <Button size="icon" variant="ghost" onClick={saveEdit}>
                <Save className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" onClick={cancelEdit}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )
      }

      return (
        <div className="flex items-center gap-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-7 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit()
              if (e.key === 'Escape') cancelEdit()
            }}
            autoFocus
          />
          <Button size="icon" variant="ghost" onClick={saveEdit}>
            <Save className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" onClick={cancelEdit}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )
    }

    return (
      <div
        className="cursor-pointer hover:bg-gray-50 rounded px-2 py-1 flex items-center gap-1 group"
        onClick={() => onUpdateField && startEditing(model.id, field, value)}
      >
        <span className="text-sm">{value || '-'}</span>
        {onUpdateField && (
          <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
        )}
      </div>
    )
  }

  const getCreditBadgeColor = (credits: number) => {
    if (credits === 1) return 'bg-green-100 text-green-800'
    if (credits <= 5) return 'bg-yellow-100 text-yellow-800'
    if (credits <= 10) return 'bg-orange-100 text-orange-800'
    return 'bg-red-100 text-red-800'
  }

  const getTestStatusIcon = (model: AIModel) => {
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

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead className="w-[60px]">Active</TableHead>
              <TableHead>Model Code</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead className="text-center">Credits</TableHead>
              <TableHead>Input $/M</TableHead>
              <TableHead>Output $/M</TableHead>
              <TableHead>Speed</TableHead>
              <TableHead className="text-center">Vision</TableHead>
              <TableHead className="text-center">Functions</TableHead>
              <TableHead className="text-center">Streaming</TableHead>
              <TableHead>Context</TableHead>
              <TableHead className="text-center">Test</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SortableContext
              items={models.map(m => m.id)}
              strategy={verticalListSortingStrategy}
            >
              {models.map((model) => (
                <SortableRow key={model.id} model={model}>
                  <TableCell>
                    <Switch
                      checked={model.is_active}
                      onCheckedChange={(checked) => onToggle(model.id, checked)}
                      disabled={isUpdating}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {renderEditableCell(model, 'model_id', model.model_id)}
                  </TableCell>
                  <TableCell>
                    {renderEditableCell(model, 'display_name', model.display_name)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn(getCreditBadgeColor(model.message_credits || 1))}>
                      {model.message_credits || 1}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    ${model.input_price_per_million || '0'}
                  </TableCell>
                  <TableCell className="text-sm">
                    ${model.output_price_per_million || '0'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={model.speed === 'fast' ? 'default' : 'secondary'}>
                      {model.speed || 'medium'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {model.supports_vision ? (
                      <Eye className="h-4 w-4 text-green-500 mx-auto" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-300 mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {model.supports_functions ? (
                      <Settings className="h-4 w-4 text-green-500 mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-gray-300 mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {model.supports_streaming ? (
                      <Wifi className="h-4 w-4 text-green-500 mx-auto" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-gray-300 mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {model.context_window?.toLocaleString() || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onTest(model.id)}
                      disabled={model.last_test_status === 'testing'}
                    >
                      {getTestStatusIcon(model)}
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
                        <DropdownMenuItem onClick={() => onEdit(model)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onTest(model.id)}>
                          <Brain className="h-4 w-4 mr-2" />
                          Test Connection
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(model.id)}
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
  )
}