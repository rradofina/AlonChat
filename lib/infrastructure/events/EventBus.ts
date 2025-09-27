import Redis from 'ioredis'
import {
  EventTypes,
  CrawlProgressEvent,
  ChunkProgressEvent,
  EmbedProgressEvent,
  type CrawlProgressEventType,
  type ChunkProgressEventType,
  type EmbedProgressEventType
} from './EventTypes'

// Re-export for backward compatibility
export {
  EventTypes,
  CrawlProgressEvent,
  ChunkProgressEvent,
  EmbedProgressEvent
}

export type EventType = typeof EventTypes[keyof typeof EventTypes]

// Type-safe event payloads
export type EventPayload = {
  [EventTypes.CRAWL_PROGRESS]: CrawlProgressEventType
  [EventTypes.CRAWL_STARTED]: CrawlProgressEventType
  [EventTypes.CRAWL_COMPLETED]: CrawlProgressEventType
  [EventTypes.CRAWL_FAILED]: CrawlProgressEventType

  [EventTypes.CHUNK_PROGRESS]: ChunkProgressEventType
  [EventTypes.CHUNK_STARTED]: ChunkProgressEventType
  [EventTypes.CHUNK_COMPLETED]: ChunkProgressEventType
  [EventTypes.CHUNK_FAILED]: ChunkProgressEventType

  [EventTypes.EMBED_PROGRESS]: EmbedProgressEventType
  [EventTypes.EMBED_STARTED]: EmbedProgressEventType
  [EventTypes.EMBED_COMPLETED]: EmbedProgressEventType
  [EventTypes.EMBED_FAILED]: EmbedProgressEventType

  [EventTypes.FILE_UPLOAD_PROGRESS]: { sourceId: string; projectId: string; progress: number }
  [EventTypes.FILE_UPLOAD_COMPLETED]: { sourceId: string; projectId: string }
  [EventTypes.FILE_UPLOAD_FAILED]: { sourceId: string; projectId: string; error: string }

  [EventTypes.AGENT_TRAINING_STARTED]: { agentId: string; projectId: string }
  [EventTypes.AGENT_TRAINING_PROGRESS]: { agentId: string; projectId: string; progress: number }
  [EventTypes.AGENT_TRAINING_COMPLETED]: { agentId: string; projectId: string }
  [EventTypes.AGENT_TRAINING_FAILED]: { agentId: string; projectId: string; error: string }
}

export type EventHandler<T extends EventType> = (data: EventPayload[T]) => void | Promise<void>

/**
 * EventBus for real-time event propagation across the system
 * Uses Redis pub/sub for distributed event handling
 */
export class EventBus {
  private publisher: Redis
  private subscriber: Redis
  private subscriptions: Map<string, Set<EventHandler<any>>> = new Map()
  private connected: boolean = false
  private connectionPromise: Promise<void> | null = null

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL

    if (!url) {
      console.warn('[EventBus] Redis URL not provided. EventBus will operate in no-op mode.')
      this.publisher = null as any
      this.subscriber = null as any
      return
    }

    // Create separate Redis clients for pub/sub
    this.publisher = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      }
    })

    this.subscriber = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      }
    })

    this.setupSubscriber()
  }

  private setupSubscriber() {
    this.subscriber.on('message', (channel: string, message: string) => {
      try {
        const data = JSON.parse(message)
        const handlers = this.subscriptions.get(channel)

        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(data)
            } catch (error) {
              console.error(`[EventBus] Handler error for ${channel}:`, error)
            }
          })
        }
      } catch (error) {
        console.error('[EventBus] Failed to parse message:', error)
      }
    })

    this.subscriber.on('ready', () => {
      this.connected = true
      console.log('[EventBus] Connected to Redis')
    })

    this.subscriber.on('error', (error) => {
      console.error('[EventBus] Redis connection error:', error)
      this.connected = false
    })
  }

  /**
   * Emit an event with type-safe payload
   */
  async emit<T extends EventType>(
    type: T,
    data: EventPayload[T]
  ): Promise<void> {
    if (!this.publisher) {
      console.log(`[EventBus] Would emit ${type}:`, data)
      return
    }

    try {
      // Add timestamp if not present
      const payload = {
        ...data,
        timestamp: data.timestamp || Date.now()
      }

      await this.publisher.publish(type, JSON.stringify(payload))
      console.log(`[EventBus] Emitted ${type}:`, payload)
    } catch (error) {
      console.error(`[EventBus] Failed to emit ${type}:`, error)
      throw error
    }
  }

  /**
   * Subscribe to an event type with a handler
   */
  async subscribe<T extends EventType>(
    type: T,
    handler: EventHandler<T>
  ): Promise<() => void> {
    if (!this.subscriber) {
      console.log(`[EventBus] Would subscribe to ${type}`)
      return () => {}
    }

    // Add handler to local map
    if (!this.subscriptions.has(type)) {
      this.subscriptions.set(type, new Set())

      // Subscribe to Redis channel
      await this.subscriber.subscribe(type)
      console.log(`[EventBus] Subscribed to channel: ${type}`)
    }

    this.subscriptions.get(type)!.add(handler)

    // Return unsubscribe function
    return () => {
      const handlers = this.subscriptions.get(type)
      if (handlers) {
        handlers.delete(handler)

        // Unsubscribe from Redis if no more handlers
        if (handlers.size === 0) {
          this.subscriptions.delete(type)
          this.subscriber.unsubscribe(type)
          console.log(`[EventBus] Unsubscribed from channel: ${type}`)
        }
      }
    }
  }

  /**
   * Subscribe to multiple events with pattern matching
   */
  async subscribePattern(
    pattern: string,
    handler: (channel: string, data: any) => void
  ): Promise<() => void> {
    if (!this.subscriber) {
      console.log(`[EventBus] Would subscribe to pattern ${pattern}`)
      return () => {}
    }

    await this.subscriber.psubscribe(pattern)

    const patternHandler = (pattern: string, channel: string, message: string) => {
      try {
        const data = JSON.parse(message)
        handler(channel, data)
      } catch (error) {
        console.error('[EventBus] Pattern handler error:', error)
      }
    }

    this.subscriber.on('pmessage', patternHandler)

    return () => {
      this.subscriber.punsubscribe(pattern)
      this.subscriber.removeListener('pmessage', patternHandler)
    }
  }

  /**
   * Wait for a specific event with timeout
   */
  async waitForEvent<T extends EventType>(
    type: T,
    predicate?: (data: EventPayload[T]) => boolean,
    timeoutMs: number = 30000
  ): Promise<EventPayload[T]> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsubscribe()
        reject(new Error(`Timeout waiting for event ${type}`))
      }, timeoutMs)

      let unsubscribe: () => void

      this.subscribe(type, (data) => {
        if (!predicate || predicate(data)) {
          clearTimeout(timer)
          unsubscribe()
          resolve(data)
        }
      }).then(unsub => {
        unsubscribe = unsub
      })
    })
  }

  /**
   * Clean up connections
   */
  async disconnect(): Promise<void> {
    if (this.publisher) {
      await this.publisher.quit()
    }
    if (this.subscriber) {
      await this.subscriber.quit()
    }
    this.connected = false
    console.log('[EventBus] Disconnected from Redis')
  }

  /**
   * Check if EventBus is connected
   */
  isConnected(): boolean {
    return this.connected
  }
}

// Singleton instance
let eventBusInstance: EventBus | null = null

/**
 * Get or create the EventBus singleton instance
 */
export function getEventBus(): EventBus {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus()
  }
  return eventBusInstance
}

// Export convenience functions
export const eventBus = getEventBus()

/**
 * Type-safe event emission helper
 */
export async function emitEvent<T extends EventType>(
  type: T,
  data: EventPayload[T]
): Promise<void> {
  return eventBus.emit(type, data)
}

/**
 * Type-safe event subscription helper
 */
export async function onEvent<T extends EventType>(
  type: T,
  handler: EventHandler<T>
): Promise<() => void> {
  return eventBus.subscribe(type, handler)
}