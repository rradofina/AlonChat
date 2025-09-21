import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's workspaces
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('*')
    .or(`owner_id.eq.${user.id},workspace_members.user_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  // If no workspace, create one
  if (!workspaces || workspaces.length === 0) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const workspaceName = profile?.full_name ? `${profile.full_name}'s Workspace` : 'My Workspace'
    const urlSlug = user.id.slice(0, 8)

    const { data: newWorkspace } = await supabase
      .from('workspaces')
      .insert({
        name: workspaceName,
        url_slug: urlSlug,
        owner_id: user.id,
      })
      .select()
      .single()

    if (newWorkspace) {
      redirect(`/dashboard`)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar workspaces={workspaces || []} user={user} />
      <div className="flex-1 flex flex-col">
        <Header user={user} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}