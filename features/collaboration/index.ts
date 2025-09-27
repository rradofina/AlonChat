// Main exports for collaboration feature
export * from './types'
export * from './hooks/usePresence'
export * from './hooks/useCollaboration'
export * from './hooks/useSupabaseRealtime'
export * from './components/PresenceIndicator'
export * from './components/LiveCursors'
export * from './components/ActivityFeed'
export * from './components/CollaborationProvider'

// Re-export key types and components for easier imports
export type {
  UserPresence,
  Activity,
  Conflict,
  CollaborationState,
  CollaborationEvent,
} from './types'

export {
  usePresence,
} from './hooks/usePresence'

export {
  useCollaboration,
} from './hooks/useCollaboration'

export {
  useSupabaseRealtime,
} from './hooks/useSupabaseRealtime'

export {
  CollaborationProvider,
  CollaborationToolbar,
  useCollaborationContext,
} from './components/CollaborationProvider'