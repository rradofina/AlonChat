'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Integration {
  id: string
  name: string
  description: string
  icon: any
  connected: boolean
}

export default function IntegrationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Manage your Google Calendar events.',
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none">
          <rect x="8" y="8" width="32" height="32" rx="4" fill="#4285F4"/>
          <rect x="12" y="16" width="24" height="20" rx="2" fill="white"/>
          <rect x="16" y="20" width="4" height="4" fill="#4285F4"/>
          <rect x="22" y="20" width="4" height="4" fill="#4285F4"/>
          <rect x="28" y="20" width="4" height="4" fill="#4285F4"/>
          <rect x="16" y="26" width="4" height="4" fill="#4285F4"/>
          <rect x="22" y="26" width="4" height="4" fill="#4285F4"/>
          <rect x="28" y="26" width="4" height="4" fill="#4285F4"/>
        </svg>
      ),
      connected: false,
    },
    {
      id: 'canbook',
      name: 'CanBook.me',
      description: 'Manage your CanBook.me appointments.',
      icon: (
        <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">CB</span>
        </div>
      ),
      connected: false,
    },
    {
      id: 'calendly',
      name: 'Calendly',
      description: 'Manage your Calendly events.',
      icon: (
        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm3 7h-4v-4h2v2h2v2z"/>
          </svg>
        </div>
      ),
      connected: false,
    },
  ])

  const filteredIntegrations = integrations.filter(integration =>
    integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    integration.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleConnect = (id: string) => {
    setIntegrations(integrations.map(integration =>
      integration.id === id ? { ...integration, connected: !integration.connected } : integration
    ))
  }

  return (
    <div className="p-8">
      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2"
          />
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredIntegrations.map((integration) => (
          <div
            key={integration.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-4">
                {integration.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {integration.name}
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {integration.description}
              </p>
              <Button
                variant={integration.connected ? "outline" : "default"}
                className={integration.connected ? "w-full" : "w-full bg-gray-900 hover:bg-gray-800"}
                onClick={() => handleConnect(integration.id)}
              >
                {integration.connected ? "Disconnect" : "Connect"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}