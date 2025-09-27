/**
 * Retry utility for handling transient failures
 */

export interface RetryOptions {
  maxAttempts?: number
  initialDelay?: number
  maxDelay?: number
  backoffFactor?: number
  retryCondition?: (error: any) => boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error) => {
    // Retry on network errors and specific status codes
    const message = error.message || ''
    return (
      message.includes('503') ||
      message.includes('Service Unavailable') ||
      message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('ECONNRESET') ||
      message.includes('ETIMEDOUT') ||
      message.includes('Network') ||
      message.includes('fetch failed')
    )
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: any
  let delay = opts.initialDelay

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      // Check if we should retry
      if (attempt === opts.maxAttempts || !opts.retryCondition(error)) {
        throw error
      }

      // Log retry attempt
      console.log(
        `Retry attempt ${attempt}/${opts.maxAttempts} after ${delay}ms. Error: ${error.message}`
      )

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * opts.backoffFactor, opts.maxDelay)
    }
  }

  throw lastError
}

/**
 * Retry with exponential backoff specifically for AI provider calls
 */
export async function retryAICall<T>(
  fn: () => Promise<T>,
  providerName?: string
): Promise<T> {
  return withRetry(fn, {
    maxAttempts: 3,
    initialDelay: 2000,
    maxDelay: 15000,
    backoffFactor: 2,
    retryCondition: (error) => {
      const message = error.message || ''

      // Don't retry on authentication or configuration errors
      if (
        message.includes('401') ||
        message.includes('Unauthorized') ||
        message.includes('not configured') ||
        message.includes('Invalid API')
      ) {
        return false
      }

      // Retry on transient errors
      return (
        message.includes('503') ||
        message.includes('Service Unavailable') ||
        message.includes('429') ||
        message.includes('rate limit') ||
        message.includes('timeout') ||
        message.includes('ECONNRESET')
      )
    }
  })
}