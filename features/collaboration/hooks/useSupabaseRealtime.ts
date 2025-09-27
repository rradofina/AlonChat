import { useState, useEffect, useRef, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useSession } from 'next-auth/react'

interface UseSupabaseRealtimeOptions {
  channelName: string
  onConnect?: () => void
  onDisconnect?: () => void
}

/**
 * Hook for managing Supabase Realtime channels
 * Provides direct WebSocket communication for real-time collaboration
 */
export function useSupabaseRealtime({
  channelName,
  onConnect,
  onDisconnect,
}: UseSupabaseRealtimeOptions) {
  const { data: session } = useSession()
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClientComponentClient()

  // Store callbacks in refs to avoid dependency issues
  const onConnectRef = useRef(onConnect)
  const onDisconnectRef = useRef(onDisconnect)

  useEffect(() => {
    onConnectRef.current = onConnect
    onDisconnectRef.current = onDisconnect
  })

  // Initialize channel
  useEffect(() => {
    if (!session?.user) return

    // Create channel
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: {
          self: false, // Don't receive own messages
          ack: true, // Get acknowledgment of message receipt
        },
      },
    })

    channelRef.current = channel

    // Subscribe to channel
    const subscription = channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected((prev) => {
          if (!prev) {
            onConnectRef.current?.()
          }
          return true
        })
      } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        setIsConnected((prev) => {
          if (prev) {
            onDisconnectRef.current?.()
          }
          return false
        })
      }
    })

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsConnected(false)
      onDisconnectRef.current?.()
    }
  }, [session, channelName, supabase])

  // Send broadcast message
  const broadcast = useCallback(async (event: string, payload: any) => {
    if (!channelRef.current || !isConnected) {
      console.warn('Channel not connected')
      return
    }

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event,
        payload,
      })
    } catch (error) {
      console.error('Failed to broadcast:', error)
    }
  }, [isConnected])

  // Track presence
  const trackPresence = useCallback(async (state: any) => {
    if (!channelRef.current || !isConnected) {
      console.warn('Channel not connected')
      return
    }

    try {
      await channelRef.current.track(state)
    } catch (error) {
      console.error('Failed to track presence:', error)
    }
  }, [isConnected])

  // Untrack presence
  const untrackPresence = useCallback(async () => {
    if (!channelRef.current) return

    try {
      await channelRef.current.untrack()
    } catch (error) {
      console.error('Failed to untrack presence:', error)
    }
  }, [])

  // Subscribe to broadcast events
  const onBroadcast = useCallback((event: string, callback: (payload: any) => void) => {
    if (!channelRef.current) {
      console.warn('Channel not initialized')
      return () => {}
    }

    channelRef.current.on('broadcast', { event }, ({ payload }) => {
      callback(payload)
    })

    // Return unsubscribe function
    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [])

  // Subscribe to presence events
  const onPresence = useCallback((callback: (state: any) => void) => {
    if (!channelRef.current) {
      console.warn('Channel not initialized')
      return () => {}
    }

    channelRef.current.on('presence', { event: 'sync' }, () => {
      const state = channelRef.current?.presenceState()
      callback(state)
    })

    channelRef.current.on('presence', { event: 'join' }, ({ newPresences }) => {
      const state = channelRef.current?.presenceState()
      callback(state)
    })

    channelRef.current.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      const state = channelRef.current?.presenceState()
      callback(state)
    })

    // Return unsubscribe function
    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [])

  return {
    isConnected,
    channel: channelRef.current,
    broadcast,
    trackPresence,
    untrackPresence,
    onBroadcast,
    onPresence,
  }
}