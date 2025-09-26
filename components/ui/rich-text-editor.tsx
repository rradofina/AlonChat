'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Placeholder from '@tiptap/extension-placeholder'
import { useState, useCallback, useEffect } from 'react'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Smile,
  Type,
  Palette,
  Link2Off
} from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  minHeight?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter your text...',
  disabled = false,
  className,
  minHeight = 'min-h-[200px]'
}: RichTextEditorProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showFontSizePicker, setShowFontSizePicker] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      }),
      Underline,
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder: placeholder
      })
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editable: !disabled,
    immediatelyRender: false,
    autofocus: false
  })

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  // Debug log to check if editor is initialized
  useEffect(() => {
    if (editor) {
      console.log('Rich text editor initialized successfully')
    }
  }, [editor])

  const addEmoji = useCallback((emoji: any) => {
    if (editor) {
      editor.chain().focus().insertContent(emoji.native).run()
      setShowEmojiPicker(false)
    }
  }, [editor])

  const setLink = useCallback(() => {
    if (!editor) return

    if (linkUrl) {
      // Update link with protocol if not present
      const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run()
    }
    setShowLinkDialog(false)
    setLinkUrl('')
  }, [editor, linkUrl])

  const removeLink = useCallback(() => {
    if (!editor) return
    editor.chain().focus().unsetLink().run()
  }, [editor])

  const openLinkDialog = useCallback(() => {
    if (!editor) return

    const { from, to } = editor.state.selection
    const text = editor.state.doc.textBetween(from, to)
    setSelectedText(text)

    // Get current link if exists
    const currentLink = editor.getAttributes('link').href || ''
    setLinkUrl(currentLink)
    setShowLinkDialog(true)
  }, [editor])

  const setFontSize = (size: string) => {
    if (!editor) return

    // Apply font size using inline styles
    const fontSize = {
      'small': '0.875rem',
      'normal': '1rem',
      'large': '1.25rem',
      'xlarge': '1.5rem'
    }[size] || '1rem'

    editor.chain().focus().setMark('textStyle', { fontSize }).run()
    setShowFontSizePicker(false)
  }

  const setTextColor = (color: string) => {
    if (!editor) return
    editor.chain().focus().setColor(color).run()
    setShowColorPicker(false)
  }

  const colors = [
    '#000000', '#4B5563', '#6B7280', '#9CA3AF',
    '#EF4444', '#F87171', '#F59E0B', '#FBBF24',
    '#10B981', '#34D399', '#3B82F6', '#60A5FA',
    '#8B5CF6', '#A78BFA', '#EC4899', '#F472B6'
  ]

  if (!editor) {
    return null
  }

  return (
    <div className={cn("border border-gray-300 rounded-md bg-white", className)}>
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-2 flex items-center gap-1 flex-wrap">
        {/* Font Size */}
        <Popover open={showFontSizePicker} onOpenChange={setShowFontSizePicker}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              disabled={disabled}
              onMouseDown={(e) => {
                e.preventDefault()
              }}
            >
              <Type className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-32 p-2">
            <div className="space-y-1">
              <button
                onClick={() => setFontSize('small')}
                className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
              >
                Small
              </button>
              <button
                onClick={() => setFontSize('normal')}
                className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
              >
                Normal
              </button>
              <button
                onClick={() => setFontSize('large')}
                className="w-full text-left px-2 py-1 text-lg hover:bg-gray-100 rounded"
              >
                Large
              </button>
              <button
                onClick={() => setFontSize('xlarge')}
                className="w-full text-left px-2 py-1 text-xl hover:bg-gray-100 rounded"
              >
                Extra Large
              </button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-gray-300" />

        {/* Text Color */}
        <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              disabled={disabled}
              onMouseDown={(e) => {
                e.preventDefault()
              }}
            >
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <div className="grid grid-cols-4 gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setTextColor(color)}
                  className="w-10 h-10 rounded border border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-gray-300" />

        {/* Basic Formatting */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            console.log('Bold onClick triggered', { editor: !!editor, disabled })
            if (editor && !disabled) {
              editor.chain().focus().toggleBold().run()
            }
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            console.log('Bold onMouseDown triggered')
          }}
          disabled={disabled}
          className={cn("h-8 px-2", editor?.isActive('bold') && 'bg-gray-200')}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (editor && !disabled) {
              editor.chain().focus().toggleItalic().run()
            }
          }}
          onMouseDown={(e) => {
            e.preventDefault()
          }}
          disabled={disabled}
          className={cn("h-8 px-2", editor.isActive('italic') && 'bg-gray-200')}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (editor && !disabled) {
              editor.chain().focus().toggleUnderline().run()
            }
          }}
          onMouseDown={(e) => {
            e.preventDefault()
          }}
          disabled={disabled}
          className={cn("h-8 px-2", editor.isActive('underline') && 'bg-gray-200')}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300" />

        {/* Lists */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (editor && !disabled) {
              editor.chain().focus().toggleBulletList().run()
            }
          }}
          onMouseDown={(e) => {
            e.preventDefault()
          }}
          disabled={disabled}
          className={cn("h-8 px-2", editor.isActive('bulletList') && 'bg-gray-200')}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (editor && !disabled) {
              editor.chain().focus().toggleOrderedList().run()
            }
          }}
          onMouseDown={(e) => {
            e.preventDefault()
          }}
          disabled={disabled}
          className={cn("h-8 px-2", editor.isActive('orderedList') && 'bg-gray-200')}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (editor && !disabled) {
              editor.chain().focus().toggleBlockquote().run()
            }
          }}
          onMouseDown={(e) => {
            e.preventDefault()
          }}
          disabled={disabled}
          className={cn("h-8 px-2", editor.isActive('blockquote') && 'bg-gray-200')}
        >
          <Quote className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300" />

        {/* Link */}
        <Popover open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!disabled) {
                  openLinkDialog()
                }
              }}
              onMouseDown={(e) => {
                e.preventDefault()
              }}
              disabled={disabled}
              className={cn("h-8 px-2", editor.isActive('link') && 'bg-gray-200')}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Add link</p>
              {selectedText && (
                <p className="text-xs text-gray-500">Text: {selectedText}</p>
              )}
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    setLink()
                  }
                }}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={setLink}>
                  Add Link
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowLinkDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {editor.isActive('link') && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!disabled) {
                removeLink()
              }
            }}
            onMouseDown={(e) => {
              e.preventDefault()
            }}
            disabled={disabled}
            className="h-8 px-2"
          >
            <Link2Off className="h-4 w-4" />
          </Button>
        )}

        <div className="w-px h-6 bg-gray-300" />

        {/* Emoji */}
        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              disabled={disabled}
              onMouseDown={(e) => {
                e.preventDefault()
              }}
            >
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-none">
            <Picker
              data={data}
              onEmojiSelect={addEmoji}
              theme="light"
              previewPosition="none"
            />
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-gray-300" />

        {/* Undo/Redo */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (editor && !disabled) {
              editor.chain().focus().undo().run()
            }
          }}
          onMouseDown={(e) => {
            e.preventDefault()
          }}
          disabled={disabled || !editor.can().undo()}
          className="h-8 px-2"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (editor && !disabled) {
              editor.chain().focus().redo().run()
            }
          }}
          onMouseDown={(e) => {
            e.preventDefault()
          }}
          disabled={disabled || !editor.can().redo()}
          className="h-8 px-2"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className={cn(
          "prose prose-sm max-w-none p-3 focus:outline-none",
          minHeight,
          "overflow-y-auto"
        )}
      />
    </div>
  )
}