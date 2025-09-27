import { useState } from 'react'
import { ChevronDown, Search, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AIModel } from '@/hooks/use-ai-models'

interface ModelSelectorProps {
  models: AIModel[]
  selectedModelId: string
  onModelSelect: (modelId: string) => void
  loading?: boolean
  className?: string
}

export function ModelSelector({
  models,
  selectedModelId,
  onModelSelect,
  loading = false,
  className = ''
}: ModelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const filteredModels = models.filter(model =>
    model.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.provider.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedModel = models.find(m => m.model_id === selectedModelId || m.name === selectedModelId)

  const groupedModels = filteredModels.reduce((acc, model) => {
    const provider = model.provider || 'Other'
    if (!acc[provider]) acc[provider] = []
    acc[provider].push(model)
    return acc
  }, {} as Record<string, AIModel[]>)

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={`w-full px-4 py-2 bg-white border border-gray-200 rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors ${className}`}
          disabled={loading}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-medium">
              {loading ? 'Loading models...' : (selectedModel?.display_name || 'Select a model')}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-[400px] p-2" align="start">
        <div className="px-2 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search Models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {Object.entries(groupedModels).map(([provider, providerModels]) => (
            <div key={provider}>
              <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase">
                {provider}
              </div>
              {providerModels.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-50 rounded-md"
                  onClick={() => {
                    if (model.is_active) {
                      onModelSelect(model.model_id || model.name)
                      setIsOpen(false)
                    }
                  }}
                  disabled={!model.is_active}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{model.display_name}</div>
                        {!model.is_active && (
                          <div className="text-xs text-gray-500">Not available</div>
                        )}
                        {model.description && (
                          <div className="text-xs text-gray-500">{model.description}</div>
                        )}
                      </div>
                    </div>
                    {(model.model_id === selectedModelId || model.name === selectedModelId) && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          ))}

          {filteredModels.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-gray-500">
              No models found
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}