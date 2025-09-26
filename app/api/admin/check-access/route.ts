import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/utils/admin-access'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ isAdmin: false, error: 'Not authenticated' }, { status: 401 })
    }

    const isAdmin = isAdminEmail(user.email)

    return NextResponse.json({
      isAdmin,
      email: user.email,
      adminEmails: process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
    })
  } catch (error) {
    console.error('Error checking admin access:', error)
    return NextResponse.json({ isAdmin: false, error: 'Failed to check access' }, { status: 500 })
  }
}