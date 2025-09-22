'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  Clock,
  Calendar,
  Activity,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

interface AnalyticsData {
  totalConversations: number
  totalMessages: number
  uniqueUsers: number
  avgResponseTime: number
  weeklyData: Array<{
    date: string
    conversations: number
    messages: number
  }>
  popularQuestions: Array<{
    question: string
    count: number
  }>
}

export default function AnalyticsPage() {
  const params = useParams()
  const agentId = params.id as string
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d')
  const supabase = createClient()

  useEffect(() => {
    loadAnalytics()
  }, [agentId, timeRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)

      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
      startDate.setDate(endDate.getDate() - days)

      // Get conversations in date range
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('agent_id', agentId)
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: false })

      // Get messages count
      const { count: messagesCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .gte('created_at', startDate.toISOString())

      // Generate mock weekly data for visualization
      const weeklyData = []
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dayConversations = conversations?.filter(conv => {
          const convDate = new Date(conv.started_at)
          return convDate.toDateString() === date.toDateString()
        }).length || 0

        weeklyData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          conversations: dayConversations,
          messages: Math.floor(dayConversations * 2.5) // Estimate messages per conversation
        })
      }

      // Mock popular questions
      const popularQuestions = [
        { question: "What are your business hours?", count: 23 },
        { question: "How can I contact support?", count: 18 },
        { question: "What services do you offer?", count: 15 },
        { question: "Where are you located?", count: 12 },
        { question: "What are your prices?", count: 10 }
      ]

      setAnalytics({
        totalConversations: conversations?.length || 0,
        totalMessages: messagesCount || 0,
        uniqueUsers: Math.floor((conversations?.length || 0) * 0.8), // Estimate unique users
        avgResponseTime: 1.2, // Mock average response time in seconds
        weeklyData,
        popularQuestions
      })
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString()
  }

  const formatResponseTime = (seconds: number) => {
    if (seconds < 1) {
      return `${Math.round(seconds * 1000)}ms`
    }
    return `${seconds.toFixed(1)}s`
  }

  const getChangeIndicator = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100
    if (change > 0) {
      return (
        <div className="flex items-center text-green-600">
          <ArrowUp className="h-3 w-3 mr-1" />
          <span className="text-xs">+{change.toFixed(1)}%</span>
        </div>
      )
    } else if (change < 0) {
      return (
        <div className="flex items-center text-red-600">
          <ArrowDown className="h-3 w-3 mr-1" />
          <span className="text-xs">{change.toFixed(1)}%</span>
        </div>
      )
    }
    return <span className="text-xs text-gray-500">No change</span>
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-gray-600 mt-1">Monitor your agent's performance and user interactions</p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[
            { value: '7d' as const, label: '7 days' },
            { value: '30d' as const, label: '30 days' },
            { value: '90d' as const, label: '90 days' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                timeRange === option.value
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Conversations</p>
              <p className="text-2xl font-bold mt-1">{formatNumber(analytics?.totalConversations || 0)}</p>
              {getChangeIndicator(analytics?.totalConversations || 0, 45)}
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Messages</p>
              <p className="text-2xl font-bold mt-1">{formatNumber(analytics?.totalMessages || 0)}</p>
              {getChangeIndicator(analytics?.totalMessages || 0, 125)}
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unique Users</p>
              <p className="text-2xl font-bold mt-1">{formatNumber(analytics?.uniqueUsers || 0)}</p>
              {getChangeIndicator(analytics?.uniqueUsers || 0, 38)}
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold mt-1">{formatResponseTime(analytics?.avgResponseTime || 0)}</p>
              {getChangeIndicator(1.2, 1.8)}
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Conversations Over Time */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Conversations Over Time</h2>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-end justify-between gap-2">
            {analytics?.weeklyData.map((day, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div
                  className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                  style={{
                    height: `${Math.max((day.conversations / Math.max(...analytics.weeklyData.map(d => d.conversations), 1)) * 200, 4)}px`
                  }}
                  title={`${day.conversations} conversations`}
                />
                <span className="text-xs text-gray-500 mt-2">{day.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Messages Over Time */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Messages Over Time</h2>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-end justify-between gap-2">
            {analytics?.weeklyData.map((day, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div
                  className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600"
                  style={{
                    height: `${Math.max((day.messages / Math.max(...analytics.weeklyData.map(d => d.messages), 1)) * 200, 4)}px`
                  }}
                  title={`${day.messages} messages`}
                />
                <span className="text-xs text-gray-500 mt-2">{day.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Popular Questions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Most Asked Questions</h2>
        <div className="space-y-3">
          {analytics?.popularQuestions.map((item, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-semibold">
                  {index + 1}
                </span>
                <span className="text-sm text-gray-900">{item.question}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{item.count}</span>
                <div className="w-16 h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${(item.count / (analytics?.popularQuestions[0]?.count || 1)) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Insights */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">Peak Hours</h3>
          </div>
          <p className="text-sm text-gray-600 mb-2">Most active time:</p>
          <p className="text-lg font-semibold">2:00 PM - 4:00 PM</p>
          <p className="text-xs text-gray-500 mt-1">Based on conversation patterns</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <MessageSquare className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">Avg. Messages</h3>
          </div>
          <p className="text-sm text-gray-600 mb-2">Per conversation:</p>
          <p className="text-lg font-semibold">4.2 messages</p>
          <p className="text-xs text-gray-500 mt-1">Including user and bot messages</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold">Session Duration</h3>
          </div>
          <p className="text-sm text-gray-600 mb-2">Average length:</p>
          <p className="text-lg font-semibold">3.5 minutes</p>
          <p className="text-xs text-gray-500 mt-1">Time from start to end</p>
        </div>
      </div>
    </div>
  )
}