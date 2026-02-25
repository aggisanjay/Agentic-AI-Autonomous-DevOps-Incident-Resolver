import 'dotenv/config';
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import Memory from './agent/memory.js';
import Notifier from './agent/notifier.js';
import { analyzeAndResolve } from './agent/planner.js';
import { executeTool } from './agent/tools.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { IncidentStatus } = require('../shared/types.js');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  tls: (process.env.REDIS_HOST && !process.env.REDIS_HOST.includes('localhost') && !process.env.REDIS_HOST.includes('127.0.0.1')) ? {} : undefined,
  maxRetriesPerRequest: null,
});

const notifier = new Notifier();
notifier.connect();

const incidentKey = (id) => `incident:${id}`;

async function updateIncidentStatus(incidentId, status, extra = {}) {
  const updates = { status, updatedAt: new Date().toISOString(), ...extra };
  await redis.hset(incidentKey(incidentId), updates);
  notifier.emitIncidentUpdate(incidentId, { status, ...extra });
}

async function processIncident(job) {
  const { incidentId } = job.data;
  console.log(`\n🔍 Processing incident: ${incidentId}`);

  // Get incident data
  const incident = await redis.hgetall(incidentKey(incidentId));
  if (!incident || !incident.id) {
    throw new Error(`Incident ${incidentId} not found`);
  }

  // Initialize memory
  const memory = new Memory(incidentId, redis);
  await memory.loadFromRedis();

  // Update status to investigating
  await updateIncidentStatus(incidentId, IncidentStatus.INVESTIGATING);

  try {
    // ═══════════════════════════════════════════
    // PHASE 1: GATHER DIAGNOSTICS (no Gemini)
    // ═══════════════════════════════════════════
    console.log('\n📋 Phase 1: Gathering diagnostics...');
    notifier.emitThinking(incidentId, 'Gathering diagnostic data...');

    // 1a. Check Logs
    const logsResult = executeTool('check_logs', { service: incident.service });
    const logsStep = await memory.addStep({
      action: 'check_logs',
      input: { service: incident.service },
      output: logsResult.summary,
      reasoning: 'Collecting application logs for analysis',
    });
    notifier.emitStep(incidentId, logsStep);
    console.log(`  📋 Logs: ${logsResult.summary}`);

    await new Promise((r) => setTimeout(r, 800));

    // 1b. Check Metrics
    const metricsResult = executeTool('check_metrics', { service: incident.service });
    const metricsStep = await memory.addStep({
      action: 'check_metrics',
      input: { service: incident.service },
      output: metricsResult.summary,
      reasoning: 'Collecting service performance metrics',
    });
    notifier.emitStep(incidentId, metricsStep);
    console.log(`  📊 Metrics: ${metricsResult.summary}`);

    await new Promise((r) => setTimeout(r, 800));

    // 1c. Run Health Check
    const healthResult = executeTool('run_healthcheck', { service: incident.service });
    const healthStep = await memory.addStep({
      action: 'run_healthcheck',
      input: { service: incident.service },
      output: healthResult.summary,
      reasoning: 'Running health check on service endpoints',
    });
    notifier.emitStep(incidentId, healthStep);
    console.log(`  💚 Health: ${healthResult.summary}`);

    // Update status
    await updateIncidentStatus(incidentId, IncidentStatus.IDENTIFIED);

    // ═══════════════════════════════════════════
    // PHASE 2: AI ANALYSIS (one Gemini call)
    // ═══════════════════════════════════════════
    console.log('\n🧠 Phase 2: AI Analysis...');
    notifier.emitThinking(incidentId, 'AI analyzing all diagnostic data...');

    const diagnosticData = {
      logs: logsResult.data,
      metrics: metricsResult.data,
      healthcheck: healthResult,
    };

    const analysis = await analyzeAndResolve(incident, diagnosticData);

    const analysisStep = await memory.addStep({
      action: 'analysis',
      input: { service: incident.service },
      output: analysis.resolution_report,
      reasoning: 'AI completed full incident analysis',
    });
    notifier.emitStep(incidentId, analysisStep);
    console.log(`  🧠 Analysis complete. Recommended: ${analysis.recommended_action}`);

    // Update status
    await updateIncidentStatus(incidentId, IncidentStatus.MITIGATING);

    await new Promise((r) => setTimeout(r, 800));

    // ═══════════════════════════════════════════
    // PHASE 3: EXECUTE ACTION & RESOLVE
    // ═══════════════════════════════════════════
    console.log('\n⚡ Phase 3: Executing recommended action...');
    notifier.emitThinking(incidentId, `Executing ${analysis.recommended_action}...`);

    const actionResult = executeTool(analysis.recommended_action, analysis.action_args);
    const actionStep = await memory.addStep({
      action: analysis.recommended_action,
      input: analysis.action_args,
      output: actionResult.summary,
      reasoning: `Executing recommended action: ${analysis.recommended_action}`,
    });
    notifier.emitStep(incidentId, actionStep);
    console.log(`  ⚡ Action: ${actionResult.summary}`);

    await new Promise((r) => setTimeout(r, 500));

    // Resolve the incident
    const resolveResult = executeTool('resolve_incident', {
      summary: analysis.resolution_report,
    });

    const resolveStep = await memory.addStep({
      action: 'resolve_incident',
      input: {},
      output: 'Incident resolved',
      reasoning: 'Incident investigation complete',
    });
    notifier.emitStep(incidentId, resolveStep);

    await updateIncidentStatus(incidentId, IncidentStatus.RESOLVED, {
      resolvedAt: new Date().toISOString(),
      resolution: analysis.resolution_report,
    });

    notifier.emitComplete(incidentId, {
      status: IncidentStatus.RESOLVED,
      resolution: analysis.resolution_report,
      totalSteps: memory.getStepCount(),
    });

    console.log(`\n✅ Incident ${incidentId} RESOLVED in ${memory.getStepCount()} steps`);

  } catch (err) {
    console.error(`\n❌ Fatal error processing incident:`, err.message);
    notifier.emitError(incidentId, err.message);

    await updateIncidentStatus(incidentId, IncidentStatus.FAILED, {
      resolution: `Agent encountered an error: ${err.message}. Manual intervention required.`,
    });

    notifier.emitComplete(incidentId, {
      status: IncidentStatus.FAILED,
      resolution: `Processing failed: ${err.message}`,
      totalSteps: memory.getStepCount(),
    });
  }
}

// BullMQ Worker
const worker = new Worker('incident-processing', processIncident, {
  connection: redis,
  concurrency: 2,
  stalledInterval: 30000,
  maxStalledCount: 2,
});

worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

worker.on('stalled', (jobId) => {
  console.warn(`⚠️ Job ${jobId} stalled — will be retried`);
});

console.log('🤖 Agent worker started — listening for incidents...');
