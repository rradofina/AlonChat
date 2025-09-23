'use client'

import { useState } from 'react'
import { RefreshCw, AlertCircle, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function WebsitePage() {
  const [url, setUrl] = useState('')
  const [showRetrainingAlert, setShowRetrainingAlert] = useState(false)
  const [crawlOption, setCrawlOption] = useState('crawl')

  const handleUrlChange = (value: string) => {
    setUrl(value)
    if (value && !showRetrainingAlert) {
      setShowRetrainingAlert(true)
    }
  }

  const handleFetchLinks = () => {
    // Handle fetch links
    console.log('Fetching links for:', url)
  }

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Website</h1>
          <p className="text-sm text-gray-600 mb-6">
            Crawl web pages or submit sitemaps to update your AI with the latest content.
          </p>

          {/* Retraining Required Alert */}
          {showRetrainingAlert && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-800">
                  <p className="font-medium">Retraining is required for changes to apply</p>
                </div>
              </div>
            </div>
          )}

          {/* Add Links Section */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Add links</h2>

              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setCrawlOption('crawl')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    crawlOption === 'crawl'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Crawl links
                </button>
                <button
                  onClick={() => setCrawlOption('individual')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    crawlOption === 'individual'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Individual link
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">URL</label>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      value={url}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="https://www.example.com"
                      className="flex-1"
                    />
                  </div>
                </div>

                {crawlOption === 'crawl' && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      id="crawling-info"
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="crawling-info">
                      Links found during crawling or sitemap retrieved may be updated if new links are discovered or some links are invalid.
                    </label>
                  </div>
                )}

                <div className="pt-4">
                  <Button
                    onClick={handleFetchLinks}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    Fetch links
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <details className="mt-6">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
              ▼ Advanced options
            </summary>
            <div className="mt-4 space-y-4">
              {/* Advanced options content would go here */}
            </div>
          </details>

          {/* Link Sources List */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Link sources</h2>

            <div className="flex items-center gap-4 mb-4">
              <button className="text-sm text-gray-700 hover:text-gray-900">Select all</button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-6">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Globe className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">https://www.starbucks.ph/</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Last crawled 14 hours ago • Links: 9
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
              <span>Sort by: Default</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-96 border-l border-gray-200 bg-gray-50 p-6">
        <div className="space-y-6">
          {/* Sources Count */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl font-bold text-gray-900">9</span>
              <span className="text-sm text-gray-600">Links</span>
            </div>
            <div className="text-sm text-gray-500">231 KB</div>
          </div>

          {/* Total Size */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Total size</span>
              <span className="text-sm text-gray-600">231 KB / 400 KB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gray-900 h-2 rounded-full"
                style={{ width: '57.75%' }}
              />
            </div>
          </div>

          {/* Retrain Button */}
          <Button
            className="w-full bg-gray-900 hover:bg-gray-800 text-white"
            onClick={() => {}}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retrain agent
          </Button>
        </div>
      </div>
    </div>
  )
}