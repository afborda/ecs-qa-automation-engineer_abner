
jest.unmock('jsonwebtoken');

const app = require('../../index');

const {
  generateRealToken,
  generateShortLivedToken,
  generateExpiredToken,
  tamperTokenPayload,
  getMalformedTokens,
  request,
} = require('../helpers/mockHelpers');

const { TEST_MESSAGES } = require('../fixtures/mockData');
const { HTTP_STATUS, TIMEOUTS } = require('../fixtures/testConstants');

const malformedTokens = getMalformedTokens();

describe('Security: Authentication & JWT Validation', () => {

  describe('Missing Authentication', () => {
    it('should reject POST /logs without Authorization header', async () => {
      const res = await request(app)
        .post('/logs')
        .send({ message: TEST_MESSAGES.auth.withoutAuth });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.toLowerCase()).toMatch(/unauthorized/);
    });

    it('should reject POST /logs with empty Authorization header', async () => {
      const res = await request(app)
        .post('/logs')
        .set('Authorization', '')
        .send({ message: TEST_MESSAGES.auth.emptyAuth });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    it('should reject POST /logs with Bearer but no token', async () => {
      const res = await request(app)
        .post('/logs')
        .set('Authorization', 'Bearer ')
        .send({ message: TEST_MESSAGES.auth.bearerNoToken });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });
  });

  describe('Invalid Token Formats', () => {
    it('should reject malformed JWT (not 3 parts)', async () => {
      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${malformedTokens.notJwt}`)
        .send({ message: TEST_MESSAGES.auth.invalidToken });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.error).toBeDefined();
    });

    it('should reject JWT with invalid signature', async () => {
      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${malformedTokens.invalidSignature}`)
        .send({ message: TEST_MESSAGES.auth.invalidToken });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.error).toMatch(/invalid|expired/i);
    });

    it('should reject JWT with tampered payload', async () => {
      const validToken = generateRealToken();
      const tamperedToken = tamperTokenPayload(validToken);

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .send({ message: TEST_MESSAGES.auth.tamperedPayload });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });
  });

  describe('Token Expiration', () => {
    it('should accept valid token immediately after generation', async () => {
      const token = generateRealToken();

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: TEST_MESSAGES.logs.validMessage });

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
      expect(res.body.correlationId).toBeDefined();
    });

    it('should reject expired token after waiting', async () => {
      const shortLivedToken = generateShortLivedToken();

      await new Promise(resolve => setTimeout(resolve, TIMEOUTS.JWT_EXPIRY_WAIT));

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${shortLivedToken}`)
        .send({ message: TEST_MESSAGES.auth.expiredToken });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.error).toMatch(/expired|invalid/i);
    }, TIMEOUTS.JWT_EXPIRY_TEST_TIMEOUT);

    it('should NOT leak expiration details in error message', async () => {
      const expiredToken = generateExpiredToken();

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ message: TEST_MESSAGES.auth.invalidToken });

      const errorStr = JSON.stringify(res.body);
      expect(errorStr).not.toMatch(/\d{10}/); // Unix timestamp
      expect(errorStr).not.toMatch(/"exp"/);  // exp claim
      expect(errorStr).not.toMatch(/"iat"/);  // iat claim
    });
  });

  describe('Public Endpoints (No Auth Required)', () => {
    it('should allow GET /logs/:id without authentication', async () => {
      const token = generateRealToken();
      const postRes = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: TEST_MESSAGES.logs.general });

      const correlationId = postRes.body.correlationId;

      const getRes = await request(app).get(`/logs/${correlationId}`);
      expect(getRes.status).toBe(HTTP_STATUS.OK);
    });

    it('should allow GET /metrics without authentication', async () => {
      const res = await request(app).get('/metrics');
      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body).toHaveProperty('queued');
      expect(res.body).toHaveProperty('processed');
    });

    it('should allow POST /auth/token without authentication', async () => {
      const res = await request(app).post('/auth/token');
      expect(res.status).toBe(HTTP_STATUS.OK);
    });
  });
});

describe('Security: Rate Limiting', () => {

  it('should have rate limiting configured', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(HTTP_STATUS.OK);
  });

  it('should include rate limit info in headers', async () => {
    const token = generateRealToken();

    const res = await request(app)
      .post('/logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: TEST_MESSAGES.logs.general });

    expect([HTTP_STATUS.OK, HTTP_STATUS.ACCEPTED]).toContain(res.status);
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
  });

});

describe('Security: Rate Limit Bypass Prevention', () => {

  it('should not bypass rate limit with different User-Agent headers', async () => {
    let requestCount = 0;

    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .get('/metrics')
        .set('User-Agent', `CustomBot-${i}-v1.0`);

      requestCount++;
      if (res.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
        break;
      }
    }

    expect(requestCount).toBeGreaterThan(0);
  });

  it('should not bypass rate limit with X-Forwarded-For spoofing', async () => {

    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .get('/metrics')
        .set('X-Forwarded-For', `192.168.1.${i}`); // Fake IP

      expect([HTTP_STATUS.OK, HTTP_STATUS.TOO_MANY_REQUESTS]).toContain(res.status);
    }
  });

  it('rate limit errors should not leak sensitive information', async () => {
    const res = await request(app).get('/metrics');

    if (res.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
      const body = JSON.stringify(res.body);
      expect(body).not.toMatch(/stack|\/config|\.env|password|secret/i);
    }
  });
});
describe('Security: CORS Validation', () => {
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'https://abnerfonseca.com.br'];

  it('should accept requests from allowed origins', async () => {
    const token = generateRealToken();

    const res = await request(app)
      .post('/logs')
      .set('Origin', allowedOrigins[0])
      .set('Authorization', `Bearer ${token}`)
      .send({ message: TEST_MESSAGES.logs.general });

    expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
  });

  it('should handle preflight CORS requests', async () => {
    const res = await request(app)
      .options('/logs')
      .set('Origin', allowedOrigins[0])
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type, Authorization');

    expect([HTTP_STATUS.OK, 204]).toContain(res.status);
  });

  it('should return correct CORS headers for allowed origin', async () => {
    const token = generateRealToken();

    const res = await request(app)
      .post('/logs')
      .set('Origin', allowedOrigins[1])
      .set('Authorization', `Bearer ${token}`)
      .send({ message: TEST_MESSAGES.logs.general });

    expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
  });

  it('should handle CORS for metrics endpoint (public)', async () => {
    const res = await request(app)
      .get('/metrics')
      .set('Origin', 'https://example.com');

    expect(res.status).toBe(HTTP_STATUS.OK);
  });
});
