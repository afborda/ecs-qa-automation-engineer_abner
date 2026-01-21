const VALID_UUIDS = {
  correlationId: '123e4567-e89b-12d3-a456-426614174000',
  nonExistent: '99999999-9999-9999-9999-999999999999',
};

const TOKENS = {
  valid: 'header.payload.signature',
  expired: 'expired.token',
  invalid: 'invalid.token',
  malformed: 'only.twoparts',
};

const MESSAGES = {
  simple: 'Test log message',
  empty: '',
  large: 'x'.repeat(501),
  maxSize: 'x'.repeat(500),
};

const API_RESPONSES = {
  tokenResponse: {
    token: 'some.jwt.token',
    expiresIn: '5s',
  },
  logResponse: {
    status: 202,
    correlationId: VALID_UUIDS.correlationId,
    queued: true,
  },
  metricsResponse: {
    queued: 5,
    processed: 10,
    memoryUsageMB: 25,
  },
};

const LOG_STATUSES = {
  queued: 'QUEUED',
  processed: 'PROCESSED',
  failed: 'FAILED',
};

const TEST_USERS = {
  qa: { user: 'qa' },
  admin: { user: 'admin' },
  regular: { user: 'regular' },
};

module.exports = {
  VALID_UUIDS,
  TOKENS,
  MESSAGES,
  API_RESPONSES,
  LOG_STATUSES,
  TEST_USERS
};
