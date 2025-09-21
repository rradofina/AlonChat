import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function OnboardingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user already has a workspace
  const { data: existingWorkspaces } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id)
    .limit(1)

  if (existingWorkspaces && existingWorkspaces.length > 0) {
    redirect('/dashboard')
  }

  // Auto-create a workspace for the user
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const workspaceName = profile?.full_name ? `${profile.full_name}'s Workspace` : 'My Workspace'

  // Generate a unique slug using timestamp
  const timestamp = Date.now().toString(36)
  const userIdPart = user.id.substring(0, 6)
  const uniqueSlug = `${userIdPart}-${timestamp}`

  const { data: newWorkspace, error } = await supabase
    .from('workspaces')
    .insert({
      name: workspaceName,
      owner_id: user.id,
      plan_tier: 'free',
      url_slug: uniqueSlug
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create workspace:', error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Creating Workspace</h1>
          <p className="text-gray-600 mb-4">There was an issue setting up your workspace.</p>
          <pre className="text-sm bg-gray-100 p-4 rounded">{JSON.stringify(error, null, 2)}</pre>
          <a href="/dashboard" className="mt-4 inline-block text-blue-500 hover:underline">
            Try again
          </a>
        </div>
      </div>
    )
  }

  // Workspace created successfully, redirect to dashboard
  redirect('/dashboard')
}