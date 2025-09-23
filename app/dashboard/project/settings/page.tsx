'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { AlertCircle, AlertTriangle } from 'lucide-react'

export default function GeneralSettingsPage() {
  const [project, setProject] = useState<any>(null)
  const [projectName, setProjectName] = useState('')
  const [projectSlug, setProjectSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadProject()
  }, [])

  async function loadProject() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (projects && projects[0]) {
        setProject(projects[0])
        setProjectName(projects[0].name)
        setProjectSlug(projects[0].url_slug)
      }
    } catch (error) {
      console.error('Error loading project:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: projectName,
          url_slug: projectSlug,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id)

      if (error) throw error
      toast.success('Project settings saved')
      loadProject()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteConfirm() {
    if (deleteConfirmation !== 'I understand') {
      toast.error('Please type "I understand" to confirm')
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id)

      if (error) throw error
      toast.success('Project deleted')
      window.location.href = '/dashboard'
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete project')
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">General</h1>

      {/* Project Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Project details</h2>

        <div className="space-y-4">
          <div>
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="project-slug">Project URL</Label>
            <Input
              id="project-slug"
              value={projectSlug}
              onChange={(e) => setProjectSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Changing the project URL will redirect you to the new address
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Delete Project */}
      <div className="border-2 border-red-200 bg-red-50 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Delete project</h2>
        <p className="text-gray-600 mb-4">
          Once you delete your project, there is no going back. Please be certain.<br />
          All your uploaded data and trained agents will be deleted.
        </p>
        <Button
          variant="destructive"
          onClick={() => setDeleteDialogOpen(true)}
          className="bg-red-600 hover:bg-red-700"
        >
          Delete
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete {projectName} ({projectSlug}) ?
            </DialogTitle>
            <DialogDescription className="pt-3">
              This will delete all the data associated with your project, and cancel all ongoing subscriptions and add-ons.
              <br />
              <span className="font-semibold text-gray-900">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="confirmation">Project name</Label>
              <Input
                id="projectname-display"
                value={`${projectName}`}
                readOnly
                disabled
                className="mt-1 bg-gray-50"
              />
            </div>
            <div>
              <Label htmlFor="confirmation">
                Please type <span className="font-semibold">"I understand"</span> to confirm
              </Label>
              <Input
                id="confirmation"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Type here..."
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setDeleteConfirmation('')
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteConfirmation !== 'I understand' || deleting}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}