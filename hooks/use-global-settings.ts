import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface GlobalSettings {
  admin_system_prompt?: string
  [key: string]: any
}

export function useGlobalSettings() {
  const [settings, setSettings] = useState<GlobalSettings>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error } = await supabase
          .from('global_settings')
          .select('*')

        if (error) throw error

        // Convert array of settings to key-value object
        const settingsObject = (data || []).reduce((acc, setting) => {
          acc[setting.key] = setting.value
          return acc
        }, {} as GlobalSettings)

        setSettings(settingsObject)
      } catch (err: any) {
        console.error('Error loading global settings:', err)
        setError(err.message || 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  const updateSetting = async (key: string, value: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('global_settings')
        .upsert({
          key,
          value,
          updated_by: user.id
        }, {
          onConflict: 'key'
        })

      if (error) throw error

      setSettings(prev => ({
        ...prev,
        [key]: value
      }))

      return { error: null }
    } catch (err: any) {
      console.error('Error updating setting:', err)
      return { error: err.message || 'Failed to update setting' }
    }
  }

  return {
    settings,
    loading,
    error,
    updateSetting,
    adminPrompt: settings.admin_system_prompt || ''
  }
}