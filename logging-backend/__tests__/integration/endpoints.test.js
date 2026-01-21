const request = require('supertest');
const {
  mockValidJWTSign,
  mockValidUser,
  mockExpiredToken,
  mockInvalidToken,
  setupIntegrationAuth,
  jwt
} = require('../helpers/authMocks');
const { VALID_UUIDS, TOKENS, MESSAGES } = require('../fixtures/testData');
const { expectErrorResponse } = require('../helpers/testUtils');

const app = require('../../index');

describe('API Endpoints Integration Tests', () => {

  describe('POST /auth/token', () => {
    it('should generate valid JWT token', async () => {
      const expectedToken = 'header.payload.signature';
      mockValidJWTSign(expectedToken);

      const res = await request(app)
        .post('/auth/token')
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body.token).toBe(expectedToken);
      expect(res.body.token).toBeValidJWT();

      expect(jwt.sign).toHaveBeenCalledWith(
        { user: 'qa' },
        'qa-secret',
        { expiresIn: '5s' }
      );
    });
  });

  describe('POST /logs', () => {
    it('should accept log with valid token', async () => {
      const validToken = TOKENS.valid;
      const payload = { message: MESSAGES.simple };

      setupIntegrationAuth();

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${validToken}`)
        .send(payload)
        .expect(202);

      expect(res.body).toHaveProperty('correlationId');
      expect(res.body.correlationId).toBeValidUUID();

      expect(jwt.verify).toHaveBeenCalledWith(validToken, 'qa-secret');
    });

    it('should return 401 without token', async () => {
      mockValidUser();

      const res = await request(app)
        .post('/logs')
        .send({ message: MESSAGES.simple });

      expectErrorResponse(res, 401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = TOKENS.expired;
      mockExpiredToken();

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ message: MESSAGES.simple });

      expectErrorResponse(res, 401);
      expect(res.body.error).toContain('Token expired or invalid');
    });

    it('should return 401 with invalid token', async () => {
      mockInvalidToken();

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${TOKENS.invalid}`)
        .send({ message: MESSAGES.simple });

      expectErrorResponse(res, 401);
    });

    it('should generate unique IDs for each log', async () => {
      setupIntegrationAuth();

      const res1 = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${TOKENS.valid}`)
        .send({ message: 'log 1' });

      const res2 = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${TOKENS.valid}`)
        .send({ message: 'log 2' });

      expect(res1.body.correlationId).not.toBe(res2.body.correlationId);
    });
  });

  describe('GET /logs/:id', () => {
    it('should return QUEUED status after POST', async () => {
      setupIntegrationAuth();

      const postRes = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${TOKENS.valid}`)
        .send({ message: MESSAGES.simple });

      const { correlationId } = postRes.body;

      const getRes = await request(app)
        .get(`/logs/${correlationId}`)
        .expect(200);

      expect(getRes.body.status).toBe('QUEUED');
    });

    it('should return 404 for non-existent ID', async () => {
      const fakeId = VALID_UUIDS.nonExistent;

      const res = await request(app)
        .get(`/logs/${fakeId}`)
        .expect(404);

      expectErrorResponse(res, 404);
      expect(res.body.error).toBe('Not found');
    });

    it('should NOT require authentication', async () => {
      const fakeId = VALID_UUIDS.correlationId;

      const res = await request(app)
        .get(`/logs/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.status).not.toBe(401);
    });
  });

  describe('GET /metrics', () => {
    it('should return system metrics', async () => {
      const res = await request(app)
        .get('/metrics')
        .expect(200);

      expect(res.body).toHaveProperty('queued');
      expect(res.body).toHaveProperty('processed');
      expect(res.body).toHaveProperty('memoryUsageMB');

      expect(res.body.queued).toBeGreaterThanOrEqual(0);
      expect(res.body.processed).toBeGreaterThanOrEqual(0);
      expect(res.body.memoryUsageMB).toBeGreaterThanOrEqual(0);
    });

    it('should NOT require authentication', async () => {
      const res = await request(app)
        .get('/metrics');

      expect(res.status).not.toBe(401);
      expect(res.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should accept requests within limit', async () => {
      setupIntegrationAuth();

      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post('/logs')
          .set('Authorization', `Bearer ${TOKENS.valid}`)
          .send({ message: `log ${i}` });

        expect(res.status).not.toBe(429);
      }
    });
  });

});
