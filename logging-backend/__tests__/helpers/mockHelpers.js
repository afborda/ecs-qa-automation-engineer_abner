/**
 * Mock Helpers
 * Funções para configurar comportamentos de mocks Jest
 * Trabalha com jsonwebtoken mock e dados de mockData.js
 */

const jwt = require('jsonwebtoken');
const request = require('supertest');
const axios = require('axios');

const { MOCK_TOKENS, MOCK_USER_PAYLOADS, JWT_MOCK_CONFIG } = require('../fixtures/mockData');

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

module.exports = {
  mockValidUser,
  mockValidJWTSign,
  mockExpiredToken,
  mockInvalidToken,
  mockTokenDecode,
  mockInvalidDecode,
  setupIntegrationAuth,
  resetAllMocks,
  jwt,
  request,
  axios
};
