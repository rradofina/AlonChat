'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Plus, HelpCircle, Edit, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useParams } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'
import SourcesSidebar from '@/components/agents/sources-sidebar'

interface QASource {
  id: string
  question: string
  answer: string
  size_bytes: number
  created_at: string
}

export default function QAPage() {
  const params = useParams()
  const [title, setTitle] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [showRetrainingAlert, setShowRetrainingAlert] = useState(false)
  const [qaItems, setQaItems] = useState<QASource[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQuestion, setEditQuestion] = useState('')
  const [editAnswer, setEditAnswer] = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

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

  useEffect(() => {
    fetchQASources()
  }, [])

  const fetchQASources = async () => {
    try {
      const response = await fetch(`/api/agents/${params.id}/sources/qa`)
      if (response.ok) {
        const data = await response.json()
        setQaItems(data.sources || [])
      }
    } catch (error) {
      console.error('Error fetching Q&A:', error)
    }
  }

  const handleAddQA = async () => {
    if (!question || !answer) {
      toast({
        title: 'Error',
        description: 'Please enter both question and answer',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/agents/${params.id}/sources/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer }),
      })

      if (response.ok) {
        const data = await response.json()
        setQaItems([...qaItems, data.source])
        setTitle('')
        setQuestion('')
        setAnswer('')
        setRefreshTrigger(prev => prev + 1)
        toast({
          title: 'Success',
          description: 'Q&A pair added successfully',
        })
        setShowRetrainingAlert(true)
      } else {
        throw new Error('Failed to add Q&A')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add Q&A pair',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateQA = async (id: string) => {
    if (!editQuestion || !editAnswer) return

    try {
      const response = await fetch(`/api/agents/${params.id}/sources/qa`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: id,
          question: editQuestion,
          answer: editAnswer
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setQaItems(qaItems.map(item =>
          item.id === id ? data.source : item
        ))
        setEditingId(null)
        setRefreshTrigger(prev => prev + 1)
        toast({
          title: 'Success',
          description: 'Q&A pair updated successfully',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update Q&A pair',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteItems = async () => {
    if (selectedItems.size === 0) return

    try {
      const response = await fetch(`/api/agents/${params.id}/sources/qa`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: Array.from(selectedItems) }),
      })

      if (response.ok) {
        setQaItems(qaItems.filter(item => !selectedItems.has(item.id)))
        setSelectedItems(new Set())
        setRefreshTrigger(prev => prev + 1)
        toast({
          title: 'Success',
          description: `Deleted ${selectedItems.size} Q&A pair(s)`,
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete Q&A pairs',
        variant: 'destructive',
      })
    }
  }

  const handleSelectAll = () => {
    if (selectedItems.size === qaItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(qaItems.map(item => item.id)))
    }
  }

  const calculateTotalSize = () => {
    return qaItems.reduce((total, item) => total + (item.size_bytes || 0), 0)
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
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
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
                    {new TextEncoder().encode(answer).length} B
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleAddQA}
                    disabled={isLoading || !question || !answer}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    {isLoading ? 'Adding...' : 'Add Q&A'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Q&A Sources List */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Q&A sources</h2>

            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                {selectedItems.size === qaItems.length ? 'Deselect all' : 'Select all'}
              </button>
              {selectedItems.size > 0 && (
                <Button
                  onClick={handleDeleteItems}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete ({selectedItems.size})
                </Button>
              )}
            </div>

            {qaItems.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <p className="text-sm text-gray-500 text-center">No Q&A pairs added yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {qaItems.map((item) => (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-lg">
                    {editingId === item.id ? (
                      <div className="p-4 space-y-3">
                        <Input
                          value={editQuestion}
                          onChange={(e) => setEditQuestion(e.target.value)}
                          placeholder="Question"
                        />
                        <Textarea
                          value={editAnswer}
                          onChange={(e) => setEditAnswer(e.target.value)}
                          placeholder="Answer"
                          className="min-h-[100px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateQA(item.id)}
                            className="bg-gray-900 hover:bg-gray-800 text-white"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedItems)
                              if (e.target.checked) {
                                newSelected.add(item.id)
                              } else {
                                newSelected.delete(item.id)
                              }
                              setSelectedItems(newSelected)
                            }}
                            className="rounded border-gray-300 mt-1"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{item.question}</p>
                            <p className="text-sm text-gray-600 mt-1">{item.answer}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-gray-500">
                                {item.size_bytes} B · {new Date(item.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingId(item.id)
                                setEditQuestion(item.question)
                                setEditAnswer(item.answer)
                              }}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Edit className="h-4 w-4 text-gray-400" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedItems(new Set([item.id]))
                                handleDeleteItems()
                              }}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <X className="h-4 w-4 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
              <span>Sort by: Default</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <SourcesSidebar
        agentId={params.id as string}
        showRetrainingAlert={showRetrainingAlert}
        refreshTrigger={refreshTrigger}
      />
    </div>
  )
}