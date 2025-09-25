import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'

interface RequestMetrics {
  endpoint: string
  method: string
  userId?: string
  projectId?: string
  agentId?: string
  responseTimeMs: number
  statusCode: number
  errorMessage?: string
  requestSizeBytes: number
  responseSizeBytes: number
  ipAddress?: string
  userAgent?: string
}

interface SystemMetrics {
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
  dbConnectionsTotal?: number
  memoryUsageMb?: number
  storageUsedGb?: number
  chunkCountTotal?: number
}

export class MetricsTracker {
  private static requestStartTimes = new Map<string, number>()
  private static activeRequests = new Set<string>()
  private static recentRequests: RequestMetrics[] = []
  private static lastAggregation = Date.now()

  /**
   * Start tracking a request
   */
  static startRequest(requestId: string): void {
    this.requestStartTimes.set(requestId, Date.now())
    this.activeRequests.add(requestId)
  }

  /**
   * End tracking a request and log metrics
   */
  static async endRequest(
    requestId: string,
    metrics: Omit<RequestMetrics, 'responseTimeMs'>
  ): Promise<void> {
    const startTime = this.requestStartTimes.get(requestId)
    if (!startTime) return

    const responseTimeMs = Date.now() - startTime
    this.requestStartTimes.delete(requestId)
    this.activeRequests.delete(requestId)

    const fullMetrics: RequestMetrics = {
      ...metrics,
      responseTimeMs
    }

    // Store in memory for aggregation
    this.recentRequests.push(fullMetrics)

    // Log to database
    await this.logRequest(fullMetrics)

    // Check if we should aggregate (every 5 minutes)
    if (Date.now() - this.lastAggregation > 5 * 60 * 1000) {
      await this.aggregateMetrics()
      this.lastAggregation = Date.now()
    }
  }

  /**
   * Log a single request to the database
   */
  private static async logRequest(metrics: RequestMetrics): Promise<void> {
    const supabase = createServiceClient()

    try {
      const { error } = await supabase
        .from('api_request_logs')
        .insert({
          endpoint: metrics.endpoint,
          method: metrics.method,
          user_id: metrics.userId,
          project_id: metrics.projectId,
          agent_id: metrics.agentId,
          response_time_ms: metrics.responseTimeMs,
          status_code: metrics.statusCode,
          error_message: metrics.errorMessage,
          request_size_bytes: metrics.requestSizeBytes,
          response_size_bytes: metrics.responseSizeBytes,
          ip_address: metrics.ipAddress,
          user_agent: metrics.userAgent,
          timestamp: new Date().toISOString()
        })

      if (error) {
        console.error('[MetricsTracker] Failed to log request:', error)
      }
    } catch (error) {
      console.error('[MetricsTracker] Error logging request:', error)
    }
  }

  /**
   * Aggregate metrics and store in system_metrics table
   */
  static async aggregateMetrics(): Promise<void> {
    if (this.recentRequests.length === 0) return

    const supabase = createServiceClient()

    try {
      // Calculate aggregated metrics
      const metrics = this.calculateAggregatedMetrics()

      // Get additional system stats
      const systemStats = await this.getSystemStats()

      // Store aggregated metrics
      const { error } = await supabase
        .from('system_metrics')
        .insert({
          total_requests: metrics.totalRequests,
          unique_users: metrics.uniqueUsers,
          api_calls_per_min: metrics.apiCallsPerMin,
          peak_concurrent_users: metrics.peakConcurrentUsers,
          avg_response_time_ms: metrics.avgResponseTimeMs,
          p95_response_time_ms: metrics.p95ResponseTimeMs,
          p99_response_time_ms: metrics.p99ResponseTimeMs,
          timeout_count: metrics.timeoutCount,
          error_rate: metrics.errorRate,
          chunk_count_total: systemStats.chunkCount,
          storage_used_gb: systemStats.storageGb,
          db_connections_active: this.activeRequests.size
        })

      if (error) {
        console.error('[MetricsTracker] Failed to store aggregated metrics:', error)
      }

      // Clear recent requests after aggregation
      this.recentRequests = []

      // Check scaling thresholds
      await this.checkScalingThresholds(metrics, systemStats)
    } catch (error) {
      console.error('[MetricsTracker] Error aggregating metrics:', error)
    }
  }

  /**
   * Calculate aggregated metrics from recent requests
   */
  private static calculateAggregatedMetrics(): SystemMetrics {
    const requests = this.recentRequests
    const responseTimes = requests.map(r => r.responseTimeMs).sort((a, b) => a - b)
    const uniqueUsers = new Set(requests.map(r => r.userId).filter(Boolean))
    const errors = requests.filter(r => r.statusCode >= 400)
    const timeouts = requests.filter(r => r.responseTimeMs > 30000)

    // Calculate percentiles
    const p95Index = Math.floor(responseTimes.length * 0.95)
    const p99Index = Math.floor(responseTimes.length * 0.99)

    return {
      totalRequests: requests.length,
      uniqueUsers: uniqueUsers.size,
      apiCallsPerMin: requests.length / 5, // Since we aggregate every 5 minutes
      peakConcurrentUsers: Math.max(...Array.from({ length: 60 }, (_, i) => {
        const minute = Date.now() - (i * 60000)
        return requests.filter(r => {
          const reqTime = Date.now() - r.responseTimeMs
          return reqTime >= minute && reqTime < minute + 60000
        }).length
      })),
      avgResponseTimeMs: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0,
      p95ResponseTimeMs: responseTimes[p95Index] || 0,
      p99ResponseTimeMs: responseTimes[p99Index] || 0,
      timeoutCount: timeouts.length,
      errorRate: (errors.length / requests.length) * 100 || 0
    }
  }

  /**
   * Get system statistics from database
   */
  private static async getSystemStats(): Promise<{
    chunkCount: number
    storageGb: number
  }> {
    const supabase = createServiceClient()

    try {
      // Get chunk count
      const { count: chunkCount } = await supabase
        .from('source_chunks')
        .select('*', { count: 'exact', head: true })

      // Get storage usage
      const { data: sources } = await supabase
        .from('sources')
        .select('size_kb')

      const totalKb = sources?.reduce((sum, s) => sum + (s.size_kb || 0), 0) || 0
      const storageGb = totalKb / 1024 / 1024

      return {
        chunkCount: chunkCount || 0,
        storageGb
      }
    } catch (error) {
      console.error('[MetricsTracker] Error getting system stats:', error)
      return { chunkCount: 0, storageGb: 0 }
    }
  }

  /**
   * Check if any scaling thresholds are exceeded
   */
  private static async checkScalingThresholds(
    metrics: SystemMetrics,
    systemStats: { chunkCount: number; storageGb: number }
  ): Promise<void> {
    const supabase = createServiceClient()
    const alerts = []

    // Check response time threshold
    if (metrics.p95ResponseTimeMs > 2000) {
      alerts.push({
        alert_type: 'slow_response',
        severity: 'critical',
        metric_name: 'p95_response_time_ms',
        current_value: metrics.p95ResponseTimeMs,
        threshold_value: 2000,
        recommendation: 'URGENT: Enable caching immediately. Response times are critically slow.'
      })
    } else if (metrics.p95ResponseTimeMs > 500) {
      alerts.push({
        alert_type: 'slow_response',
        severity: 'warning',
        metric_name: 'p95_response_time_ms',
        current_value: metrics.p95ResponseTimeMs,
        threshold_value: 500,
        recommendation: 'Response times degrading. Consider adding Redis cache and optimizing queries.'
      })
    }

    // Check error rate threshold
    if (metrics.errorRate > 5) {
      alerts.push({
        alert_type: 'high_error_rate',
        severity: 'critical',
        metric_name: 'error_rate',
        current_value: metrics.errorRate,
        threshold_value: 5,
        recommendation: 'High error rate detected. Check logs and consider scaling resources.'
      })
    }

    // Check concurrent users
    if (metrics.peakConcurrentUsers > 100) {
      alerts.push({
        alert_type: 'high_traffic',
        severity: metrics.peakConcurrentUsers > 500 ? 'critical' : 'warning',
        metric_name: 'peak_concurrent_users',
        current_value: metrics.peakConcurrentUsers,
        threshold_value: 100,
        recommendation: metrics.peakConcurrentUsers > 500
          ? 'URGENT: Scale horizontally NOW. Add more servers and enable load balancing.'
          : 'Traffic increasing. Prepare to scale horizontally if trend continues.'
      })
    }

    // Check chunk count (database size)
    if (systemStats.chunkCount > 1000000) {
      alerts.push({
        alert_type: 'database_size',
        severity: systemStats.chunkCount > 10000000 ? 'critical' : 'warning',
        metric_name: 'chunk_count',
        current_value: systemStats.chunkCount,
        threshold_value: 1000000,
        recommendation: 'Database growing large. Consider partitioning and moving to dedicated vector database.'
      })
    }

    // Insert alerts
    if (alerts.length > 0) {
      const { error } = await supabase
        .from('scaling_alerts')
        .insert(alerts)

      if (error) {
        console.error('[MetricsTracker] Failed to create scaling alerts:', error)
      } else {
        console.log(`[MetricsTracker] Created ${alerts.length} scaling alerts`)
      }
    }
  }

  /**
   * Get current system health
   */
  static async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical'
    metrics: SystemMetrics
    alerts: any[]
  }> {
    const supabase = createServiceClient()

    try {
      // Get latest metrics
      const { data: latestMetrics } = await supabase
        .from('system_metrics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()

      // Get unacknowledged alerts
      const { data: activeAlerts } = await supabase
        .from('scaling_alerts')
        .select('*')
        .eq('acknowledged', false)
        .order('triggered_at', { ascending: false })
        .limit(10)

      // Determine overall status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy'
      if (activeAlerts?.some(a => a.severity === 'critical')) {
        status = 'critical'
      } else if (activeAlerts?.some(a => a.severity === 'warning')) {
        status = 'warning'
      }

      return {
        status,
        metrics: latestMetrics || this.calculateAggregatedMetrics(),
        alerts: activeAlerts || []
      }
    } catch (error) {
      console.error('[MetricsTracker] Error getting system health:', error)
      return {
        status: 'warning',
        metrics: this.calculateAggregatedMetrics(),
        alerts: []
      }
    }
  }

  /**
   * Track daily resource usage for cost calculation
   */
  static async trackDailyUsage(): Promise<void> {
    const supabase = createServiceClient()
    const today = new Date().toISOString().split('T')[0]

    try {
      // Get user counts
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      const { count: activeUsers } = await supabase
        .from('api_request_logs')
        .select('user_id', { count: 'exact', head: true })
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      // Get storage stats
      const { data: sources } = await supabase
        .from('sources')
        .select('size_kb')

      const { count: filesCount } = await supabase
        .from('sources')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'file')

      const { count: chunksCount } = await supabase
        .from('source_chunks')
        .select('*', { count: 'exact', head: true })

      // Get API usage
      const { count: apiCalls } = await supabase
        .from('api_request_logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', today)

      // Calculate costs (example rates)
      const totalStorageGb = (sources?.reduce((sum, s) => sum + (s.size_kb || 0), 0) || 0) / 1024 / 1024
      const storageCost = totalStorageGb * 0.023 // $0.023/GB/month
      const computeCost = (apiCalls || 0) * 0.00001 // $0.01 per 1000 requests
      const bandwidthCost = totalStorageGb * 0.09 // $0.09/GB bandwidth

      // Upsert daily usage
      const { error } = await supabase
        .from('resource_usage_daily')
        .upsert({
          date: today,
          total_users: totalUsers || 0,
          active_users: activeUsers || 0,
          new_users: 0, // Would need to track signups
          total_storage_gb: totalStorageGb,
          files_count: filesCount || 0,
          chunks_count: chunksCount || 0,
          total_api_calls: apiCalls || 0,
          storage_cost_usd: storageCost,
          compute_cost_usd: computeCost,
          bandwidth_cost_usd: bandwidthCost,
          total_cost_usd: storageCost + computeCost + bandwidthCost
        }, {
          onConflict: 'date'
        })

      if (error) {
        console.error('[MetricsTracker] Failed to track daily usage:', error)
      }
    } catch (error) {
      console.error('[MetricsTracker] Error tracking daily usage:', error)
    }
  }
}