const Redis = require('ioredis');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
};

// Enable TLS for cloud Redis (Upstash, etc.)
if (process.env.REDIS_PASSWORD) {
  redisConfig.password = process.env.REDIS_PASSWORD;
}
if (process.env.REDIS_TLS === 'true' || (process.env.REDIS_HOST && !process.env.REDIS_HOST.includes('localhost') && !process.env.REDIS_HOST.includes('127.0.0.1'))) {
  redisConfig.tls = {};
}

const redis = new Redis(redisConfig);

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('❌ Redis error:', err.message));

module.exports = redis;
