
const TEST_MESSAGES = {
  auth: {
    withoutAuth: 'test without auth',
    emptyAuth: 'test empty auth',
    bearerNoToken: 'test',
    invalidToken: 'test',
    expiredToken: 'test expired token',
    tamperedPayload: 'test',
  },
  logs: {
    validMessage: 'test valid token',
    general: 'test',
  },
  e2e: {
    simple: 'Test log message from E2E local tests',
    invalidId: 'invalid-correlation-id-xyz-123',
  },
};

// ============================================
// MOCK TOKENS (for tests with mocked JWT)
// ============================================
const MOCK_TOKENS = {
  valid: 'valid.jwt.token',
  expired: 'expired.token',
  invalid: 'invalid.token',
  malformed: 'only.twoparts',
};

// ============================================
// REAL JWT CONFIG (for security tests)
// ============================================
const REAL_JWT_CONFIG = {
  // Secret used by backend (hardcoded in index.js)
  secret: 'qa-secret',

  // Expiration options for different scenarios
  expiry: {
    valid: '1h',        // Token valid for 1 hour
    short: '1s',        // Token that expires quickly (for expiration tests)
    expired: '-1s',     // Already expired token
  },

  // Payloads for security tests
  payloads: {
    validUser: { user: 'qa' },
    adminUser: { user: 'admin' },
    tamperedAdmin: { user: 'admin', iat: 9999999999 },
  },

  // Malformed tokens for validation tests
  malformedTokens: {
    notJwt: 'not-a-valid-jwt',
    twoPartsOnly: 'header.payload',
    invalidSignature: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoicWEiLCJpYXQiOjE3MzcwMDAwMDAsImV4cCI6OTk5OTk5OTk5OX0.INVALID_SIGNATURE',
  },
};

const MOCK_USER_PAYLOADS = {
  validUser: { user: 'qa' },
  adminUser: { user: 'admin' },
  regularUser: { user: 'regular' },
  expiredPayload: { user: 'qa-tester', iat: 1234567, exp: 1234572 },
};

const JWT_MOCK_CONFIG = {
  sign: {
    defaultReturn: MOCK_TOKENS.valid,
  },
  verify: {
    defaultPayload: MOCK_USER_PAYLOADS.validUser,
    expiredError: new Error('jwt expired'),
    invalidError: new Error('invalid signature'),
  },
  decode: {
    defaultPayload: MOCK_USER_PAYLOADS.expiredPayload,
    invalidReturn: null,
  },
};

const AUTH_HEADERS = {
  valid: { Authorization: `Bearer ${MOCK_TOKENS.valid}` },
  expired: { Authorization: `Bearer ${MOCK_TOKENS.expired}` },
  invalid: { Authorization: `Bearer ${MOCK_TOKENS.invalid}` },
  missing: {},
};

module.exports = {
  TEST_MESSAGES,
  MOCK_TOKENS,
  MOCK_USER_PAYLOADS,
  JWT_MOCK_CONFIG,
  AUTH_HEADERS,
  REAL_JWT_CONFIG,
};
