'use client'

import { useState, useRef, useEffect } from 'react'
import { HelpCircle, Plus, X, Image, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateQA } from '../hooks/useQASources'

interface AddQAFormProps {
  agentId: string
  showRetrainingAlert?: boolean
  onSuccess?: () => void
}

export function AddQAForm({ agentId, showRetrainingAlert, onSuccess }: AddQAFormProps) {
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<string[]>([''])
  const [answer, setAnswer] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const createMutation = useCreateQA()

  // Cleanup image previews on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url))
    }
  }, [imagePreviews])

  const handleAddQuestion = () => {
    setQuestions([...questions, ''])
  }

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...questions]
    newQuestions[index] = value
    setQuestions(newQuestions)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const newImages = [...images, ...files].slice(0, 4) // Max 4 images
    setImages(newImages)

    // Create previews
    const newPreviews = newImages.map(file => URL.createObjectURL(file))
    // Clean up old previews
    imagePreviews.forEach(url => URL.revokeObjectURL(url))
    setImagePreviews(newPreviews)
  }

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index])
    setImages(images.filter((_, i) => i !== index))
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !answer.trim()) {
      return
    }

    const validQuestions = questions.filter(q => q.trim())
    if (validQuestions.length === 0) {
      return
    }

    await createMutation.mutateAsync({
      agentId,
      data: {
        title,
        questions: validQuestions,
        answer,
        images,
      },
    })

    // Reset form
    setTitle('')
    setQuestions([''])
    setAnswer('')
    setImages([])
    setImagePreviews([])

    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <HelpCircle className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add Q&A</h2>
            <p className="text-sm text-gray-500">Create question and answer pairs</p>
          </div>
        </div>
      </div>

      {showRetrainingAlert && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-amber-900 font-medium">Agent needs retraining</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Adding new Q&A will require retraining your agent.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Product Features"
            required
          />
        </div>

        {/* Questions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Questions
          </label>
          <div className="space-y-2">
            {questions.map((question, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={question}
                  onChange={(e) => handleQuestionChange(index, e.target.value)}
                  placeholder="Enter a question"
                />
                {questions.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleRemoveQuestion(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddQuestion}
            className="mt-2"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Question
          </Button>
        </div>

        {/* Answer */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Answer
          </label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Enter the answer"
            className="w-full min-h-[100px] px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Images (optional)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-2">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {images.length < 4 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image className="h-4 w-4 mr-1" />
              Add Images ({images.length}/4)
            </Button>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={!title.trim() || !answer.trim() || createMutation.isPending}
        >
          {createMutation.isPending ? 'Adding Q&A...' : 'Add Q&A'}
        </Button>
      </div>
    </form>
  )
}