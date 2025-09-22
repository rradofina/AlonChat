import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DynamicSidebar } from '@/components/layout/dynamic-sidebar'
import { DashboardHeader } from '@/components/layout/dashboard-header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get all user's projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })

  // If no project exists, redirect to onboarding to create one
  if (!projects || projects.length === 0) {
    redirect('/onboarding')
  }

  const currentProject = projects[0]

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <DashboardHeader projectName={currentProject?.name} />
      <div className="flex flex-1 overflow-hidden">
        <DynamicSidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}