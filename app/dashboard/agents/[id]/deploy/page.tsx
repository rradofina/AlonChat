'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Copy, Check, Code, Globe, MessageSquare, Smartphone } from 'lucide-react'
import { toast } from 'sonner'

export default function DeployPage() {
  const params = useParams()
  const [copiedCode, setCopiedCode] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'widget' | 'api' | 'integrations'>('widget')
  const agentId = params.id as string

  const widgetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/widget/${agentId}`
  const embedCode = `<!-- AlonChat Widget -->
<script src="${widgetUrl}"></script>`

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedCode)
    setCopiedCode(true)
    toast.success('Widget code copied to clipboard!')
    setTimeout(() => setCopiedCode(false), 3000)
  }

  const integrations = [
    {
      name: 'Website Widget',
      description: 'Embed a chat widget on your website',
      icon: Globe,
      status: 'available',
      action: 'widget'
    },
    {
      name: 'Facebook Messenger',
      description: 'Connect to Facebook Messenger',
      icon: MessageSquare,
      status: 'coming_soon'
    },
    {
      name: 'WhatsApp',
      description: 'Connect to WhatsApp Business',
      icon: MessageSquare,
      status: 'coming_soon'
    },
    {
      name: 'Mobile SDK',
      description: 'Integrate into mobile apps',
      icon: Smartphone,
      status: 'coming_soon'
    }
  ]

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Deploy Your Agent</h1>
        <p className="text-gray-600">
          Choose how you want to deploy your agent and integrate it with your platforms
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setSelectedTab('widget')}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
            selectedTab === 'widget'
              ? 'bg-white text-black shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Website Widget
        </button>
        <button
          onClick={() => setSelectedTab('api')}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
            selectedTab === 'api'
              ? 'bg-white text-black shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          API Access
        </button>
        <button
          onClick={() => setSelectedTab('integrations')}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
            selectedTab === 'integrations'
              ? 'bg-white text-black shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Integrations
        </button>
      </div>

      {/* Widget Tab */}
      {selectedTab === 'widget' && (
        <div className="grid gap-6">
          {/* Quick Start */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Start</h2>
            <p className="text-gray-600 mb-4">
              Add this code snippet to your website's HTML, just before the closing &lt;/body&gt; tag:
            </p>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg relative">
              <pre className="text-sm overflow-x-auto">
                <code>{embedCode}</code>
              </pre>
              <button
                onClick={handleCopyCode}
                className="absolute top-3 right-3 p-2 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
              >
                {copiedCode ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Customization Options */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Widget Preview</h2>
            <div className="bg-gray-50 rounded-lg p-8 relative" style={{ minHeight: '300px' }}>
              <p className="text-gray-500 text-center">
                The widget will appear as a chat button in the bottom-right corner of your website.
              </p>
              {/* Mock widget button */}
              <div className="absolute bottom-4 right-4">
                <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center shadow-lg">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Installation Guide */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Installation Guide</h2>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-semibold">
                  1
                </span>
                <div>
                  <p className="font-medium">Copy the embed code</p>
                  <p className="text-sm text-gray-600">Click the copy button above to copy the widget code</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-semibold">
                  2
                </span>
                <div>
                  <p className="font-medium">Add to your website</p>
                  <p className="text-sm text-gray-600">
                    Paste the code into your website's HTML, just before the closing &lt;/body&gt; tag
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-semibold">
                  3
                </span>
                <div>
                  <p className="font-medium">Test the widget</p>
                  <p className="text-sm text-gray-600">
                    Refresh your website and click the chat button to test your agent
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* API Tab */}
      {selectedTab === 'api' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">API Access</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Endpoint</label>
              <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm">
                POST /api/agents/{agentId}/chat
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Example Request</label>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">
{`curl -X POST ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/agents/${agentId}/chat \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello, how can you help me?"}'`}
                </pre>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Example Response</label>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">
{`{
  "response": "Hi! I'm here to help. What would you like to know?",
  "conversation_id": "conv_123456789"
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {selectedTab === 'integrations' && (
        <div className="grid grid-cols-2 gap-4">
          {integrations.map((integration) => {
            const Icon = integration.icon
            return (
              <div
                key={integration.name}
                className="bg-white border border-gray-200 rounded-lg p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Icon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{integration.name}</h3>
                      <p className="text-sm text-gray-600">{integration.description}</p>
                    </div>
                  </div>
                </div>
                {integration.status === 'available' ? (
                  <button
                    onClick={() => integration.action === 'widget' && setSelectedTab('widget')}
                    className="w-full py-2 bg-black text-white rounded-lg hover:bg-gray-900"
                  >
                    Configure
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}