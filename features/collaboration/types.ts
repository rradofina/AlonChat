import { z } from 'zod'

// User presence types
export interface UserPresence {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  agentId: string
  sourceId?: string
  cursor?: CursorPosition
  status: 'online' | 'idle' | 'offline'
  lastActivity: Date
  color: string // For cursor/selection color
}

export interface CursorPosition {
  x: number
  y: number
  elementId?: string
  selection?: SelectionRange
}

export interface SelectionRange {
  start: number
  end: number
  text?: string
}

// Activity feed types
export interface Activity {
  id: string
  type: ActivityType
  userId: string
  userName: string
  userAvatar?: string
  agentId: string
  targetId?: string
  targetType?: 'source' | 'agent' | 'qa' | 'model'
  description: string
  metadata?: Record<string, any>
  timestamp: Date
}

export type ActivityType = 
  | 'source_added'
  | 'source_updated'
  | 'source_deleted'
  | 'crawl_started'
  | 'crawl_completed'
  | 'qa_added'
  | 'qa_updated'
  | 'qa_deleted'
  | 'model_activated'
  | 'model_deactivated'
  | 'agent_updated'
  | 'user_joined'
  | 'user_left'

// Conflict resolution types
export interface Conflict {
  id: string
  type: 'merge' | 'overwrite' | 'skip'
  localChange: any
  remoteChange: any
  resolvedBy?: string
  resolvedAt?: Date
  resolution?: any
}

// Collaboration events with Zod schemas
export const CollaborationEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('presence:update'),
    data: z.object({
      userId: z.string(),
      presence: z.any(), // UserPresence
    })
  }),
  z.object({
    type: z.literal('cursor:move'),
    data: z.object({
      userId: z.string(),
      cursor: z.object({
        x: z.number(),
        y: z.number(),
        elementId: z.string().optional(),
      })
    })
  }),
  z.object({
    type: z.literal('activity:new'),
    data: z.object({
      activity: z.any(), // Activity
    })
  }),
  z.object({
    type: z.literal('conflict:detected'),
    data: z.object({
      conflict: z.any(), // Conflict
    })
  }),
  z.object({
    type: z.literal('selection:change'),
    data: z.object({
      userId: z.string(),
      selection: z.object({
        start: z.number(),
        end: z.number(),
        text: z.string().optional(),
      }).optional()
    })
  }),
])

export type CollaborationEvent = z.infer<typeof CollaborationEventSchema>

// Collaboration state
export interface CollaborationState {
  users: Map<string, UserPresence>
  activities: Activity[]
  conflicts: Conflict[]
  isConnected: boolean
}

// Operational Transform types for conflict resolution
export interface Operation {
  type: 'insert' | 'delete' | 'replace'
  position: number
  content?: string
  length?: number
  oldContent?: string
  newContent?: string
  userId: string
  timestamp: number
}

export interface TransformResult {
  op1Prime: Operation
  op2Prime: Operation
}

// Color palette for user cursors/selections
export const USER_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#FFD93D', // Gold
  '#6C5CE7', // Purple
  '#FDA7DF', // Pink
] as const