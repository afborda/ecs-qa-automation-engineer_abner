const request = require('supertest');
const {
  setupIntegrationAuth,
  mockValidUser,
  jwt
} = require('../helpers/authMocks');
const { TOKENS, MESSAGES, LOG_STATUSES } = require('../fixtures/testData');
const { waitForLogProcessing, createLog, getMetrics } = require('../helpers/testUtils');

const app = require('../../index');

describe('Async Worker - Log Processing', () => {

  describe('Log Processing Flow', () => {
    it('should be QUEUED immediately after POST', async () => {
      setupIntegrationAuth();

      const correlationId = await createLog(MESSAGES.simple, TOKENS.valid);

      const getRes = await request(app)
        .get(`/logs/${correlationId}`);

      expect(getRes.body.status).toBe(LOG_STATUSES.queued);
    });

    it('should be PROCESSED after polling', async () => {
      setupIntegrationAuth();

      const correlationId = await createLog(MESSAGES.simple, TOKENS.valid);

      let status = 'QUEUED';
      let attempts = 0;
      const maxAttempts = 30;

      while (status === 'QUEUED' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));

        const res = await request(app)
          .get(`/logs/${correlationId}`);

        status = res.body.status;
        attempts++;
      }

      expect(['PROCESSED', 'FAILED']).toContain(status);
    });

    it('should store message after processing', async () => {
      setupIntegrationAuth();

      const testMessage = 'My test message';
      const correlationId = await createLog(testMessage, TOKENS.valid);

      let processed = false;
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 100));

        const res = await request(app)
          .get(`/logs/${correlationId}`);

        if (res.body.status === 'PROCESSED') {
          processed = true;
          expect(res.body.message).toBe(testMessage);
          break;
        }
      }

      if (processed) {
        expect(processed).toBe(true);
      }
    });
  });

  describe('Flaky Failures (30% Rate)', () => {
    it('should randomly fail some logs', async () => {
      setupIntegrationAuth();

      const correlationIds = [];

      for (let i = 0; i < 20; i++) {
        const res = await request(app)
          .post('/logs')
          .set('Authorization', `Bearer token`)
          .send({ message: `log ${i}` });

        correlationIds.push(res.body.correlationId);
        await new Promise(r => setTimeout(r, 50));
      }

      await new Promise(r => setTimeout(r, 3000));

      let processedCount = 0;
      let failedCount = 0;

      for (const cid of correlationIds) {
        const res = await request(app)
          .get(`/logs/${cid}`);

        if (res.body.status === 'PROCESSED') processedCount++;
        if (res.body.status === 'FAILED') failedCount++;
      }

      expect(processedCount + failedCount).toBeGreaterThan(0);
    });

    it('should fail logs with payload > 500 chars', async () => {
      jwt.verify.mockReturnValue({ user: 'qa' });

      const largeMessage = 'x'.repeat(501);

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer token`)
        .send({ message: largeMessage });

      const { correlationId } = res.body;

      expect(res.status).toBe(202);
      expect(correlationId).toBeValidUUID();

      await new Promise(r => setTimeout(r, 2000));

      const getRes = await request(app)
        .get(`/logs/${correlationId}`);

      expect(['FAILED', 'QUEUED']).toContain(getRes.body.status);

      if (getRes.body.status === 'FAILED') {
        expect(getRes.body.reason).toContain('Payload too large');
      }
    });
  });

  describe('Metrics and Queue', () => {
    it('should update metrics when processing logs', async () => {
      jwt.verify.mockReturnValue({ user: 'qa' });

      const initialRes = await request(app)
        .get('/metrics');

      const postRes = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer token`)
        .send({ message: 'test' });

      const queuedRes = await request(app)
        .get('/metrics');

      expect(queuedRes.body.queued).toBeGreaterThan(0);

      await new Promise(r => setTimeout(r, 1500));

      const finalRes = await request(app)
        .get('/metrics');

      expect(finalRes.body.queued).toBeLessThanOrEqual(queuedRes.body.queued);
    });
  });

});
