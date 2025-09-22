'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertCircle } from 'lucide-react'

export default function ProjectGeneralPage() {
  const [projectName, setProjectName] = useState('')
  const [projectUrl, setProjectUrl] = useState('')
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProjectData()
  }, [])

  const loadProjectData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get user's project
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)

    if (projects && projects.length > 0) {
      const ws = projects[0]
      setProject(ws)
      setProjectName(ws.name)
      setProjectUrl(ws.url_slug)
    }
  }

  const handleUpdateProject = async () => {
    if (!project) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: projectName,
          url_slug: projectUrl
        })
        .eq('id', project.id)

      if (error) throw error
      toast.success('Project updated successfully')
    } catch (error: any) {
      if (error.message?.includes('unique')) {
        toast.error('This project URL is already taken')
      } else {
        toast.error('Failed to update project')
      }
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!window.confirm('Are you sure you want to delete this project? All your agents and data will be permanently deleted.')) {
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id)

      if (error) throw error

      toast.success('Project deleted successfully')
      router.push('/onboarding')
    } catch (error) {
      toast.error('Failed to delete project')
      console.error(error)
    } finally {
      setDeleting(false)
    }
  }

  if (!project) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">General</h1>

      {/* Project Details Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Project details</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your project name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project URL
            </label>
            <input
              type="text"
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your-project-url"
            />
            <p className="mt-2 text-sm text-gray-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Changing the project URL will redirect you to the new address
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleUpdateProject}
              disabled={loading}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wider mb-4">
          Danger Zone
        </h3>

        <div>
          <h4 className="font-medium text-gray-900 mb-2">Delete project</h4>
          <p className="text-sm text-gray-600 mb-4">
            Once you delete your project, there is no going back. Please be certain.{' '}
            <span className="font-medium">
              All your uploaded data and trained agents will be deleted.
            </span>
          </p>
          <button
            onClick={handleDeleteProject}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}