'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { MoreVertical, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Member {
  id: string
  email: string
  role: string
  created_at: string
}

export default function MembersSettingsPage() {
  const [project, setProject] = useState<any>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadProjectAndMembers()
  }, [])

  async function loadProjectAndMembers() {
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

        // For now, just show the owner as the only member
        setMembers([
          {
            id: user.id,
            email: user.email || '',
            role: 'Owner',
            created_at: projects[0].created_at
          }
        ])
      }
    } catch (error) {
      console.error('Error loading project:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite() {
    if (!inviteEmail) {
      toast.error('Please enter an email address')
      return
    }

    setInviting(true)
    try {
      // In a real implementation, you would send an invite email here
      toast.success(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Members</h1>

      {/* Manage Members */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Manage</h2>
            <span className="text-sm text-gray-500">{members.length} / 1</span>
          </div>
        </div>

        <div className="p-6">
          {/* Members Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium">Member since</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <span className="text-sm text-gray-900">{member.email}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="text-sm text-gray-600">{formatDate(member.created_at)}</span>
                    </td>
                    <td className="py-4">
                      <span className="text-sm text-gray-900">{member.role}</span>
                    </td>
                    <td className="py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Change role</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Invite Members */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex gap-3">
              <Input
                placeholder="Enter email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleInvite}
                disabled={inviting}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                {inviting ? 'Inviting...' : 'Invite members'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}