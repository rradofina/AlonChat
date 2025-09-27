'use client'

import { Brain, Wifi, WifiOff, Settings, Trash2, ToggleLeft, ToggleRight, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { AIModel } from '../types'

interface ModelCardProps {
  model: AIModel
  onToggle: (id: string, isActive: boolean) => void
  onTest: (id: string) => void
  onEdit: (model: AIModel) => void
  onDelete: (id: string) => void
}

export function ModelCard({ model, onToggle, onTest, onEdit, onDelete }: ModelCardProps) {
  const formatPrice = (price: number | null) => {
    if (!price) return 'N/A'
    return `$${price.toFixed(2)}`
  }

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai': return 'bg-green-100 text-green-800'
      case 'anthropic': return 'bg-purple-100 text-purple-800'
      case 'google': return 'bg-blue-100 text-blue-800'
      case 'xai': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSpeedIcon = (speed: string | null) => {
    switch (speed) {
      case 'fast': return <Zap className="h-3 w-3 text-green-600" />
      case 'medium': return <Zap className="h-3 w-3 text-yellow-600" />
      case 'slow': return <Zap className="h-3 w-3 text-red-600" />
      default: return null
    }
  }

  return (
    <div className={`bg-white border rounded-lg p-4 ${!model.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`p-2 rounded-lg ${model.is_active ? 'bg-blue-50' : 'bg-gray-100'}`}>
            <Brain className={`h-5 w-5 ${model.is_active ? 'text-blue-600' : 'text-gray-400'}`} />
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-gray-900">{model.display_name}</h3>
              <Badge variant="secondary" className={getProviderColor(model.provider)}>
                {model.provider}
              </Badge>
              {model.speed && getSpeedIcon(model.speed)}
            </div>

            <p className="text-xs text-gray-500 mt-1">{model.model_id}</p>

            {model.description && (
              <p className="text-xs text-gray-600 mt-2">{model.description}</p>
            )}

            {/* Capabilities */}
            <div className="flex flex-wrap gap-1 mt-2">
              {model.supports_vision && (
                <Badge variant="outline" className="text-xs">Vision</Badge>
              )}
              {model.supports_functions && (
                <Badge variant="outline" className="text-xs">Functions</Badge>
              )}
              {model.supports_streaming && (
                <Badge variant="outline" className="text-xs">Streaming</Badge>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span>Context: {model.context_window.toLocaleString()}</span>
              <span>Max: {model.max_tokens.toLocaleString()}</span>
              <span>Credits: {model.message_credits}</span>
            </div>

            {/* Pricing */}
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
              <span>Input: {formatPrice(model.input_price_per_million)}/M</span>
              <span>Output: {formatPrice(model.output_price_per_million)}/M</span>
            </div>

            {/* Test Status */}
            {model.last_test_status && (
              <div className="flex items-center gap-2 mt-2">
                {model.last_test_status === 'success' ? (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                    <Wifi className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : model.last_test_status === 'error' ? (
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Error
                  </Badge>
                ) : model.last_test_status === 'testing' ? (
                  <Badge variant="outline" className="text-xs">
                    Testing...
                  </Badge>
                ) : null}
                {model.last_tested_at && (
                  <span className="text-xs text-gray-400">
                    Tested {new Date(model.last_tested_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Switch
            checked={model.is_active}
            onCheckedChange={(checked) => onToggle(model.id, checked)}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onTest(model.id)}>
                <Wifi className="h-4 w-4 mr-2" />
                Test Connection
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(model)}>
                <Settings className="h-4 w-4 mr-2" />
                Edit Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(model.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Model
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}