const {request} = require('../helpers/mockHelpers');
const app = require('../../index');

const createLog = async (message = 'test log', token = 'valid.token') => {
  const response = await request(app)
    .post('/logs')
    .set('Authorization', `Bearer ${token}`)
    .send({ message });

  return response.body.correlationId;
};

const waitForLogProcessing = async (correlationId, maxAttempts = 10, intervalMs = 500) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await request(app).get(`/logs/${correlationId}`);

    if (response.body.status !== 'QUEUED') {
      return response.body;
    }

    if (attempt < maxAttempts) {
      await sleep(intervalMs);
    }
  }

  throw new Error(`Log ${correlationId} still QUEUED after ${maxAttempts} attempts`);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const generateToken = async () => {
  const response = await request(app).post('/auth/token');
  return response.body.token;
};

const getMetrics = async () => {
  const response = await request(app).get('/metrics');
  return response.body;
};

const expectErrorResponse = (response, expectedStatus) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('error');
  expect(typeof response.body.error).toBe('string');
};

module.exports = {
  createLog,
  waitForLogProcessing,
  sleep,
  generateToken,
  getMetrics,
  expectErrorResponse
};
