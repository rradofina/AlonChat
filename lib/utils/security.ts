/**
 * Security utilities for production SaaS application
 */

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

/**
 * Sanitize error messages for production
 * Removes sensitive information like file paths, SQL queries, etc.
 */
export function sanitizeError(error: any): string {
  // In production, return generic messages
  if (process.env.NODE_ENV === 'production') {
    // Map common errors to user-friendly messages
    const errorMessage = error?.message?.toLowerCase() || ''

    if (errorMessage.includes('timeout')) {
      return 'The operation took too long to complete. Please try again.'
    }
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'Network error. Please check your connection and try again.'
    }
    if (errorMessage.includes('rate limit')) {
      return 'Too many requests. Please wait a moment before trying again.'
    }
    if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
      return 'You do not have permission to perform this action.'
    }
    if (errorMessage.includes('not found')) {
      return 'The requested resource was not found.'
    }

    // Default generic message
    return 'An error occurred. Please try again or contact support if the issue persists.'
  }

  // In development, sanitize but show more details
  let message = error?.message || 'Unknown error'

  // Remove file paths
  message = message.replace(/\/[A-Za-z0-9\/\\:.-]+\.(ts|js|tsx|jsx)/g, '[FILE]')
  message = message.replace(/at\s+.*\([^)]+\)/g, 'at [STACK]')

  // Remove SQL queries
  message = message.replace(/SELECT\s+[\s\S]+?FROM/gi, 'SELECT ... FROM')
  message = message.replace(/INSERT\s+INTO\s+[\s\S]+?VALUES/gi, 'INSERT INTO ... VALUES')
  message = message.replace(/UPDATE\s+[\s\S]+?SET/gi, 'UPDATE ... SET')
  message = message.replace(/DELETE\s+FROM\s+[\s\S]+?WHERE/gi, 'DELETE FROM ... WHERE')

  // Remove sensitive headers and tokens
  message = message.replace(/Bearer\s+[A-Za-z0-9-._~+/]+=*/g, 'Bearer [TOKEN]')
  message = message.replace(/[A-Za-z0-9]{32,}/g, '[KEY]')

  return message
}

/**
 * Validate and sanitize URLs for crawling
 * Prevents SSRF attacks and validates URL format
 */
export function validateCrawlUrl(url: string): { valid: boolean; error?: string; normalizedUrl?: string } {
  try {
    // Add protocol if missing
    let normalizedUrl = url
    if (!url.match(/^https?:\/\//i)) {
      normalizedUrl = 'https://' + url
    }

    const parsed = new URL(normalizedUrl)

    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return {
        valid: false,
        error: 'Only HTTP and HTTPS URLs are allowed'
      }
    }

    // Block localhost and private IPs (SSRF protection)
    const hostname = parsed.hostname.toLowerCase()

    // Block localhost variations
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return {
        valid: false,
        error: 'Local URLs are not allowed'
      }
    }

    // Block private IP ranges
    const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
    const match = hostname.match(ipv4Pattern)
    if (match) {
      const [, a, b, c, d] = match.map(Number)

      // Check for private IP ranges
      if (
        (a === 10) || // 10.0.0.0/8
        (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
        (a === 192 && b === 168) || // 192.168.0.0/16
        (a === 169 && b === 254) // 169.254.0.0/16 (link-local)
      ) {
        return {
          valid: false,
          error: 'Private network URLs are not allowed'
        }
      }
    }

    // Block certain sensitive domains
    const blockedDomains = [
      'metadata.google.internal',
      'metadata.azure.com',
      'instance-data.ec2.internal'
    ]

    if (blockedDomains.some(domain => hostname.includes(domain))) {
      return {
        valid: false,
        error: 'This domain is not allowed'
      }
    }

    // Validate URL length
    if (normalizedUrl.length > 2048) {
      return {
        valid: false,
        error: 'URL is too long (max 2048 characters)'
      }
    }

    return {
      valid: true,
      normalizedUrl
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid URL format'
    }
  }
}

/**
 * Rate limiting by user ID
 * Uses in-memory storage for simplicity, consider Redis for production
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export async function checkRateLimit(
  userId: string,
  limit: number = 10,
  windowMs: number = 60000 // 1 minute
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const now = Date.now()
  const userLimit = rateLimitStore.get(userId)

  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key)
      }
    }
  }

  if (!userLimit || userLimit.resetTime < now) {
    // New window
    const resetTime = now + windowMs
    rateLimitStore.set(userId, { count: 1, resetTime })
    return { allowed: true, remaining: limit - 1, resetTime }
  }

  if (userLimit.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: userLimit.resetTime
    }
  }

  // Increment count
  userLimit.count++
  rateLimitStore.set(userId, userLimit)

  return {
    allowed: true,
    remaining: limit - userLimit.count,
    resetTime: userLimit.resetTime
  }
}

/**
 * Get user IP address from request headers
 */
export async function getUserIP(): Promise<string | null> {
  const hdrs = await headers()

  // Check various headers that might contain the real IP
  const forwardedFor = hdrs.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = hdrs.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  const cfConnectingIP = hdrs.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return cfConnectingIP
  }

  return null
}

/**
 * Validate content size to prevent DoS
 */
export function validateContentSize(content: string, maxSizeMB: number = 10): { valid: boolean; error?: string } {
  const sizeInBytes = Buffer.byteLength(content, 'utf8')
  const sizeInMB = sizeInBytes / (1024 * 1024)

  if (sizeInMB > maxSizeMB) {
    return {
      valid: false,
      error: `Content is too large (${sizeInMB.toFixed(2)}MB). Maximum allowed is ${maxSizeMB}MB.`
    }
  }

  return { valid: true }
}

/**
 * Log security events for auditing
 */
export async function logSecurityEvent(
  event: {
    type: 'rate_limit' | 'invalid_url' | 'ssrf_attempt' | 'large_content' | 'unauthorized'
    userId?: string
    ip?: string
    details?: any
  }
) {
  // In production, this should go to a proper logging service
  if (process.env.NODE_ENV === 'production') {
    // Send to logging service (e.g., Sentry, LogFlare, etc.)
    console.error('[SECURITY]', {
      timestamp: new Date().toISOString(),
      ...event
    })
  } else {
    console.log('[SECURITY]', event)
  }
}