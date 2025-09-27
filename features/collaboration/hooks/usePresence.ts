import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useSupabaseRealtime } from './useSupabaseRealtime'
import type { UserPresence, CursorPosition } from '../types'
import { USER_COLORS } from '../types'

interface UsePresenceOptions {
  agentId: string
  sourceId?: string
  updateInterval?: number
  idleTimeout?: number
}

/**
 * Hook for tracking user presence using Supabase Realtime channels
 */
export function usePresence({
  agentId,
  sourceId,
  updateInterval = 5000,
  idleTimeout = 60000,
}: UsePresenceOptions) {
  const { data: session } = useSession()
  const [users, setUsers] = useState<Map<string, UserPresence>>(new Map())
  const [myPresence, setMyPresence] = useState<UserPresence | null>(null)

  const lastActivityRef = useRef<Date>(new Date())
  const updateTimerRef = useRef<NodeJS.Timeout>()
  const idleTimerRef = useRef<NodeJS.Timeout>()
  const cursorThrottleRef = useRef<NodeJS.Timeout>()

  // Channel name based on agent and source
  const channelName = sourceId
    ? `presence:${agentId}:${sourceId}`
    : `presence:${agentId}`

  // Use Supabase Realtime hook
  const {
    isConnected,
    trackPresence,
    untrackPresence,
    onPresence,
    broadcast,
  } = useSupabaseRealtime({
    channelName,
    onConnect: () => console.log('Presence channel connected'),
    onDisconnect: () => console.log('Presence channel disconnected'),
  })

  // Generate consistent color for user
  const getUserColor = useCallback((userId: string) => {
    const hash = userId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc)
    }, 0)
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
  }, [])

  // Initialize presence
  const initializePresence = useCallback(() => {
    if (!session?.user) return null

    const presence: UserPresence = {
      userId: session.user.id,
      userName: session.user.name || session.user.email || 'Anonymous',
      color: getUserColor(session.user.id),
      status: 'active',
      lastActivity: new Date(),
      cursor: null,
    }

    setMyPresence(presence)
    return presence
  }, [session, getUserColor])

  // Broadcast presence update
  const broadcastPresence = useCallback(async (presence: UserPresence) => {
    if (!isConnected) return

    try {
      // Use Supabase Realtime track for presence
      await trackPresence({
        userId: presence.userId,
        userName: presence.userName,
        color: presence.color,
        status: presence.status,
        lastActivity: presence.lastActivity.toISOString(),
        cursor: presence.cursor,
      })
    } catch (error) {
      console.error('Failed to broadcast presence:', error)
    }
  }, [isConnected, trackPresence])

  // Update cursor position
  const updateCursor = useCallback((cursor: CursorPosition) => {
    if (!myPresence) return

    // Throttle cursor updates
    if (cursorThrottleRef.current) {
      clearTimeout(cursorThrottleRef.current)
    }

    cursorThrottleRef.current = setTimeout(() => {
      const updatedPresence = {
        ...myPresence,
        cursor,
        lastActivity: new Date(),
      }
      setMyPresence(updatedPresence)

      // Broadcast cursor position separately for lower latency
      broadcast('cursor:update', {
        userId: myPresence.userId,
        cursor,
        timestamp: Date.now(),
      })
    }, 50) // Throttle to max 20 updates per second
  }, [myPresence, broadcast])

  // Mark user as active
  const markActive = useCallback(() => {
    lastActivityRef.current = new Date()

    if (!myPresence || myPresence.status === 'active') return

    const updatedPresence = {
      ...myPresence,
      status: 'active' as const,
      lastActivity: new Date(),
    }
    setMyPresence(updatedPresence)
    broadcastPresence(updatedPresence)

    // Reset idle timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }

    idleTimerRef.current = setTimeout(() => {
      if (myPresence) {
        const idlePresence = {
          ...myPresence,
          status: 'idle' as const,
        }
        setMyPresence(idlePresence)
        broadcastPresence(idlePresence)
      }
    }, idleTimeout)
  }, [myPresence, broadcastPresence, idleTimeout])

  // Setup presence sync
  useEffect(() => {
    if (!session?.user || !isConnected) return

    // Initialize and broadcast presence
    const presence = initializePresence()
    if (presence) {
      broadcastPresence(presence)
    }

    // Listen for presence updates
    const unsubscribe = onPresence((presenceState) => {
      const newUsers = new Map<string, UserPresence>()

      Object.entries(presenceState).forEach(([key, presences]: [string, any[]]) => {
        presences.forEach((presence) => {
          if (presence.userId !== session.user.id) {
            newUsers.set(presence.userId, {
              userId: presence.userId,
              userName: presence.userName,
              color: presence.color,
              status: presence.status,
              lastActivity: new Date(presence.lastActivity),
              cursor: presence.cursor,
              lastSeen: Date.now(),
            })
          }
        })
      })

      setUsers(newUsers)
    })

    // Setup periodic presence updates
    updateTimerRef.current = setInterval(() => {
      if (myPresence) {
        broadcastPresence(myPresence)
      }
    }, updateInterval)

    // Track activity
    const handleMouseMove = () => markActive()
    const handleKeyPress = () => markActive()

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('keypress', handleKeyPress)

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('keypress', handleKeyPress)

      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current)
      }

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }

      if (cursorThrottleRef.current) {
        clearTimeout(cursorThrottleRef.current)
      }

      // Broadcast offline status
      if (myPresence) {
        const offlinePresence = {
          ...myPresence,
          status: 'offline' as const,
        }
        broadcastPresence(offlinePresence)
      }

      untrackPresence()
      unsubscribe()
    }
  }, [
    session,
    isConnected,
    initializePresence,
    broadcastPresence,
    onPresence,
    markActive,
    updateInterval,
    myPresence,
    untrackPresence,
  ])

  return {
    users: Array.from(users.values()),
    myPresence,
    isConnected,
    updateCursor,
    markActive,
  }
}