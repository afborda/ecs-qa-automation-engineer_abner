// Jest configuration dinâmica baseada no ambiente

module.exports = {
  // ============================================
  // Performance & Paralelização
  // ============================================

  // Ambiente: Node.js (não browser)
  testEnvironment: 'node',

  /**
   * Workers = processos paralelos do Jest
   * CI: 100% dos cores | Local: 75% (deixa margem)
   */
  maxWorkers: process.env.CI ? '100%' : '75%',

  /**
   * Concurrency = testes simultâneos POR worker
   * Previne rate limiting e timeouts
   */
  maxConcurrency: 10,

  // ============================================
  // Cache & Otimização
  // ============================================

  /**
   * Cache agressivo para re-runs
   * Acelera re-runs em ~30-40%
   */
  cache: true,
  cacheDirectory: '.jest-cache',

  // ============================================
  // Timeouts & Cleanup
  // ============================================

  /**
   * Timeout aumentado para 30s
   * Cobre testes XSS com polling + retry logic
   */
  testTimeout: 30000,

  // Padrão de pastas de teste
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.spec.js',
  ],

  // Limpar mocks entre testes (previne mock leakage)
  clearMocks: true,

  // NÃO resetar mocks (preserva custom matchers)
  resetMocks: false,

  // Restaurar implementação original após testes
  restoreMocks: true,

  // ============================================
  // Debugging & Mefalse,  // Desabilitado por padrão (usar test:coverage)Leaks
  // ============================================

  /**
   * Detectar handles abertos (ativar com DETECT_LEAKS=true)
   * ⚠️ Muito lento, usar apenas para debug
   */
  detectOpenHandles: process.env.DETECT_LEAKS === 'true',
  detectLeaks: process.env.DETECT_LEAKS === 'true',

  /**
   * NUNCA forçar exit
   * Leaks devem ser corrigidos, não mascarados
   */
  forceExit: false,

  // ============================================
  // Setup & Test Patterns
  // ============================================

  // Setup file
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],

  // Coverage (desabilitado por padrão - usar test:coverage)
  collectCoverage: false,
  collectCoverageFrom: [
    'index.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'html', 'lcov', 'json-summary'],
  coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/', '/coverage/'],

  // Thresholds (será mais flexível no começo)
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

  // Verbose desabilitado (ativar com --verbose)
  verbose: false,

  // Suprimir warnings em CI
  silent: process.env.CI === 'true',

  // ============================================
  // Transform (nenhum necessário para Node.js 18+)
  // ============================================

  transform: {},
  transformIgnorePatterns: ['/node_modules/'],
};
