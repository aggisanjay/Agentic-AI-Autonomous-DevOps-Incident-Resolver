const serviceNames = ['api-gateway', 'auth-service', 'payment-service', 'user-service', 'notification-service', 'order-service'];

const logTemplates = {
  error: [
    'ERROR: Connection refused to database cluster primary node',
    'ERROR: OutOfMemoryError — heap space exhausted',
    'ERROR: Request timeout after 30000ms — upstream unresponsive',
    'ERROR: SSL handshake failed — certificate expired',
    'ERROR: Unhandled promise rejection — null pointer in handler',
    'ERROR: Circuit breaker OPEN — too many failures in 60s window',
    'ERROR: Disk I/O latency spike — write queue full',
    'ERROR: DNS resolution failed for internal service endpoint',
  ],
  warn: [
    'WARN: Connection pool nearing capacity (85/100)',
    'WARN: Response time degraded — p99 > 2000ms',
    'WARN: Memory usage above 80% threshold',
    'WARN: Rate limiter triggered — 429 responses increasing',
    'WARN: Stale cache entries detected — TTL misconfiguration',
    'WARN: Goroutine/thread count unusually high',
  ],
  info: [
    'INFO: Health check passed — all dependencies OK',
    'INFO: Deployment v2.14.3 rolled out successfully',
    'INFO: Auto-scaling triggered — adding 2 replicas',
    'INFO: Cache hit ratio stable at 94%',
    'INFO: Garbage collection completed in 45ms',
  ],
};

function generateFakeLogs(service, count = 20) {
  if (!service) {
    service = serviceNames[Math.floor(Math.random() * serviceNames.length)];
  }

  const logs = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const rand = Math.random();
    let level, templates;

    if (rand < 0.4) {
      level = 'error';
      templates = logTemplates.error;
    } else if (rand < 0.7) {
      level = 'warn';
      templates = logTemplates.warn;
    } else {
      level = 'info';
      templates = logTemplates.info;
    }

    const message = templates[Math.floor(Math.random() * templates.length)];
    const timestamp = new Date(now - (count - i) * 1000 * Math.random() * 60).toISOString();

    logs.push({
      timestamp,
      level,
      service,
      message,
    });
  }

  logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return logs;
}

module.exports = { generateFakeLogs, serviceNames };
