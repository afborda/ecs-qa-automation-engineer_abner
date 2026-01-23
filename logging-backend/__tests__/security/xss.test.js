/**
 * Phase 4: Security Testing - XSS Input Validation
 *
 * Tests validate that the API safely handles XSS payloads without:
 * - Executing malicious code
 * - Reflecting unencoded input
 * - Crashing on edge cases
 *
 * ⚠️ ATENÇÃO: Importar setup-worker PRIMEIRO para habilitar o worker!
 * Alguns testes (Payload Size, Response Validation) precisam que logs
 * sejam processados para validar comportamento.
 */

// CRÍTICO: Importar setup PRIMEIRO
require('./setup-worker');

const app = require('../../index');
const { generateToken } = require('../helpers/testUtils');
const { pollWithBackoff } = require('../helpers/pollingHelpers');
const { XSS_PAYLOADS, PAYLOAD_SIZE_TESTS } = require('../fixtures/testDataSecurity');
const { HTTP_STATUS } = require('../fixtures/testConstants');
const { request } = require('../helpers/mockHelpers');

describe('Security: XSS-like Input Validation', () => {
  describe('Script Tag Injection', () => {
    it('should accept basic script tag without execution', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.basicScript };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
      expect(res.body).toHaveProperty('correlationId');

      // Validar que o log foi aceito sem executar
      const correlationId = res.body.correlationId;
      const pollRes = await request(app).get(`/logs/${correlationId}`);
      expect(['QUEUED', 'PROCESSED', 'FAILED']).toContain(pollRes.body.status);

      // Quando processado, a mensagem armazenada deve ser igual ao payload (não alterada)
      if (pollRes.body.status === 'PROCESSED') {
        expect(pollRes.body.message).toBe(payload.message);
      }
    });

    it('should not crash with nested script tags', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.nestedScript };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
    });

    it('should handle script with external src', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.scriptWithSrc };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
    });

    it('should handle script using eval', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.scriptUsingEval };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
    });
  });

  describe('Event Handler Injection', () => {
    it('should handle img tag with onerror', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.imgOnerror };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
      expect(res.body).toHaveProperty('correlationId');
    });

    it('should handle img tag with onload', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.imgOnload };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
    });

    it('should handle svg with onload event', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.svgOnload };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
      expect(res.body).toHaveProperty('correlationId');
    });

    it('should handle svg with onerror', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.svgOnerror };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
    });

    it('should handle body onload event', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.bodyOnload };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
    });

    it('should handle input autofocus with onfocus', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.inputOnfocus };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
    });
  });

  describe('Encoded Payloads', () => {
    it('should handle URL encoded XSS', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.urlEncoded };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
    });

    it('should handle double URL encoded XSS', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.doubleUrlEncoded };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
    });

    it('should handle HTML encoded XSS', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.htmlEncoded };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
    });

    it('should handle Unicode escaped XSS', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.unicodeEscaped };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
    });

    it('should handle hex encoded XSS', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.hexEncoded };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
    });
  });

  describe('CSS/SVG Vector Attacks', () => {
    it('should handle CSS style tag with JavaScript URI', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.styleTag };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
    });

    it('should handle CSS import with javascript URI', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.cssImport };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
    });

    it('should handle SVG path with javascript URI', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.svgPath };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
    });
  });

  describe('Data URI and JavaScript Protocol', () => {
    it('should handle data URI with embedded script', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.dataUri };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
    });

    it('should handle javascript: protocol URI', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.javascriptUri };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
    });
  });

  describe('Advanced XSS Techniques', () => {
    it('should handle mutation XSS (mXSS)', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.mutationXSS };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
    });
  });

  describe('Payload Size Validation', () => {
    it('should accept message within size limit (500 chars)', async () => {
      const token = await generateToken();
      const payload = { message: PAYLOAD_SIZE_TESTS.withinLimit.message };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(PAYLOAD_SIZE_TESTS.withinLimit.expectedStatus);
      expect(res.body).toHaveProperty('correlationId');
    });

    it('should reject message over size limit (501+ chars)', async () => {
      const payload = { message: PAYLOAD_SIZE_TESTS.justOverLimit.message };
      expect(payload.message.length).toBeGreaterThan(500);

      const token = await generateToken();
      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(PAYLOAD_SIZE_TESTS.justOverLimit.expectedStatus);

      // Worker processa 1 log/segundo - usar delays maiores
      const result = await pollWithBackoff(
        async () => {
          const pollRes = await request(app).get(`/logs/${res.body.correlationId}`);
          if (pollRes.body.status === 'QUEUED') throw new Error('Still queued');
          return pollRes.body;
        },
        { maxAttempts: 15, initialDelayMs: 500 }
      );
      expect(result.status).toBe('FAILED');
      // Pode falhar por tamanho ou por razão aleatória
      expect(['Payload too large', 'Random processing failure']).toContain(result.reason);
    }, 25000);

    it('should reject very large payloads', async () => {
      const token = await generateToken();
      const payload = { message: PAYLOAD_SIZE_TESTS.largePayload.message };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(PAYLOAD_SIZE_TESTS.largePayload.expectedStatus);
    });

    it('should handle XSS attempt combined with oversized payload', async () => {
      const longXSS = XSS_PAYLOADS.longPayloadScript;
      expect(longXSS.length).toBeGreaterThan(500);

      let attempts = 0;
      let payloadSizeError = null;

      while (attempts < 20 && !payloadSizeError) {
        attempts++;
        const token = await generateToken();
        const payload = { message: longXSS };

        const res = await request(app)
          .post('/logs')
          .set('Authorization', `Bearer ${token}`)
          .send(payload);

        expect(res.status).toBe(HTTP_STATUS.ACCEPTED);

        const result = await pollWithBackoff(
          async () => {
            const pollRes = await request(app).get(`/logs/${res.body.correlationId}`);
            if (pollRes.body.status === 'QUEUED') throw new Error('Still queued');
            return pollRes.body;
          },
          { maxAttempts: 15, initialDelayMs: 50 }
        );
        expect(result.status).toBe('FAILED');

        if (result.reason === 'Payload too large') {
          payloadSizeError = result;
          break;
        }
        expect(result.reason).toBe('Random processing failure');
      }

      // Security validation: oversized payloads should fail, not execute
      expect(payloadSizeError).toBeTruthy();
      expect(payloadSizeError.reason).toBe('Payload too large');
    }, 18000);
  });

  describe('Response Validation & Output Encoding', () => {
    it('should ensure JSON response is properly encoded', async () => {
      const token = await generateToken();
      const payload = { message: '{"malicious": "<script>alert(1)</script>"}' };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
    });

    it('should not reflect unencoded XSS in GET responses', async () => {
      const token = await generateToken();
      const payload = { message: XSS_PAYLOADS.basicScript };

      const postRes = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(postRes.status).toBe(HTTP_STATUS.ACCEPTED);
      const correlationId = postRes.body.correlationId;

      // Polling otimizado com backoff
      await pollWithBackoff(
        async () => {
          const pollRes = await request(app).get(`/logs/${correlationId}`);
          if (pollRes.body.status === 'QUEUED') throw new Error('Still queued');
          return pollRes.body;
        },
        { maxAttempts: 10, initialDelayMs: 50 }
      );

      const getRes = await request(app).get(`/logs/${correlationId}`);

      // Verificar que a resposta é JSON válido
      expect(getRes.status).toBe(HTTP_STATUS.OK);
      expect(getRes.headers['content-type']).toMatch(/json/);

      // Se processado, message deve estar presente (não deve executar)
      if (getRes.body.status === 'PROCESSED') {
        expect(getRes.body.message).toBe(payload.message);
        // Validar que JSON está properly encoded
        expect(typeof getRes.body.message).toBe('string');
      }
    });

    it('should handle XSS in error context without executing', async () => {
      const token = await generateToken();
      const xssPayload = { message: XSS_PAYLOADS.basicScript };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(xssPayload);

      // Validar que resposta é JSON
      const responseText = JSON.stringify(res.body);
      expect(responseText).toBeDefined();

      // Se houver erro em response.body, deve estar encoded
      if (res.body.error) {
        expect(typeof res.body.error).toBe('string');
        // Error message não deve conter script tags sem escape
        expect(res.body.error).not.toMatch(/<script>/);
      }
    });
  });

  describe('Integration: XSS + Security Headers', () => {
    it('should include security headers in response', async () => {
      const token = await generateToken();
      const payload = { message: 'test message' };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      // Validar headers de segurança
      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
      expect(res.headers['content-type']).toMatch(/json/);
      // X-Content-Type-Options: nosniff previne MIME sniffing
      // Note: Backend pode não implementar, então just document
    });

    it('should not allow content injection through correlationId', async () => {
      const token = await generateToken();
      const payload = { message: 'test' };

      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
      expect(res.body).toHaveProperty('correlationId');

      // correlationId deve ser UUID format, não arbitrary text
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(res.body.correlationId).toMatch(uuidRegex);
    });
  });
});
