'use client'

import { createContext, useContext, ReactNode, useRef, useCallback } from 'react'
import { usePresence } from '../hooks/usePresence'
import { useCollaboration } from '../hooks/useCollaboration'
import { PresenceIndicator } from './PresenceIndicator'
import { LiveCursors } from './LiveCursors'
import { ActivityFeed } from './ActivityFeed'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Activity, MousePointer } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import type { Conflict } from '../types'
import { toast } from 'sonner'

interface CollaborationContextValue {
  presence: ReturnType<typeof usePresence>
  collaboration: ReturnType<typeof useCollaboration>
}

const CollaborationContext = createContext<CollaborationContextValue | null>(null)

export function useCollaborationContext() {
  const context = useContext(CollaborationContext)
  if (!context) {
    throw new Error('useCollaborationContext must be used within CollaborationProvider')
  }
  return context
}

interface CollaborationProviderProps {
  children: ReactNode
  agentId: string
  sourceId?: string
  showPresence?: boolean
  showCursors?: boolean
  showActivity?: boolean
  className?: string
}

/**
 * Provider component that adds real-time collaboration features to any page
 * 
 * Features:
 * - User presence tracking
 * - Live cursor display
 * - Activity feed
 * - Conflict resolution
 * - Easy integration
 * 
 * Usage:
 * ```tsx
 * <CollaborationProvider agentId={agentId} sourceId={sourceId}>
 *   <YourPageContent />
 * </CollaborationProvider>
 * ```
 */
export function CollaborationProvider({
  children,
  agentId,
  sourceId,
  showPresence = true,
  showCursors = true,
  showActivity = true,
  className = '',
}: CollaborationProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize collaboration hooks
  const presence = usePresence({ agentId, sourceId })
  
  const handleConflict = useCallback((conflict: Conflict) => {
    toast.error('Conflict detected', {
      description: 'Your changes conflict with another user. Please review and merge.',
      action: {
        label: 'Resolve',
        onClick: () => {
          // Open conflict resolution UI
          console.log('Resolving conflict:', conflict)
        },
      },
    })
  }, [])

  const collaboration = useCollaboration({ 
    agentId, 
    sourceId, 
    onConflict: handleConflict 
  })

  // Track mouse position for live cursors
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (showCursors && presence.isConnected) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        presence.updateCursor({
          x: e.clientX,
          y: e.clientY,
          elementId: (e.target as HTMLElement).id || undefined,
        })
      }
    }
  }, [showCursors, presence])

  return (
    <CollaborationContext.Provider value={{ presence, collaboration }}>
      <div 
        ref={containerRef}
        className={`relative ${className}`}
        onMouseMove={handleMouseMove}
      >
        {/* Presence indicator bar */}
        {showPresence && (
          <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
            <PresenceIndicator users={presence.users} />
            
            {/* Activity feed toggle */}
            {showActivity && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Activity className="h-4 w-4" />
                    Activity
                    {collaboration.state.activities.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                        {collaboration.state.activities.length}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px]">
                  <SheetHeader>
                    <SheetTitle>Activity Feed</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <ActivityFeed 
                      activities={collaboration.state.activities}
                      maxHeight="calc(100vh - 120px)"
                    />
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        )}

        {/* Live cursors overlay */}
        {showCursors && (
          <LiveCursors users={presence.users} containerRef={containerRef} />
        )}

        {/* Connection status indicator */}
        {!presence.isConnected && (
          <div className="absolute top-4 left-4 z-40">
            <Card className="p-2 bg-yellow-50 border-yellow-200">
              <div className="flex items-center gap-2 text-sm text-yellow-700">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                Connecting to collaboration server...
              </div>
            </Card>
          </div>
        )}

        {/* Conflict notification area */}
        {collaboration.state.conflicts.length > 0 && (
          <div className="absolute bottom-4 right-4 z-40 space-y-2 max-w-sm">
            {collaboration.state.conflicts
              .filter(c => !c.resolvedAt)
              .slice(0, 3)
              .map(conflict => (
                <Card key={conflict.id} className="p-3 bg-red-50 border-red-200">
                  <div className="text-sm text-red-700">
                    <p className="font-medium mb-1">Conflict detected</p>
                    <p className="text-xs mb-2">
                      Your changes conflict with another user's edits.
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          collaboration.resolveConflict(conflict.id, conflict.localChange)
                          toast.success('Kept your changes')
                        }}
                      >
                        Keep Mine
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          collaboration.resolveConflict(conflict.id, conflict.remoteChange)
                          toast.success('Accepted their changes')
                        }}
                      >
                        Keep Theirs
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        )}

        {/* Page content */}
        {children}
      </div>
    </CollaborationContext.Provider>
  )
}

/**
 * Standalone collaboration toolbar that can be added to any page
 */
export function CollaborationToolbar({ agentId, sourceId }: { agentId: string; sourceId?: string }) {
  const presence = usePresence({ agentId, sourceId })
  const collaboration = useCollaboration({ agentId, sourceId })

  return (
    <div className="flex items-center gap-4 p-2 bg-white border-b">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600">Collaborators:</span>
        <PresenceIndicator users={presence.users} maxDisplay={3} />
      </div>
      
      <div className="flex items-center gap-2 ml-auto">
        <Button variant="ghost" size="sm" className="gap-2">
          <MousePointer className="h-4 w-4" />
          {presence.users.filter(u => u.cursor).length} active cursors
        </Button>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <Activity className="h-4 w-4" />
              {collaboration.state.activities.length} activities
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Recent Activity</SheetTitle>
            </SheetHeader>
            <ActivityFeed activities={collaboration.state.activities} />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}