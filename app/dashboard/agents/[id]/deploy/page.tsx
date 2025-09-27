'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, MessageCircle, Copy, Check, Settings, ExternalLink, Facebook, Instagram } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { FacebookConnect } from '@/components/facebook/facebook-connect'
import { InstagramConnect } from '@/components/instagram/instagram-connect'

export default function DeployPage() {
  const params = useParams()
  const agentId = params.id as string
  const [agent, setAgent] = useState<any>(null)
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [copied, setCopied] = useState(false)
  const [facebookPageId, setFacebookPageId] = useState('')
  const [facebookPageName, setFacebookPageName] = useState('')
  const [facebookAccessToken, setFacebookAccessToken] = useState('')
  const [widgetColor, setWidgetColor] = useState('#0084FF')
  const [showFacebookConnect, setShowFacebookConnect] = useState(false)
  const [showInstagramSetup, setShowInstagramSetup] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadAgent()
  }, [agentId])

  const loadAgent = async () => {
    const { data } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single()

    if (data) {
      setAgent(data)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const channels = [
    {
      id: 'facebook-messenger',
      name: 'Facebook Messenger',
      description: 'Connect your agent to Facebook Messenger and respond to customer messages instantly.',
      icon: '💬',
      bgColor: 'bg-blue-600',
      featured: true,
      actions: ['Setup Integration'],
      enabled: true,
      setupAvailable: true
    },
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
      id: 'whatsapp',
      name: 'WhatsApp',
      description: 'Connect your agent to a WhatsApp number and respond to messages.',
      icon: '💬',
      bgColor: 'bg-green-500',
      actions: ['Coming Soon'],
      needsSubscription: true,
      enabled: true
    },
    {
      id: 'instagram',
      name: 'Instagram',
      description: 'Connect your agent to Instagram Business account and respond to DMs automatically.',
      icon: '📷',
      bgColor: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400',
      actions: ['Setup Integration'],
      featured: true,
      enabled: true,
      setupAvailable: true
    }
  ]

  const handleChannelSetup = (channelId: string) => {
    setSelectedChannel(channelId)
    if (channelId === 'facebook-messenger') {
      setShowSetup(true)
    } else if (channelId === 'instagram') {
      setShowInstagramSetup(true)
    }
  }

  const getFacebookEmbedCode = () => {
    return `<!-- Facebook Messenger Chat Plugin -->
<script>
  window.fbAsyncInit = function() {
    FB.init({
      xfbml: true,
      version: 'v18.0'
    });
  };

  (function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = 'https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js';
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));
</script>

<!-- Your Chat Plugin code -->
<div class="fb-customerchat"
  attribution="setup_tool"
  page_id="${facebookPageId || 'YOUR_FACEBOOK_PAGE_ID'}"
  theme_color="${widgetColor}"
  logged_in_greeting="${agent?.welcome_message || 'Hi! How can I help you today?'}"
  logged_out_greeting="${agent?.welcome_message || 'Hi! How can I help you today?'}">
</div>

<!-- AlonChat AI Integration -->
<script>
  // Connect to AlonChat AI Backend
  window.addEventListener('message', function(e) {
    if (e.origin !== 'https://www.facebook.com') return;

    // Forward messages to AlonChat
    fetch('${window.location.origin}/api/agents/${agentId}/facebook-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: e.data,
        agentId: '${agentId}'
      })
    });
  });
</script>`
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Deploy Your Agent</h1>

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
            <Button variant="outline" size="sm" className="text-sm">
              Update
            </Button>
          </div>
        </div>

        {/* Facebook Messenger Featured Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-1">Facebook Messenger Integration</h2>
                  <p className="text-blue-100">
                    Connect your AI agent to Facebook Messenger and engage with customers instantly
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handleChannelSetup('facebook-messenger')}
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                Setup Now
              </Button>
            </div>
          </div>
        </div>

        {/* Other Channels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {channels.filter(c => c.id !== 'facebook-messenger').map((channel) => (
            <div
              key={channel.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow flex"
            >
              <div className="flex flex-col items-center text-center w-full">
                {/* Icon */}
                <div className={`w-16 h-16 rounded-lg flex items-center justify-center mb-4 ${channel.bgColor}`}>
                  <span className="text-2xl">{channel.icon}</span>
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
                      onClick={() => handleChannelSetup(channel.id)}
                      disabled={action === 'Coming Soon'}
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

      {/* Facebook Messenger Setup Modal */}
      {showSetup && selectedChannel === 'facebook-messenger' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Facebook Messenger Setup
                </h2>
                <button
                  onClick={() => setShowSetup(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Facebook Connection */}
              {!showFacebookConnect ? (
                <>
                  {/* Connected Page Display */}
                  {facebookPageId ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <Check className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium text-green-900">Connected to Facebook</div>
                            <div className="text-sm text-green-700">{facebookPageName || 'Page ID: ' + facebookPageId}</div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowFacebookConnect(true)}
                        >
                          Change Page
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-center">
                      <Facebook className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                      <h3 className="font-medium text-blue-900 mb-2">Connect Your Facebook Page</h3>
                      <p className="text-sm text-blue-800 mb-4">
                        Sign in with Facebook to automatically connect your page.
                        No need to manually find Page IDs!
                      </p>
                      <Button
                        onClick={() => setShowFacebookConnect(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Facebook className="w-4 h-4 mr-2" />
                        Connect Facebook Page
                      </Button>
                    </div>
                  )}

                  {/* Configuration Form - Only show theme color after connection */}
                  {facebookPageId && (
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Theme Color
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={widgetColor}
                            onChange={(e) => setWidgetColor(e.target.value)}
                            className="w-12 h-12 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={widgetColor}
                            onChange={(e) => setWidgetColor(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  )}

              {/* Embed Code */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Embed Code
                  </label>
                  <button
                    onClick={() => copyToClipboard(getFacebookEmbedCode())}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                  <code>{getFacebookEmbedCode()}</code>
                </pre>
              </div>

              {/* Help Links */}
              <div className="flex items-center gap-4 text-sm">
                <a
                  href="https://developers.facebook.com/docs/messenger-platform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="w-3 h-3" />
                  Facebook Docs
                </a>
                <a
                  href="#"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                >
                  <Settings className="w-3 h-3" />
                  Advanced Settings
                </a>
              </div>
                </>
              ) : (
                <FacebookConnect
                  agentId={agentId}
                  onConnect={(pageId, pageName, accessToken) => {
                    setFacebookPageId(pageId)
                    setFacebookPageName(pageName)
                    setFacebookAccessToken(accessToken)
                    setShowFacebookConnect(false)
                    toast.success(`Connected to ${pageName}!`)
                  }}
                  onCancel={() => setShowFacebookConnect(false)}
                />
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowSetup(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    toast.success('Facebook Messenger integration configured!')
                    setShowSetup(false)
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save Configuration
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instagram Setup Modal */}
      {showInstagramSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Instagram className="h-6 w-6 text-pink-600" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Instagram Business Setup
                  </h2>
                </div>
                <button
                  onClick={() => setShowInstagramSetup(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <InstagramConnect agentId={agentId} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}