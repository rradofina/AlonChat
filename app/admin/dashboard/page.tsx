'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  AlertTriangle,
  Activity,
  Database,
  DollarSign,
  Users,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Download
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

interface DashboardMetrics {
  dataIntegrity: {
    duplicateChunks: number
    missingEmbeddings: number
    qaWithExcessChunks: number
    orphanedChunks: number
    affectedAgents: number
  }
  systemHealth: {
    totalAgents: number
    trainedAgents: number
    processingAgents: number
    errorAgents: number
    avgResponseTime: number
    queueDepth: number
  }
  usage: {
    activeUsers: number
    messagestoday: number
    tokensUsedToday: number
    storageUsedGB: number
    embeddingsGenerated: number
  }
  costs: {
    dailyCost: number
    monthlyProjection: number
    costByModel: { model: string; cost: number }[]
    topSpenders: { name: string; cost: number }[]
  }
  alerts: {
    level: 'critical' | 'warning' | 'info'
    message: string
    timestamp: string
  }[]
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const supabase = createClient()

  const fetchMetrics = async () => {
    try {
      setRefreshing(true)
      const response = await fetch('/api/admin/dashboard/metrics')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      } else {
        toast.error('Failed to fetch dashboard metrics')
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
      toast.error('Error loading dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleCleanupDuplicates = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'duplicates' })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Cleaned up ${result.removed} duplicate chunks`)
        fetchMetrics()
      } else {
        toast.error('Cleanup failed')
      }
    } catch (error) {
      toast.error('Error during cleanup')
    }
  }

  const handleReprocessEmbeddings = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'embeddings' })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Reprocessing ${result.count} chunks`)
        fetchMetrics()
      } else {
        toast.error('Reprocessing failed')
      }
    } catch (error) {
      toast.error('Error starting reprocessing')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load dashboard metrics</AlertDescription>
        </Alert>
      </div>
    )
  }

  const criticalAlerts = metrics.alerts.filter(a => a.level === 'critical')
  const warningAlerts = metrics.alerts.filter(a => a.level === 'warning')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">Monitor your SaaS health and performance</p>
        </div>
        <Button
          onClick={fetchMetrics}
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="space-y-2">
          {criticalAlerts.map((alert, idx) => (
            <Alert key={idx} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Critical Issue</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Warning Alerts */}
      {warningAlerts.length > 0 && (
        <div className="space-y-2">
          {warningAlerts.map((alert, idx) => (
            <Alert key={idx} className="border-yellow-500 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="data">Data Integrity</TabsTrigger>
          <TabsTrigger value="costs">Costs & Usage</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Agents */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Active Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.systemHealth.totalAgents}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="default" className="text-xs">
                    {metrics.systemHealth.trainedAgents} trained
                  </Badge>
                  {metrics.systemHealth.errorAgents > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {metrics.systemHealth.errorAgents} errors
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Daily Cost */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Daily Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${metrics.costs.dailyCost.toFixed(2)}</div>
                <p className="text-sm text-gray-600 mt-1">
                  Projected: ${metrics.costs.monthlyProjection.toFixed(0)}/mo
                </p>
              </CardContent>
            </Card>

            {/* Active Users */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.usage.activeUsers}</div>
                <p className="text-sm text-gray-600 mt-1">
                  {metrics.usage.messagestoday} messages today
                </p>
              </CardContent>
            </Card>

            {/* Storage */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Storage Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.usage.storageUsedGB.toFixed(1)} GB</div>
                <p className="text-sm text-gray-600 mt-1">
                  {metrics.usage.embeddingsGenerated.toLocaleString()} embeddings
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common maintenance tasks</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3 flex-wrap">
              <Button
                onClick={handleCleanupDuplicates}
                variant={metrics.dataIntegrity.duplicateChunks > 0 ? 'destructive' : 'outline'}
                size="sm"
              >
                Clean Duplicates ({metrics.dataIntegrity.duplicateChunks})
              </Button>
              <Button
                onClick={handleReprocessEmbeddings}
                variant={metrics.dataIntegrity.missingEmbeddings > 0 ? 'destructive' : 'outline'}
                size="sm"
              >
                Fix Embeddings ({metrics.dataIntegrity.missingEmbeddings})
              </Button>
              <Button variant="outline" size="sm">
                Export Metrics
                <Download className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          {/* Data Integrity Issues */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Chunk Integrity</CardTitle>
                <CardDescription>Data duplication and consistency issues</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Duplicate Chunks</span>
                  <Badge variant={metrics.dataIntegrity.duplicateChunks > 0 ? 'destructive' : 'default'}>
                    {metrics.dataIntegrity.duplicateChunks}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Q&A with Excess Chunks (&gt;10)</span>
                  <Badge variant={metrics.dataIntegrity.qaWithExcessChunks > 0 ? 'destructive' : 'default'}>
                    {metrics.dataIntegrity.qaWithExcessChunks}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Orphaned Chunks</span>
                  <Badge variant={metrics.dataIntegrity.orphanedChunks > 0 ? 'destructive' : 'default'}>
                    {metrics.dataIntegrity.orphanedChunks}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Affected Agents</span>
                  <Badge variant="secondary">
                    {metrics.dataIntegrity.affectedAgents}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Embedding Coverage</CardTitle>
                <CardDescription>Vector search readiness</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Missing Embeddings</span>
                  <Badge variant={metrics.dataIntegrity.missingEmbeddings > 0 ? 'destructive' : 'default'}>
                    {metrics.dataIntegrity.missingEmbeddings}
                  </Badge>
                </div>
                <div className="mt-4">
                  <div className="text-sm text-gray-600 mb-2">Overall Coverage</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: `${((metrics.usage.embeddingsGenerated - metrics.dataIntegrity.missingEmbeddings) / metrics.usage.embeddingsGenerated * 100).toFixed(0)}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {((metrics.usage.embeddingsGenerated - metrics.dataIntegrity.missingEmbeddings) / metrics.usage.embeddingsGenerated * 100).toFixed(1)}% complete
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          {/* Cost Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cost by Model</CardTitle>
                <CardDescription>AI model usage costs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.costs.costByModel.map((item) => (
                    <div key={item.model} className="flex justify-between items-center">
                      <span className="text-sm">{item.model}</span>
                      <span className="font-medium">${item.cost.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Spenders</CardTitle>
                <CardDescription>Highest cost projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.costs.topSpenders.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="text-sm truncate">{item.name}</span>
                      <span className="font-medium">${item.cost.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          {/* System Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Processing Queue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.systemHealth.queueDepth}</div>
                <p className="text-sm text-gray-600">items pending</p>
                {metrics.systemHealth.processingAgents > 0 && (
                  <Badge className="mt-2">
                    {metrics.systemHealth.processingAgents} processing
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {metrics.systemHealth.avgResponseTime.toFixed(0)}ms
                </div>
                <p className="text-sm text-gray-600">average</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Token Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {(metrics.usage.tokensUsedToday / 1000).toFixed(1)}k
                </div>
                <p className="text-sm text-gray-600">tokens today</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}