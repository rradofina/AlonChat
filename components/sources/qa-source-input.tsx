'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { RichTextEditor } from '@/components/ui/rich-text-editor'

interface QAPair {
  id: string
  question: string
  answer: string
}

interface QASourceInputProps {
  onAddSource: (data: any, name: string, size: number) => void
}

export function QASourceInput({ onAddSource }: QASourceInputProps) {
  const [title, setTitle] = useState('')
  const [qaPairs, setQaPairs] = useState<QAPair[]>([
    { id: '1', question: '', answer: '' }
  ])

  const handleAddQuestion = () => {
    setQaPairs([
      ...qaPairs,
      { id: Date.now().toString(), question: '', answer: '' }
    ])
  }

  const handleRemoveQuestion = (id: string) => {
    if (qaPairs.length > 1) {
      setQaPairs(qaPairs.filter(qa => qa.id !== id))
    }
  }

  const updateQAPair = (id: string, field: 'question' | 'answer', value: string) => {
    setQaPairs(qaPairs.map(qa =>
      qa.id === id ? { ...qa, [field]: value } : qa
    ))
  }

  const handleAddQA = () => {
    // Filter out empty Q&A pairs
    const validPairs = qaPairs.filter(qa => qa.question.trim() && qa.answer.trim())

    if (!title.trim() || validPairs.length === 0) {
      return
    }

    const data = {
      title,
      qaPairs: validPairs,
      createdAt: new Date().toISOString()
    }

    // Calculate size based on content
    const content = JSON.stringify(validPairs)
    const size = new Blob([content]).size

    onAddSource(data, title, size)

    // Reset form
    setTitle('')
    setQaPairs([{ id: '1', question: '', answer: '' }])
  }

  const hasValidContent = title.trim() && qaPairs.some(qa => qa.question.trim() && qa.answer.trim())

  return (
    <div className="p-6">
      <h3 className="font-medium mb-4">Add Q&A</h3>

      {/* Title input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Refund requests"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Q&A Pairs */}
      <div className="space-y-6">
        {qaPairs.map((qa, index) => (
          <div key={qa.id} className="border border-gray-200 rounded-lg p-4">
            {/* Question */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Question {index + 1}
                </label>
                {qaPairs.length > 1 && (
                  <button
                    onClick={() => handleRemoveQuestion(qa.id)}
                    className="text-red-500 hover:text-red-700"
                    title="Remove question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <input
                type="text"
                value={qa.question}
                onChange={(e) => updateQAPair(qa.id, 'question', e.target.value)}
                placeholder="Ex: How do I request a refund?"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Answer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Answer</label>
              <RichTextEditor
                value={qa.answer}
                onChange={(value) => updateQAPair(qa.id, 'answer', value)}
                placeholder="Enter your answer with formatting, links, and emojis..."
                minHeight="min-h-[150px]"
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {qa.answer.length > 0 && `${new Blob([qa.answer]).size} B`}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add question button */}
      <button
        onClick={handleAddQuestion}
        className="mt-4 flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add question
      </button>

      {/* Submit button */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <button
          onClick={handleAddQA}
          disabled={!hasValidContent}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Q&A
        </button>
      </div>
    </div>
  )
}