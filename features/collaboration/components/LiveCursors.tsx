'use client'

import { memo, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { UserPresence } from '../types'

interface LiveCursorsProps {
  users: UserPresence[]
  containerRef?: React.RefObject<HTMLElement>
}

interface CursorProps {
  user: UserPresence
  containerRect?: DOMRect
}

/**
 * Individual cursor component with smooth animation
 */
const Cursor = memo(function Cursor({ user, containerRect }: CursorProps) {
  if (!user.cursor || !containerRect) return null

  // Calculate relative position within container
  const x = user.cursor.x - containerRect.left
  const y = user.cursor.y - containerRect.top

  // Don't render if cursor is outside container
  if (x < 0 || y < 0 || x > containerRect.width || y > containerRect.height) {
    return null
  }

  return (
    <motion.div
      className="pointer-events-none fixed z-50"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        x,
        y,
      }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{
        type: 'spring',
        damping: 30,
        stiffness: 300,
        mass: 0.8,
      }}
      style={{
        left: containerRect.left,
        top: containerRect.top,
      }}
    >
      {/* Cursor pointer */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        style={{
          filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.2))`,
        }}
      >
        <path
          d="M3 3L17 8.5L10.5 10.5L8.5 17L3 3Z"
          fill={user.color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      
      {/* User name label */}
      <div
        className="absolute left-5 top-0 px-2 py-1 rounded text-xs text-white font-medium whitespace-nowrap"
        style={{
          backgroundColor: user.color,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      >
        {user.userName}
      </div>

      {/* Selection highlight if present */}
      {user.cursor.selection && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: 0,
            top: 20,
            backgroundColor: user.color,
            opacity: 0.2,
            width: `${(user.cursor.selection.end - user.cursor.selection.start) * 8}px`,
            height: '20px',
          }}
        />
      )}
    </motion.div>
  )
})

/**
 * Component to display live cursors of all collaborating users
 * 
 * Features:
 * - Smooth cursor movement with spring animations
 * - User name labels
 * - Selection highlighting
 * - Automatic cleanup of stale cursors
 */
export const LiveCursors = memo(function LiveCursors({ 
  users, 
  containerRef 
}: LiveCursorsProps) {
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null)
  const [visibleUsers, setVisibleUsers] = useState<UserPresence[]>([])

  // Update container rect when container changes
  useEffect(() => {
    if (!containerRef?.current) return

    const updateRect = () => {
      setContainerRect(containerRef.current?.getBoundingClientRect() || null)
    }

    updateRect()
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect)

    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect)
    }
  }, [containerRef])

  // Filter users with valid cursor positions
  useEffect(() => {
    const usersWithCursors = users.filter(
      (user) => 
        user.cursor && 
        user.status !== 'offline' &&
        // Only show cursors updated in last 10 seconds
        new Date().getTime() - new Date(user.lastActivity).getTime() < 10000
    )
    setVisibleUsers(usersWithCursors)
  }, [users])

  // Cleanup stale cursors every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleUsers(prev => 
        prev.filter(user => 
          new Date().getTime() - new Date(user.lastActivity).getTime() < 10000
        )
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  if (!containerRect) return null

  return (
    <AnimatePresence>
      {visibleUsers.map((user) => (
        <Cursor
          key={user.id}
          user={user}
          containerRect={containerRect}
        />
      ))}
    </AnimatePresence>
  )
})