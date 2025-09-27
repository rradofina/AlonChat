import { JSDOM } from 'jsdom'
import { z } from 'zod'

// Schema for a structured link
export const LinkSchema = z.object({
  id: z.string(),
  text: z.string(),
  url: z.string().url(),
  position: z.object({
    start: z.number(),
    end: z.number()
  }).optional(),
  verified: z.boolean().default(false),
  lastChecked: z.string().datetime().optional()
})

export type ExtractedLink = z.infer<typeof LinkSchema>

// List of known malicious domains (in production, this would be a larger list or external service)
const BLOCKED_DOMAINS = [
  'bit.ly', // Can be used for phishing
  'tinyurl.com', // Can hide malicious URLs
  // Add more as needed
]

// List of allowed protocols
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:']

/**
 * Extract links from HTML content
 */
export function extractLinksFromHtml(html: string): ExtractedLink[] {
  try {
    const dom = new JSDOM(html)
    const document = dom.window.document
    const links: ExtractedLink[] = []

    // Get all anchor tags
    const anchorTags = document.querySelectorAll('a[href]')

    anchorTags.forEach((anchor, index) => {
      const href = anchor.getAttribute('href')
      const text = anchor.textContent || ''

      if (!href) return

      // Validate URL
      const validatedUrl = validateUrl(href)
      if (!validatedUrl) return

      // Check if URL is safe
      const isSafe = isUrlSafe(validatedUrl)

      links.push({
        id: `link_${Date.now()}_${index}`,
        text: text.trim(),
        url: validatedUrl,
        verified: isSafe,
        lastChecked: new Date().toISOString()
      })
    })

    return links
  } catch (error) {
    console.error('Error extracting links:', error)
    return []
  }
}

/**
 * Extract links from plain text (for AI responses)
 */
export function extractLinksFromText(text: string): ExtractedLink[] {
  const links: ExtractedLink[] = []

  // Regex to match URLs in text
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi
  const matches = text.matchAll(urlRegex)

  let index = 0
  for (const match of matches) {
    const url = match[0]
    const position = match.index

    if (position === undefined) continue

    const validatedUrl = validateUrl(url)
    if (!validatedUrl) continue

    const isSafe = isUrlSafe(validatedUrl)

    links.push({
      id: `link_${Date.now()}_${index}`,
      text: url,
      url: validatedUrl,
      position: {
        start: position,
        end: position + url.length
      },
      verified: isSafe,
      lastChecked: new Date().toISOString()
    })

    index++
  }

  return links
}

/**
 * Validate and normalize URL
 */
export function validateUrl(url: string): string | null {
  try {
    // Handle relative URLs by adding https://
    if (!url.match(/^[a-zA-Z]+:\/\//)) {
      url = 'https://' + url
    }

    const urlObj = new URL(url)

    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(urlObj.protocol)) {
      console.warn(`Blocked URL with protocol: ${urlObj.protocol}`)
      return null
    }

    // Normalize URL
    return urlObj.toString()
  } catch (error) {
    console.warn(`Invalid URL: ${url}`)
    return null
  }
}

/**
 * Check if URL is safe (not in blocklist)
 */
export function isUrlSafe(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname.toLowerCase()

    // Check against blocked domains
    for (const blockedDomain of BLOCKED_DOMAINS) {
      if (domain.includes(blockedDomain)) {
        console.warn(`Blocked unsafe domain: ${domain}`)
        return false
      }
    }

    // Check for suspicious patterns
    if (domain.includes('phishing') || domain.includes('malware')) {
      return false
    }

    // Check for IP addresses (often suspicious)
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (ipRegex.test(domain)) {
      console.warn(`Blocked IP address URL: ${domain}`)
      return false
    }

    return true
  } catch (error) {
    return false
  }
}

/**
 * Convert HTML links to markdown format for AI context
 */
export function convertLinksToMarkdown(html: string, links: ExtractedLink[]): string {
  try {
    const dom = new JSDOM(html)
    const document = dom.window.document

    // Replace all anchor tags with markdown format
    links.forEach(link => {
      const anchors = document.querySelectorAll(`a[href="${link.url}"]`)
      anchors.forEach(anchor => {
        const markdownLink = `[${link.text}](${link.url})`
        const textNode = document.createTextNode(markdownLink)
        anchor.parentNode?.replaceChild(textNode, anchor)
      })
    })

    return document.body.textContent || ''
  } catch (error) {
    console.error('Error converting links to markdown:', error)
    return html
  }
}

/**
 * Inject links back into AI response
 */
export function injectLinksIntoResponse(
  response: string,
  links: ExtractedLink[]
): string {
  let processedResponse = response

  // Sort links by position (if available) to process from end to start
  const sortedLinks = [...links].sort((a, b) => {
    const posA = a.position?.start ?? 0
    const posB = b.position?.start ?? 0
    return posB - posA // Reverse order
  })

  sortedLinks.forEach(link => {
    // Only inject verified links
    if (!link.verified) return

    // Create safe HTML anchor tag
    const safeAnchor = `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">${escapeHtml(link.text)}</a>`

    // Try to find and replace the link text in the response
    // First try exact match
    if (processedResponse.includes(link.text)) {
      processedResponse = processedResponse.replace(link.text, safeAnchor)
    }
    // Then try URL match
    else if (processedResponse.includes(link.url)) {
      processedResponse = processedResponse.replace(link.url, safeAnchor)
    }
    // Try markdown format
    else if (processedResponse.includes(`[${link.text}](${link.url})`)) {
      processedResponse = processedResponse.replace(
        `[${link.text}](${link.url})`,
        safeAnchor
      )
    }
  })

  return processedResponse
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  }
  return text.replace(/[&<>"'/]/g, char => map[char] || char)
}

/**
 * Verify URL is accessible (for production use)
 */
export async function verifyUrlAccessibility(url: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow'
    })

    clearTimeout(timeoutId)

    // Check if response is successful (2xx or 3xx)
    return response.ok || response.status < 400
  } catch (error) {
    console.warn(`Failed to verify URL ${url}:`, error)
    return false
  }
}

/**
 * Batch verify multiple URLs
 */
export async function batchVerifyUrls(
  links: ExtractedLink[]
): Promise<ExtractedLink[]> {
  const verificationPromises = links.map(async (link) => {
    const isAccessible = await verifyUrlAccessibility(link.url)
    return {
      ...link,
      verified: link.verified && isAccessible,
      lastChecked: new Date().toISOString()
    }
  })

  return Promise.all(verificationPromises)
}