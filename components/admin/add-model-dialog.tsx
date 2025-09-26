'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Plus, Loader2, Wifi, CheckCircle, WifiOff } from 'lucide-react'

interface AddModelDialogProps {
  onModelAdded: () => void
  providers: string[]
}

export function AddModelDialog({ onModelAdded, providers }: AddModelDialogProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testStatus, setTestStatus] = useState<'success' | 'error' | null>(null)
  const [model, setModel] = useState({
    name: '',
    display_name: '',
    provider: 'openai',
    model_id: '',
    description: '',
    context_window: 128000,
    max_tokens: 4096,
    input_price_per_million: 0,
    output_price_per_million: 0,
    message_credits: 1,
    supports_vision: false,
    supports_functions: true,
    supports_streaming: true,
    is_active: true,
    sort_order: 100
  })

  const supabase = createClient()

  const handleTest = async () => {
    if (!model.provider || !model.model_id) {
      toast.error('Please select a provider and enter a model code')
      return
    }

    setTesting(true)
    setTestStatus(null)

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

      if (result.success) {
        setTestStatus('success')
        toast.success(`Model ${model.model_id} test successful!`)
      } else {
        setTestStatus('error')
        toast.error(result.error || 'Model test failed')
      }
    } catch (error) {
      setTestStatus('error')
      toast.error('Connection test failed')
    } finally {
      setTesting(false)
    }
  }

  const handleSubmit = async () => {
    if (!model.name || !model.model_id || !model.display_name) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('ai_models')
        .insert([model])

      if (error) throw error

      toast.success(`Model ${model.display_name} added successfully`)
      setOpen(false)
      onModelAdded()

      // Reset form and test status
      setTestStatus(null)
      setModel({
        name: '',
        display_name: '',
        provider: 'openai',
        model_id: '',
        description: '',
        context_window: 128000,
        max_tokens: 4096,
        input_price_per_million: 0,
        output_price_per_million: 0,
        message_credits: 1,
        supports_vision: false,
        supports_functions: true,
        supports_streaming: true,
        is_active: true,
        sort_order: 100
      })
    } catch (error: any) {
      console.error('Error adding model:', error)
      toast.error(error.message || 'Failed to add model')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-10">
          <Plus className="h-4 w-4 mr-2" />
          Add Model
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New AI Model</DialogTitle>
          <DialogDescription>
            Add a new model by entering its API model code and configuration
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 px-1 overflow-y-auto flex-1 max-h-[65vh]">
          {/* Provider Selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="provider" className="text-right">
              Provider *
            </Label>
            <Select
              value={model.provider}
              onValueChange={(value) => setModel({ ...model, provider: value })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providers.map(p => (
                  <SelectItem key={p} value={p}>
                    {p === 'openai' ? 'OpenAI' :
                     p === 'google' ? 'Google' :
                     p === 'anthropic' ? 'Anthropic' :
                     p === 'xai' ? 'xAI' : p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model ID (API Code) */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="model_id" className="text-right">
              Model Code *
            </Label>
            <Input
              id="model_id"
              value={model.model_id}
              onChange={(e) => setModel({ ...model, model_id: e.target.value })}
              className="col-span-3"
              placeholder="e.g., gpt-4o-mini, claude-3-5-sonnet-20241022"
            />
          </div>

          {/* Internal Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Internal Name *
            </Label>
            <Input
              id="name"
              value={model.name}
              onChange={(e) => setModel({ ...model, name: e.target.value })}
              className="col-span-3"
              placeholder="e.g., gpt-4o-mini, claude-3-5-sonnet"
            />
          </div>

          {/* Display Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="display_name" className="text-right">
              Display Name *
            </Label>
            <Input
              id="display_name"
              value={model.display_name}
              onChange={(e) => setModel({ ...model, display_name: e.target.value })}
              className="col-span-3"
              placeholder="e.g., GPT-4o Mini, Claude 3.5 Sonnet"
            />
          </div>

          {/* Description */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              value={model.description}
              onChange={(e) => setModel({ ...model, description: e.target.value })}
              className="col-span-3"
              placeholder="Brief description of the model's capabilities"
            />
          </div>

          {/* Context Window */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="context_window" className="text-right">
              Context Window
            </Label>
            <Input
              id="context_window"
              type="number"
              value={model.context_window}
              onChange={(e) => setModel({ ...model, context_window: parseInt(e.target.value) || 0 })}
              className="col-span-3"
              placeholder="e.g., 128000"
            />
          </div>

          {/* Max Tokens */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="max_tokens" className="text-right">
              Max Tokens
            </Label>
            <Input
              id="max_tokens"
              type="number"
              value={model.max_tokens}
              onChange={(e) => setModel({ ...model, max_tokens: parseInt(e.target.value) || 0 })}
              className="col-span-3"
              placeholder="e.g., 4096"
            />
          </div>

          {/* Input Price */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="input_price" className="text-right">
              Input $/Million
            </Label>
            <Input
              id="input_price"
              type="number"
              step="0.01"
              value={model.input_price_per_million}
              onChange={(e) => setModel({ ...model, input_price_per_million: parseFloat(e.target.value) || 0 })}
              className="col-span-3"
              placeholder="e.g., 0.15"
            />
          </div>

          {/* Output Price */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="output_price" className="text-right">
              Output $/Million
            </Label>
            <Input
              id="output_price"
              type="number"
              step="0.01"
              value={model.output_price_per_million}
              onChange={(e) => setModel({ ...model, output_price_per_million: parseFloat(e.target.value) || 0 })}
              className="col-span-3"
              placeholder="e.g., 0.60"
            />
          </div>

          {/* User Cost (Message Credits) */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="message_credits" className="text-right">
              User Cost (Credits) *
            </Label>
            <div className="col-span-3 space-y-1">
              <Input
                id="message_credits"
                type="number"
                min="1"
                value={model.message_credits}
                onChange={(e) => setModel({ ...model, message_credits: parseInt(e.target.value) || 1 })}
                placeholder="e.g., 1, 5, 10"
              />
              <p className="text-xs text-muted-foreground">
                Credits consumed per message. Your profit = User credits - Provider cost
              </p>
            </div>
          </div>

          {/* Capabilities */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">
              Capabilities
            </Label>
            <div className="col-span-3 space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="supports_vision"
                  checked={model.supports_vision}
                  onCheckedChange={(checked) => setModel({ ...model, supports_vision: !!checked })}
                />
                <Label htmlFor="supports_vision" className="font-normal">
                  Supports Vision
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="supports_functions"
                  checked={model.supports_functions}
                  onCheckedChange={(checked) => setModel({ ...model, supports_functions: !!checked })}
                />
                <Label htmlFor="supports_functions" className="font-normal">
                  Supports Functions
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="supports_streaming"
                  checked={model.supports_streaming}
                  onCheckedChange={(checked) => setModel({ ...model, supports_streaming: !!checked })}
                />
                <Label htmlFor="supports_streaming" className="font-normal">
                  Supports Streaming
                </Label>
              </div>
            </div>
          </div>

          {/* Active Status */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              Status
            </Label>
            <div className="col-span-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={model.is_active}
                  onCheckedChange={(checked) => setModel({ ...model, is_active: !!checked })}
                />
                <Label htmlFor="is_active" className="font-normal">
                  Active (visible to users)
                </Label>
              </div>
            </div>
          </div>

          {/* Sort Order */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sort_order" className="text-right">
              Sort Order
            </Label>
            <div className="col-span-3 space-y-1">
              <Input
                id="sort_order"
                type="number"
                min="0"
                value={model.sort_order}
                onChange={(e) => setModel({ ...model, sort_order: parseInt(e.target.value) || 100 })}
                placeholder="e.g., 100"
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first in the model list
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || !model.provider || !model.model_id}
            className="min-w-[140px]"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : testStatus === 'success' ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                Connected
              </>
            ) : testStatus === 'error' ? (
              <>
                <WifiOff className="h-4 w-4 mr-2 text-red-600" />
                Failed
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 mr-2" />
                Test Connection
              </>
            )}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Model
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}