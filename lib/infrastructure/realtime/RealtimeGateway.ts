import { EventTypes, type EventPayload } from '../events/EventBus'

export type RealtimeEventHandler = (event: any) => void

export interface RealtimeConfig {
  url?: string
  projectId?: string
  sourceId?: string
  eventTypes?: string[]
  reconnectInterval?: number
  maxReconnectAttempts?: number
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Error) => void
}

/**
 * Client-side gateway for receiving real-time events via Server-Sent Events (SSE)
 * Handles automatic reconnection, event parsing, and subscription management
 */
export class RealtimeGateway {
  private eventSource: EventSource | null = null
  private handlers: Map<string, Set<RealtimeEventHandler>> = new Map()
  private config: Required<RealtimeConfig>
  private reconnectAttempts: number = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private isConnected: boolean = false
  private connectionPromise: Promise<void> | null = null

  constructor(config: RealtimeConfig = {}) {
    this.config = {
      url: config.url || '/api/events',
      projectId: config.projectId || '',
      sourceId: config.sourceId || '',
      eventTypes: config.eventTypes || ['*'],
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      onConnect: config.onConnect || (() => {}),
      onDisconnect: config.onDisconnect || (() => {}),
      onError: config.onError || ((error) => console.error('[RealtimeGateway]', error)),
    }
  }

  /**
   * Connect to the SSE endpoint
   */
  connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // Build URL with query parameters
        const params = new URLSearchParams()
        if (this.config.projectId) params.append('projectId', this.config.projectId)
        if (this.config.sourceId) params.append('sourceId', this.config.sourceId)
        if (this.config.eventTypes.length) params.append('types', this.config.eventTypes.join(','))

        const url = `${this.config.url}?${params.toString()}`
        console.log('[RealtimeGateway] Connecting to:', url)

        // Create EventSource connection
        this.eventSource = new EventSource(url)

        // Handle connection opened
        this.eventSource.onopen = () => {
          console.log('[RealtimeGateway] Connected')
          this.isConnected = true
          this.reconnectAttempts = 0
          this.config.onConnect()
          resolve()
        }

        // Handle incoming messages
        this.eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.handleEvent(data)
          } catch (error) {
            console.error('[RealtimeGateway] Failed to parse event:', error)
          }
        }

        // Handle errors
        this.eventSource.onerror = (error) => {
          console.error('[RealtimeGateway] Connection error:', error)
          this.isConnected = false
          this.config.onError(new Error('SSE connection failed'))

          // Close the connection
          if (this.eventSource) {
            this.eventSource.close()
            this.eventSource = null
          }

          // Attempt reconnection
          this.scheduleReconnect()

          // Reject the initial connection promise
          if (this.reconnectAttempts === 0) {
            reject(new Error('Failed to establish connection'))
          }
        }
      } catch (error) {
        console.error('[RealtimeGateway] Failed to create EventSource:', error)
        reject(error)
      } finally {
        this.connectionPromise = null
      }
    })

    return this.connectionPromise
  }

  /**
   * Disconnect from the SSE endpoint
   */
  disconnect(): void {
    console.log('[RealtimeGateway] Disconnecting')

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    // Close EventSource
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    this.isConnected = false
    this.reconnectAttempts = 0
    this.config.onDisconnect()
  }

  /**
   * Schedule automatic reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[RealtimeGateway] Max reconnection attempts reached')
      this.config.onError(new Error('Max reconnection attempts reached'))
      return
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      30000
    )

    console.log(`[RealtimeGateway] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++
      this.connect()
    }, delay)
  }

  /**
   * Handle incoming event
   */
  private handleEvent(data: any): void {
    const { type, ...payload } = data

    // Handle special connection event
    if (type === 'connection') {
      console.log('[RealtimeGateway] Connection confirmed:', payload)
      return
    }

    // Notify specific event type handlers
    const handlers = this.handlers.get(type)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload)
        } catch (error) {
          console.error(`[RealtimeGateway] Handler error for ${type}:`, error)
        }
      })
    }

    // Notify wildcard handlers
    const wildcardHandlers = this.handlers.get('*')
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error('[RealtimeGateway] Wildcard handler error:', error)
        }
      })
    }
  }

  /**
   * Subscribe to specific event type
   */
  on(eventType: string, handler: RealtimeEventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }

    this.handlers.get(eventType)!.add(handler)
    console.log(`[RealtimeGateway] Subscribed to ${eventType}`)

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(eventType)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          this.handlers.delete(eventType)
        }
      }
    }
  }

  /**
   * Subscribe to multiple event types
   */
  onMany(eventTypes: string[], handler: RealtimeEventHandler): () => void {
    const unsubscribers = eventTypes.map(type => this.on(type, handler))

    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }

  /**
   * Wait for a specific event with optional timeout
   */
  waitForEvent(
    eventType: string,
    predicate?: (data: any) => boolean,
    timeoutMs: number = 30000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsubscribe()
        reject(new Error(`Timeout waiting for event ${eventType}`))
      }, timeoutMs)

      const unsubscribe = this.on(eventType, (data) => {
        if (!predicate || predicate(data)) {
          clearTimeout(timer)
          unsubscribe()
          resolve(data)
        }
      })
    })
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.isConnected
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RealtimeConfig>): void {
    const wasConnected = this.isConnected

    // Update config
    this.config = { ...this.config, ...config }

    // Reconnect if configuration changed while connected
    if (wasConnected) {
      this.disconnect()
      this.connect()
    }
  }
}

/**
 * Singleton instance for default gateway
 */
let defaultGateway: RealtimeGateway | null = null

/**
 * Get or create the default RealtimeGateway instance
 */
export function getRealtimeGateway(config?: RealtimeConfig): RealtimeGateway {
  if (!defaultGateway) {
    defaultGateway = new RealtimeGateway(config)
  } else if (config) {
    defaultGateway.updateConfig(config)
  }
  return defaultGateway
}

/**
 * React Hook for using the RealtimeGateway
 */
export function useRealtime(config?: RealtimeConfig) {
  const gateway = getRealtimeGateway(config)

  return {
    connect: () => gateway.connect(),
    disconnect: () => gateway.disconnect(),
    on: (eventType: string, handler: RealtimeEventHandler) => gateway.on(eventType, handler),
    onMany: (eventTypes: string[], handler: RealtimeEventHandler) => gateway.onMany(eventTypes, handler),
    waitForEvent: (eventType: string, predicate?: (data: any) => boolean, timeoutMs?: number) =>
      gateway.waitForEvent(eventType, predicate, timeoutMs),
    isConnected: () => gateway.isConnected(),
  }
}