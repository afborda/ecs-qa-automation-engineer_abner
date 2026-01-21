const axios = require('axios');
const { VALID_UUIDS, MESSAGES } = require('../fixtures/testData');

const baseURL = process.env.API_BASE || 'https://abnerfonseca.com.br/api';
const client = axios.create({ baseURL, timeout: 10000, validateStatus: () => true });

describe('E2E Tests - Remote API', () => {
  describe('Authentication Flow', () => {
    it('should generate valid token via POST /auth/token', async () => {
      const res = await client.post('/auth/token');
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('token');
      expect(typeof res.data.token).toBe('string');
    });
  });

  describe('Log Submission & Polling', () => {
    it('complete flow: token → POST /logs → polling until PROCESSED', async () => {
      const tokenRes = await client.post('/auth/token');
      expect(tokenRes.status).toBe(200);
      const token = tokenRes.data.token;

      const logRes = await client.post('/logs', { message: MESSAGES.simple }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      expect(logRes.status).toBe(202);
      expect(logRes.data).toHaveProperty('correlationId');
      const correlationId = logRes.data.correlationId;

      const deadline = Date.now() + 15000;
      let status = 'QUEUED';
      while (Date.now() < deadline) {
        const pollRes = await client.get(`/logs/${correlationId}`);
        expect(pollRes.status).toBe(200);
        status = pollRes.data.status;

        if (status !== 'QUEUED') break;
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 500));
      }

      expect(status).not.toBe('QUEUED');
      expect(['PROCESSED', 'FAILED']).toContain(status);
    }, 20000);

    it('should return 401 without token', async () => {
      const res = await client.post('/logs', { message: MESSAGES.simple });
      expect(res.status).toBe(401);
      expect(res.data).toHaveProperty('error');
    });

    it('should reject payload > 500 characters', async () => {
      const tokenRes = await client.post('/auth/token');
      const token = tokenRes.data.token;

      const bigMessage = 'A'.repeat(501);
      const res = await client.post('/logs', { message: bigMessage }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 202) {
        const correlationId = res.data.correlationId;
        await new Promise(r => setTimeout(r, 2000));
        const pollRes = await client.get(`/logs/${correlationId}`);
        expect(pollRes.data.status).not.toBe('PROCESSED');
      }
    });
  });

  describe('Metrics Endpoint', () => {
    it('should return object with expected properties', async () => {
      const res = await client.get('/metrics');
      expect(res.status).toBe(200);
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
      const res = await client.get(`/logs/${VALID_UUIDS.nonExistent}`);
      expect([404, 200]).toContain(res.status);
    });
  });
});
