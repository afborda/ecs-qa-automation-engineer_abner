/**
 * Mock Helpers
 * Funções para configurar comportamentos de mocks Jest
 * Trabalha com jsonwebtoken mock e dados de mockData.js
 */

const jwt = require('jsonwebtoken');
const request = require('supertest');
const axios = require('axios');

const { MOCK_TOKENS, MOCK_USER_PAYLOADS, JWT_MOCK_CONFIG, REAL_JWT_CONFIG } = require('../fixtures/mockData');

// ============================================
// MOCK FUNCTIONS (JWT mockado pelo Jest)
// ============================================

/**
 * Configura mock de JWT para token válido com payload padrão
 */
const mockValidUser = (overrides = {}) => {
  jwt.verify.mockReturnValue({
    ...MOCK_USER_PAYLOADS.validUser,
    ...overrides,
  });
};

/**
 * Configura mock de jwt.sign para retornar token válido
 */
const mockValidJWTSign = (token = MOCK_TOKENS.valid) => {
  jwt.sign.mockReturnValue(token);
};

/**
 * Simula token expirado
 */
const mockExpiredToken = () => {
  jwt.verify.mockImplementation(() => {
    throw JWT_MOCK_CONFIG.verify.expiredError;
  });
};

/**
 * Simula token inválido
 */
const mockInvalidToken = () => {
  jwt.verify.mockImplementation(() => {
    throw JWT_MOCK_CONFIG.verify.invalidError;
  });
};

/**
 * Configura mock de jwt.decode com payload específico
 */
const mockTokenDecode = (payload = MOCK_USER_PAYLOADS.expiredPayload) => {
  jwt.decode.mockReturnValue(payload);
};

/**
 * Simula decode inválido (token malformado)
 */
const mockInvalidDecode = () => {
  jwt.decode.mockReturnValue(null);
};

/**
 * Setup para testes de integração com autenticação válida
 */
const setupIntegrationAuth = () => {
  mockValidUser();
  mockValidJWTSign();
};

/**
 * Reseta todos os mocks para estado limpo
 */
const resetAllMocks = () => {
  jest.resetModules();
  jest.clearAllMocks();
};

// ============================================
// REAL JWT FUNCTIONS (para testes de segurança)
// Geram tokens REAIS usando a secret do backend
// ============================================

/**
 * Gera um token JWT real válido
 * @param {Object} payload - Payload do token (default: { user: 'qa' })
 * @param {string} expiresIn - Tempo de expiração (default: '1h')
 * @returns {string} Token JWT real
 */
const generateRealToken = (payload = REAL_JWT_CONFIG.payloads.validUser, expiresIn = REAL_JWT_CONFIG.expiry.valid) => {
  // Usa a lib real, não o mock
  const realJwt = jest.requireActual('jsonwebtoken');
  return realJwt.sign(payload, REAL_JWT_CONFIG.secret, { expiresIn });
};

/**
 * Gera um token JWT que expira rapidamente (para testes de expiração)
 * @returns {string} Token que expira em 1 segundo
 */
const generateShortLivedToken = () => {
  return generateRealToken(REAL_JWT_CONFIG.payloads.validUser, REAL_JWT_CONFIG.expiry.short);
};

/**
 * Gera um token JWT já expirado
 * @returns {string} Token expirado
 */
const generateExpiredToken = () => {
  return generateRealToken(REAL_JWT_CONFIG.payloads.validUser, REAL_JWT_CONFIG.expiry.expired);
};

/**
 * Gera um token com payload adulterado (para testar validação de assinatura)
 * @param {string} validToken - Token válido para adulterara
 * @returns {string} Token com payload modificado mas assinatura original
 */
const tamperTokenPayload = (validToken) => {
  const [header, , signature] = validToken.split('.');
  const tamperedPayload = Buffer.from(JSON.stringify(REAL_JWT_CONFIG.payloads.tamperedAdmin)).toString('base64url');
  return `${header}.${tamperedPayload}.${signature}`;
};

/**
 * Retorna tokens malformados para testes de validação
 * @returns {Object} Objeto com diferentes tipos de tokens inválidos
 */
const getMalformedTokens = () => REAL_JWT_CONFIG.malformedTokens;

/**
 * Retorna a secret do JWT (para testes que precisam gerar tokens diretamente)
 * @returns {string} JWT Secret
 */
const getJwtSecret = () => REAL_JWT_CONFIG.secret;

module.exports = {
  // Mock functions (JWT mockado)
  mockValidUser,
  mockValidJWTSign,
  mockExpiredToken,
  mockInvalidToken,
  mockTokenDecode,
  mockInvalidDecode,
  setupIntegrationAuth,
  resetAllMocks,

  // Real JWT functions (para testes de segurança)
  generateRealToken,
  generateShortLivedToken,
  generateExpiredToken,
  tamperTokenPayload,
  getMalformedTokens,
  getJwtSecret,

  // Re-exports
  jwt,
  request,
  axios,
  REAL_JWT_CONFIG,
};
