// Jest configuration dinâmica baseada no ambiente
const os = require('os');
const cpuCount = os.cpus().length;

module.exports = {
  // Ambiente: Node.js (não browser)
  testEnvironment: 'node',

  // Aumentar timeout para testes com async worker
  testTimeout: 20000,  // 20 segundos (para polling do async worker)

  // Padrão de pastas de teste
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.spec.js',
  ],

  // Limpar mocks entre testes
  clearMocks: true,

  // Restaurar implementação original após testes
  restoreMocks: true,

  // Setup file
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],

  // Coverage
  collectCoverage: true,
  collectCoverageFrom: [
    'index.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'html', 'lcov'],

  // Thresholds (será mais flexível no começo)
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },

  // Parallelização dinâmica baseada no ambiente
  maxWorkers: process.env.CI
    ? '100%'                    // CI: usar todos os cores
    : Math.max(cpuCount - 1, 1), // Local: deixar 1 core livre
  maxConcurrency: 10,  // Até 10 testes concorrentes por worker

  // Verbose (mostra cada teste)
  verbose: true,
};
