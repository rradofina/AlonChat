'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  refreshSession: async () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const pathname = usePathname()

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session: refreshedSession }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Error refreshing session:', error)
        return
      }

      if (refreshedSession) {
        setSession(refreshedSession)
        setUser(refreshedSession.user)

        // If session is expiring soon, refresh the token
        const expiresAt = refreshedSession.expires_at
        if (expiresAt) {
          const expiresIn = expiresAt * 1000 - Date.now()
          if (expiresIn < 60 * 60 * 1000) { // Less than 1 hour
            const { data: { session: newSession } } = await supabase.auth.refreshSession()
            if (newSession) {
              setSession(newSession)
              setUser(newSession.user)
            }
          }
        }
      }
    } catch (error) {
      console.error('Session refresh error:', error)
    }
  }, [supabase])

  useEffect(() => {
    // Initial session check
    refreshSession().then(() => {
      setLoading(false)
    })

    // Set up auto-refresh interval
    const refreshInterval = setInterval(() => {
      refreshSession()
    }, 30 * 60 * 1000) // Refresh every 30 minutes

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('Auth state changed:', event)
      setSession(newSession)
      setUser(newSession?.user ?? null)

      if (event === 'SIGNED_IN' && pathname === '/login') {
        router.push('/dashboard')
      } else if (event === 'SIGNED_OUT') {
        router.push('/login')
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully')
      }
    })

    // Handle visibility change to refresh session when tab becomes active
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshSession()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      clearInterval(refreshInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [supabase, refreshSession, router, pathname])

  return (
    <AuthContext.Provider value={{ user, session, loading, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)