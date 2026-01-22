/**
 * Mock Data Fixtures
 * Configurações e dados para mocks de JWT e autenticação
 * Separado de funções (helpers) e dados genéricos (testData.js)
 */

const MOCK_TOKENS = {
  valid: 'valid.jwt.token',
  expired: 'expired.token',
  invalid: 'invalid.token',
  malformed: 'only.twoparts',
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
  MOCK_TOKENS,
  MOCK_USER_PAYLOADS,
  JWT_MOCK_CONFIG,
  AUTH_HEADERS,
};
