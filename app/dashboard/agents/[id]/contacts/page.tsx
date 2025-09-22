'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Users,
  Mail,
  Phone,
  Building,
  MapPin,
  Calendar,
  MessageSquare,
  Filter,
  Search,
  Download,
  Plus,
  Star,
  Tag,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

interface Contact {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  location?: string
  status: 'new' | 'contacted' | 'qualified' | 'converted'
  source: 'chat' | 'form' | 'manual'
  tags: string[]
  first_contact: string
  last_contact: string
  message_count: number
  notes?: string
}

export default function ContactsPage() {
  const params = useParams()
  const agentId = params.id as string
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadContacts()
  }, [agentId])

  const loadContacts = async () => {
    try {
      // For now, we'll use mock data since the contacts table might not exist yet
      const mockContacts: Contact[] = [
        {
          id: '1',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@example.com',
          phone: '+1 (555) 123-4567',
          company: 'Acme Corp',
          location: 'New York, NY',
          status: 'qualified',
          source: 'chat',
          tags: ['premium', 'enterprise'],
          first_contact: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          last_contact: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          message_count: 8,
          notes: 'Interested in enterprise plan, needs demo scheduled'
        },
        {
          id: '2',
          name: 'Michael Chen',
          email: 'mchen@techstartup.com',
          company: 'TechStartup Inc',
          location: 'San Francisco, CA',
          status: 'new',
          source: 'chat',
          tags: ['startup', 'technical'],
          first_contact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          last_contact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          message_count: 3
        },
        {
          id: '3',
          name: 'Emily Rodriguez',
          email: 'emily.r@consulting.com',
          phone: '+1 (555) 987-6543',
          company: 'Business Consulting LLC',
          status: 'contacted',
          source: 'form',
          tags: ['consulting', 'small-business'],
          first_contact: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          last_contact: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          message_count: 12,
          notes: 'Requested pricing for team of 10'
        },
        {
          id: '4',
          name: 'David Kim',
          email: 'david@freelancer.dev',
          status: 'converted',
          source: 'chat',
          tags: ['freelancer', 'developer'],
          first_contact: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          last_contact: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          message_count: 15,
          notes: 'Upgraded to Pro plan, very satisfied'
        },
        {
          id: '5',
          name: 'Lisa Thompson',
          email: 'lisa.thompson@agency.com',
          phone: '+1 (555) 456-7890',
          company: 'Digital Marketing Agency',
          location: 'Austin, TX',
          status: 'new',
          source: 'chat',
          tags: ['marketing', 'agency'],
          first_contact: new Date().toISOString(),
          last_contact: new Date().toISOString(),
          message_count: 1
        }
      ]
      setContacts(mockContacts)
    } catch (error) {
      console.error('Error loading contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: Contact['status']) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800'
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800'
      case 'qualified':
        return 'bg-purple-100 text-purple-800'
      case 'converted':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSourceIcon = (source: Contact['source']) => {
    switch (source) {
      case 'chat':
        return MessageSquare
      case 'form':
        return ExternalLink
      case 'manual':
        return Plus
      default:
        return Users
    }
  }

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchQuery.toLowerCase()) || false

    const matchesStatus = selectedStatus === 'all' || contact.status === selectedStatus
    const matchesSource = selectedSource === 'all' || contact.source === selectedSource

    return matchesSearch && matchesStatus && matchesSource
  })

  const contactStats = {
    total: contacts.length,
    new: contacts.filter(c => c.status === 'new').length,
    qualified: contacts.filter(c => c.status === 'qualified').length,
    converted: contacts.filter(c => c.status === 'converted').length
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const exportContacts = () => {
    const csv = [
      ['Name', 'Email', 'Phone', 'Company', 'Status', 'Source', 'First Contact', 'Last Contact', 'Messages'],
      ...filteredContacts.map(contact => [
        contact.name,
        contact.email,
        contact.phone || '',
        contact.company || '',
        contact.status,
        contact.source,
        formatDate(contact.first_contact),
        formatDate(contact.last_contact),
        contact.message_count.toString()
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    toast.success('Contacts exported successfully')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contacts & Leads</h1>
          <p className="text-gray-600 mt-1">Manage contacts captured by your AI agent</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportContacts}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{contactStats.total}</p>
              <p className="text-sm text-gray-600">Total Contacts</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Star className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{contactStats.new}</p>
              <p className="text-sm text-gray-600">New Leads</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Tag className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{contactStats.qualified}</p>
              <p className="text-sm text-gray-600">Qualified</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Star className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{contactStats.converted}</p>
              <p className="text-sm text-gray-600">Converted</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="converted">Converted</option>
          </select>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Sources</option>
            <option value="chat">Chat</option>
            <option value="form">Form</option>
            <option value="manual">Manual</option>
          </select>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">
            Contacts ({filteredContacts.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || selectedStatus !== 'all' || selectedSource !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'Contacts will appear here when users interact with your agent'
              }
            </p>
            {!searchQuery && selectedStatus === 'all' && selectedSource === 'all' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900"
              >
                <Plus className="h-4 w-4" />
                Add Your First Contact
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredContacts.map((contact) => {
              const SourceIcon = getSourceIcon(contact.source)
              return (
                <div key={contact.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {contact.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900">{contact.name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(contact.status)}`}>
                            {contact.status}
                          </span>
                          {contact.tags.map((tag) => (
                            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </span>
                          {contact.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </span>
                          )}
                          {contact.company && (
                            <span className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {contact.company}
                            </span>
                          )}
                          {contact.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {contact.location}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <SourceIcon className="h-3 w-3" />
                            From {contact.source}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            First contact {formatDate(contact.first_contact)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {contact.message_count} messages
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {contact.notes && (
                    <div className="mt-3 px-14">
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                        📝 {contact.notes}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Contact</h3>
            <p className="text-gray-600 mb-6">
              Manual contact creation is coming soon! For now, contacts are automatically captured when users interact with your agent.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  toast.info('Manual contact creation coming soon!')
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