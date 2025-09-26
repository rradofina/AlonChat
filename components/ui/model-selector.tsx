'use client'

import * as React from 'react'
import { Check, ChevronDown, Sparkles, Bot, Brain, Cpu } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export interface Model {
  id: string
  name: string
  display_name: string
  provider: string
  description?: string
  context_window?: number
  max_tokens?: number
  cost?: {
    input?: number
    output?: number
  }
  capabilities?: {
    vision?: boolean
    functions?: boolean
    streaming?: boolean
    reasoning?: boolean
  }
  speed?: 'fast' | 'medium' | 'slow'
  intelligence?: 'basic' | 'advanced' | 'expert'
}

interface ModelSelectorProps {
  models: Model[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

const providerIcons: Record<string, React.ReactNode> = {
  openai: <Bot className="h-4 w-4" />,
  google: <Sparkles className="h-4 w-4" />,
  anthropic: <Brain className="h-4 w-4" />,
  custom: <Cpu className="h-4 w-4" />,
}

const providerColors: Record<string, string> = {
  openai: 'text-green-600',
  google: 'text-blue-600',
  anthropic: 'text-orange-600',
  custom: 'text-purple-600',
}

function getModelBadge(model: Model) {
  if (model.name.includes('o1')) return { text: 'Reasoning', color: 'bg-purple-100 text-purple-700' }
  if (model.name.includes('4o')) return { text: 'Multimodal', color: 'bg-blue-100 text-blue-700' }
  if (model.name.includes('turbo')) return { text: 'Fast', color: 'bg-green-100 text-green-700' }
  if (model.name.includes('flash')) return { text: 'Efficient', color: 'bg-amber-100 text-amber-700' }
  if (model.name.includes('pro')) return { text: 'Pro', color: 'bg-indigo-100 text-indigo-700' }
  if (model.name.includes('haiku')) return { text: 'Fast', color: 'bg-teal-100 text-teal-700' }
  if (model.name.includes('sonnet')) return { text: 'Balanced', color: 'bg-violet-100 text-violet-700' }
  if (model.name.includes('opus')) return { text: 'Powerful', color: 'bg-pink-100 text-pink-700' }
  return null
}

function formatCost(cost?: number) {
  if (!cost) return 'Free'
  if (cost === 0) return 'Free'
  return `$${cost.toFixed(2)}`
}

function formatTokens(tokens?: number) {
  if (!tokens) return 'N/A'
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`
  return tokens.toString()
}

export function ModelSelector({
  models,
  value,
  onValueChange,
  placeholder = 'Select a model...',
  className,
  disabled = false,
}: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false)

  const selectedModel = models.find((model) => model.name === value)

  // Group models by provider
  const groupedModels = React.useMemo(() => {
    const groups: Record<string, Model[]> = {}
    models.forEach((model) => {
      if (!groups[model.provider]) {
        groups[model.provider] = []
      }
      groups[model.provider].push(model)
    })
    return groups
  }, [models])

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
        >
          <div className="flex items-center gap-2 truncate">
            {selectedModel ? (
              <>
                <span className={providerColors[selectedModel.provider]}>
                  {providerIcons[selectedModel.provider]}
                </span>
                <span className="truncate">{selectedModel.display_name}</span>
              </>
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search models..." />
          <CommandEmpty>No model found.</CommandEmpty>
          <CommandList>
            {Object.entries(groupedModels).map(([provider, providerModels]) => (
              <CommandGroup
                key={provider}
                heading={
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <span className={providerColors[provider]}>
                      {providerIcons[provider]}
                    </span>
                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                  </div>
                }
              >
                {providerModels.map((model) => {
                  const badge = getModelBadge(model)
                  const isSelected = value === model.name

                  return (
                    <HoverCard key={model.id} openDelay={200} closeDelay={0}>
                      <HoverCardTrigger asChild>
                        <CommandItem
                          value={`${model.display_name} ${model.name} ${model.provider}`}
                          onSelect={(currentValue) => {
                            // The onSelect receives the search value, but we want the model name
                            onValueChange?.(model.name)
                            setOpen(false)
                          }}
                          className="flex items-center justify-between py-2 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Check
                              className={cn(
                                'h-4 w-4',
                                isSelected ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <span className={providerColors[provider]}>
                              {providerIcons[provider]}
                            </span>
                            <span className="text-sm">{model.display_name}</span>
                            {badge && (
                              <Badge variant="secondary" className={cn('text-xs px-1.5 py-0', badge.color)}>
                                {badge.text}
                              </Badge>
                            )}
                          </div>
                          {model.capabilities?.vision && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              Vision
                            </Badge>
                          )}
                        </CommandItem>
                      </HoverCardTrigger>
                      <HoverCardContent side="right" align="start" className="w-80">
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={providerColors[provider]}>
                                {providerIcons[provider]}
                              </span>
                              <h4 className="text-sm font-semibold">
                                {provider.charAt(0).toUpperCase() + provider.slice(1)} / {model.display_name}
                              </h4>
                            </div>
                            {model.cost && (
                              <div className="text-xs text-muted-foreground">
                                Credits cost: {formatCost(model.cost.input)}/1K input • {formatCost(model.cost.output)}/1K output
                              </div>
                            )}
                          </div>

                          {model.description && (
                            <p className="text-sm text-muted-foreground">
                              {model.description}
                            </p>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {model.context_window && (
                              <div>
                                <span className="text-muted-foreground">Context: </span>
                                <span className="font-medium">{formatTokens(model.context_window)}</span>
                              </div>
                            )}
                            {model.max_tokens && (
                              <div>
                                <span className="text-muted-foreground">Max output: </span>
                                <span className="font-medium">{formatTokens(model.max_tokens)}</span>
                              </div>
                            )}
                          </div>

                          {model.capabilities && (
                            <div className="flex flex-wrap gap-1">
                              {model.capabilities.vision && (
                                <Badge variant="secondary" className="text-xs">Vision</Badge>
                              )}
                              {model.capabilities.functions && (
                                <Badge variant="secondary" className="text-xs">Functions</Badge>
                              )}
                              {model.capabilities.streaming && (
                                <Badge variant="secondary" className="text-xs">Streaming</Badge>
                              )}
                              {model.capabilities.reasoning && (
                                <Badge variant="secondary" className="text-xs">Reasoning</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}