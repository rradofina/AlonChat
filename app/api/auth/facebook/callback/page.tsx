'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function FacebookCallbackPage() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (error) {
      // Send error to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'facebook-auth-error',
            error: errorDescription || error
          },
          window.location.origin
        )
      }
      // Close window after delay
      setTimeout(() => window.close(), 2000)
    } else if (code) {
      // Send success to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'facebook-auth-success',
            code
          },
          window.location.origin
        )
      }
      // Window will be closed by parent
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          Connecting to Facebook...
        </h2>
        <p className="text-sm text-gray-600">
          Please wait while we complete the connection
        </p>
      </div>
    </div>
  )
}