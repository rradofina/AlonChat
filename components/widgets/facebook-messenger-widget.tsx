'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'

interface FacebookMessengerWidgetProps {
  pageId: string
  color?: string
  greetingMessage?: string
  agentId?: string
  position?: 'bottom-right' | 'bottom-left'
}

export function FacebookMessengerWidget({
  pageId,
  color = '#0084FF',
  greetingMessage = 'Hi! How can I help you today?',
  agentId,
  position = 'bottom-right'
}: FacebookMessengerWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Load Facebook SDK
    if (typeof window !== 'undefined' && !window.FB) {
      const script = document.createElement('script')
      script.src = 'https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js'
      script.async = true
      script.defer = true
      script.crossOrigin = 'anonymous'

      script.onload = () => {
        window.fbAsyncInit = function() {
          window.FB.init({
            appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
            autoLogAppEvents: true,
            xfbml: true,
            version: 'v18.0'
          })
          setIsLoaded(true)
        }
      }

      document.body.appendChild(script)
    }
  }, [])

  const positionClasses = position === 'bottom-right'
    ? 'bottom-4 right-4'
    : 'bottom-4 left-4'

  return (
    <>
      {/* Facebook Messenger Plugin */}
      <div
        className="fb-customerchat"
        data-page-id={pageId}
        data-theme-color={color}
        data-greeting-dialog-display="fade"
        data-greeting-dialog-delay="0"
        data-logged-in-greeting={greetingMessage}
        data-logged-out-greeting={greetingMessage}
      />

      {/* Custom Trigger Button */}
      <div className={`fixed ${positionClasses} z-50`}>
        <button
          onClick={() => {
            if (window.FB && window.FB.CustomerChat) {
              window.FB.CustomerChat.showDialog()
            } else {
              setIsOpen(!isOpen)
            }
          }}
          className="group flex items-center justify-center w-14 h-14 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200"
          style={{ backgroundColor: color }}
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </button>

        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-gray-800 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap">
            Chat with us on Messenger
          </div>
        </div>
      </div>

      {/* Fallback Custom Chat Window (if FB SDK fails to load) */}
      {isOpen && !isLoaded && (
        <div className={`fixed ${positionClasses} mb-20 z-40`}>
          <div className="bg-white rounded-2xl shadow-2xl w-96 h-[600px] flex flex-col border border-gray-200">
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 rounded-t-2xl text-white"
              style={{ backgroundColor: color }}
            >
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5" />
                <span className="font-medium">Messenger</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <MessageCircle
                  className="w-16 h-16 mx-auto mb-4 text-gray-300"
                  style={{ color: color + '30' }}
                />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Connect with Messenger
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Click below to open Facebook Messenger and start chatting with us
                </p>
                <a
                  href={`https://m.me/${pageId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-full hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: color }}
                >
                  <MessageCircle className="w-5 h-5" />
                  Open Messenger
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Extend Window interface for Facebook SDK
declare global {
  interface Window {
    FB: any
    fbAsyncInit: () => void
  }
}