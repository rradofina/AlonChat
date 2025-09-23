'use client'

import { useState } from 'react'
import { Search, Plus, Globe, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

interface Action {
  id: string
  name: string
  title: string
  description: string
  icon: any
  iconColor: string
  enabled: boolean
  needsConnection?: boolean
  connectionText?: string
  hasCreateAction?: boolean
}

export default function ActionsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [actions, setActions] = useState<Action[]>([
    {
      id: 'form',
      name: 'Form',
      title: 'Collect Leads',
      description: 'Collect leads from your website',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
          <circle cx="9" cy="9" r="4" fill="#FF1493" />
          <circle cx="15" cy="15" r="4" fill="#FF1493" opacity="0.6" />
        </svg>
      ),
      iconColor: 'bg-pink-100',
      enabled: false,
      hasCreateAction: true,
    },
    {
      id: 'button',
      name: 'Button',
      title: 'Custom Button',
      description: 'Custom button to trigger your own links',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="4" width="6" height="6" fill="#333" />
          <rect x="14" y="4" width="6" height="6" fill="#333" />
          <rect x="4" y="14" width="6" height="6" fill="#333" />
          <rect x="14" y="14" width="6" height="6" fill="#333" />
        </svg>
      ),
      iconColor: 'bg-gray-100',
      enabled: false,
    },
    {
      id: 'search',
      name: 'Search',
      title: 'Web Search',
      description: 'Search the web for information and feed the results back to the chatbot',
      icon: <Globe className="w-8 h-8 text-gray-700" />,
      iconColor: 'bg-gray-100',
      enabled: false,
    },
    {
      id: 'slack',
      name: 'Slack',
      title: 'Send Message',
      description: 'Send message to a Slack channel',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="5" width="5" height="5" fill="#36C5F0" />
          <rect x="14" y="5" width="5" height="5" fill="#2EB67D" />
          <rect x="5" y="14" width="5" height="5" fill="#ECB22E" />
          <rect x="14" y="14" width="5" height="5" fill="#E01E5A" />
        </svg>
      ),
      iconColor: 'bg-gray-100',
      enabled: false,
      needsConnection: true,
      connectionText: 'Please connect your Slack account first',
      hasCreateAction: true,
    },
    {
      id: 'cal',
      name: 'Cal.com',
      title: 'Get Available Slots',
      description: 'Retrieve and book available slots from your Cal.com account',
      icon: (
        <div className="w-8 h-8 bg-gray-900 rounded-md flex items-center justify-center">
          <span className="text-white font-bold text-xs">Cal</span>
        </div>
      ),
      iconColor: 'bg-gray-100',
      enabled: false,
    },
    {
      id: 'calendly',
      name: 'Calendly',
      title: 'Get Available Slots',
      description: 'Retrieve and book available slots from your Calendly account',
      icon: (
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-xs">C</span>
        </div>
      ),
      iconColor: 'bg-blue-100',
      enabled: false,
      hasCreateAction: true,
    },
  ])

  const filteredActions = actions.filter(action =>
    action.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    action.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    action.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleAction = (id: string) => {
    setActions(actions.map(action =>
      action.id === id ? { ...action, enabled: !action.enabled } : action
    ))
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder="Search actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2"
          />
        </div>
        <Button className="ml-4 bg-gray-900 hover:bg-gray-800 text-white">
          Create custom action
        </Button>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredActions.map((action) => (
          <div
            key={action.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${action.iconColor}`}>
                  {action.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{action.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{action.title}</p>
                  <p className="text-xs text-gray-500 mt-2">{action.description}</p>
                </div>
              </div>
              <Switch
                checked={action.enabled}
                onCheckedChange={() => toggleAction(action.id)}
              />
            </div>

            {/* Action buttons */}
            <div className="mt-6">
              {action.needsConnection ? (
                <div className="bg-gray-900 text-white text-sm px-4 py-2 rounded-md text-center">
                  {action.connectionText}
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  {action.hasCreateAction ? (
                    <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
                      <Plus className="h-4 w-4" />
                      Create Action
                    </button>
                  ) : (
                    <button className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                      Customize
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Slack icon placeholder */}
            {action.id === 'slack' && (
              <div className="mt-4 flex justify-center">
                <svg className="w-20 h-20 text-gray-300" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3L3 9v6c0 5.25 3.64 10.14 8.5 11.39 4.86-1.25 8.5-6.14 8.5-11.39V9l-9-6z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8.5 12l2 2 3.5-3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}