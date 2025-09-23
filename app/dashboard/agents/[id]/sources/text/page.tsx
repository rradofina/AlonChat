'use client'

import { useState } from 'react'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export default function TextPage() {
  const [textContent, setTextContent] = useState('')
  const [showRetrainingAlert, setShowRetrainingAlert] = useState(false)

  const handleTextChange = (value: string) => {
    setTextContent(value)
    if (value && !showRetrainingAlert) {
      setShowRetrainingAlert(true)
    }
  }

  const handleAddSnippet = () => {
    // Handle add text snippet
    console.log('Adding text snippet:', textContent)
  }

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Text</h1>
          <p className="text-sm text-gray-600 mb-6">
            Add plain text-based sources to train your AI Agent with precise information.
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

          {/* Add Text Snippet Section */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Add text snippet</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Title</label>
                  <input
                    type="text"
                    placeholder="Ex: Refund requests"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <Textarea
                    value={textContent}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder="Enter your text"
                    className="min-h-[200px] resize-none"
                  />
                  <div className="text-right text-xs text-gray-500 mt-1">
                    0 B
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleAddSnippet}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    Add text snippet
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Text Sources List */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Text sources</h2>

            <div className="flex items-center gap-4 mb-4">
              <button className="text-sm text-gray-700 hover:text-gray-900">Select all</button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Pricing</p>
                  <div className="flex items-center justify-between mt-4 p-4 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">19 B</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">New</span>
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
              <span className="text-2xl font-bold text-gray-900">1</span>
              <span className="text-sm text-gray-600">Text File</span>
            </div>
            <div className="text-sm text-gray-500">18 B</div>
          </div>

          {/* Links Count */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl font-bold text-gray-900">10</span>
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