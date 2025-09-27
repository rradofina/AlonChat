import { Sparkles, ChevronDown, Edit2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { PromptTemplate } from '@/hooks/use-prompt-templates'

interface TemplateSelectorProps {
  templates: PromptTemplate[]
  selectedTemplateId: string | null
  onTemplateSelect: (templateId: string | null) => void
  customMode: boolean
  onCustomModeToggle: (customMode: boolean) => void
  loading?: boolean
  className?: string
}

export function TemplateSelector({
  templates,
  selectedTemplateId,
  onTemplateSelect,
  customMode,
  onCustomModeToggle,
  loading = false,
  className = ''
}: TemplateSelectorProps) {
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId)

  const groupedTemplates = templates.reduce((acc, template) => {
    const category = template.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(template)
    return acc
  }, {} as Record<string, PromptTemplate[]>)

  const handleSelect = (templateId: string | null) => {
    if (templateId === 'custom') {
      onCustomModeToggle(true)
      onTemplateSelect(null)
    } else if (templateId) {
      onCustomModeToggle(false)
      onTemplateSelect(templateId)
    }
  }

  return (
    <div className={className}>
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        Prompt Template
      </label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">
                {loading ? 'Loading templates...' : (
                  customMode ? 'Custom Prompt' : (selectedTemplate?.name || 'Select a template')
                )}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-[400px] max-h-[500px] overflow-y-auto" align="start">
          <DropdownMenuItem onClick={() => handleSelect('custom')}>
            <div className="flex items-center gap-2">
              <Edit2 className="h-4 w-4" />
              <div>
                <div className="font-medium">Custom Prompt</div>
                <div className="text-xs text-gray-500">Create your own prompt from scratch</div>
              </div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category}>
              <DropdownMenuLabel className="text-xs text-gray-500">{category}</DropdownMenuLabel>
              {categoryTemplates.map((template) => (
                <DropdownMenuItem
                  key={template.id}
                  onClick={() => handleSelect(template.id)}
                >
                  <div className="w-full">
                    <div className="font-medium">{template.name}</div>
                    {template.description && (
                      <div className="text-xs text-gray-500">{template.description}</div>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          ))}

          {templates.length === 0 && !loading && (
            <div className="px-3 py-8 text-center text-sm text-gray-500">
              No templates available
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}