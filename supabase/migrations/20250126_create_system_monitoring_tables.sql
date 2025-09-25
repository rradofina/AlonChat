-- System monitoring tables for tracking traffic, performance, and scaling needs

-- 1. System metrics table (5-minute aggregates)
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Traffic Metrics
  total_requests INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  api_calls_per_min DECIMAL(10,2),
  peak_concurrent_users INTEGER DEFAULT 0,

  -- Performance Metrics
  avg_response_time_ms DECIMAL(10,2),
  p95_response_time_ms DECIMAL(10,2),
  p99_response_time_ms DECIMAL(10,2),
  timeout_count INTEGER DEFAULT 0,
  error_rate DECIMAL(5,2), -- percentage

  -- Resource Usage
  db_connections_active INTEGER,
  db_connections_total INTEGER,
  memory_usage_mb DECIMAL(10,2),
  storage_used_gb DECIMAL(10,2),
  chunk_count_total BIGINT,

  -- Processing Metrics
  files_processing INTEGER DEFAULT 0,
  files_queued INTEGER DEFAULT 0,
  avg_file_process_time_s DECIMAL(10,2),
  largest_file_mb DECIMAL(10,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. API request logs for detailed tracking
CREATE TABLE IF NOT EXISTS api_request_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Request Info
  endpoint TEXT NOT NULL,
  method VARCHAR(10),
  user_id UUID,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,

  -- Performance
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,

  -- Resource Impact
  db_queries_count INTEGER,
  memory_used_mb DECIMAL(10,2),
  chunks_processed INTEGER,

  -- Request Size
  request_size_bytes BIGINT,
  response_size_bytes BIGINT,

  -- Metadata
  ip_address INET,
  user_agent TEXT,
  region VARCHAR(50)
);

-- 3. Scaling alerts table
CREATE TABLE IF NOT EXISTS scaling_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  alert_type VARCHAR(50), -- 'high_traffic', 'slow_response', 'memory_pressure', etc
  severity VARCHAR(20), -- 'warning', 'critical', 'emergency'

  -- Thresholds
  metric_name VARCHAR(100),
  current_value DECIMAL(15,2),
  threshold_value DECIMAL(15,2),

  -- Recommendations
  recommendation TEXT,
  auto_scaled BOOLEAN DEFAULT FALSE,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP WITH TIME ZONE,

  metadata JSONB DEFAULT '{}'
);

-- 4. Daily resource usage for cost tracking
CREATE TABLE IF NOT EXISTS resource_usage_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,

  -- User Metrics
  total_users INTEGER,
  active_users INTEGER,
  new_users INTEGER,

  -- Storage
  total_storage_gb DECIMAL(10,2),
  files_count BIGINT,
  chunks_count BIGINT,

  -- Processing
  files_processed INTEGER,
  total_processing_time_hours DECIMAL(10,2),

  -- API Usage
  total_api_calls BIGINT,
  unique_endpoints_called INTEGER,

  -- Costs (estimated)
  storage_cost_usd DECIMAL(10,2),
  compute_cost_usd DECIMAL(10,2),
  bandwidth_cost_usd DECIMAL(10,2),
  total_cost_usd DECIMAL(10,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_timestamp ON api_request_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_endpoint ON api_request_logs(endpoint, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_user ON api_request_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_status ON api_request_logs(status_code, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_scaling_alerts_triggered ON scaling_alerts(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_scaling_alerts_severity ON scaling_alerts(severity, acknowledged);
CREATE INDEX IF NOT EXISTS idx_resource_usage_date ON resource_usage_daily(date DESC);

-- Enable RLS
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scaling_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_usage_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies (only admins can view system metrics)
-- For now, we'll allow authenticated users to view their own data
-- In production, you'd want to restrict this to admin users only

CREATE POLICY "Authenticated users can view system metrics" ON system_metrics
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert system metrics" ON system_metrics
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own request logs" ON api_request_logs
  FOR SELECT USING (user_id = auth.uid() OR auth.uid() IS NOT NULL);

CREATE POLICY "System can insert request logs" ON api_request_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view scaling alerts" ON scaling_alerts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can manage scaling alerts" ON scaling_alerts
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view resource usage" ON resource_usage_daily
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can manage resource usage" ON resource_usage_daily
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Function to calculate current system metrics
CREATE OR REPLACE FUNCTION calculate_system_metrics()
RETURNS TABLE (
  active_users INTEGER,
  total_requests_last_5min INTEGER,
  avg_response_time DECIMAL,
  total_chunks BIGINT,
  total_storage_gb DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT user_id)::INTEGER as active_users,
    COUNT(*)::INTEGER as total_requests_last_5min,
    AVG(response_time_ms)::DECIMAL as avg_response_time,
    (SELECT COUNT(*) FROM source_chunks)::BIGINT as total_chunks,
    (SELECT SUM(size_kb) / 1024 / 1024 FROM sources)::DECIMAL as total_storage_gb
  FROM api_request_logs
  WHERE timestamp > NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Function to check scaling thresholds
CREATE OR REPLACE FUNCTION check_scaling_thresholds()
RETURNS VOID AS $$
DECLARE
  current_metrics RECORD;
BEGIN
  -- Get current metrics
  SELECT * INTO current_metrics FROM calculate_system_metrics();

  -- Check for high traffic
  IF current_metrics.active_users > 100 THEN
    INSERT INTO scaling_alerts (
      alert_type,
      severity,
      metric_name,
      current_value,
      threshold_value,
      recommendation
    ) VALUES (
      'high_traffic',
      CASE
        WHEN current_metrics.active_users > 500 THEN 'critical'
        WHEN current_metrics.active_users > 200 THEN 'warning'
        ELSE 'info'
      END,
      'active_users',
      current_metrics.active_users,
      100,
      'Consider enabling caching and horizontal scaling'
    );
  END IF;

  -- Check for slow response times
  IF current_metrics.avg_response_time > 500 THEN
    INSERT INTO scaling_alerts (
      alert_type,
      severity,
      metric_name,
      current_value,
      threshold_value,
      recommendation
    ) VALUES (
      'slow_response',
      CASE
        WHEN current_metrics.avg_response_time > 2000 THEN 'critical'
        WHEN current_metrics.avg_response_time > 1000 THEN 'warning'
        ELSE 'info'
      END,
      'avg_response_time_ms',
      current_metrics.avg_response_time,
      500,
      'Optimize database queries and consider adding Redis cache'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to aggregate metrics every 5 minutes
-- Note: This requires pg_cron extension or external scheduler
-- For now, we'll document the SQL that should be run periodically

COMMENT ON FUNCTION calculate_system_metrics IS 'Run this every 5 minutes to aggregate system metrics';
COMMENT ON FUNCTION check_scaling_thresholds IS 'Run this every 5 minutes to check for scaling alerts';