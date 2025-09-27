'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import {
  Plus,
  Edit2,
  Trash2,
  Shield,
  User,
  Save,
  X,
  Copy,
  Check,
  AlertTriangle,
  Sparkles
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

interface PromptTemplate {
  id: string
  name: string
  description: string
  category: string
  user_prompt: string
  is_system: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

const categories = [
  'Support',
  'Sales',
  'Education',
  'Creative',
  'Technical',
  'Healthcare',
  'Finance',
  'Other'
]

export default function PromptsAdminPage() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<PromptTemplate | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Support',
    user_prompt: ''
  })


  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/admin/prompt-templates?includeInactive=true')
      if (!response.ok) throw new Error('Failed to load templates')
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Failed to load templates:', error)
      toast({
        title: 'Error',
        description: 'Failed to load prompt templates',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const url = selectedTemplate
        ? `/api/admin/prompt-templates/${selectedTemplate.id}`
        : '/api/admin/prompt-templates'

      const method = selectedTemplate ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save template')
      }

      toast({
        title: 'Success',
        description: `Template ${selectedTemplate ? 'updated' : 'created'} successfully`
      })

      setIsDialogOpen(false)
      loadTemplates()
      resetForm()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const handleDelete = async () => {
    if (!templateToDelete) return

    try {
      const response = await fetch(`/api/admin/prompt-templates/${templateToDelete.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete template')
      }

      const result = await response.json()

      toast({
        title: 'Success',
        description: result.soft_deleted
          ? 'Template deactivated (in use by agents)'
          : 'Template deleted successfully'
      })

      setIsDeleteDialogOpen(false)
      setTemplateToDelete(null)
      loadTemplates()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const handleEdit = (template: PromptTemplate) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category || 'Support',
      user_prompt: template.user_prompt
    })
    setIsDialogOpen(true)
  }

  const handleDuplicate = (template: PromptTemplate) => {
    setSelectedTemplate(null)
    setFormData({
      name: `${template.name} (Copy)`,
      description: template.description || '',
      category: template.category || 'Support',
      user_prompt: template.user_prompt
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setSelectedTemplate(null)
    setFormData({
      name: '',
      description: '',
      category: 'Support',
      user_prompt: ''
    })
  }

  const filteredTemplates = templates.filter(template => {
    const matchesFilter = filter === 'all' ||
      (filter === 'active' && template.is_active) ||
      (filter === 'inactive' && !template.is_active) ||
      (filter === 'system' && template.is_system)

    const matchesSearch = searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesFilter && matchesSearch
  })

  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const category = template.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(template)
    return acc
  }, {} as Record<string, PromptTemplate[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Prompt Templates</h1>
        <p className="text-gray-600">
          Manage system-wide prompt templates for different AI assistant personalities and behaviors
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />

        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Templates</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={() => {
            resetForm()
            setIsDialogOpen(true)
          }}
          className="ml-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="space-y-8">
        {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
          <div key={category}>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              {category}
              <Badge variant="secondary" className="ml-2">
                {categoryTemplates.length}
              </Badge>
            </h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`relative ${!template.is_active ? 'opacity-60' : ''}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.description && (
                          <CardDescription className="mt-1">
                            {template.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {template.is_system && (
                          <Badge variant="outline" className="text-xs">
                            System
                          </Badge>
                        )}
                        {!template.is_active && (
                          <Badge variant="destructive" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <User className="h-3 w-3 text-gray-500" />
                          <span className="text-xs font-medium text-gray-500">Assistant Prompt</span>
                        </div>
                        <div className="text-xs text-gray-600 line-clamp-3 bg-gray-50 p-2 rounded">
                          {template.user_prompt}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(template)}
                        disabled={template.is_system}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicate(template)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTemplateToDelete(template)
                          setIsDeleteDialogOpen(true)
                        }}
                        disabled={template.is_system}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              Configure the assistant personality and behavior for this template
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Template Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Customer Support Agent"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Description (Optional)</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this template"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Assistant Prompt</label>
              <p className="text-sm text-gray-600">
                This prompt defines the assistant's personality and behavior.
              </p>
              <Textarea
                value={formData.user_prompt}
                onChange={(e) => setFormData({ ...formData, user_prompt: e.target.value })}
                placeholder="Enter the assistant prompt..."
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              {selectedTemplate ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Confirm Delete
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"?
              {templateToDelete?.is_system && " This is a system template and cannot be deleted."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={templateToDelete?.is_system}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}