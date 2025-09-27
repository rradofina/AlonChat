import { useState, useCallback, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useSupabaseRealtime } from './useSupabaseRealtime'
import type {
  Operation,
  TransformResult,
  Conflict,
  CollaborationState,
  Activity,
} from '../types'

interface UseCollaborationOptions {
  agentId: string
  sourceId?: string
  onConflict?: (conflict: Conflict) => void
}

/**
 * Hook for collaborative editing using Supabase Realtime channels
 */
export function useCollaboration({
  agentId,
  sourceId,
  onConflict,
}: UseCollaborationOptions) {
  const { data: session } = useSession()
  const [state, setState] = useState<CollaborationState>({
    users: new Map(),
    activities: [],
    conflicts: [],
    isConnected: false,
  })

  const operationQueueRef = useRef<Operation[]>([])
  const versionRef = useRef<number>(0)

  // Channel name for collaboration
  const channelName = sourceId
    ? `collab:${agentId}:${sourceId}`
    : `collab:${agentId}`

  // Use Supabase Realtime hook
  const { isConnected, broadcast, onBroadcast } = useSupabaseRealtime({
    channelName,
    onConnect: () => {
      setState(prev => ({ ...prev, isConnected: true }))
    },
    onDisconnect: () => {
      setState(prev => ({ ...prev, isConnected: false }))
    },
  })

  /**
   * Transform two concurrent operations using OT algorithm
   */
  const transformOperations = useCallback((
    op1: Operation,
    op2: Operation
  ): TransformResult => {
    // Same transformation logic as before
    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op1.position <= op2.position) {
        return {
          transformed: {
            ...op2,
            position: op2.position + op1.content!.length,
          },
          conflict: false,
        }
      } else {
        return {
          transformed: {
            ...op1,
            position: op1.position + op2.content!.length,
          },
          conflict: false,
        }
      }
    }

    if (op1.type === 'delete' && op2.type === 'delete') {
      if (op1.position + op1.length! <= op2.position) {
        return {
          transformed: {
            ...op2,
            position: op2.position - op1.length!,
          },
          conflict: false,
        }
      } else if (op2.position + op2.length! <= op1.position) {
        return {
          transformed: op1,
          conflict: false,
        }
      } else {
        return {
          transformed: op1,
          conflict: true,
        }
      }
    }

    if (op1.type === 'insert' && op2.type === 'delete') {
      if (op1.position <= op2.position) {
        return {
          transformed: {
            ...op2,
            position: op2.position + op1.content!.length,
          },
          conflict: false,
        }
      } else if (op1.position >= op2.position + op2.length!) {
        return {
          transformed: {
            ...op1,
            position: op1.position - op2.length!,
          },
          conflict: false,
        }
      } else {
        return {
          transformed: op1,
          conflict: true,
        }
      }
    }

    return { transformed: op2, conflict: false }
  }, [])

  /**
   * Apply operation to content
   */
  const applyOperation = useCallback((content: string, operation: Operation): string => {
    switch (operation.type) {
      case 'insert':
        return (
          content.slice(0, operation.position) +
          operation.content +
          content.slice(operation.position)
        )

      case 'delete':
        return (
          content.slice(0, operation.position) +
          content.slice(operation.position + operation.length!)
        )

      case 'replace':
        const beforeReplace = content.slice(0, operation.position)
        const afterReplace = content.slice(
          operation.position + operation.oldContent!.length
        )
        return beforeReplace + operation.newContent + afterReplace

      default:
        return content
    }
  }, [])

  /**
   * Send an operation to collaborators
   */
  const sendOperation = useCallback(async (operation: Operation) => {
    if (!isConnected) return

    try {
      await broadcast('operation:apply', {
        operation,
        version: versionRef.current,
        userId: session?.user?.id,
        timestamp: Date.now(),
      })

      versionRef.current++
    } catch (error) {
      console.error('Failed to send operation:', error)
    }
  }, [isConnected, broadcast, session])

  /**
   * Handle incoming operations
   */
  const handleRemoteOperation = useCallback((payload: any) => {
    const { operation, version, userId } = payload

    // Don't process our own operations
    if (userId === session?.user?.id) return

    // Transform against queued operations
    let transformedOp = operation
    const newQueue: Operation[] = []

    for (const queuedOp of operationQueueRef.current) {
      const result = transformOperations(queuedOp, transformedOp)
      transformedOp = result.transformed

      if (result.conflict && onConflict) {
        const conflict: Conflict = {
          localOp: queuedOp,
          remoteOp: operation,
          resolved: false,
          resolution: 'manual',
        }
        onConflict(conflict)
        setState(prev => ({
          ...prev,
          conflicts: [...prev.conflicts, conflict],
        }))
      }

      newQueue.push(queuedOp)
    }

    operationQueueRef.current = newQueue

    // Add activity
    const activity: Activity = {
      id: `${Date.now()}-${userId}`,
      userId,
      operation: transformedOp,
      timestamp: Date.now(),
    }

    setState(prev => ({
      ...prev,
      activities: [...prev.activities.slice(-49), activity],
    }))

    // Return the transformed operation for application
    return transformedOp
  }, [session, transformOperations, onConflict])

  // Create operation methods
  const insertText = useCallback((position: number, text: string) => {
    const operation: Operation = {
      type: 'insert',
      position,
      content: text,
      userId: session?.user?.id || 'anonymous',
      timestamp: Date.now(),
    }

    operationQueueRef.current.push(operation)
    sendOperation(operation)
    return operation
  }, [session, sendOperation])

  const deleteText = useCallback((position: number, length: number) => {
    const operation: Operation = {
      type: 'delete',
      position,
      length,
      userId: session?.user?.id || 'anonymous',
      timestamp: Date.now(),
    }

    operationQueueRef.current.push(operation)
    sendOperation(operation)
    return operation
  }, [session, sendOperation])

  const replaceText = useCallback((
    position: number,
    oldText: string,
    newText: string
  ) => {
    const operation: Operation = {
      type: 'replace',
      position,
      oldContent: oldText,
      newContent: newText,
      userId: session?.user?.id || 'anonymous',
      timestamp: Date.now(),
    }

    operationQueueRef.current.push(operation)
    sendOperation(operation)
    return operation
  }, [session, sendOperation])

  // Setup event listeners
  useEffect(() => {
    if (!isConnected) return

    const unsubscribe = onBroadcast('operation:apply', handleRemoteOperation)

    return () => {
      unsubscribe()
    }
  }, [isConnected, onBroadcast, handleRemoteOperation])

  return {
    state,
    insertText,
    deleteText,
    replaceText,
    applyOperation,
    isConnected,
  }
}