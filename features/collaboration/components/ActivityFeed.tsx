'use client'

import { memo, useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Globe,
  MessageSquare,
  Database,
  Play,
  CheckCircle,
  XCircle,
  UserPlus,
  UserMinus,
  Edit,
  Trash,
  Plus,
  RefreshCw,
} from 'lucide-react'
import type { Activity, ActivityType } from '../types'

interface ActivityFeedProps {
  activities: Activity[]
  maxHeight?: string
  showTimestamps?: boolean
  groupByUser?: boolean
  className?: string
}

// Icon mapping for different activity types
const activityIcons: Record<ActivityType, React.ElementType> = {
  source_added: Plus,
  source_updated: Edit,
  source_deleted: Trash,
  crawl_started: Play,
  crawl_completed: CheckCircle,
  qa_added: MessageSquare,
  qa_updated: Edit,
  qa_deleted: Trash,
  model_activated: Database,
  model_deactivated: Database,
  agent_updated: RefreshCw,
  user_joined: UserPlus,
  user_left: UserMinus,
}

// Color mapping for activity types
const activityColors: Record<ActivityType, string> = {
  source_added: 'text-green-600',
  source_updated: 'text-blue-600',
  source_deleted: 'text-red-600',
  crawl_started: 'text-yellow-600',
  crawl_completed: 'text-green-600',
  qa_added: 'text-green-600',
  qa_updated: 'text-blue-600',
  qa_deleted: 'text-red-600',
  model_activated: 'text-green-600',
  model_deactivated: 'text-gray-600',
  agent_updated: 'text-blue-600',
  user_joined: 'text-green-600',
  user_left: 'text-gray-600',
}

/**
 * Individual activity item component
 */
const ActivityItem = memo(function ActivityItem({ 
  activity, 
  showTimestamp 
}: { 
  activity: Activity
  showTimestamp: boolean 
}) {
  const Icon = activityIcons[activity.type]
  const color = activityColors[activity.type]

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={activity.userAvatar} alt={activity.userName} />
        <AvatarFallback className="text-xs">
          {activity.userName.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <p className="text-sm text-gray-900">
            <span className="font-medium">{activity.userName}</span>
            <span className="text-gray-600 ml-1">{activity.description}</span>
          </p>
        </div>
        
        {activity.metadata && (
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(activity.metadata).map(([key, value]) => (
              <Badge key={key} variant="outline" className="text-xs">
                {key}: {String(value)}
              </Badge>
            ))}
          </div>
        )}
        
        {showTimestamp && (
          <p className="text-xs text-gray-500 mt-1">
            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
          </p>
        )}
      </div>
    </motion.div>
  )
})

/**
 * Real-time activity feed component
 * 
 * Features:
 * - Live updates with animations
 * - Activity grouping by user
 * - Type-based icons and colors
 * - Metadata display
 * - Timestamp formatting
 */
export const ActivityFeed = memo(function ActivityFeed({
  activities,
  maxHeight = '400px',
  showTimestamps = true,
  groupByUser = false,
  className = '',
}: ActivityFeedProps) {
  const [filteredActivities, setFilteredActivities] = useState(activities)
  const [filter, setFilter] = useState<ActivityType | 'all'>('all')

  // Group activities by user if requested
  const groupedActivities = groupByUser
    ? activities.reduce((acc, activity) => {
        const key = activity.userId
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key].push(activity)
        return acc
      }, {} as Record<string, Activity[]>)
    : null

  // Filter activities
  useEffect(() => {
    if (filter === 'all') {
      setFilteredActivities(activities)
    } else {
      setFilteredActivities(activities.filter(a => a.type === filter))
    }
  }, [activities, filter])

  // Auto-scroll to top when new activities arrive
  useEffect(() => {
    const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollArea && activities.length > 0) {
      scrollArea.scrollTop = 0
    }
  }, [activities])

  if (activities.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-gray-500 ${className}`}>
        <RefreshCw className="h-12 w-12 mb-2 text-gray-300" />
        <p className="text-sm">No activity yet</p>
        <p className="text-xs mt-1">Activities will appear here as they happen</p>
      </div>
    )
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Filter buttons */}
      <div className="flex gap-1 mb-2 flex-wrap">
        <Badge
          variant={filter === 'all' ? 'default' : 'outline'}
          className="cursor-pointer text-xs"
          onClick={() => setFilter('all')}
        >
          All ({activities.length})
        </Badge>
        <Badge
          variant={filter === 'source_added' ? 'default' : 'outline'}
          className="cursor-pointer text-xs"
          onClick={() => setFilter('source_added')}
        >
          Sources ({activities.filter(a => a.type.startsWith('source')).length})
        </Badge>
        <Badge
          variant={filter === 'crawl_started' ? 'default' : 'outline'}
          className="cursor-pointer text-xs"
          onClick={() => setFilter('crawl_started')}
        >
          Crawls ({activities.filter(a => a.type.startsWith('crawl')).length})
        </Badge>
      </div>

      {/* Activity list */}
      <ScrollArea className="flex-1" style={{ maxHeight }}>
        <AnimatePresence mode="popLayout">
          {groupedActivities ? (
            // Grouped view
            Object.entries(groupedActivities).map(([userId, userActivities]) => (
              <div key={userId} className="mb-4">
                <div className="flex items-center gap-2 mb-2 px-3">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={userActivities[0].userAvatar} />
                    <AvatarFallback className="text-xs">
                      {userActivities[0].userName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {userActivities[0].userName}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {userActivities.length} activities
                  </Badge>
                </div>
                <div className="space-y-1">
                  {userActivities.map((activity) => (
                    <ActivityItem
                      key={activity.id}
                      activity={activity}
                      showTimestamp={showTimestamps}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Regular view
            <div className="space-y-1">
              {filteredActivities.map((activity) => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  showTimestamp={showTimestamps}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>
    </div>
  )
})