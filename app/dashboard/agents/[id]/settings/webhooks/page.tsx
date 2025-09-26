'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Facebook, Copy, Check, ExternalLink, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function WebhooksPage() {
  const params = useParams()
  const agentId = params.id as string
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [config, setConfig] = useState({
    messenger_enabled: false,
    messenger_page_id: '',
    messenger_page_token: '',
    messenger_webhook_secret: ''
  })

  const supabase = createClient()
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/api/webhooks/messenger`

  useEffect(() => {
    loadConfiguration()
  }, [agentId])

  const loadConfiguration = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('messenger_enabled, messenger_page_id, messenger_page_token, messenger_webhook_secret')
        .eq('id', agentId)
        .single()

      if (error) throw error

      if (data) {
        setConfig({
          messenger_enabled: data.messenger_enabled || false,
          messenger_page_id: data.messenger_page_id || '',
          messenger_page_token: data.messenger_page_token || '',
          messenger_webhook_secret: data.messenger_webhook_secret || ''
        })
      }
    } catch (error) {
      console.error('Error loading configuration:', error)
      toast.error('Failed to load webhook configuration')
    } finally {
      setLoading(false)
    }
  }

  const saveConfiguration = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('agents')
        .update({
          messenger_enabled: config.messenger_enabled,
          messenger_page_id: config.messenger_page_id,
          messenger_page_token: config.messenger_page_token,
          messenger_webhook_secret: config.messenger_webhook_secret
        })
        .eq('id', agentId)

      if (error) throw error

      toast.success('Messenger configuration saved successfully!')
    } catch (error) {
      console.error('Error saving configuration:', error)
      toast.error('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    toast.success('Webhook URL copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const testWebhook = async () => {
    try {
      const response = await fetch(`${webhookUrl}?hub.mode=subscribe&hub.verify_token=${config.messenger_webhook_secret || 'test_token'}&hub.challenge=test_challenge`)

      if (response.ok) {
        const result = await response.text()
        if (result === 'test_challenge') {
          toast.success('Webhook verification successful!')
        } else {
          toast.error('Webhook verification failed')
        }
      } else {
        toast.error('Webhook endpoint returned an error')
      }
    } catch (error) {
      toast.error('Failed to test webhook')
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Webhooks</h1>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Webhooks</h1>

      {/* Facebook Messenger Integration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Facebook className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold">Facebook Messenger</h2>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.messenger_enabled}
                onChange={(e) => setConfig({ ...config, messenger_enabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Enable Integration</span>
            </label>
          </div>
        </div>

        {/* Webhook URL */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Webhook URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={webhookUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 text-sm"
            />
            <button
              onClick={copyWebhookUrl}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Add this URL to your Facebook App webhook configuration
          </p>
        </div>

        {/* Configuration Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Page ID
            </label>
            <input
              type="text"
              value={config.messenger_page_id}
              onChange={(e) => setConfig({ ...config, messenger_page_id: e.target.value })}
              placeholder="Enter your Facebook Page ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Found in your Facebook Page settings under "About"
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Page Access Token
            </label>
            <input
              type="password"
              value={config.messenger_page_token}
              onChange={(e) => setConfig({ ...config, messenger_page_token: e.target.value })}
              placeholder="Enter your Page Access Token"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Generate this in your Facebook App Dashboard under Messenger → Settings
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verify Token
            </label>
            <input
              type="text"
              value={config.messenger_webhook_secret}
              onChange={(e) => setConfig({ ...config, messenger_webhook_secret: e.target.value })}
              placeholder="Create a verify token (any random string)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use this same token when setting up the webhook in Facebook App
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={testWebhook}
            disabled={!config.messenger_webhook_secret}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Test Webhook
          </button>
          <button
            onClick={saveConfiguration}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Setup Instructions</h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="font-medium">1.</span>
                <span>Create a Facebook App at <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">developers.facebook.com <ExternalLink className="h-3 w-3" /></a></span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium">2.</span>
                <span>Add Messenger product to your app</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium">3.</span>
                <span>Generate a Page Access Token for your Facebook Page</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium">4.</span>
                <span>Set up webhooks with the URL above and subscribe to "messages" and "messaging_postbacks" events</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium">5.</span>
                <span>Enter your configuration above and save</span>
              </li>
            </ol>
            <p className="text-sm text-gray-600 mt-3">
              Once configured, your agent will automatically respond to messages on your Facebook Page with Q&A images when relevant!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}