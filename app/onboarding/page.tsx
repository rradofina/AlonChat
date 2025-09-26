import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function OnboardingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user already has a project
  const { data: existingProjects } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', user.id)
    .limit(1)

  if (existingProjects && existingProjects.length > 0) {
    redirect('/dashboard')
  }

  // Auto-create a project for the user
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const projectName = profile?.full_name ? `${profile.full_name}'s Project` : 'My Project'

  // Generate a unique slug using timestamp
  const timestamp = Date.now().toString(36)
  const userIdPart = user.id.substring(0, 6)
  const uniqueSlug = `${userIdPart}-${timestamp}`

  const { data: newProject, error } = await supabase
    .from('projects')
    .insert({
      name: projectName,
      owner_id: user.id,
      plan_tier: 'free',
      url_slug: uniqueSlug
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create project:', error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Creating Project</h1>
          <p className="text-gray-600 mb-4">There was an issue setting up your project.</p>
          <pre className="text-sm bg-gray-100 p-4 rounded">{JSON.stringify(error, null, 2)}</pre>
          <a href="/dashboard" className="mt-4 inline-block text-blue-500 hover:underline">
            Try again
          </a>
        </div>
      </div>
    )
  }

  // Create a free subscription for the new project
  if (newProject) {
    // Get the free plan ID
    const { data: freePlan } = await supabase
      .from('plans')
      .select('id')
      .eq('tier', 'free')
      .single()

    if (freePlan) {
      // Create subscription for the project
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          project_id: newProject.id,
          plan_id: freePlan.id,
          status: 'active',
          credits_limit: 100, // Free plan credits
          credits_used: 0,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          billing_email: user.email
        })

      if (subError) {
        console.error('Failed to create subscription:', subError)
        // Continue anyway - project is created
      }
    }
  }

  // Project created successfully, redirect to dashboard
  redirect('/dashboard')
}