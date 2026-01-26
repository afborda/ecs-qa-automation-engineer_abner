// ============================================
// HTTP Status Codes
// ============================================
const HTTP_STATUS = {
  OK: 200,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  UNSUPPORTED_MEDIA_TYPE: 415,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

// ============================================
// Timeouts (in milliseconds)
// ============================================
const TIMEOUTS = {
  // JWT expiration
  JWT_EXPIRY_WAIT: 2000,      // Wait 2s (token with 1s expires)
  JWT_EXPIRY_FULL_WAIT: 6000, // Wait 6s (5s token expires)
  JWT_EXPIRY_TEST_TIMEOUT: 5000, // Test timeout

  // Server startup
  SERVER_START_WAIT: 3000,    // 3s for server to start

  // E2E Polling
  POLLING_INTERVAL: 500,      // Interval between polling attempts
  POLLING_MAX_WAIT: 15000,    // Maximum timeout for polling
  WORKER_PROCESSING_DELAY: 2000, // Delay for worker processing logs

  // Request timeouts
  REQUEST_TIMEOUT: 30000,     // 30s default
  SLOW_TEST_TIMEOUT: 60000,   // 60s for slow tests
  E2E_WORKFLOW_TIMEOUT: 10000, // 10s for complete E2E flow
  E2E_CONCURRENT_TIMEOUT: 20000, // 20s for concurrent tests
  REMOTE_WORKFLOW_TIMEOUT: 20000, // 20s for remote tests
};

// ============================================
// Payload Sizes
// ============================================
const PAYLOAD_SIZES = {
  MAX_MESSAGE: 500,           // Maximum characters per message
  LARGE_MESSAGE: 501,         // Above the limit
  EMPTY: 0,
  SMALL: 50,
  MEDIUM: 250,
  HEADER_BLOAT: 200,          // Used to inflate headers (e.g., Authorization)
  VERY_LARGE: 10000,          // Very large payload for robustness tests
  XSS_PAYLOAD_REPEAT: 100,    // Repetitions for XSS payloads (<script> loops)
  XSS_PAYLOAD_SHORT: 50,      // Short repetitions for XSS (images, events)
  EXTREME_PAYLOAD: 1000000,   // Extreme payload (1M chars) for HTTP limit tests
};

// ============================================
// Rate Limiting
// ============================================
const RATE_LIMITING = {
  REQUESTS_PER_MINUTE: 100,   // Default rate limit
  CI_RATE_LIMIT: 500,         // Rate limit for CI tests
  TEST_DELAY_BETWEEN_REQUESTS: 100, // ms between requests
  OVER_LIMIT_EXCESS: 10,      // Requests above limit for testing
};

// ============================================
// E2E Constants
// ============================================
const E2E = {
  POLLING_MAX_ATTEMPTS: 10,   // Maximum polling attempts
  CONCURRENT_REQUESTS: 5,     // Number of simultaneous requests
  RANDOM_JITTER_MAX: 500,     // Maximum random jitter (ms)
};

// ============================================
// JWT Token Timing
// ============================================
const JWT_TIMING = {
  TOKEN_LIFETIME_SHORT: '1s',    // For quick tests
  TOKEN_LIFETIME_NORMAL: '5s',   // Backend default lifetime
  TOKEN_LIFETIME_LONG: '1h',     // For general tests
  TOKEN_EXPIRED: '-1s',          // Already expired
};

module.exports = {
  HTTP_STATUS,
  TIMEOUTS,
  PAYLOAD_SIZES,
  RATE_LIMITING,
  JWT_TIMING,
  E2E,
};
