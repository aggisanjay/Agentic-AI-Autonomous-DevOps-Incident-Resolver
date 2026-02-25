const { Queue } = require('bullmq');
const redis = require('./client');

const incidentQueue = new Queue('incident-processing', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: false,
    removeOnFail: false,
  },
});

module.exports = incidentQueue;
