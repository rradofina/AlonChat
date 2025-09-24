'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function UsagePage() {
  const [agents, setAgents] = useState<any[]>([])
  const [selectedAgent, setSelectedAgent] = useState('all')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadAgents()
  }, [])

  async function loadAgents() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get user's projects first
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id)

    if (!projects || projects.length === 0) {
      setLoading(false)
      return
    }

    // Get agents from user's projects
    const projectIds = projects.map(p => p.id)
    const { data } = await supabase
      .from('agents')
      .select('*')
      .in('project_id', projectIds)

    if (data) {
      setAgents(data)
    }
    setLoading(false)
  }

  // Mock data for the chart
  const chartData = [
    { date: 'Sep 1', value: 0 },
    { date: 'Sep 3', value: 0 },
    { date: 'Sep 5', value: 0 },
    { date: 'Sep 7', value: 0 },
    { date: 'Sep 9', value: 0 },
    { date: 'Sep 11', value: 3 },
    { date: 'Sep 13', value: 0 },
    { date: 'Sep 15', value: 0 },
    { date: 'Sep 17', value: 0 },
    { date: 'Sep 19', value: 0 },
    { date: 'Sep 21', value: 0 },
    { date: 'Sep 23', value: 4 },
  ]

  const maxValue = Math.max(...chartData.map(d => d.value), 1)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Usage</h1>
        <div className="flex items-center gap-3">
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-[180px] bg-white border-gray-300 hover:bg-gray-50">
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all" className="hover:bg-gray-50">
                <div className="flex items-center justify-between w-full">
                  <span>All agents</span>
                  {selectedAgent === 'all' && (
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </SelectItem>
              {agents.length > 0 && (
                <SelectItem value={agents[0]?.id || 'starbucks'} className="hover:bg-gray-50">
                  <div className="flex items-center justify-between w-full">
                    <span>{agents[0]?.name || 'starbucks.ph'}</span>
                    {selectedAgent === (agents[0]?.id || 'starbucks') && (
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </SelectItem>
              )}
              <SelectItem value="deleted" className="hover:bg-gray-50">
                <div className="flex items-center justify-between w-full">
                  <span>Deleted agents</span>
                  {selectedAgent === 'deleted' && (
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <DateRangePicker className="w-[260px]" />
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Credits Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-4xl font-bold text-gray-900">7</div>
              <div className="text-sm text-gray-500 mt-1">/ 100 ⓘ</div>
              <div className="text-sm text-gray-500 mt-2">Credits used</div>
            </div>
            <svg className="w-16 h-16" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="#e5e7eb"
                strokeWidth="10"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="#3b82f6"
                strokeWidth="10"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 45 * 0.07} ${2 * Math.PI * 45}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
          </div>
        </div>

        {/* Agents Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-4xl font-bold text-gray-900">1</div>
              <div className="text-sm text-gray-500 mt-1">/ 1</div>
              <div className="text-sm text-gray-500 mt-2">Agents used</div>
            </div>
            <svg className="w-16 h-16" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="#e5e7eb"
                strokeWidth="10"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="#3b82f6"
                strokeWidth="10"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 45} ${0}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Usage History Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Usage history</h2>
        <div className="relative h-64">
          <div className="absolute inset-0 flex items-end justify-between gap-2">
            {chartData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center justify-end">
                <div
                  className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                  style={{
                    height: data.value > 0 ? `${(data.value / maxValue) * 100}%` : '2px',
                    minHeight: '2px'
                  }}
                />
                <span className="text-xs text-gray-500 mt-2">{data.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Credits Used Per Agent */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Credits used per agent</h2>
        <div className="flex items-center justify-between">
          {/* Pie Chart */}
          <div className="relative w-64 h-64">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Deleted agents slice */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#8b5cf6"
                strokeWidth="80"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 40 * 0.43} ${2 * Math.PI * 40}`}
              />
              {/* Active agent slice */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#3b82f6"
                strokeWidth="80"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 40 * 0.57} ${2 * Math.PI * 40}`}
                strokeDashoffset={`${-2 * Math.PI * 40 * 0.43}`}
              />
            </svg>
          </div>

          {/* Legend */}
          <div className="space-y-3">
            {agents.map(agent => (
              <div key={agent.id} className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-sm text-gray-700">{agent.name}</span>
                </div>
                <span className="text-sm text-gray-900 font-medium">4</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-700">Deleted agents</span>
              </div>
              <span className="text-sm text-gray-900 font-medium">3</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}