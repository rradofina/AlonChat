'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Users } from 'lucide-react'

export default function CreateProjectPage() {
  const [projectName, setProjectName] = useState('')
  const [projectUrl, setProjectUrl] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleProjectNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setProjectName(name)

    // Auto-generate URL slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    setProjectUrl(slug)
  }

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error('Please enter a project name')
      return
    }

    if (!projectUrl.trim()) {
      toast.error('Please enter a project URL')
      return
    }

    setCreating(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check if user already has a project (for MVP, one project per user)
      const { data: existingProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)

      if (existingProjects && existingProjects.length > 0) {
        toast.error('You already have a project. Multiple projects will be available in the Pro plan.')
        return
      }

      // Create the project
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          name: projectName,
          url_slug: projectUrl,
          owner_id: user.id,
          plan_tier: 'free'
        })
        .select()
        .single()

      if (error) {
        if (error.message.includes('unique')) {
          toast.error('This project URL is already taken. Please choose another.')
        } else {
          throw error
        }
        return
      }

      toast.success('Project created successfully!')
      router.push('/dashboard')
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Failed to create project')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-gray-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-2">Create project</h1>
          <p className="text-gray-600 text-center mb-8">
            This is your project's visible name within Chatbase.
          </p>

          {/* Form */}
          <div className="space-y-6">
            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={handleProjectNameChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Name of your project"
                autoFocus
              />
            </div>

            {/* Project URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project URL
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg">
                  alonchat.com/
                </span>
                <input
                  type="text"
                  value={projectUrl}
                  onChange={(e) => setProjectUrl(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="URL of your project"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                This will be your project's URL slug
              </p>
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreateProject}
              disabled={creating || !projectName.trim() || !projectUrl.trim()}
              className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>

            {/* Cancel Link */}
            <div className="text-center">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-800 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}