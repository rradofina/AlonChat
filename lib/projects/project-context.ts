/**
 * Project Context Management
 *
 * This module helps manage the current project context across the application.
 * Since subscriptions are tied to projects (not users), we need to track
 * which project the user is currently working with.
 *
 * ARCHITECTURE NOTE:
 * - Each project has its own subscription
 * - Users can have multiple projects
 * - We need to know which project context we're in for billing/limits
 */

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

const PROJECT_COOKIE_NAME = 'current_project_id'

/**
 * Get the current project ID from cookies
 * Falls back to user's default project if not set
 */
export async function getCurrentProjectId(userId?: string): Promise<string | null> {
  try {
    // First try to get from cookie
    const cookieStore = await cookies()
    const projectIdCookie = cookieStore.get(PROJECT_COOKIE_NAME)

    if (projectIdCookie?.value) {
      // Validate that this project exists and user has access
      if (userId) {
        const isValid = await validateProjectAccess(projectIdCookie.value, userId)
        if (isValid) {
          return projectIdCookie.value
        }
      } else {
        // If no userId provided, trust the cookie
        return projectIdCookie.value
      }
    }

    // Fall back to user's default project if we have userId
    if (userId) {
      const defaultProject = await getUserDefaultProject(userId)
      if (defaultProject) {
        // Set cookie for next time
        await setCurrentProjectId(defaultProject.id)
        return defaultProject.id
      }
    }

    return null
  } catch (error) {
    console.error('Error getting current project:', error)
    return null
  }
}

/**
 * Set the current project ID in cookies
 */
export async function setCurrentProjectId(projectId: string): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.set(PROJECT_COOKIE_NAME, projectId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    })
  } catch (error) {
    console.error('Error setting current project:', error)
  }
}

/**
 * Clear the current project from cookies
 */
export async function clearCurrentProjectId(): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(PROJECT_COOKIE_NAME)
  } catch (error) {
    console.error('Error clearing current project:', error)
  }
}

/**
 * Validate that a user has access to a project
 */
async function validateProjectAccess(projectId: string, userId: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('owner_id', userId)
      .single()

    return !error && !!data
  } catch (error) {
    console.error('Error validating project access:', error)
    return false
  }
}

/**
 * Get user's default project (first created)
 * This is a fallback when no project is selected
 */
async function getUserDefaultProject(userId: string): Promise<{ id: string; name: string } | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (error || !data) {
      console.log('No default project found for user:', userId)
      return null
    }

    return data
  } catch (error) {
    console.error('Error getting user default project:', error)
    return null
  }
}

/**
 * Get all projects for a user
 * Useful for project switcher UI
 */
export async function getUserProjects(userId: string): Promise<Array<{ id: string; name: string; created_at: string }>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, created_at')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error getting user projects:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error getting user projects:', error)
    return []
  }
}

/**
 * Switch to a different project
 * Validates access and updates the cookie
 */
export async function switchProject(projectId: string, userId: string): Promise<boolean> {
  try {
    // Validate access first
    const hasAccess = await validateProjectAccess(projectId, userId)
    if (!hasAccess) {
      console.error('User does not have access to project:', projectId)
      return false
    }

    // Update the cookie
    await setCurrentProjectId(projectId)
    return true
  } catch (error) {
    console.error('Error switching project:', error)
    return false
  }
}