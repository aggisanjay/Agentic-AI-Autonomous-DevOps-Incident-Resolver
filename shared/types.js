// Incident Statuses
const IncidentStatus = {
  CREATED: 'created',
  INVESTIGATING: 'investigating',
  IDENTIFIED: 'identified',
  MITIGATING: 'mitigating',
  RESOLVED: 'resolved',
  FAILED: 'failed',
};

// Severity Levels
const Severity = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

// Tool Names
const ToolName = {
  CHECK_LOGS: 'check_logs',
  CHECK_METRICS: 'check_metrics',
  RESTART_SERVICE: 'restart_service',
  SCALE_PODS: 'scale_pods',
  RUN_HEALTHCHECK: 'run_healthcheck',
  RESOLVE_INCIDENT: 'resolve_incident',
};

// Socket Event Types
const SocketEvents = {
  INCIDENT_CREATED: 'incident:created',
  INCIDENT_UPDATED: 'incident:updated',
  AGENT_STEP: 'agent:step',
  AGENT_THINKING: 'agent:thinking',
  AGENT_COMPLETE: 'agent:complete',
  AGENT_ERROR: 'agent:error',
  JOIN_INCIDENT: 'join:incident',
  LEAVE_INCIDENT: 'leave:incident',
};

// Max agent steps before forced stop
const MAX_AGENT_STEPS = 15;

module.exports = {
  IncidentStatus,
  Severity,
  ToolName,
  SocketEvents,
  MAX_AGENT_STEPS,
};
