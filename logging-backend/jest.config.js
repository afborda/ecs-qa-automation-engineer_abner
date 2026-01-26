// Jest dynamic configuration based on environment

module.exports = {
  // ============================================
  // Performance & Parallelization
  // ============================================

  // Environment: Node.js (not browser)
  testEnvironment: 'node',

  /**
   * Workers = Jest parallel processes
   * CI: 100% of cores | Local: 75% (leaves margin)
   */
  maxWorkers: process.env.CI ? '100%' : '75%',

  /**
   * Concurrency = simultaneous tests PER worker
   * Prevents rate limiting and timeouts
   */
  maxConcurrency: 10,

  // ============================================
  // Cache & Optimization
  // ============================================

  /**
   * Aggressive cache for re-runs
   * Speeds up re-runs by ~30-40%
   */
  cache: true,
  cacheDirectory: '.jest-cache',

  // ============================================
  // Timeouts & Cleanup
  // ============================================

  /**
   * Timeout increased to 30s
   * Covers XSS tests with polling + retry logic
   */
  testTimeout: 30000,

  // Test folder patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.spec.js',
  ],

  // Clear mocks between tests (prevents mock leakage)
  clearMocks: true,

  // DO NOT reset mocks (preserves custom matchers)
  resetMocks: false,

  // Restore original implementation after tests
  restoreMocks: true,

  // ============================================
  // Debugging & Memory Leaks
  // ============================================

  /**
   * Detect open handles (enable with DETECT_LEAKS=true)
   * ⚠️ Very slow, use only for debug
   */
  detectOpenHandles: process.env.DETECT_LEAKS === 'true',
  detectLeaks: process.env.DETECT_LEAKS === 'true',

  /**
   * NEVER force exit
   * Leaks must be fixed, not masked
   */
  forceExit: false,

  // ============================================
  // Setup & Test Patterns
  // ============================================

  // Setup file
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],

  // Coverage (disabled by default - use test:coverage)
  collectCoverage: false,
  collectCoverageFrom: [
    'index.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'html', 'lcov', 'json-summary'],
  coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/', '/coverage/'],

  // Thresholds (more flexible at the beginning)
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },

  // ============================================
  // Reporters & Output
  // ============================================

  // Verbose disabled (enable with --verbose)
  verbose: false,

  // Suppress warnings in CI
  silent: process.env.CI === 'true',

  // ============================================
  // Transform (none needed for Node.js 18+)
  // ============================================

  transform: {},
  transformIgnorePatterns: ['/node_modules/'],
};
