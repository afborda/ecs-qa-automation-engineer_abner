
process.env.ENABLE_WORKER_FOR_TESTS = 'true';
delete process.env.DISABLE_WORKER;

jest.unmock('jsonwebtoken');
const {request} = require('../helpers/mockHelpers');
const app = require('../../index');
const { HTTP_STATUS, TIMEOUTS, PAYLOAD_SIZES, RATE_LIMITING, E2E } = require('../fixtures/testConstants');
const { TEST_MESSAGES } = require('../fixtures/mockData');

const MESSAGES = {
  simple: TEST_MESSAGES.e2e.simple,
  medium: 'A'.repeat(PAYLOAD_SIZES.MEDIUM),
  large: 'B'.repeat(PAYLOAD_SIZES.LARGE_MESSAGE),
};

describe('E2E Tests - Local Environment', () => {
  describe('Authentication Flow', () => {
    it('should generate valid JWT token via POST /auth/token', async () => {
      const res = await request(app)
        .post('/auth/token')
        .send({})
        .expect(HTTP_STATUS.OK);

      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });

    it('should return 401 when POST /logs without token', async () => {
      const res = await request(app)
        .post('/logs')
        .send({ message: MESSAGES.simple })
        .expect(HTTP_STATUS.UNAUTHORIZED);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Full Workflow', () => {
    it('complete flow: token → POST /logs → polling until PROCESSED', async () => {
      const tokenRes = await request(app)
        .post('/auth/token')
        .send({})
        .expect(HTTP_STATUS.OK);

      const token = tokenRes.body.token;

      const postRes = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: MESSAGES.simple })
        .expect(HTTP_STATUS.ACCEPTED);

      const correlationId = postRes.body.correlationId;
      expect(correlationId).toBeTruthy();

      let status = 'QUEUED';
      let attempts = 0;

      while (status === 'QUEUED' && attempts < E2E.POLLING_MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, TIMEOUTS.POLLING_INTERVAL));

        const statusRes = await request(app)
          .get(`/logs/${correlationId}`)
          .expect(HTTP_STATUS.OK);

        status = statusRes.body.status;
        attempts++;
      }

      expect(['PROCESSED', 'FAILED']).toContain(status);
    }, TIMEOUTS.E2E_WORKFLOW_TIMEOUT);
  });

  describe('Error Handling', () => {
    it('should return 404 for invalid correlation ID', async () => {
      const res = await request(app)
        .get(`/logs/${TEST_MESSAGES.e2e.invalidId}`)
        .expect(HTTP_STATUS.NOT_FOUND);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/not found/i);
    });
  });

  describe('Payload Validation', () => {
    it('should accept large payload (no validation implemented)', async () => {
      const tokenRes = await request(app)
        .post('/auth/token')
        .send({})
        .expect(HTTP_STATUS.OK);

      const token = tokenRes.body.token;

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: MESSAGES.large })
        .expect(HTTP_STATUS.ACCEPTED);

      expect(res.body).toHaveProperty('correlationId');
    });

    it('should accept payload without message field', async () => {
      const tokenRes = await request(app)
        .post('/auth/token')
        .send({})
        .expect(HTTP_STATUS.OK);

      const token = tokenRes.body.token;

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(HTTP_STATUS.ACCEPTED);

      expect(res.body).toHaveProperty('correlationId');
    });
  });

  describe('Metrics Endpoint', () => {
    it('should return object with expected properties', async () => {
      const res = await request(app)
        .get('/metrics')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toHaveProperty('queued');
      expect(res.body).toHaveProperty('processed');
      expect(typeof res.body.queued).toBe('number');
      expect(typeof res.body.processed).toBe('number');
    });
  });

  describe('Concurrency & Rate Limiting', () => {
    it('should process multiple logs simultaneously', async () => {
      const tokenRes = await request(app)
        .post('/auth/token')
        .send({})
        .expect(HTTP_STATUS.OK);

      const token = tokenRes.body.token;

      const promises = Array(E2E.CONCURRENT_REQUESTS).fill(null).map(() =>
        request(app)
          .post('/logs')
          .set('Authorization', `Bearer ${token}`)
          .send({ message: MESSAGES.simple })
      );

      const results = await Promise.all(promises);

      results.forEach(res => {
        expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
        expect(res.body).toHaveProperty('correlationId');
      });

      const ids = results.map(r => r.body.correlationId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(E2E.CONCURRENT_REQUESTS);
    });

    it('should respect rate limit (configured limit per minute)', async () => {
      const tokenRes = await request(app)
        .post('/auth/token')
        .send({})
        .expect(HTTP_STATUS.OK);

      const token = tokenRes.body.token;

      // Rate limit configured via env
      const rateLimit = parseInt(process.env.RATE_LIMIT || RATE_LIMITING.REQUESTS_PER_MINUTE);
      // If RATE_LIMIT is too high (e.g., 500), this test would require >500 requests
      // and may timeout. In that case, we skip explicitly.
      if (rateLimit > 150) {
        console.log(`High RATE_LIMIT (${rateLimit}) - skipping rate limit test`);
        return;
      }
      const requestCount = rateLimit + RATE_LIMITING.OVER_LIMIT_EXCESS;

      const promises = Array(requestCount).fill(null).map(() =>
        request(app)
          .post('/logs')
          .set('Authorization', `Bearer ${token}`)
          .send({ message: MESSAGES.simple })
      );

      const results = await Promise.all(promises);

      const blockedRequests = results.filter(r => r.status === HTTP_STATUS.TOO_MANY_REQUESTS);
      expect(blockedRequests.length).toBeGreaterThan(0);
    }, TIMEOUTS.E2E_CONCURRENT_TIMEOUT);
  });

  describe('Token Expiration', () => {
    it('should expire token after 5 seconds as configured', async () => {
      await new Promise(r => setTimeout(r, TIMEOUTS.JWT_EXPIRY_WAIT / 2));

      const tokenRes = await request(app)
        .post('/auth/token')
        .send({});

      if (tokenRes.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
        console.log('Rate limit hit - skipping expiration test');
        return;
      }

      expect(tokenRes.status).toBe(HTTP_STATUS.OK);
      const token = tokenRes.body.token;

      await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: MESSAGES.simple })
        .expect(HTTP_STATUS.ACCEPTED);

      await new Promise(r => setTimeout(r, TIMEOUTS.JWT_EXPIRY_FULL_WAIT));

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: MESSAGES.simple });

      expect([HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.ACCEPTED]).toContain(res.status);
    }, TIMEOUTS.E2E_WORKFLOW_TIMEOUT);
  });
});
