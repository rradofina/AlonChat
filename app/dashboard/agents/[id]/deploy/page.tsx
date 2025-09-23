'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DeployPage() {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null)

  const channels = [
    {
      id: 'chat-widget',
      name: 'Chat widget',
      description: 'Add the agent chat widget to your website with iframe support.',
      icon: '💬',
      bgColor: 'bg-purple-500',
      actions: ['Manage'],
      enabled: true
    },
    {
      id: 'help-page',
      name: 'Help page',
      description: 'Host your own help page and let users chat directly from it.',
      icon: '📘',
      bgColor: 'bg-blue-500',
      actions: ['Setup'],
      enabled: true
    },
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Connect your agent with thousands of apps using Zapier.',
      icon: '⚡',
      bgColor: 'bg-orange-500',
      actions: ['Subscribe to enable'],
      needsSubscription: true,
      enabled: true
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Connect your agent to Slack, mention it, and have it reply to any message.',
      icon: '➕',
      bgColor: 'bg-gray-100',
      actions: ['Subscribe to enable'],
      needsSubscription: true,
      enabled: true
    },
    {
      id: 'wordpress',
      name: 'WordPress',
      description: 'Use the official Chatbase plugin for Wordpress to add the chat widget to your website.',
      icon: 'W',
      bgColor: 'bg-blue-500',
      textColor: 'text-white',
      actions: ['Setup'],
      enabled: false
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      description: 'Connect your agent to a WhatsApp number and let it respond to messages from your customers.',
      icon: '💬',
      bgColor: 'bg-green-500',
      actions: ['Subscribe to enable'],
      needsSubscription: true,
      enabled: true
    },
    {
      id: 'facebook-messenger',
      name: 'Facebook Messenger',
      description: 'Connect your agent to a Facebook page and let it respond to messages from your customers.',
      icon: '💬',
      bgColor: 'bg-blue-600',
      actions: ['Subscribe to enable'],
      needsSubscription: true,
      enabled: true
    },
    {
      id: 'instagram',
      name: 'Instagram',
      description: 'Connect your agent to an Instagram page and let it respond to messages from your customers.',
      icon: '📷',
      bgColor: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400',
      actions: ['Subscribe to enable'],
      needsSubscription: true,
      enabled: true
    },
    {
      id: 'zendesk',
      name: 'Zendesk',
      description: 'Create Zendesk tickets from your customers and let your agent reply to them.',
      icon: 'Z',
      bgColor: 'bg-gray-800',
      textColor: 'text-white',
      actions: ['Subscribe to enable'],
      needsSubscription: true,
      enabled: false
    }
  ]

  // Filter to only show enabled channels (removing WordPress and Zendesk)
  const activeChannels = channels.filter(channel =>
    channel.id !== 'wordpress' &&
    channel.id !== 'zendesk' &&
    channel.id !== 'slack' &&
    channel.id !== 'zapier'
  )

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">All Channels</h1>

        {/* Agent Visibility Bar */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 font-medium">Agent Visibility:</span>
              <div className="flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Private</span>
                <button className="ml-1 text-gray-400 hover:text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-sm"
            >
              Update
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {activeChannels.map((channel) => (
            <div
              key={channel.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow flex"
            >
              <div className="flex flex-col items-center text-center w-full">
                {/* Icon */}
                <div className={`w-16 h-16 rounded-lg flex items-center justify-center mb-4 ${channel.bgColor}`}>
                  {channel.icon.startsWith('http') || channel.icon.startsWith('/') ? (
                    <img src={channel.icon} alt={channel.name} className="w-10 h-10" />
                  ) : (
                    <span className={`text-2xl ${channel.textColor || ''}`}>
                      {channel.icon}
                    </span>
                  )}
                </div>

                {/* Name */}
                <h3 className="font-semibold text-gray-900 mb-2">{channel.name}</h3>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-6 flex-grow">
                  {channel.description}
                </p>

                {/* Actions */}
                <div className="w-full space-y-2 mt-auto">
                  {channel.actions.map((action, index) => (
                    <Button
                      key={index}
                      variant={channel.needsSubscription ? "outline" : "default"}
                      className={`w-full ${
                        channel.needsSubscription
                          ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                          : "bg-gray-900 text-white hover:bg-gray-800"
                      }`}
                      onClick={() => setSelectedChannel(channel.id)}
                    >
                      {action}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}