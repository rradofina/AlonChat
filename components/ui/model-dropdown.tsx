'use client'

import * as React from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface Model {
  id: string
  name: string
  display_name: string
  provider: string
  provider_logo?: string
  description?: string
  message_credits?: number
}

interface ModelDropdownProps {
  models: Model[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}


export function ModelDropdown({
  models,
  value,
  onValueChange,
  placeholder = 'Select a model...',
  className,
  disabled = false,
}: ModelDropdownProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  // Get selected model
  const selectedModel = models.find((model) => model.name === value)

  // Filter models based on search
  const filteredModels = React.useMemo(() => {
    if (!search) return models

    const searchLower = search.toLowerCase()
    return models.filter((model) =>
      model.name.toLowerCase().includes(searchLower) ||
      model.display_name.toLowerCase().includes(searchLower) ||
      model.provider.toLowerCase().includes(searchLower)
    )
  }, [models, search])


  const handleSelect = (modelName: string) => {
    console.log('Model selected:', modelName)
    onValueChange?.(modelName)
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal',
            !selectedModel && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
          onClick={(e) => {
            console.log('Dropdown button clicked')
            if (disabled) {
              e.preventDefault()
              e.stopPropagation()
            }
          }}
        >
          <div className="flex items-center gap-2 truncate">
            {selectedModel ? (
              <>
                {selectedModel.provider_logo && (
                  <img
                    src={selectedModel.provider_logo}
                    alt={selectedModel.provider}
                    className="h-4 w-4 object-contain"
                  />
                )}
                <span className="truncate text-sm">{selectedModel.display_name}</span>
              </>
            ) : (
              <span className="text-sm">{placeholder}</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="flex flex-col">
          {/* Search Input */}
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              type="text"
              placeholder="Search models..."
              className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Models List */}
          <div className="max-h-[300px] overflow-y-auto p-1">
            {filteredModels.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No models found.
              </div>
            ) : (
              filteredModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model.name)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
                    'hover:bg-accent hover:text-accent-foreground cursor-pointer',
                    value === model.name && 'bg-accent text-accent-foreground'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Check
                      className={cn(
                        'h-4 w-4',
                        value === model.name ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {model.provider_logo && (
                      <img
                        src={model.provider_logo}
                        alt={model.provider}
                        className="h-4 w-4 object-contain"
                      />
                    )}
                    <span>{model.display_name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {model.message_credits || 1} credit
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}