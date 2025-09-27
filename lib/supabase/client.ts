import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          if (typeof document === 'undefined') return undefined
          const cookies = document.cookie.split('; ')
          const cookie = cookies.find(c => c.startsWith(`${name}=`))
          return cookie ? decodeURIComponent(cookie.split('=')[1]) : undefined
        },
        set(name: string, value: string, options?: any) {
          if (typeof document === 'undefined') return
          const cookieOptions = {
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            ...options
          }

          const cookieString = `${name}=${encodeURIComponent(value)}; path=${cookieOptions.path}; max-age=${cookieOptions.maxAge}; samesite=${cookieOptions.sameSite}${cookieOptions.secure ? '; secure' : ''}`
          document.cookie = cookieString
        },
        remove(name: string, options?: any) {
          if (typeof document === 'undefined') return
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        }
      },
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true
      }
    }
  )
}