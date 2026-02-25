import Redis from 'ioredis';

export default class Memory {
  constructor(incidentId, redisConnection) {
    this.incidentId = incidentId;
    this.steps = [];
    this.redis = redisConnection || new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      tls: (process.env.REDIS_HOST && !process.env.REDIS_HOST.includes('localhost') && !process.env.REDIS_HOST.includes('127.0.0.1')) ? {} : undefined,
      maxRetriesPerRequest: null,
    });
    this.timelineKey = `incident:${incidentId}:timeline`;
    this.incidentKey = `incident:${incidentId}`;
  }

  // Load previous steps from Redis (crash recovery)
  async loadFromRedis() {
    const raw = await this.redis.lrange(this.timelineKey, 0, -1);
    this.steps = raw.map((s) => JSON.parse(s));
    console.log(`📝 Loaded ${this.steps.length} steps from Redis for incident ${this.incidentId}`);
    return this.steps;
  }

  // Append a new step
  async addStep(step) {
    const entry = {
      stepNumber: this.steps.length + 1,
      action: step.action,
      input: step.input || {},
      output: step.output || '',
      reasoning: step.reasoning || '',
      timestamp: new Date().toISOString(),
    };

    this.steps.push(entry);
    await this.redis.rpush(this.timelineKey, JSON.stringify(entry));
    await this.redis.hset(this.incidentKey, 'stepCount', this.steps.length.toString());

    return entry;
  }

  // Get conversation history for AI context
  getConversationHistory() {
    return this.steps.map((s) => ({
      role: 'assistant',
      content: `Step ${s.stepNumber}: [${s.action}] ${s.reasoning}\nInput: ${JSON.stringify(s.input)}\nOutput: ${typeof s.output === 'string' ? s.output : JSON.stringify(s.output)}`,
    }));
  }

  getStepCount() {
    return this.steps.length;
  }

  getLastStep() {
    return this.steps[this.steps.length - 1] || null;
  }
}
