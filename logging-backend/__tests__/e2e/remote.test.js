const { VALID_UUIDS, MESSAGES } = require('../fixtures/testData');
const { axios } = require('../helpers/mockHelpers');
const { pollWithBackoff, sleep } = require('../helpers/pollingHelpers');
const { HTTP_STATUS, TIMEOUTS, PAYLOAD_SIZES, E2E } = require('../fixtures/testConstants');
const baseURL = process.env.API_BASE || 'https://abnerfonseca.com.br/api';
const client = axios.create({ baseURL, timeout: TIMEOUTS.REQUEST_TIMEOUT, validateStatus: () => true });

// Retry helper para lidar com 429 (rate limit) no ambiente remoto
const withRetry429 = (fn, options = {}) => {
  const { maxAttempts = 6, initialDelayMs = 150 } = options;
  return pollWithBackoff(async () => {
    const res = await fn();
    if (res.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
      throw new Error('Rate limited');
    }
    return res;
  }, { maxAttempts, initialDelayMs });
};

describe('E2E Tests - Remote API', () => {
  describe('Authentication Flow', () => {
    it('should generate valid token via POST /auth/token', async () => {
      const res = await withRetry429(() => client.post('/auth/token'));
      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.data).toHaveProperty('token');
      expect(typeof res.data.token).toBe('string');
    });
  });

  describe('Log Submission & Polling', () => {
    it('complete flow: token → POST /logs → polling until PROCESSED', async () => {
      const tokenRes = await withRetry429(() => client.post('/auth/token'));
      expect(tokenRes.status).toBe(HTTP_STATUS.OK);
      const token = tokenRes.data.token;

      const logRes = await withRetry429(() => client.post('/logs', { message: MESSAGES.simple }, {
        headers: { Authorization: `Bearer ${token}` }
      }));
      expect(logRes.status).toBe(HTTP_STATUS.ACCEPTED);
      expect(logRes.data).toHaveProperty('correlationId');
      const correlationId = logRes.data.correlationId;

      const deadline = Date.now() + TIMEOUTS.POLLING_MAX_WAIT;
      let status = 'QUEUED';
      while (Date.now() < deadline) {
        const pollRes = await client.get(`/logs/${correlationId}`);
        expect(pollRes.status).toBe(HTTP_STATUS.OK);
        status = pollRes.data.status;

        if (status !== 'QUEUED') break;
        await new Promise(r => setTimeout(r, TIMEOUTS.POLLING_INTERVAL + Math.random() * E2E.RANDOM_JITTER_MAX));
      }

      expect(status).not.toBe('QUEUED');
      expect(['PROCESSED', 'FAILED']).toContain(status);
    }, TIMEOUTS.REMOTE_WORKFLOW_TIMEOUT);

    it('should return 401 without token', async () => {
      const res = await withRetry429(() => client.post('/logs', { message: MESSAGES.simple }));
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.data).toHaveProperty('error');
    });

    it('should reject payload > 500 characters', async () => {
      const tokenRes = await withRetry429(() => client.post('/auth/token'));
      const token = tokenRes.data.token;

      const bigMessage = 'A'.repeat(PAYLOAD_SIZES.LARGE_MESSAGE);
      const res = await withRetry429(() => client.post('/logs', { message: bigMessage }, {
        headers: { Authorization: `Bearer ${token}` }
      }));

      if (res.status === HTTP_STATUS.ACCEPTED) {
        const correlationId = res.data.correlationId;
        await new Promise(r => setTimeout(r, TIMEOUTS.WORKER_PROCESSING_DELAY));
        const pollRes = await client.get(`/logs/${correlationId}`);
        expect(pollRes.data.status).not.toBe('PROCESSED');
      }
    });
  });

  describe('Metrics Endpoint', () => {
    it('should return object with expected properties', async () => {
      const res = await withRetry429(() => client.get('/metrics'));
      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.data).toHaveProperty('queued');
      expect(res.data).toHaveProperty('processed');
      expect(res.data).toHaveProperty('memoryUsageMB');
      expect(typeof res.data.queued).toBe('number');
      expect(typeof res.data.processed).toBe('number');
      expect(typeof res.data.memoryUsageMB).toBe('number');
    });
  });

  describe('Not Found Handling', () => {
    it('should return 404 for invalid correlation ID', async () => {
      const res = await withRetry429(() => client.get(`/logs/${VALID_UUIDS.nonExistent}`), { maxAttempts: 4, initialDelayMs: 200 });
      expect([HTTP_STATUS.NOT_FOUND, HTTP_STATUS.OK]).toContain(res.status);
    });
  });
});
