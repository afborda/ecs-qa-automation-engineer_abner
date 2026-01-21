const jwt = require('jsonwebtoken');

const mockValidUser = () => {
  jwt.verify.mockReturnValue({ user: 'qa' });
};

const mockValidJWTSign = (token = 'valid.jwt.token') => {
  jwt.sign.mockReturnValue(token);
};

const mockExpiredToken = () => {
  jwt.verify.mockImplementation(() => {
    throw new Error('jwt expired');
  });
};

const mockInvalidToken = () => {
  jwt.verify.mockImplementation(() => {
    throw new Error('invalid signature');
  });
};

const mockTokenDecode = (payload = { user: 'qa-tester', iat: 1234567, exp: 1234572 }) => {
  jwt.decode.mockReturnValue(payload);
};

const mockInvalidDecode = () => {
  jwt.decode.mockReturnValue(null);
};

const setupIntegrationAuth = () => {
  mockValidUser();
  mockValidJWTSign();
};

module.exports = {
  mockValidUser,
  mockValidJWTSign,
  mockExpiredToken,
  mockInvalidToken,
  mockTokenDecode,
  mockInvalidDecode,
  setupIntegrationAuth,
  jwt
};
