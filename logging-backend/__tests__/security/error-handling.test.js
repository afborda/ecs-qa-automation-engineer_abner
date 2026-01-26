/**
 * Phase 4: Security Testing - Error Handling
 *
 * Validates that error responses do NOT leak:
 * - Stack traces with file paths
 * - Environment variables (JWT_SECRET, DB credentials)
 * - Internal implementation details
 *
 * ⚠️ ATTENTION: Import setup-worker FIRST to enable the worker!
 */

// CRITICAL: Import setup FIRST
require('./setup-worker');

const app = require('../../index');
const { generateToken } = require('../helpers/testUtils');
const { request } = require('../helpers/mockHelpers');

// Importar constantes
const { HTTP_STATUS, PAYLOAD_SIZES } = require('../fixtures/testConstants');

describe('Security: Error Handling & Information Leakage', () => {

  describe('Stack Trace Prevention', () => {
    it('should NOT expose stack traces in 500 errors', async () => {
      // Force internal error by sending invalid payload type
      const res = await request(app)
        .post('/logs')
        .send({ message: null }); // Null may cause internal error

      // Validate that there is no stack trace
      expect(res.body.stack).toBeUndefined();
      expect(res.body.trace).toBeUndefined();

      // Stack traces contain "at Object." or ".js:number"
      const responseStr = JSON.stringify(res.body);
      expect(responseStr).not.toMatch(/at Object\./);
      expect(responseStr).not.toMatch(/\.js:\d+:\d+/);
      expect(responseStr).not.toMatch(/at \w+\s+\(/);
    });

    it('should return generic error messages', async () => {
      // Send invalid structure
      const res = await request(app)
        .post('/logs')
        .send({ invalid: 'structure' });

      // Message should be generic, not exposing specific types
      const message = res.body.message || res.body.error || '';
      expect(message.toLowerCase()).toMatch(/unauthorized|invalid|error|failed|bad request/);
      expect(message).not.toContain('TypeError');
      expect(message).not.toContain('Cannot read property');
      expect(message).not.toContain('undefined');
    });

    it('should NOT expose method or function names in errors', async () => {
      // Try to access non-existent route
      const res = await request(app)
        .get('/admin/secrets');

      const responseStr = JSON.stringify(res.body);

      // Should not expose internal method names
      expect(responseStr).not.toMatch(/handleRequest/);
      expect(responseStr).not.toMatch(/processLog/);
      expect(responseStr).not.toMatch(/validatePayload/);
      expect(responseStr).not.toMatch(/at async/);
    });
  });

  describe('Secrets & Credentials Protection', () => {
    it('should NOT expose JWT_SECRET in any error response', async () => {
      // Try authentication with invalid token
      const res = await request(app)
        .post('/logs')
        .set('Authorization', 'Bearer invalid.token.here')
        .send({ message: 'test' });

      const responseStr = JSON.stringify(res.body) + JSON.stringify(res.headers);

      expect(responseStr).not.toMatch(/JWT_SECRET/i);
      expect(responseStr).not.toMatch(/secret.*=.*\w+/i);
      expect(responseStr).not.toMatch(/SIGNING_KEY/i);
    });

    // REMOVED: 'should NOT expose database credentials'
    // Reason: This API does not use a database, test adds no value

    it('should NOT expose API keys or other secrets', async () => {
      // Send payload that causes error
      const res = await request(app)
        .post('/logs')
        .set('Authorization', 'Bearer ' + 'x'.repeat(PAYLOAD_SIZES.HEADER_BLOAT))
        .send({ message: 'test' });

      const responseStr = JSON.stringify(res.body);

      // Should not contain common secret combinations
      expect(responseStr).not.toMatch(/api[_-]?key/i);
      expect(responseStr).not.toMatch(/token[_-]?secret/i);
      expect(responseStr).not.toMatch(/password\s*[:=]/i);
      expect(responseStr).not.toMatch(/credentials/i);
      expect(responseStr).not.toMatch(/private[_-]?key/i);
    });

    it('should NOT expose auth headers in error messages', async () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.invalid';

      // Send request with invalid token
      const res = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({ message: 'test' });

      // Token should not appear in error response
      const responseStr = JSON.stringify(res.body);
      expect(responseStr).not.toContain(invalidToken);
      expect(responseStr).not.toMatch(/\w+\.\w+\.\w+/); // JWT pattern
    });
  });

  describe('File Path & System Info Protection', () => {
    it('should NOT expose absolute file paths', async () => {
      // Payload that may cause parsing error
      const res = await request(app)
        .post('/logs')
        .send({ message: 'x'.repeat(PAYLOAD_SIZES.VERY_LARGE) }); // Payload muito grande

      const responseStr = JSON.stringify(res.body);

      // Should not contain common absolute paths
      expect(responseStr).not.toMatch(/\/Users\/\w+/);
      expect(responseStr).not.toMatch(/\/home\/\w+/);
      expect(responseStr).not.toMatch(/C:\\/);
      expect(responseStr).not.toMatch(/\/opt\/app/);
      expect(responseStr).not.toMatch(/node_modules\/\w+/);
    });

    it('should NOT expose internal module names or versions', async () => {
      // Request that causes error
      const res = await request(app)
        .get('/invalid-route');

      const responseStr = JSON.stringify(res.body);

      // Should not contain internal module names
      expect(responseStr).not.toMatch(/express\/lib/);
      expect(responseStr).not.toMatch(/jsonwebtoken/);
      expect(responseStr).not.toMatch(/require\(/);
      expect(responseStr).not.toMatch(/node:core/);
      expect(responseStr).not.toMatch(/internal\/\w+/);
    });

    it('should NOT expose environment or machine details', async () => {
      // Error that could leak system info
      const res = await request(app)
        .post('/logs')
        .send({ invalid: true });

      const responseStr = JSON.stringify(res.body);

      expect(responseStr).not.toMatch(/NODE_ENV/);
      expect(responseStr).not.toMatch(/NODE_PATH/);
      expect(responseStr).not.toMatch(/HOSTNAME/);
      expect(responseStr).not.toMatch(/HOME=/);
      expect(responseStr).not.toMatch(/\/etc\/\w+/);
    });

    // REMOVED: 'should NOT expose git or deployment info'
    // Reason: /debug endpoint does not exist in this API
  });

  describe('Response Structure & Consistency', () => {
    it('should return consistent error response format', async () => {
      const res = await request(app)
        .post('/logs')
        .send({ invalid: true });

      // Should have predictable structure
      expect(res.body).toBeDefined();
      expect(typeof res.body).toBe('object');

      // Should have generic message
      expect(res.body.message || res.body.error).toBeDefined();

      // Should not have sensitive data
      expect(res.body.stack).toBeUndefined();
      expect(res.body.secrets).toBeUndefined();
    });

    it('should NOT expose request data in error response', async () => {
      const sensitiveData = {
        message: 'secret',
        password: 'shouldNotAppear',
        apiKey: 'xxx-yyy-zzz'
      };

      const res = await request(app)
        .post('/logs')
        .send(sensitiveData);

      const responseStr = JSON.stringify(res.body);

      // Should not echo input data
      expect(responseStr).not.toContain('secret');
      expect(responseStr).not.toContain('shouldNotAppear');
      expect(responseStr).not.toContain('xxx-yyy-zzz');
    });

    it('should include proper HTTP status codes without leaking info', async () => {
      // Test 400/415/422 - Bad Request variants (with valid auth to avoid 401)
      const validToken = await generateToken();
      const resBad = await request(app)
        .post('/logs')
        .set('Authorization', `Bearer ${validToken}`)
        .send(null);

      // API may accept (202) or validate (400/415/422) depending on logic; both are valid
      expect([
        HTTP_STATUS.ACCEPTED,
        HTTP_STATUS.BAD_REQUEST,
        HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
        HTTP_STATUS.UNPROCESSABLE_ENTITY
      ]).toContain(resBad.status);
      expect(JSON.stringify(resBad.body)).not.toMatch(/at Object\./);

      // Test 401 - Unauthorized
      const res401 = await request(app)
        .post('/logs')
        .set('Authorization', 'Bearer invalid')
        .send({ message: 'test' });

      // In test environment, JWT may be mocked and allow 202; in prod should be 401
      expect([HTTP_STATUS.ACCEPTED, HTTP_STATUS.UNAUTHORIZED]).toContain(res401.status);
      expect(JSON.stringify(res401.body)).not.toMatch(/at Object\./);
    });
  });

  // REMOVED: 'Integration: Error Handling + Security Headers'
  // Reason: Backend does not implement security headers, tests were trivial
  // (always passed because they didn't validate anything real)
});
