'use client'

import { useState } from 'react'
import { RefreshCw, AlertCircle, Plus, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function QAPage() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [showRetrainingAlert, setShowRetrainingAlert] = useState(false)
  const [qaItems, setQaItems] = useState([
    { id: 1, question: 'Refund Request', questions: 1, status: 'new' }
  ])

  const handleQuestionChange = (value: string) => {
    setQuestion(value)
    if (value && !showRetrainingAlert) {
      setShowRetrainingAlert(true)
    }
  }

  const handleAnswerChange = (value: string) => {
    setAnswer(value)
    if (value && !showRetrainingAlert) {
      setShowRetrainingAlert(true)
    }
  }

  const handleAddQA = () => {
    // Handle add Q&A
    console.log('Adding Q&A:', { question, answer })
  }

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Q&A</h1>
          <p className="text-sm text-gray-600 mb-6">
            Craft responses for key questions, ensuring your AI shares relevant info.
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

          {/* Add Q&A Section */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Q&A</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Title</label>
                  <Input
                    type="text"
                    placeholder="Ex: Refund requests"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Question</label>
                  <Input
                    type="text"
                    value={question}
                    onChange={(e) => handleQuestionChange(e.target.value)}
                    placeholder="Ex: How do I request a refund?"
                    className="w-full"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add question
                  </Button>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Answer</label>
                  <Textarea
                    value={answer}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder="Enter your answer..."
                    className="min-h-[200px] resize-none"
                  />
                  <div className="text-right text-xs text-gray-500 mt-1">
                    0 B
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleAddQA}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    Add Q&A
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Q&A Sources List */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Q&A sources</h2>

            <div className="flex items-center gap-4 mb-4">
              <button className="text-sm text-gray-700 hover:text-gray-900">Select all</button>
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Refund Request</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">New</span>
                        <span className="text-xs text-gray-500">99 B · 1 questions</span>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
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
          {/* Q&A Count */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl font-bold text-gray-900">1</span>
              <span className="text-sm text-gray-600">Q&A</span>
            </div>
            <div className="text-sm text-gray-500">96 B</div>
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