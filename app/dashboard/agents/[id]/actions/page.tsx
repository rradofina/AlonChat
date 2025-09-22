'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Plus,
  Zap,
  Globe,
  Mail,
  Calendar,
  Database,
  Code,
  Settings,
  Play,
  Pause,
  Edit,
  Trash2,
  ExternalLink,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'

interface AIAction {
  id: string
  name: string
  description: string
  type: 'webhook' | 'email' | 'calendar' | 'database' | 'api' | 'custom'
  enabled: boolean
  config: any
  created_at: string
  last_used: string | null
  usage_count: number
}

export default function ActionsPage() {
  const params = useParams()
  const agentId = params.id as string
  const [actions, setActions] = useState<AIAction[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadActions()
  }, [agentId])

  const loadActions = async () => {
    try {
      // For now, we'll use mock data since the actions table might not exist yet
      const mockActions: AIAction[] = [
        {
          id: '1',
          name: 'Send Welcome Email',
          description: 'Automatically send a welcome email when a user starts a conversation',
          type: 'email',
          enabled: true,
          config: {
            template: 'welcome',
            to: '{{ user.email }}',
            subject: 'Welcome to our support!'
          },
          created_at: new Date().toISOString(),
          last_used: new Date().toISOString(),
          usage_count: 42
        },
        {
          id: '2',
          name: 'Schedule Meeting',
          description: 'Allow users to schedule meetings directly through chat',
          type: 'calendar',
          enabled: false,
          config: {
            calendar_id: 'primary',
            duration: 30,
            availability: 'business_hours'
          },
          created_at: new Date().toISOString(),
          last_used: null,
          usage_count: 0
        },
        {
          id: '3',
          name: 'Capture Lead Info',
          description: 'Collect and store lead information in your CRM',
          type: 'database',
          enabled: true,
          config: {
            fields: ['name', 'email', 'company'],
            table: 'leads'
          },
          created_at: new Date().toISOString(),
          last_used: new Date().toISOString(),
          usage_count: 18
        }
      ]
      setActions(mockActions)
    } catch (error) {
      console.error('Error loading actions:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleAction = async (actionId: string, enabled: boolean) => {
    try {
      setActions(prev =>
        prev.map(action =>
          action.id === actionId ? { ...action, enabled } : action
        )
      )
      toast.success(`Action ${enabled ? 'enabled' : 'disabled'} successfully`)
    } catch (error) {
      toast.error('Failed to update action')
      console.error(error)
    }
  }

  const getActionIcon = (type: AIAction['type']) => {
    switch (type) {
      case 'webhook':
        return Globe
      case 'email':
        return Mail
      case 'calendar':
        return Calendar
      case 'database':
        return Database
      case 'api':
        return Code
      default:
        return Zap
    }
  }

  const getActionColor = (type: AIAction['type']) => {
    switch (type) {
      case 'webhook':
        return 'bg-blue-100 text-blue-600'
      case 'email':
        return 'bg-green-100 text-green-600'
      case 'calendar':
        return 'bg-purple-100 text-purple-600'
      case 'database':
        return 'bg-orange-100 text-orange-600'
      case 'api':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-indigo-100 text-indigo-600'
    }
  }

  const actionTemplates = [
    {
      name: 'Send Email',
      description: 'Send automated emails based on user interactions',
      type: 'email' as const,
      icon: Mail,
      color: 'bg-green-100 text-green-600'
    },
    {
      name: 'Schedule Meeting',
      description: 'Allow users to book meetings through your calendar',
      type: 'calendar' as const,
      icon: Calendar,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      name: 'Webhook Integration',
      description: 'Send data to external services via HTTP requests',
      type: 'webhook' as const,
      icon: Globe,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      name: 'Database Action',
      description: 'Store or retrieve data from your database',
      type: 'database' as const,
      icon: Database,
      color: 'bg-orange-100 text-orange-600'
    },
    {
      name: 'Custom API',
      description: 'Connect to any REST API endpoint',
      type: 'api' as const,
      icon: Code,
      color: 'bg-gray-100 text-gray-600'
    },
    {
      name: 'Custom Action',
      description: 'Build a custom action with your own logic',
      type: 'custom' as const,
      icon: Zap,
      color: 'bg-indigo-100 text-indigo-600'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Actions</h1>
          <p className="text-gray-600 mt-1">Configure automated actions and integrations for your agent</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900"
        >
          <Plus className="h-4 w-4" />
          Create Action
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Active Actions */}
          {actions.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Your Actions</h2>
                <p className="text-sm text-gray-600 mt-1">Manage your configured AI actions</p>
              </div>
              <div className="divide-y divide-gray-200">
                {actions.map((action) => {
                  const Icon = getActionIcon(action.type)
                  return (
                    <div key={action.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getActionColor(action.type)}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{action.name}</h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                action.enabled
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {action.enabled ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>Used {action.usage_count} times</span>
                              {action.last_used && (
                                <span>Last used {new Date(action.last_used).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleAction(action.id, !action.enabled)}
                            className={`p-2 rounded-lg ${
                              action.enabled
                                ? 'text-orange-600 hover:bg-orange-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={action.enabled ? 'Disable action' : 'Enable action'}
                          >
                            {action.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </button>
                          <button className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                            <Settings className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action Templates */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Create New Action</h2>
              <p className="text-sm text-gray-600 mt-1">Choose from pre-built templates or create custom actions</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {actionTemplates.map((template) => {
                  const Icon = template.icon
                  return (
                    <button
                      key={template.name}
                      className="text-left p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 group"
                      onClick={() => setShowCreateModal(true)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${template.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{template.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Documentation */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">What are AI Actions?</h2>
            <div className="prose text-sm text-gray-600">
              <p className="mb-4">
                AI Actions allow your agent to perform automated tasks and integrate with external services.
                When triggered by specific events or user interactions, these actions can:
              </p>
              <ul className="list-disc ml-6 space-y-1 mb-4">
                <li>Send emails or notifications</li>
                <li>Schedule appointments or meetings</li>
                <li>Store data in databases or CRMs</li>
                <li>Call external APIs and webhooks</li>
                <li>Trigger workflows in other applications</li>
              </ul>
              <div className="flex items-center gap-2 pt-2">
                <ExternalLink className="h-4 w-4" />
                <a href="#" className="text-blue-600 hover:text-blue-800 text-sm">
                  Learn more about AI Actions in our documentation
                </a>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {actions.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Zap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No actions configured</h3>
              <p className="text-gray-600 mb-6">
                Get started by creating your first AI action to automate tasks and integrate with external services
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900"
              >
                <Plus className="h-4 w-4" />
                Create Your First Action
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Action Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Action</h3>
            <p className="text-gray-600 mb-6">
              This feature is coming soon! You'll be able to create custom AI actions to automate tasks and integrate with external services.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  toast.info('Action creation coming soon!')
                }}
                className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900"
              >
                Get Notified
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}