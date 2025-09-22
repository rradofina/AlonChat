'use client'

import { useState } from 'react'
import { Link2, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'

interface WebsiteSourceInputProps {
  onAddSource: (data: any, name: string, size: number) => void
}

type CrawlType = 'crawl' | 'sitemap' | 'individual'

export function WebsiteSourceInput({ onAddSource }: WebsiteSourceInputProps) {
  const [crawlType, setCrawlType] = useState<CrawlType>('crawl')
  const [url, setUrl] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [maxPages, setMaxPages] = useState(50)
  const [includeSubdomains, setIncludeSubdomains] = useState(false)
  const [isFetching, setIsFetching] = useState(false)

  const handleFetchLinks = async () => {
    if (!url.trim()) return

    setIsFetching(true)

    // Simulate fetching - in production, this would crawl the website
    setTimeout(() => {
      const data = {
        url,
        crawlType,
        maxPages,
        includeSubdomains,
        fetchedAt: new Date().toISOString()
      }

      // Extract domain name for display
      let domain = url
      try {
        domain = new URL(url).hostname
      } catch {}

      // Estimate size based on crawl settings
      const estimatedSize = crawlType === 'individual' ? 5 * 1024 : maxPages * 10 * 1024

      onAddSource(data, domain, estimatedSize)

      // Reset form
      setUrl('')
      setIsFetching(false)
    }, 1500)
  }

  return (
    <div className="p-6">
      <h3 className="font-medium mb-4">Add links</h3>

      {/* Crawl type tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setCrawlType('crawl')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            crawlType === 'crawl'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Crawl links
        </button>
        <button
          onClick={() => setCrawlType('sitemap')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            crawlType === 'sitemap'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Sitemap
        </button>
        <button
          onClick={() => setCrawlType('individual')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            crawlType === 'individual'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Individual link
        </button>
      </div>

      {/* URL input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center border border-gray-200 rounded-lg px-3">
            <span className="text-gray-500 mr-2">https://</span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="www.example.com"
              className="flex-1 py-2 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Info message */}
      <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 mb-4">
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>
          {crawlType === 'crawl' && 'Links found during crawling or sitemap retrieval may be updated if new links are discovered or some links are invalid.'}
          {crawlType === 'sitemap' && 'Submit your sitemap URL to automatically fetch and index all pages listed in it.'}
          {crawlType === 'individual' && 'Add a single specific page URL to index its content.'}
        </span>
      </div>

      {/* Advanced options */}
      {crawlType === 'crawl' && (
        <div className="mb-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Advanced options
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum pages to crawl
                </label>
                <input
                  type="number"
                  value={maxPages}
                  onChange={(e) => setMaxPages(parseInt(e.target.value) || 50)}
                  min={1}
                  max={500}
                  className="w-32 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="subdomains"
                  checked={includeSubdomains}
                  onChange={(e) => setIncludeSubdomains(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="subdomains" className="ml-2 text-sm text-gray-700">
                  Include subdomains
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fetch button */}
      <button
        onClick={handleFetchLinks}
        disabled={!url.trim() || isFetching}
        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isFetching ? 'Fetching links...' : 'Fetch links'}
      </button>
    </div>
  )
}