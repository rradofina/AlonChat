'use client'

import { useState } from 'react'
import { Globe, ChevronDown, Info, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useAddWebsiteSource } from '../hooks/useWebsiteSources'

interface AddWebsiteFormProps {
  agentId: string
  onSuccess?: () => void
  showRetrainingAlert?: boolean
}

export function AddWebsiteForm({ agentId, onSuccess, showRetrainingAlert }: AddWebsiteFormProps) {
  const [url, setUrl] = useState('')
  const [protocol, setProtocol] = useState<'https' | 'http'>('https')
  const [showProtocolDropdown, setShowProtocolDropdown] = useState(false)
  const [crawlOption, setCrawlOption] = useState('crawl')
  const [maxPages, setMaxPages] = useState(200)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [includeOnlyPaths, setIncludeOnlyPaths] = useState('')
  const [excludePaths, setExcludePaths] = useState('')
  const [slowScraping, setSlowScraping] = useState(false)
  const [fullPageContent, setFullPageContent] = useState(false)

  const addWebsiteMutation = useAddWebsiteSource()

  const handleUrlChange = (value: string) => {
    // Remove any protocol if user types it in the input
    const cleanedValue = value.replace(/^https?:\/\//i, '')
    setUrl(cleanedValue)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!url) return

    const fullUrl = `${protocol}://${url}`

    await addWebsiteMutation.mutateAsync({
      agentId,
      url: fullUrl,
      crawlOption: crawlOption as 'single' | 'crawl',
      maxPages,
      includeOnlyPaths,
      excludePaths,
      slowScraping,
      fullPageContent,
    })

    // Reset form
    setUrl('')
    setCrawlOption('crawl')
    setMaxPages(200)
    setIncludeOnlyPaths('')
    setExcludePaths('')
    setSlowScraping(false)
    setFullPageContent(false)
    setShowAdvancedOptions(false)

    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Globe className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add Website</h2>
            <p className="text-sm text-gray-500">Import content from a website URL</p>
          </div>
        </div>
      </div>

      {showRetrainingAlert && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex gap-2">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-amber-900 font-medium">Agent needs retraining</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Adding new sources will require retraining your agent to include this content in responses.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProtocolDropdown(!showProtocolDropdown)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1 h-10"
            >
              <span className="text-sm text-gray-600">{protocol}://</span>
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>
            {showProtocolDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-sm z-10">
                <button
                  type="button"
                  onClick={() => {
                    setProtocol('https')
                    setShowProtocolDropdown(false)
                  }}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50"
                >
                  <span className="flex items-center gap-2">
                    <Lock className="h-3 w-3 text-green-600" />
                    https:// (Secure)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProtocol('http')
                    setShowProtocolDropdown(false)
                  }}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50"
                >
                  http:// (Insecure)
                </button>
              </div>
            )}
          </div>
          <Input
            placeholder="example.com or example.com/page"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="flex-1"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={crawlOption}
            onChange={(e) => setCrawlOption(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="crawl">🕸️ Crawl subpages</option>
            <option value="single">📄 Single page only</option>
          </select>
          {crawlOption === 'crawl' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Max pages:</span>
              <Input
                type="number"
                value={maxPages}
                onChange={(e) => setMaxPages(Number(e.target.value))}
                className="w-24"
                min={1}
                max={10000}
              />
            </div>
          )}
        </div>

        {/* Advanced Options */}
        <div className="border-t pt-3">
          <button
            type="button"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                showAdvancedOptions ? 'rotate-180' : ''
              }`}
            />
            Advanced Options
          </button>

          {showAdvancedOptions && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Include only paths</label>
                <Input
                  placeholder="/blog/*, /docs/*"
                  value={includeOnlyPaths}
                  onChange={(e) => setIncludeOnlyPaths(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Comma-separated paths to include. Use * as wildcard.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Exclude paths</label>
                <Input
                  placeholder="/admin/*, /private/*"
                  value={excludePaths}
                  onChange={(e) => setExcludePaths(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Comma-separated paths to exclude. Use * as wildcard.
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={slowScraping}
                    onCheckedChange={(checked) => setSlowScraping(checked as boolean)}
                  />
                  <span className="text-sm text-gray-700">Slow scraping (for rate-limited sites)</span>
                </label>

                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={fullPageContent}
                    onCheckedChange={(checked) => setFullPageContent(checked as boolean)}
                  />
                  <span className="text-sm text-gray-700">Extract full page content</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={!url || addWebsiteMutation.isPending}
        >
          {addWebsiteMutation.isPending ? 'Adding...' : 'Add Website'}
        </Button>
      </div>
    </form>
  )
}