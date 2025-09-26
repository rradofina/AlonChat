'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'

export default function GeneralSettingsPage() {
  const [agentName, setAgentName] = useState('starbucks.ph')
  const [agentId] = useState('Ehivx0jOQg8qpvO4MV_zu')
  const [size] = useState('231 KB')
  const [creditsLimit, setCreditsLimit] = useState('')
  const [limitEnabled, setLimitEnabled] = useState(false)

  const handleCopyId = () => {
    navigator.clipboard.writeText(agentId)
    toast.success('Agent ID copied to clipboard')
  }

  const handleDeleteConversations = () => {
    // Handle delete all conversations
    toast.success('All conversations deleted')
  }

  const handleDeleteAgent = () => {
    // Handle delete agent
    toast.error('Agent deletion not implemented')
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">General</h1>

        {/* Agent Details Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 mb-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Agent details</h2>
            <p className="text-sm text-gray-600 mb-6">
              Basic information about the agent, including its name, unique ID, and storage size.
            </p>

            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Agent ID</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{agentId}</span>
                    <button
                      onClick={handleCopyId}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="Copy Agent ID"
                    >
                      <Copy className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Size</label>
                  <span className="text-sm font-medium text-gray-900">{size}</span>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-2 block">Name</label>
                <Input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="max-w-md"
                />
              </div>

              <div className="flex justify-end">
                <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Credits Limit Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 mb-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Credits limit</h2>
            <p className="text-sm text-gray-600 mb-6">
              Maximum credits to be used by this agent from the credits available on the project.
            </p>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900">
                  Set credits limit on agent:
                </label>
                <Switch
                  checked={limitEnabled}
                  onCheckedChange={setLimitEnabled}
                />
              </div>

              {limitEnabled && (
                <div>
                  <Input
                    type="number"
                    placeholder="Enter credit limit"
                    value={creditsLimit}
                    onChange={(e) => setCreditsLimit(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
              )}

              <div className="flex justify-end">
                <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="text-center text-sm font-medium text-red-600 mb-8">
          DANGER ZONE
        </div>

        {/* Delete Conversations Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete all conversations</h2>
              <p className="text-sm text-gray-600">
                Once you delete all your conversations, there is no going back. Please be certain. All the conversations on this agent will be deleted.
              </p>
            </div>
            <Button
              onClick={handleDeleteConversations}
              className="bg-red-600 hover:bg-red-700 text-white ml-8 whitespace-nowrap"
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Delete Agent Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete agent</h2>
              <p className="text-sm text-gray-600">
                Once you delete your agent, there is not going back. Please be certain.
              </p>
            </div>
            <Button
              onClick={handleDeleteAgent}
              className="bg-red-600 hover:bg-red-700 text-white ml-8 whitespace-nowrap"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}