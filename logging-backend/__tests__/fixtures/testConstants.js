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
// Timeouts (em milissegundos)
// ============================================
const TIMEOUTS = {
  // JWT expiration
  JWT_EXPIRY_WAIT: 2000,      // Aguardar 2s (token com 1s expira)
  JWT_EXPIRY_FULL_WAIT: 6000, // Aguardar 6s (token de 5s expira)
  JWT_EXPIRY_TEST_TIMEOUT: 5000, // Timeout do teste

  // Server startup
  SERVER_START_WAIT: 3000,    // 3s para servidor iniciar

  // E2E Polling
  POLLING_INTERVAL: 500,      // Intervalo entre tentativas de polling
  POLLING_MAX_WAIT: 15000,    // Timeout máximo para polling
  WORKER_PROCESSING_DELAY: 2000, // Delay do worker processar logs

  // Request timeouts
  REQUEST_TIMEOUT: 30000,     // 30s padrão
  SLOW_TEST_TIMEOUT: 60000,   // 60s para testes lentos
  E2E_WORKFLOW_TIMEOUT: 10000, // 10s para fluxo E2E completo
  E2E_CONCURRENT_TIMEOUT: 20000, // 20s para testes concorrentes
  REMOTE_WORKFLOW_TIMEOUT: 20000, // 20s para testes remotos
};

// ============================================
// Payload Sizes
// ============================================
const PAYLOAD_SIZES = {
  MAX_MESSAGE: 500,           // Máximo de caracteres por mensagem
  LARGE_MESSAGE: 501,         // Acima do limite
  EMPTY: 0,
  SMALL: 50,
  MEDIUM: 250,
  HEADER_BLOAT: 200,          // Usado para inflar headers (Ex.: Authorization)
  VERY_LARGE: 10000,          // Payload muito grande para testes de robustez
  XSS_PAYLOAD_REPEAT: 100,    // Repetições para payloads XSS (<script> loops)
  XSS_PAYLOAD_SHORT: 50,      // Repetições curtas para XSS (imagens, eventos)
  EXTREME_PAYLOAD: 1000000,   // Payload extremo (1M chars) para testes de limite HTTP
};

// ============================================
// Rate Limiting
// ============================================
const RATE_LIMITING = {
  REQUESTS_PER_MINUTE: 100,   // Default rate limit
  CI_RATE_LIMIT: 500,         // Rate limit para testes CI
  TEST_DELAY_BETWEEN_REQUESTS: 100, // ms entre requests
  OVER_LIMIT_EXCESS: 10,      // Requests acima do limite para teste
};

// ============================================
// E2E Constants
// ============================================
const E2E = {
  POLLING_MAX_ATTEMPTS: 10,   // Máximo de tentativas de polling
  CONCURRENT_REQUESTS: 5,     // Número de requests simultâneos
  RANDOM_JITTER_MAX: 500,     // Jitter aleatório máximo (ms)
};

// ============================================
// JWT Token Timing
// ============================================
const JWT_TIMING = {
  TOKEN_LIFETIME_SHORT: '1s',    // Para testes rápidos
  TOKEN_LIFETIME_NORMAL: '5s',   // Lifetime padrão do backend
  TOKEN_LIFETIME_LONG: '1h',     // Para testes gerais
  TOKEN_EXPIRED: '-1s',          // Já expirado
};

module.exports = {
  HTTP_STATUS,
  TIMEOUTS,
  PAYLOAD_SIZES,
  RATE_LIMITING,
  JWT_TIMING,
  E2E,
};
