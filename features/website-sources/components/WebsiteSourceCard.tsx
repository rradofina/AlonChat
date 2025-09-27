'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, MoreHorizontal, Edit, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { WebsiteSource } from '../hooks/useWebsiteSources'
import { WebsiteSourceStatus } from './WebsiteSourceStatus'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface WebsiteSourceCardProps {
  source: WebsiteSource
  isSelected: boolean
  isExpanded: boolean
  onSelect: (selected: boolean) => void
  onToggleExpand: () => void
  onEdit: (sourceId: string, newUrl: string) => void
  onRecrawl: (sourceId: string) => void
  onDelete: (sourceId: string) => void
  onViewDetails: (source: WebsiteSource) => void
}

export function WebsiteSourceCard({
  source,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onEdit,
  onRecrawl,
  onDelete,
  onViewDetails,
}: WebsiteSourceCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editUrl, setEditUrl] = useState(source.url)

  const hasSubLinks = source.sub_links && source.sub_links.length > 0
  const crawledPages = source.metadata?.crawled_pages || []
  const discoveredLinks = source.metadata?.discovered_links || source.discovered_links || []

  const handleEdit = () => {
    onEdit(source.id, editUrl)
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditUrl(source.url)
    setIsEditing(false)
  }

  const handleCardClick = () => {
    if (!isEditing && !hasSubLinks && source.status === 'ready') {
      onViewDetails(source)
    }
  }

  return (
    <div className="bg-white border rounded-lg hover:shadow-sm transition-shadow">
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <div className="mt-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              aria-label={`Select ${source.url}`}
            />
          </div>

          {/* Expand/Collapse Arrow */}
          {(hasSubLinks || (source.status === 'ready' && discoveredLinks.length > 0)) && (
            <button
              onClick={onToggleExpand}
              className="mt-1 p-0.5 hover:bg-gray-100 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
            </button>
          )}

          {/* Main Content */}
          <div
            className="flex-1 min-w-0"
            style={{ cursor: !isEditing && !hasSubLinks ? 'pointer' : 'default' }}
            onClick={handleCardClick}
          >
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="text-sm"
                  placeholder="Enter URL"
                />
                <Button size="sm" onClick={handleEdit}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                  {source.url}
                </p>
                <div className="flex flex-col gap-1 mt-1">
                  <WebsiteSourceStatus source={source} />
                </div>
              </>
            )}
          </div>

          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setIsEditing(true)}
                disabled={source.status === 'processing' || source.status === 'queued'}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit URL
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onRecrawl(source.id)}
                disabled={source.status === 'processing' || source.status === 'queued'}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-crawl
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(source.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Expanded Content - Sub-links */}
        {isExpanded && hasSubLinks && (
          <div className="ml-9 mt-3 space-y-1">
            {source.sub_links?.map((link, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 py-1.5 px-2 text-sm hover:bg-gray-50 rounded cursor-pointer"
                onClick={() => {
                  // Handle sub-link click
                  console.log('Sub-link clicked:', link)
                }}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    link.status === 'included' ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
                <span className="text-gray-600 truncate">{link.url}</span>
                {link.crawled && (
                  <span className="text-xs text-gray-400 ml-auto">Crawled</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Expanded Content - Discovered Links */}
        {isExpanded && source.status === 'ready' && !hasSubLinks && discoveredLinks.length > 0 && (
          <div className="ml-9 mt-3">
            <div className="text-xs text-gray-500 mb-2">
              Discovered {discoveredLinks.length} links • Crawled {crawledPages.length} pages
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {discoveredLinks.slice(0, 20).map((link: string, idx: number) => (
                <div key={idx} className="text-xs text-gray-600 truncate">
                  {crawledPages.includes(link) ? '✓' : '○'} {link}
                </div>
              ))}
              {discoveredLinks.length > 20 && (
                <div className="text-xs text-gray-400 italic">
                  +{discoveredLinks.length - 20} more links...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}