'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Instagram, Check, AlertCircle, Users, MessageSquare, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface InstagramConnectProps {
  agentId: string
}

interface InstagramAccount {
  id: string
  username: string
  name?: string
  profile_picture_url?: string
  followers_count?: number
  media_count?: number
}

interface FacebookPage {
  id: string
  name: string
  picture?: { data: { url: string } }
  access_token: string
  instagram_account?: InstagramAccount
}

export function InstagramConnect({ agentId }: InstagramConnectProps) {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [connected, setConnected] = useState(false)
  const [integration, setIntegration] = useState<any>(null)
  const [step, setStep] = useState<'login' | 'select' | 'confirm'>('login')
  const [pages, setPages] = useState<FacebookPage[]>([])
  const [selectedPage, setSelectedPage] = useState<FacebookPage | null>(null)
  const [userAccessToken, setUserAccessToken] = useState<string>('')

  // Check existing Instagram integration
  useEffect(() => {
    checkIntegration()
  }, [agentId])

  const checkIntegration = async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}/instagram`)
      const data = await response.json()

      if (data.connected) {
        setConnected(true)
        setIntegration(data.integration)
      }
    } catch (error) {
      console.error('Failed to check Instagram integration:', error)
    } finally {
      setChecking(false)
    }
  }

  const handleOAuthLogin = () => {
    setLoading(true)

    // Open Facebook OAuth in popup
    const width = 600
    const height = 700
    const left = (window.screen.width / 2) - (width / 2)
    const top = (window.screen.height / 2) - (height / 2)

    const popup = window.open(
      `/api/auth/facebook?agent_id=${agentId}`,
      'instagram_oauth',
      `width=${width},height=${height},left=${left},top=${top}`
    )

    // Listen for OAuth callback
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      if (event.data.type === 'FACEBOOK_OAUTH_SUCCESS') {
        // Exchange auth code for access token
        try {
          const response = await fetch('/api/auth/facebook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: event.data.code,
              agentId
            })
          })

          const data = await response.json()

          if (data.success) {
            // Filter pages that have Instagram accounts
            const pagesWithInstagram = data.pages.filter((p: FacebookPage) =>
              p.instagram_account && p.instagram_account.id
            )

            if (pagesWithInstagram.length === 0) {
              toast.error('No Instagram Business accounts found. Please connect an Instagram account to your Facebook Page.')
              setLoading(false)
              return
            }

            setPages(pagesWithInstagram)
            setUserAccessToken(data.user_access_token)
            setStep('select')
          } else {
            toast.error('Authentication failed')
          }
        } catch (error) {
          console.error('OAuth exchange failed:', error)
          toast.error('Failed to authenticate')
        }

        setLoading(false)
      } else if (event.data.type === 'FACEBOOK_OAUTH_ERROR') {
        toast.error(event.data.error || 'Authentication failed')
        setLoading(false)
      }
    }

    window.addEventListener('message', handleMessage)

    // Clean up if popup is closed
    const checkPopup = setInterval(() => {
      if (popup && popup.closed) {
        clearInterval(checkPopup)
        window.removeEventListener('message', handleMessage)
        setLoading(false)
      }
    }, 1000)
  }

  const handleSelectPage = (page: FacebookPage) => {
    setSelectedPage(page)
    setStep('confirm')
  }

  const handleSaveIntegration = async () => {
    if (!selectedPage || !selectedPage.instagram_account) return

    setLoading(true)
    try {
      const response = await fetch(`/api/agents/${agentId}/instagram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedPage.instagram_account.id,
          username: selectedPage.instagram_account.username,
          name: selectedPage.instagram_account.name,
          profilePicUrl: selectedPage.instagram_account.profile_picture_url,
          followersCount: selectedPage.instagram_account.followers_count,
          pageId: selectedPage.id,
          pageAccessToken: selectedPage.access_token,
          userAccessToken: userAccessToken
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Instagram connected successfully!')
        setConnected(true)
        setIntegration(data.integration)
        setStep('login')
      } else {
        throw new Error(data.error || 'Failed to save integration')
      }
    } catch (error: any) {
      console.error('Failed to save Instagram integration:', error)
      toast.error(error.message || 'Failed to connect Instagram')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/agents/${agentId}/instagram`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Instagram disconnected')
        setConnected(false)
        setIntegration(null)
        setStep('login')
      } else {
        throw new Error('Failed to disconnect')
      }
    } catch (error) {
      console.error('Failed to disconnect Instagram:', error)
      toast.error('Failed to disconnect Instagram')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (connected && integration) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Instagram className="h-5 w-5" />
              <CardTitle>Instagram Direct</CardTitle>
            </div>
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              Connected
            </Badge>
          </div>
          <CardDescription>
            Respond to Instagram DMs directly from your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            {integration.profilePicUrl && (
              <Avatar className="h-12 w-12">
                <AvatarImage src={integration.profilePicUrl} />
                <AvatarFallback>IG</AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1">
              <p className="font-medium">@{integration.username}</p>
              {integration.name && (
                <p className="text-sm text-gray-600">{integration.name}</p>
              )}
              {integration.followersCount && (
                <p className="text-sm text-gray-500">{integration.followersCount.toLocaleString()} followers</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Receiving DMs</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>AI Responses Active</span>
            </div>
            <div className="flex items-center gap-2">
              {integration.tokenValid ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
              <span>Token {integration.tokenValid ? 'Valid' : 'Expiring Soon'}</span>
            </div>
            <div className="flex items-center gap-2">
              {integration.webhookVerified ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
              <span>Webhook {integration.webhookVerified ? 'Active' : 'Pending'}</span>
            </div>
          </div>

          {!integration.webhookVerified && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Webhook needs to be configured in Meta Developer Dashboard.
                <a href="#" className="text-blue-600 underline ml-1">View setup guide</a>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => window.location.href = `/dashboard/agents/${agentId}/activity/messenger`}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              View Messages
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Disconnect'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Instagram className="h-5 w-5" />
          <CardTitle>Instagram Direct</CardTitle>
        </div>
        <CardDescription>
          Connect your Instagram Business account to receive and respond to DMs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'login' && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Requirements:</strong>
                <ul className="list-disc list-inside mt-2">
                  <li>Instagram Business or Creator account</li>
                  <li>Connected to a Facebook Page</li>
                  <li>instagram_manage_messages permission</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button
              className="w-full"
              onClick={handleOAuthLogin}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Instagram className="h-4 w-4 mr-2" />
                  Connect Instagram Account
                </>
              )}
            </Button>
          </div>
        )}

        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Select the Instagram Business account you want to connect:
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => handleSelectPage(page)}
                  className="w-full p-3 border rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={page.instagram_account?.profile_picture_url} />
                      <AvatarFallback>IG</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">@{page.instagram_account?.username}</p>
                      <p className="text-sm text-gray-500">
                        {page.instagram_account?.followers_count?.toLocaleString()} followers •
                        via {page.name}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => setStep('login')}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        )}

        {step === 'confirm' && selectedPage && selectedPage.instagram_account && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedPage.instagram_account.profile_picture_url} />
                  <AvatarFallback>IG</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">@{selectedPage.instagram_account.username}</p>
                  {selectedPage.instagram_account.name && (
                    <p className="text-sm text-gray-600">{selectedPage.instagram_account.name}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    {selectedPage.instagram_account.followers_count?.toLocaleString()} followers
                  </p>
                </div>
              </div>
            </div>

            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                Your AI agent will automatically respond to Instagram DMs using your trained knowledge base.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('select')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSaveIntegration}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Confirm & Connect'
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}