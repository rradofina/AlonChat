'use client'

import { memo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { UserPresence } from '../types'
import { formatDistanceToNow } from 'date-fns'

interface PresenceIndicatorProps {
  users: UserPresence[]
  maxDisplay?: number
  className?: string
}

/**
 * Component to display online users with their presence status
 * Shows avatars with colored borders indicating their cursor color
 */
export const PresenceIndicator = memo(function PresenceIndicator({
  users,
  maxDisplay = 5,
  className = '',
}: PresenceIndicatorProps) {
  const displayUsers = users.slice(0, maxDisplay)
  const remainingCount = Math.max(0, users.length - maxDisplay)

  if (users.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="outline" className="text-xs">
          <div className="w-2 h-2 bg-gray-400 rounded-full mr-1.5" />
          Working alone
        </Badge>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-1 ${className}`}>
        <div className="flex -space-x-2">
          {displayUsers.map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar
                    className="h-8 w-8 border-2 bg-white"
                    style={{ borderColor: user.color }}
                  >
                    <AvatarImage src={user.userAvatar} alt={user.userName} />
                    <AvatarFallback className="text-xs">
                      {user.userName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                      user.status === 'online'
                        ? 'bg-green-500'
                        : user.status === 'idle'
                        ? 'bg-yellow-500'
                        : 'bg-gray-400'
                    }`}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                <div className="space-y-1">
                  <div className="font-medium">{user.userName}</div>
                  <div className="text-gray-500">
                    {user.status === 'online'
                      ? 'Active now'
                      : user.status === 'idle'
                      ? `Idle ${formatDistanceToNow(new Date(user.lastActivity), {
                          addSuffix: true,
                        })}`
                      : 'Offline'}
                  </div>
                  {user.cursor?.elementId && (
                    <div className="text-gray-500">
                      Editing: {user.cursor.elementId}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 border-2 border-white text-xs font-medium">
                  +{remainingCount}
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {remainingCount} more {remainingCount === 1 ? 'person' : 'people'} online
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        <Badge variant="outline" className="text-xs ml-2">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse" />
          {users.length} {users.length === 1 ? 'person' : 'people'} online
        </Badge>
      </div>
    </TooltipProvider>
  )
})