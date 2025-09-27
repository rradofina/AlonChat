'use client'

import DOMPurify from 'isomorphic-dompurify'
import { useEffect, useState } from 'react'

interface SafeHtmlRendererProps {
  content: string
  className?: string
  allowedTags?: string[]
  allowedAttributes?: string[]
}

export function SafeHtmlRenderer({
  content,
  className = '',
  allowedTags = ['a', 'strong', 'em', 'b', 'i', 'u', 'br', 'p', 'span'],
  allowedAttributes = ['href', 'target', 'rel', 'class']
}: SafeHtmlRendererProps) {
  const [sanitizedHtml, setSanitizedHtml] = useState('')

  useEffect(() => {
    // Configure DOMPurify
    const config = {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: allowedAttributes,
      ALLOW_DATA_ATTR: false,
      KEEP_CONTENT: true,
      ADD_TAGS: [],
      ADD_ATTR: ['target', 'rel'], // Always allow these for links
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
    }

    // Sanitize the content
    let cleaned = DOMPurify.sanitize(content, config)

    // Ensure all links have proper attributes
    if (cleaned.includes('<a ')) {
      cleaned = cleaned.replace(
        /<a\s+href="([^"]+)"([^>]*)>/gi,
        (match, url, rest) => {
          // Ensure target and rel attributes
          if (!rest.includes('target=')) {
            rest += ' target="_blank"'
          }
          if (!rest.includes('rel=')) {
            rest += ' rel="noopener noreferrer"'
          }
          // Add styling class if not present
          if (!rest.includes('class=')) {
            rest += ' class="text-blue-600 underline hover:text-blue-800"'
          }
          return `<a href="${url}"${rest}>`
        }
      )
    }

    setSanitizedHtml(cleaned)
  }, [content, allowedTags, allowedAttributes])

  // Check if content appears to be HTML (contains tags)
  const isHtml = /<[^>]+>/.test(content)

  // If it's not HTML, just render as plain text
  if (!isHtml) {
    return <span className={className}>{content}</span>
  }

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}

// Export a simpler version for chat messages
export function ChatMessageRenderer({ content, className }: { content: string; className?: string }) {
  return (
    <SafeHtmlRenderer
      content={content}
      className={className}
      allowedTags={['a', 'strong', 'em', 'b', 'i', 'br', 'p']}
      allowedAttributes={['href', 'target', 'rel', 'class']}
    />
  )
}