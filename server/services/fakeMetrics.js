function generateFakeMetrics(service) {
  const isUnhealthy = Math.random() < 0.6; // 60% chance the service looks unhealthy

  const baseMetrics = {
    service,
    timestamp: new Date().toISOString(),
    cpu_usage_percent: isUnhealthy
      ? +(70 + Math.random() * 30).toFixed(1)
      : +(10 + Math.random() * 40).toFixed(1),
    memory_usage_percent: isUnhealthy
      ? +(75 + Math.random() * 25).toFixed(1)
      : +(20 + Math.random() * 40).toFixed(1),
    request_rate_per_sec: +(50 + Math.random() * 500).toFixed(0),
    error_rate_percent: isUnhealthy
      ? +(5 + Math.random() * 40).toFixed(1)
      : +(0 + Math.random() * 2).toFixed(1),
    p50_latency_ms: isUnhealthy
      ? +(200 + Math.random() * 800).toFixed(0)
      : +(10 + Math.random() * 50).toFixed(0),
    p99_latency_ms: isUnhealthy
      ? +(1000 + Math.random() * 4000).toFixed(0)
      : +(50 + Math.random() * 200).toFixed(0),
    active_connections: +(10 + Math.random() * (isUnhealthy ? 500 : 100)).toFixed(0),
    pod_count: Math.floor(2 + Math.random() * 3),
    pod_restarts_last_hour: isUnhealthy ? Math.floor(Math.random() * 15) : 0,
    uptime_seconds: Math.floor(1000 + Math.random() * 86400),
  };

  return baseMetrics;
}

module.exports = { generateFakeMetrics };
