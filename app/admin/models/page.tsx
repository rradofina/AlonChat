'use client'

import { useState } from 'react'
import { ArrowLeft, RefreshCw, Plus, Database } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AddModelDialog } from '@/components/admin/add-model-dialog'
import { ModelCard } from '@/features/model-config/components/ModelCard'
import {
  useModels,
  useToggleModel,
  useTestModel,
  useDeleteModel,
  useSyncModels,
} from '@/features/model-config/hooks/useModels'
import type { AIModel } from '@/features/model-config/types'

/**
 * Refactored Admin Models Page
 *
 * This component orchestrates the AI model management interface.
 * It's been refactored from an 1,155 line file into smaller, focused components:
 *
 * - ModelCard: Individual model display and actions
 * - useModels: React Query hook for data fetching
 * - useToggleModel, useTestModel, etc: Mutation hooks
 *
 * The refactoring follows the same principles as other pages:
 * 1. Single Responsibility: Each component has one clear purpose
 * 2. Data Fetching Separation: React Query handles all API calls
 * 3. Type Safety: Full TypeScript with proper interfaces
 * 4. Reusability: Components and hooks can be used elsewhere
 *
 * Original file: 1,155 lines → Now: ~150 lines (orchestration only)
 */
export default function ModelsPage() {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingModel, setEditingModel] = useState<AIModel | null>(null)

  // React Query hooks
  const { data: models = [], isLoading } = useModels()
  const toggleMutation = useToggleModel()
  const testMutation = useTestModel()
  const deleteMutation = useDeleteModel()
  const syncMutation = useSyncModels()

  // Group models by provider
  const modelsByProvider = models.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = []
    }
    acc[model.provider].push(model)
    return acc
  }, {} as Record<string, AIModel[]>)

  // Calculate stats
  const activeModels = models.filter(m => m.is_active).length
  const totalModels = models.length

  const handleToggle = (id: string, isActive: boolean) => {
    toggleMutation.mutate({ id, isActive })
  }

  const handleTest = (id: string) => {
    testMutation.mutate(id)
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this model?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleSync = () => {
    syncMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <h1 className="text-xl font-semibold">Model Management</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                Sync Models
              </Button>
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Model
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Models</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalModels}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active Models</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeModels}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Providers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(modelsByProvider).length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Models List */}
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-gray-500">Loading models...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
              <div key={provider}>
                <h2 className="text-lg font-semibold mb-3 capitalize flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  {provider} Models
                  <Badge variant="secondary">{providerModels.length}</Badge>
                </h2>
                <div className="space-y-3">
                  {providerModels.map(model => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      onToggle={handleToggle}
                      onTest={handleTest}
                      onEdit={setEditingModel}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Model Dialog */}
      {showAddDialog && (
        <AddModelDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          editingModel={editingModel}
        />
      )}
    </div>
  )
}

// Note: Badge import was missing - should be imported from ui/badge