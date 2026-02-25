import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { generateFakeLogs } = require('../../server/services/fakeLogs.js');
const { generateFakeMetrics } = require('../../server/services/fakeMetrics.js');

// Shared types (CJS module)
const { ToolName } = require('../../shared/types.js');

// Tool definitions for Gemini function calling
export const toolDefinitions = [
  {
    type: 'function',
    name: ToolName.CHECK_LOGS,
    description: 'Retrieve recent application logs for a specific service to diagnose issues. Returns timestamped log entries with severity levels.',
    parameters: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          description: 'The service name to check logs for (e.g., api-gateway, auth-service, payment-service)',
        },
      },
      required: ['service'],
    },
  },
  {
    type: 'function',
    name: ToolName.CHECK_METRICS,
    description: 'Get current performance metrics for a service including CPU, memory, latency, error rate, and pod status. Similar to Prometheus/Grafana data.',
    parameters: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          description: 'The service name to check metrics for',
        },
      },
      required: ['service'],
    },
  },
  {
    type: 'function',
    name: ToolName.RESTART_SERVICE,
    description: 'Perform a rolling restart of a service. Use this when a service is in a degraded state and may recover from a restart.',
    parameters: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          description: 'The service name to restart',
        },
      },
      required: ['service'],
    },
  },
  {
    type: 'function',
    name: ToolName.SCALE_PODS,
    description: 'Horizontally scale a service by adjusting the number of pod replicas. Use when a service is under heavy load.',
    parameters: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          description: 'The service name to scale',
        },
        replicas: {
          type: 'number',
          description: 'Target number of replicas (1-10)',
        },
      },
      required: ['service', 'replicas'],
    },
  },
  {
    type: 'function',
    name: ToolName.RUN_HEALTHCHECK,
    description: 'Run a health check against a service endpoint to verify if it is responding correctly.',
    parameters: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          description: 'The service name to health check',
        },
      },
      required: ['service'],
    },
  },
  {
    type: 'function',
    name: ToolName.RESOLVE_INCIDENT,
    description: 'Mark the incident as resolved with a summary of what was found and done. Call this only when you are confident the issue is mitigated.',
    parameters: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'A detailed summary of what caused the incident and what actions were taken to resolve it',
        },
      },
      required: ['summary'],
    },
  },
];

// Execute a tool call
export function executeTool(toolName, args) {
  switch (toolName) {
    case ToolName.CHECK_LOGS: {
      const logs = generateFakeLogs(args.service, 15);
      return {
        success: true,
        data: logs,
        summary: `Retrieved ${logs.length} log entries for ${args.service}. Found ${logs.filter((l) => l.level === 'error').length} errors, ${logs.filter((l) => l.level === 'warn').length} warnings.`,
      };
    }

    case ToolName.CHECK_METRICS: {
      const metrics = generateFakeMetrics(args.service);
      return {
        success: true,
        data: metrics,
        summary: `Metrics for ${args.service}: CPU ${metrics.cpu_usage_percent}%, Memory ${metrics.memory_usage_percent}%, Error rate ${metrics.error_rate_percent}%, P99 latency ${metrics.p99_latency_ms}ms, ${metrics.pod_count} pods (${metrics.pod_restarts_last_hour} restarts/hr)`,
      };
    }

    case ToolName.RESTART_SERVICE: {
      const restartTime = (1 + Math.random() * 4).toFixed(1);
      return {
        success: true,
        data: { service: args.service, restartTime: `${restartTime}s`, newPodId: `${args.service}-${Date.now().toString(36)}` },
        summary: `Successfully initiated rolling restart of ${args.service}. New pods came up in ${restartTime}s. Old pods terminated gracefully.`,
      };
    }

    case ToolName.SCALE_PODS: {
      const replicas = Math.min(Math.max(args.replicas || 3, 1), 10);
      return {
        success: true,
        data: { service: args.service, previousReplicas: Math.floor(2 + Math.random() * 2), newReplicas: replicas },
        summary: `Scaled ${args.service} to ${replicas} replicas. New pods are being scheduled and should be ready within 30 seconds.`,
      };
    }

    case ToolName.RUN_HEALTHCHECK: {
      const healthy = Math.random() > 0.3;
      return {
        success: true,
        data: {
          service: args.service,
          status: healthy ? 'healthy' : 'degraded',
          responseTime: healthy ? `${(10 + Math.random() * 50).toFixed(0)}ms` : `${(500 + Math.random() * 2000).toFixed(0)}ms`,
          checks: {
            http: healthy ? 'pass' : 'fail',
            database: healthy ? 'pass' : Math.random() > 0.5 ? 'pass' : 'fail',
            cache: 'pass',
            dependencies: healthy ? 'pass' : 'degraded',
          },
        },
        summary: healthy
          ? `${args.service} health check PASSED. All endpoints responding normally.`
          : `${args.service} health check DEGRADED. Some endpoints are slow or failing.`,
      };
    }

    case ToolName.RESOLVE_INCIDENT: {
      return {
        success: true,
        resolved: true,
        data: { summary: args.summary },
        summary: `Incident marked as RESOLVED: ${args.summary}`,
      };
    }

    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}
