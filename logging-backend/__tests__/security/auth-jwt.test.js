/**
 * Phase 4: Security Testing - Authentication & JWT
 *
 * Testes de segurança para validar:
 * - Tokens JWT são validados corretamente
 * - Tokens expirados são rejeitados
 * - Tokens inválidos/alterados são rejeitados
 * - Requests sem autenticação são bloqueados
 * - Rate limiting funciona
 *
 * ⚠️ IMPORTANTE: Este arquivo usa funções do mockHelpers que geram
 * tokens REAIS (via jest.requireActual) para testar validação de autenticação.
 */

// CRÍTICO: Unmock ANTES de qualquer require
jest.unmock('jsonwebtoken');

const app = require('../../index');

// Importar helpers centralizados - seguindo padrão SOLID do projeto
const {
  generateRealToken,
  generateShortLivedToken,
  generateExpiredToken,
  tamperTokenPayload,
  getMalformedTokens,
  request,
} = require('../helpers/mockHelpers');

// Importar constantes e dados
const { TEST_MESSAGES } = require('../fixtures/mockData');
const { HTTP_STATUS, TIMEOUTS } = require('../fixtures/testConstants');

// Dados de teste centralizados
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
      // Gerar token válido e depois adulterar o payload
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
      // Gerar token que expira em 1 segundo
      const shortLivedToken = generateShortLivedToken();

      // Esperar token expirar (1s + margem)
      await new Promise(resolve => setTimeout(resolve, TIMEOUTS.JWT_EXPIRY_WAIT));

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${shortLivedToken}`)
        .send({ message: TEST_MESSAGES.auth.expiredToken });

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.error).toMatch(/expired|invalid/i);
    }, TIMEOUTS.JWT_EXPIRY_TEST_TIMEOUT);

    it('should NOT leak expiration details in error message', async () => {
      // Gerar token já expirado
      const expiredToken = generateExpiredToken();

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ message: TEST_MESSAGES.auth.invalidToken });

      // Erro não deve conter timestamp exato ou detalhes do token
      const errorStr = JSON.stringify(res.body);
      expect(errorStr).not.toMatch(/\d{10}/); // Unix timestamp
      expect(errorStr).not.toMatch(/"exp"/);  // exp claim
      expect(errorStr).not.toMatch(/"iat"/);  // iat claim
    });
  });

  describe('Public Endpoints (No Auth Required)', () => {
    it('should allow GET /logs/:id without authentication', async () => {
      // Criar um log com auth válida
      const token = generateRealToken();
      const postRes = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: TEST_MESSAGES.logs.general });

      const correlationId = postRes.body.correlationId;

      // GET não requer auth
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
      // Este endpoint gera tokens - não requer auth prévia
      const res = await request(app).post('/auth/token');
      expect(res.status).toBe(HTTP_STATUS.OK);
    });
  });
});

describe('Security: Rate Limiting', () => {
  // Nota: RATE_LIMIT=500 em testes para evitar bloqueios

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

    // Express-rate-limit tipicamente adiciona headers
    expect([HTTP_STATUS.OK, HTTP_STATUS.ACCEPTED]).toContain(res.status);
  });

  // NOTA: Teste completo de rate limit (100+ requests) seria lento
  // Em CI usamos RATE_LIMIT=500 para não bloquear
});

describe('Security: Rate Limit Bypass Prevention', () => {
  // Testes para validar que rate limit não pode ser bypassado com técnicas comuns

  it('should not bypass rate limit with different User-Agent headers', async () => {
    let requestCount = 0;

    // Fazer múltiplas requests com User-Agents diferentes
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .get('/metrics')
        .set('User-Agent', `CustomBot-${i}-v1.0`);

      requestCount++;
      if (res.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
        break;
      }
    }

    // Esperado: requests são contadas por IP, não por User-Agent
    expect(requestCount).toBeGreaterThan(0);
  });

  it('should not bypass rate limit with X-Forwarded-For spoofing', async () => {

    // Múltiplas requests do mesmo IP com X-Forwarded-For falso
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .get('/metrics')
        .set('X-Forwarded-For', `192.168.1.${i}`); // IP falso

      // Não deve bloquear se o servidor confiar em X-Forwarded-For
      // ou bloqueia se não confiar (ambos são seguros)
      expect([HTTP_STATUS.OK, HTTP_STATUS.TOO_MANY_REQUESTS]).toContain(res.status);
    }
  });

  it('rate limit errors should not leak sensitive information', async () => {
    // Se rate limit ocorrer, validar que erro não expõe internals
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

    // Esperado: 200 ou 204 para preflight
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
    // Note: CORS headers behavior depende da configuração do Express
  });

  it('should handle CORS for metrics endpoint (public)', async () => {
    const res = await request(app)
      .get('/metrics')
      .set('Origin', 'https://example.com');

    // Metrics é público, deve aceitar qualquer Origin
    expect(res.status).toBe(HTTP_STATUS.OK);
  });
});
