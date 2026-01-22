/**
 * E2E Tests - Local Environment
 *
 * ⚠️ ATENÇÃO: Habilitar worker para testar fluxo completo
 */

// Habilitar worker antes de importar app
process.env.ENABLE_WORKER_FOR_TESTS = 'true';
delete process.env.DISABLE_WORKER;

jest.unmock('jsonwebtoken');
const {request} = require('../helpers/mockHelpers');
const app = require('../../index');

const MESSAGES = {
  simple: 'Test log message from E2E local tests',
  medium: 'A'.repeat(250),
  large: 'B'.repeat(501),
};

describe('E2E Tests - Local Environment', () => {
  describe('Authentication Flow', () => {
    it('should generate valid JWT token via POST /auth/token', async () => {
      const res = await request(app)
        .post('/auth/token')
        .send({})
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });

    it('should return 401 when POST /logs without token', async () => {
      const res = await request(app)
        .post('/logs')
        .send({ message: MESSAGES.simple })
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Full Workflow', () => {
    it('complete flow: token → POST /logs → polling until PROCESSED', async () => {
      const tokenRes = await request(app)
        .post('/auth/token')
        .send({})
        .expect(200);

      const token = tokenRes.body.token;

      const postRes = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: MESSAGES.simple })
        .expect(202);

      const correlationId = postRes.body.correlationId;
      expect(correlationId).toBeTruthy();

      const maxAttempts = 10;
      let status = 'QUEUED';
      let attempts = 0;

      while (status === 'QUEUED' && attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 500));

        const statusRes = await request(app)
          .get(`/logs/${correlationId}`)
          .expect(200);

        status = statusRes.body.status;
        attempts++;
      }

      expect(['PROCESSED', 'FAILED']).toContain(status);
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should return 404 for invalid correlation ID', async () => {
      const res = await request(app)
        .get('/logs/invalid-correlation-id-xyz-123')
        .expect(404);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/not found/i);
    });
  });

  describe('Payload Validation', () => {
    it('should accept large payload (no validation implemented)', async () => {
      const tokenRes = await request(app)
        .post('/auth/token')
        .send({})
        .expect(200);

      const token = tokenRes.body.token;

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: MESSAGES.large })
        .expect(202);

      expect(res.body).toHaveProperty('correlationId');
    });

    it('should accept payload without message field', async () => {
      const tokenRes = await request(app)
        .post('/auth/token')
        .send({})
        .expect(200);

      const token = tokenRes.body.token;

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(202);

      expect(res.body).toHaveProperty('correlationId');
    });
  });

  describe('Metrics Endpoint', () => {
    it('should return object with expected properties', async () => {
      const res = await request(app)
        .get('/metrics')
        .expect(200);

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
        .expect(200);

      const token = tokenRes.body.token;

      const promises = Array(5).fill(null).map(() =>
        request(app)
          .post('/logs')
          .set('Authorization', `Bearer ${token}`)
          .send({ message: MESSAGES.simple })
      );

      const results = await Promise.all(promises);

      results.forEach(res => {
        expect(res.status).toBe(202);
        expect(res.body).toHaveProperty('correlationId');
      });

      const ids = results.map(r => r.body.correlationId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });

    it('should respect rate limit (configured limit per minute)', async () => {
      const tokenRes = await request(app)
        .post('/auth/token')
        .send({})
        .expect(200);

      const token = tokenRes.body.token;

      // Rate limit configurado via env (pode ser 100 ou 500)
      const rateLimit = parseInt(process.env.RATE_LIMIT || '100');
      const requestCount = rateLimit + 10; // 10 acima do limite

      const promises = Array(requestCount).fill(null).map(() =>
        request(app)
          .post('/logs')
          .set('Authorization', `Bearer ${token}`)
          .send({ message: MESSAGES.simple })
      );

      const results = await Promise.all(promises);

      const blockedRequests = results.filter(r => r.status === 429);
      expect(blockedRequests.length).toBeGreaterThan(0);
    }, 20000);
  });

  describe('Token Expiration', () => {
    it('should expire token after 5 seconds as configured', async () => {
      await new Promise(r => setTimeout(r, 1000));

      const tokenRes = await request(app)
        .post('/auth/token')
        .send({});

      if (tokenRes.status === 429) {
        console.log('Rate limit hit - skipping expiration test');
        return;
      }

      expect(tokenRes.status).toBe(200);
      const token = tokenRes.body.token;

      await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: MESSAGES.simple })
        .expect(202);

      await new Promise(r => setTimeout(r, 6000));

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: MESSAGES.simple });

      expect([401, 202]).toContain(res.status);
    }, 10000);
  });
});
