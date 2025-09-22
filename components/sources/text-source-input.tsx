'use client'

import { useState } from 'react'
import { Type, Bold, Italic, Strikethrough, List, ListOrdered, Link, Smile } from 'lucide-react'

interface TextSourceInputProps {
  onAddSource: (data: any, name: string, size: number) => void
}

export function TextSourceInput({ onAddSource }: TextSourceInputProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const handleAddSnippet = () => {
    if (!title.trim() || !content.trim()) {
      return
    }

    const data = {
      title,
      content,
      createdAt: new Date().toISOString()
    }

    // Calculate size in bytes
    const size = new Blob([content]).size

    onAddSource(data, title, size)

    // Reset form
    setTitle('')
    setContent('')
  }

  const formatButtons = [
    { icon: Type, action: 'text', label: 'Text' },
    { icon: Bold, action: 'bold', label: 'Bold' },
    { icon: Italic, action: 'italic', label: 'Italic' },
    { icon: Strikethrough, action: 'strike', label: 'Strikethrough' },
    { icon: List, action: 'bullet', label: 'Bullet List' },
    { icon: ListOrdered, action: 'number', label: 'Numbered List' },
    { icon: Link, action: 'link', label: 'Link' },
    { icon: Smile, action: 'emoji', label: 'Emoji' },
  ]

  return (
    <div className="p-6">
      <h3 className="font-medium mb-4">Add text snippet</h3>

      {/* Title input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter title..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Content editor */}
      <div className="mb-4">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
            {formatButtons.slice(0, 4).map((button) => {
              const Icon = button.icon
              return (
                <button
                  key={button.action}
                  className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
                  title={button.label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              )
            })}
            <div className="w-px h-5 bg-gray-300 mx-1" />
            {formatButtons.slice(4).map((button) => {
              const Icon = button.icon
              return (
                <button
                  key={button.action}
                  className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
                  title={button.label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              )
            })}
            <div className="ml-auto text-xs text-gray-500 px-2">
              {content.length > 0 && `${new Blob([content]).size} B`}
            </div>
          </div>

          {/* Text area */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your text content here..."
            className="w-full px-4 py-3 min-h-[200px] resize-none focus:outline-none"
            style={{ fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        <button
          onClick={handleAddSnippet}
          disabled={!title.trim() || !content.trim()}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add text snippet
        </button>
      </div>
    </div>
  )
}