import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // If user is logged in, redirect to dashboard
    redirect('/dashboard')
  } else {
    // If not logged in, redirect to login page
    redirect('/login')
  }
}