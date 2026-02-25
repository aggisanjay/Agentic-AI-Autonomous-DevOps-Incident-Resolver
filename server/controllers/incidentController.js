const { v4: uuidv4 } = require('uuid');
const redis = require('../redis/client');
const incidentQueue = require('../redis/queue');
const { IncidentStatus, SocketEvents } = require('../../shared/types');

const INCIDENTS_KEY = 'incidents';
const incidentKey = (id) => `incident:${id}`;
const timelineKey = (id) => `incident:${id}:timeline`;

// Create a new incident
async function createIncident(req, res) {
  try {
    const { title, description, severity, service } = req.body;

    if (!title || !severity || !service) {
      return res.status(400).json({ error: 'title, severity, and service are required' });
    }

    const id = uuidv4();
    const incident = {
      id,
      title,
      description: description || '',
      severity,
      service,
      status: IncidentStatus.CREATED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolvedAt: null,
      resolution: null,
      stepCount: 0,
    };

    // Store in Redis
    await redis.hset(incidentKey(id), incident);
    await redis.lpush(INCIDENTS_KEY, id);

    // Enqueue for agent processing
    await incidentQueue.add('process-incident', { incidentId: id }, { jobId: id });

    // Notify connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit(SocketEvents.INCIDENT_CREATED, incident);
    }

    res.status(201).json(incident);
  } catch (err) {
    console.error('Error creating incident:', err);
    res.status(500).json({ error: 'Failed to create incident' });
  }
}

// List all incidents
async function listIncidents(req, res) {
  try {
    const ids = await redis.lrange(INCIDENTS_KEY, 0, -1);
    const incidents = [];

    for (const id of ids) {
      const data = await redis.hgetall(incidentKey(id));
      if (data && data.id) {
        incidents.push(data);
      }
    }

    // Sort by createdAt descending
    incidents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(incidents);
  } catch (err) {
    console.error('Error listing incidents:', err);
    res.status(500).json({ error: 'Failed to list incidents' });
  }
}

// Get incident detail with timeline
async function getIncident(req, res) {
  try {
    const { id } = req.params;
    const data = await redis.hgetall(incidentKey(id));

    if (!data || !data.id) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Get timeline steps
    const timelineRaw = await redis.lrange(timelineKey(id), 0, -1);
    const timeline = timelineRaw.map((step) => JSON.parse(step));

    res.json({ ...data, timeline });
  } catch (err) {
    console.error('Error getting incident:', err);
    res.status(500).json({ error: 'Failed to get incident' });
  }
}

module.exports = { createIncident, listIncidents, getIncident };
