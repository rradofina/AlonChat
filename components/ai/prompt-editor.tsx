import { User, Info } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { PromptTemplate } from '@/hooks/use-prompt-templates'

interface PromptEditorProps {
  template?: PromptTemplate | null
  customMode: boolean
  customPrompt: string
  onCustomPromptChange: (prompt: string) => void
  showOverride?: boolean
  onOverrideToggle?: (show: boolean) => void
  className?: string
}

export function PromptEditor({
  template,
  customMode,
  customPrompt,
  onCustomPromptChange,
  showOverride = false,
  onOverrideToggle,
  className = ''
}: PromptEditorProps) {
  if (customMode) {
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="text-sm font-medium">Assistant Prompt</label>
        <p className="text-sm text-gray-600">
          Define the assistant&apos;s personality and behavior.
        </p>
        <Textarea
          value={customPrompt}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          placeholder="Enter the assistant prompt..."
          className="min-h-[250px] font-mono text-sm"
        />
      </div>
    )
  }

  if (!template) {
    return null
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Template Preview */}
      <div className="p-4 bg-gray-50 rounded-lg space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Assistant Prompt</span>
          </div>
          <div className="text-sm text-gray-600 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200 max-h-60 overflow-y-auto">
            {template.user_prompt}
          </div>
        </div>
      </div>

      {/* Custom Override Option */}
      {onOverrideToggle && (
        <>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-900">
                Want to customize this template?
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showOverride}
                onChange={(e) => onOverrideToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {showOverride && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Override</label>
              <p className="text-sm text-gray-600">
                Override the template&apos;s prompt for this agent only.
              </p>
              <Textarea
                value={customPrompt}
                onChange={(e) => onCustomPromptChange(e.target.value)}
                placeholder="Enter custom prompt override..."
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}