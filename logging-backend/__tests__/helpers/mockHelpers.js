
const jwt = require('jsonwebtoken');
const request = require('supertest');
const axios = require('axios');

const { MOCK_TOKENS, MOCK_USER_PAYLOADS, JWT_MOCK_CONFIG, REAL_JWT_CONFIG } = require('../fixtures/mockData');

/**
 * Configure JWT mock for valid token with default payload
 */
const mockValidUser = (overrides = {}) => {
  jwt.verify.mockReturnValue({
    ...MOCK_USER_PAYLOADS.validUser,
    ...overrides,
  });
};

/**
 * Configure jwt.sign mock to return valid token
 */
const mockValidJWTSign = (token = MOCK_TOKENS.valid) => {
  jwt.sign.mockReturnValue(token);
};

/**
 * Simulates expired token
 */
const mockExpiredToken = () => {
  jwt.verify.mockImplementation(() => {
    throw JWT_MOCK_CONFIG.verify.expiredError;
  });
};

/**
 * Simulates invalid token
 */
const mockInvalidToken = () => {
  jwt.verify.mockImplementation(() => {
    throw JWT_MOCK_CONFIG.verify.invalidError;
  });
};

/**
 * Configure jwt.decode mock with specific payload
 */
const mockTokenDecode = (payload = MOCK_USER_PAYLOADS.expiredPayload) => {
  jwt.decode.mockReturnValue(payload);
};

/**
 * Simulates invalid decode (malformed token)
 */
const mockInvalidDecode = () => {
  jwt.decode.mockReturnValue(null);
};

/**
 * Setup for integration tests with valid authentication
 */
const setupIntegrationAuth = () => {
  mockValidUser();
  mockValidJWTSign();
};

/**
 * Resets all mocks to clean state
 */
const resetAllMocks = () => {
  jest.resetModules();
  jest.clearAllMocks();
};

const generateRealToken = (payload = REAL_JWT_CONFIG.payloads.validUser, expiresIn = REAL_JWT_CONFIG.expiry.valid) => {
  // Use the real lib, not the mock
  const realJwt = jest.requireActual('jsonwebtoken');
  return realJwt.sign(payload, REAL_JWT_CONFIG.secret, { expiresIn });
};

/**
 * Generates a JWT token that expires quickly (for expiration tests)
 * @returns {string} Token that expires in 1 second
 */
const generateShortLivedToken = () => {
  return generateRealToken(REAL_JWT_CONFIG.payloads.validUser, REAL_JWT_CONFIG.expiry.short);
};

/**
 * Generates an already expired JWT token
 * @returns {string} Expired token
 */
const generateExpiredToken = () => {
  return generateRealToken(REAL_JWT_CONFIG.payloads.validUser, REAL_JWT_CONFIG.expiry.expired);
};

const tamperTokenPayload = (validToken) => {
  const [header, , signature] = validToken.split('.');
  const tamperedPayload = Buffer.from(JSON.stringify(REAL_JWT_CONFIG.payloads.tamperedAdmin)).toString('base64url');
  return `${header}.${tamperedPayload}.${signature}`;
};

const getMalformedTokens = () => REAL_JWT_CONFIG.malformedTokens;

const getJwtSecret = () => REAL_JWT_CONFIG.secret;

module.exports = {
  // Mock functions (JWT mocked)
  mockValidUser,
  mockValidJWTSign,
  mockExpiredToken,
  mockInvalidToken,
  mockTokenDecode,
  mockInvalidDecode,
  setupIntegrationAuth,
  resetAllMocks,

  // Real JWT functions (for security tests)
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
