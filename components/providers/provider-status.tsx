'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface ProviderHealth {
  provider: string
  status: {
    isHealthy: boolean
    lastChecked: string
    error?: string
    responseTime?: number
  }
}

export function ProviderStatus() {
  const [providers, setProviders] = useState<ProviderHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const checkStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/providers/status')
      const data = await response.json()
      setProviders(data.providers || [])
      setLastCheck(new Date())
    } catch (error) {
      console.error('Failed to fetch provider status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkStatus()
    // Check every 60 seconds
    const interval = setInterval(checkStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (isHealthy: boolean | undefined) => {
    if (isHealthy === undefined) return <AlertCircle className="h-4 w-4 text-gray-400" />
    return isHealthy
      ? <CheckCircle className="h-4 w-4 text-green-500" />
      : <XCircle className="h-4 w-4 text-red-500" />
  }

  const getProviderDisplayName = (provider: string) => {
    const names: Record<string, string> = {
      openai: 'OpenAI',
      google: 'Google Gemini',
      anthropic: 'Anthropic Claude'
    }
    return names[provider] || provider
  }

  if (loading && !providers.length) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Checking providers...
      </div>
    )
  }

  if (!providers.length) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">AI Provider Status</span>
        <button
          onClick={checkStatus}
          disabled={loading}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Refresh status"
        >
          <RefreshCw className={`h-3 w-3 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-1">
        {providers.map((provider) => (
          <div
            key={provider.provider}
            className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
          >
            <div className="flex items-center gap-2">
              {getStatusIcon(provider.status?.isHealthy)}
              <span className="font-medium">
                {getProviderDisplayName(provider.provider)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              {provider.status?.responseTime && (
                <span>{provider.status.responseTime}ms</span>
              )}
              {provider.status?.error && (
                <span className="text-red-500" title={provider.status.error}>
                  Error
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {lastCheck && (
        <div className="text-xs text-gray-400 text-right">
          Last checked: {lastCheck.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}