'use client'

import { useState } from 'react'
import { Facebook, Check, Building2, Users, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface FacebookPage {
  id: string
  name: string
  picture?: {
    data: {
      url: string
    }
  }
  access_token: string
  category: string
  fan_count?: number
}

interface FacebookConnectProps {
  agentId: string
  onConnect: (pageId: string, pageName: string, accessToken: string) => void
  onCancel: () => void
}

export function FacebookConnect({ agentId, onConnect, onCancel }: FacebookConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [pages, setPages] = useState<FacebookPage[]>([])
  const [selectedPage, setSelectedPage] = useState<FacebookPage | null>(null)
  const [step, setStep] = useState<'login' | 'select' | 'confirm'>('login')

  const handleFacebookLogin = async () => {
    setIsConnecting(true)

    try {
      // Open Facebook OAuth in a popup
      const width = 600
      const height = 700
      const left = (window.innerWidth - width) / 2
      const top = (window.innerHeight - height) / 2

      const popup = window.open(
        `/api/auth/facebook?agent_id=${agentId}`,
        'facebook-login',
        `width=${width},height=${height},left=${left},top=${top}`
      )

      // Listen for OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return

        if (event.data.type === 'facebook-auth-success') {
          window.removeEventListener('message', handleMessage)
          popup?.close()

          // Exchange code for pages
          const response = await fetch('/api/auth/facebook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: event.data.code,
              agentId
            })
          })

          const data = await response.json()

          if (data.pages && data.pages.length > 0) {
            setPages(data.pages)
            setStep('select')
          } else {
            toast.error('No Facebook Pages found. Please make sure you manage at least one page.')
          }

          setIsConnecting(false)
        } else if (event.data.type === 'facebook-auth-error') {
          window.removeEventListener('message', handleMessage)
          popup?.close()
          toast.error('Facebook authentication failed')
          setIsConnecting(false)
        }
      }

      window.addEventListener('message', handleMessage)

      // Check if popup was blocked
      if (!popup || popup.closed) {
        window.removeEventListener('message', handleMessage)
        toast.error('Please allow popups to connect Facebook')
        setIsConnecting(false)
      }

    } catch (error) {
      console.error('Facebook login error:', error)
      toast.error('Failed to connect to Facebook')
      setIsConnecting(false)
    }
  }

  const handlePageSelect = (page: FacebookPage) => {
    setSelectedPage(page)
    setStep('confirm')
  }

  const handleConfirm = () => {
    if (selectedPage) {
      onConnect(selectedPage.id, selectedPage.name, selectedPage.access_token)
      toast.success(`Connected to ${selectedPage.name}!`)
    }
  }

  if (step === 'login') {
    return (
      <div className="text-center py-8">
        <div className="mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Facebook className="w-10 h-10 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Connect Your Facebook Page
          </h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Sign in with Facebook to automatically connect your page. No need to find Page IDs manually!
          </p>
        </div>

        <Button
          onClick={handleFacebookLogin}
          disabled={isConnecting}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Facebook className="w-5 h-5 mr-2" />
              Continue with Facebook
            </>
          )}
        </Button>

        <div className="mt-6 text-xs text-gray-500">
          We'll request permission to manage your pages and messaging
        </div>
      </div>
    )
  }

  if (step === 'select') {
    return (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Select a Facebook Page
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Choose which page you want to connect to your AI agent
        </p>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => handlePageSelect(page)}
              className="w-full p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {page.picture?.data?.url ? (
                    <img
                      src={page.picture.data.url}
                      alt={page.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{page.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>{page.category}</span>
                      {page.fan_count && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {page.fan_count.toLocaleString()} fans
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-4">
          <Button variant="outline" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'confirm') {
    return (
      <div className="text-center py-8">
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Ready to Connect!
          </h3>
          <p className="text-sm text-gray-600">
            Your AI agent will be connected to:
          </p>
        </div>

        {selectedPage && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 justify-center">
              {selectedPage.picture?.data?.url ? (
                <img
                  src={selectedPage.picture.data.url}
                  alt={selectedPage.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-gray-500" />
                </div>
              )}
              <div className="text-left">
                <div className="font-medium text-gray-900">{selectedPage.name}</div>
                <div className="text-xs text-gray-500">{selectedPage.category}</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setStep('select')}
            className="flex-1"
          >
            Change Page
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Confirm & Connect
          </Button>
        </div>
      </div>
    )
  }

  return null
}