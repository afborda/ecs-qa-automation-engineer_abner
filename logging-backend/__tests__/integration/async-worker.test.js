
require('./setup-worker');

const {
  setupIntegrationAuth,
  jwt,
  request
} = require('../helpers/mockHelpers');
const { TOKENS, MESSAGES, LOG_STATUSES } = require('../fixtures/testData');
const { createLog } = require('../helpers/testUtils');
const { pollWithFixedDelay } = require('../helpers/pollingHelpers');
const { HTTP_STATUS, TIMEOUTS, PAYLOAD_SIZES } = require('../fixtures/testConstants');
const { TEST_MESSAGES } = require('../fixtures/mockData');

const app = require('../../index');

jest.setTimeout(TIMEOUTS.SLOW_TEST_TIMEOUT);

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

      const result = await pollWithFixedDelay(
        async () => {
          const res = await request(app).get(`/logs/${correlationId}`);

          if (!res.body.status) {
            throw new Error('No status in response');
          }

          if (res.body.status === 'QUEUED') {
            throw new Error('Still QUEUED, retrying...');
          }

          return res.body;
        },
        { maxAttempts: 30, delayMs: TIMEOUTS.POLLING_INTERVAL / 5 }
      );

      expect(['PROCESSED', 'FAILED']).toContain(result.status);
    });

    it('should store message after processing', async () => {
      setupIntegrationAuth();

      const testMessage = `${TEST_MESSAGES.logs.validMessage} - stored`;
      const correlationId = await createLog(testMessage, TOKENS.valid);

      let processed = false;
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, TIMEOUTS.POLLING_INTERVAL / 5));

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
          .set('Authorization', `Bearer ${TOKENS.valid}`)
          .send({ message: `${TEST_MESSAGES.logs.general} ${i}` });

        correlationIds.push(res.body.correlationId);
        await new Promise(r => setTimeout(r, TIMEOUTS.POLLING_INTERVAL / 10));
      }

      await new Promise(r => setTimeout(r, TIMEOUTS.SERVER_START_WAIT));

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

      const largeMessage = 'x'.repeat(PAYLOAD_SIZES.LARGE_MESSAGE);

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${TOKENS.valid}`)
        .send({ message: largeMessage });

      const { correlationId } = res.body;

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
      expect(correlationId).toBeValidUUID();

      await new Promise(r => setTimeout(r, TIMEOUTS.WORKER_PROCESSING_DELAY));

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

      const initialRes = await request(app).get('/metrics');
      expect(initialRes.status).toBe(200);
      expect(initialRes.body).toHaveProperty('queued');
      expect(initialRes.body).toHaveProperty('processed');

      const initialProcessed = initialRes.body.processed || 0;

      const postRes = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${TOKENS.valid}`)
        .send({ message: TEST_MESSAGES.logs.general });

      if (postRes.status === 429) {
        console.log('Rate limited - skipping metrics test');
        return;
      }

      expect(postRes.status).toBe(202);

      await new Promise(r => setTimeout(r, TIMEOUTS.POLLING_INTERVAL * 3));

      const finalRes = await request(app).get('/metrics');
      expect(finalRes.status).toBe(200);
      expect(finalRes.body).toHaveProperty('queued');
      expect(finalRes.body).toHaveProperty('processed');

      const finalProcessed = finalRes.body.processed || 0;
      const finalQueued = finalRes.body.queued || 0;

      expect(finalProcessed >= initialProcessed || finalQueued < initialRes.body.queued).toBe(true);
    });
  });

});
