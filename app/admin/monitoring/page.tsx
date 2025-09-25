'use client'

import { useState, useEffect } from 'react'
import { Activity, AlertCircle, TrendingUp, Users, Database, Clock, Server, AlertTriangle, CheckCircle, HardDrive } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'

interface SystemMetrics {
  status: 'healthy' | 'warning' | 'critical'
  metrics: {
    totalRequests: number
    uniqueUsers: number
    apiCallsPerMin: number
    peakConcurrentUsers: number
    avgResponseTimeMs: number
    p95ResponseTimeMs: number
    p99ResponseTimeMs: number
    timeoutCount: number
    errorRate: number
    dbConnectionsActive?: number
    chunkCountTotal?: number
    storageUsedGb?: number
  }
  alerts: Array<{
    id: string
    alert_type: string
    severity: string
    metric_name: string
    current_value: number
    threshold_value: number
    recommendation: string
    triggered_at: string
    acknowledged: boolean
  }>
}

interface DailyUsage {
  date: string
  totalUsers: number
  activeUsers: number
  totalStorageGb: number
  totalApiCalls: number
  totalCostUsd: number
}

export default function MonitoringDashboard() {
  const [systemHealth, setSystemHealth] = useState<SystemMetrics | null>(null)
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch system health data
  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/admin/monitoring/health')
      if (response.ok) {
        const data = await response.json()
        setSystemHealth(data)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Error fetching system health:', error)
    }
  }

  // Fetch daily usage data
  const fetchDailyUsage = async () => {
    try {
      const response = await fetch('/api/admin/monitoring/usage')
      if (response.ok) {
        const data = await response.json()
        setDailyUsage(data.usage || [])
      }
    } catch (error) {
      console.error('Error fetching daily usage:', error)
    }
  }

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchSystemHealth(), fetchDailyUsage()])
      setIsLoading(false)
    }
    loadData()
  }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchSystemHealth()
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  // Acknowledge alert
  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/monitoring/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      })

      if (response.ok) {
        toast({
          title: 'Alert acknowledged',
          description: 'The alert has been marked as acknowledged'
        })
        fetchSystemHealth()
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error)
      toast({
        title: 'Error',
        description: 'Failed to acknowledge alert',
        variant: 'destructive'
      })
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600'
      case 'warning':
        return 'text-yellow-600'
      case 'critical':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return null
    }
  }

  // Calculate health percentage
  const getHealthPercentage = () => {
    if (!systemHealth) return 0
    const { metrics } = systemHealth

    let score = 100

    // Deduct points based on metrics
    if (metrics.avgResponseTimeMs > 500) score -= 20
    if (metrics.avgResponseTimeMs > 2000) score -= 30
    if (metrics.errorRate > 1) score -= 20
    if (metrics.errorRate > 5) score -= 30
    if (metrics.peakConcurrentUsers > 100) score -= 10
    if (metrics.peakConcurrentUsers > 500) score -= 20

    return Math.max(0, score)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading monitoring data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
            <p className="text-gray-600 mt-1">Real-time system health and scaling metrics</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              Last update: {lastUpdate.toLocaleTimeString()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSystemHealth}
            >
              Refresh Now
            </Button>
          </div>
        </div>

        {/* System Status */}
        {systemHealth && (
          <div className={`p-4 rounded-lg border-2 ${
            systemHealth.status === 'healthy' ? 'bg-green-50 border-green-200' :
            systemHealth.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(systemHealth.status)}
                <div>
                  <div className={`text-lg font-semibold ${getStatusColor(systemHealth.status)}`}>
                    System Status: {systemHealth.status.toUpperCase()}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Overall health: {getHealthPercentage()}%
                  </div>
                </div>
              </div>
              <Progress value={getHealthPercentage()} className="w-32" />
            </div>
          </div>
        )}
      </div>

      {/* Active Alerts */}
      {systemHealth?.alerts && systemHealth.alerts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Active Alerts</h2>
          <div className="space-y-3">
            {systemHealth.alerts.filter(a => !a.acknowledged).map(alert => (
              <Alert key={alert.id} className={
                alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                alert.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                'border-blue-500 bg-blue-50'
              }>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  <span>{alert.alert_type.replace('_', ' ').toUpperCase()} - {alert.severity.toUpperCase()}</span>
                  <span className="text-sm font-normal text-gray-600">
                    {new Date(alert.triggered_at).toLocaleString()}
                  </span>
                </AlertTitle>
                <AlertDescription className="mt-2">
                  <div className="space-y-2">
                    <div>
                      <strong>{alert.metric_name}:</strong> {alert.current_value} (threshold: {alert.threshold_value})
                    </div>
                    <div className="text-sm">{alert.recommendation}</div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Active Users */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{systemHealth.metrics.uniqueUsers}</div>
                  <div className="text-xs text-gray-500">Peak: {systemHealth.metrics.peakConcurrentUsers}</div>
                </div>
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <div className="mt-3">
                <div className="text-xs text-gray-600">Scaling threshold: 100 users</div>
                <Progress
                  value={(systemHealth.metrics.uniqueUsers / 100) * 100}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Response Time */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Response Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{systemHealth.metrics.avgResponseTimeMs.toFixed(0)}ms</div>
                  <div className="text-xs text-gray-500">P95: {systemHealth.metrics.p95ResponseTimeMs.toFixed(0)}ms</div>
                </div>
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
              <div className="mt-3">
                <div className="text-xs text-gray-600">Target: &lt;200ms</div>
                <Progress
                  value={Math.min(100, (200 / systemHealth.metrics.avgResponseTimeMs) * 100)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* API Calls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">API Calls/min</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{systemHealth.metrics.apiCallsPerMin.toFixed(0)}</div>
                  <div className="text-xs text-gray-500">Total: {systemHealth.metrics.totalRequests}</div>
                </div>
                <Activity className="h-8 w-8 text-gray-400" />
              </div>
              <div className="mt-3">
                <div className="text-xs text-gray-600">Error rate: {systemHealth.metrics.errorRate.toFixed(1)}%</div>
                <Progress
                  value={100 - systemHealth.metrics.errorRate}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Storage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Storage Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {systemHealth.metrics.storageUsedGb?.toFixed(2) || '0.00'} GB
                  </div>
                  <div className="text-xs text-gray-500">
                    Chunks: {(systemHealth.metrics.chunkCountTotal || 0).toLocaleString()}
                  </div>
                </div>
                <HardDrive className="h-8 w-8 text-gray-400" />
              </div>
              <div className="mt-3">
                <div className="text-xs text-gray-600">Database load</div>
                <Progress
                  value={Math.min(100, ((systemHealth.metrics.chunkCountTotal || 0) / 1000000) * 100)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scaling Recommendations */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Scaling Recommendations</CardTitle>
          <CardDescription>Actions to take based on current metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {systemHealth && (
              <>
                {/* Response Time Recommendation */}
                <div className="flex items-start gap-3">
                  <div className={`mt-1 ${
                    systemHealth.metrics.avgResponseTimeMs > 500 ? 'text-red-500' :
                    systemHealth.metrics.avgResponseTimeMs > 200 ? 'text-yellow-500' :
                    'text-green-500'
                  }`}>
                    {systemHealth.metrics.avgResponseTimeMs > 500 ? <AlertCircle className="h-5 w-5" /> :
                     systemHealth.metrics.avgResponseTimeMs > 200 ? <AlertTriangle className="h-5 w-5" /> :
                     <CheckCircle className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="font-medium">Response Time Optimization</div>
                    <div className="text-sm text-gray-600">
                      {systemHealth.metrics.avgResponseTimeMs > 500 ?
                        'Critical: Enable Redis caching immediately and optimize database queries' :
                       systemHealth.metrics.avgResponseTimeMs > 200 ?
                        'Warning: Consider adding caching layer for frequently accessed data' :
                        'Good: Response times are within acceptable range'}
                    </div>
                  </div>
                </div>

                {/* User Load Recommendation */}
                <div className="flex items-start gap-3">
                  <div className={`mt-1 ${
                    systemHealth.metrics.peakConcurrentUsers > 100 ? 'text-red-500' :
                    systemHealth.metrics.peakConcurrentUsers > 50 ? 'text-yellow-500' :
                    'text-green-500'
                  }`}>
                    {systemHealth.metrics.peakConcurrentUsers > 100 ? <AlertCircle className="h-5 w-5" /> :
                     systemHealth.metrics.peakConcurrentUsers > 50 ? <AlertTriangle className="h-5 w-5" /> :
                     <CheckCircle className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="font-medium">User Capacity</div>
                    <div className="text-sm text-gray-600">
                      {systemHealth.metrics.peakConcurrentUsers > 100 ?
                        'Critical: Add horizontal scaling and load balancing NOW' :
                       systemHealth.metrics.peakConcurrentUsers > 50 ?
                        'Warning: Prepare for horizontal scaling if growth continues' :
                        'Good: System can handle current user load'}
                    </div>
                  </div>
                </div>

                {/* Database Recommendation */}
                <div className="flex items-start gap-3">
                  <div className={`mt-1 ${
                    (systemHealth.metrics.chunkCountTotal || 0) > 1000000 ? 'text-red-500' :
                    (systemHealth.metrics.chunkCountTotal || 0) > 500000 ? 'text-yellow-500' :
                    'text-green-500'
                  }`}>
                    {(systemHealth.metrics.chunkCountTotal || 0) > 1000000 ? <AlertCircle className="h-5 w-5" /> :
                     (systemHealth.metrics.chunkCountTotal || 0) > 500000 ? <AlertTriangle className="h-5 w-5" /> :
                     <CheckCircle className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="font-medium">Database Scaling</div>
                    <div className="text-sm text-gray-600">
                      {(systemHealth.metrics.chunkCountTotal || 0) > 1000000 ?
                        'Critical: Implement database partitioning and consider vector database migration' :
                       (systemHealth.metrics.chunkCountTotal || 0) > 500000 ?
                        'Warning: Plan for database partitioning and indexing optimization' :
                        'Good: Database size is manageable'}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Daily Usage Trends */}
      {dailyUsage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Usage & Costs</CardTitle>
            <CardDescription>Last 7 days of usage data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left pb-2">Date</th>
                    <th className="text-right pb-2">Active Users</th>
                    <th className="text-right pb-2">API Calls</th>
                    <th className="text-right pb-2">Storage (GB)</th>
                    <th className="text-right pb-2">Cost (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyUsage.slice(0, 7).map(day => (
                    <tr key={day.date} className="border-b">
                      <td className="py-2">{new Date(day.date).toLocaleDateString()}</td>
                      <td className="text-right">{day.activeUsers}</td>
                      <td className="text-right">{day.totalApiCalls.toLocaleString()}</td>
                      <td className="text-right">{day.totalStorageGb.toFixed(2)}</td>
                      <td className="text-right font-medium">${day.totalCostUsd.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}