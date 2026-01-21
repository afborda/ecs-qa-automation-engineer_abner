const {
  mockValidJWTSign,
  mockInvalidToken,
  mockExpiredToken,
  mockTokenDecode,
  mockInvalidDecode,
  jwt
} = require('../helpers/authMocks');

const { TOKENS, TEST_USERS } = require('../fixtures/testData');

describe('JWT Authentication', () => {

  describe('Token Generation', () => {
    it('should generate token with payload', () => {
      const payload = TEST_USERS.qa;
      const secret = 'secret-key';
      const expiresIn = '5s';
      const expectedToken = 'mock.jwt.token';

      mockValidJWTSign(expectedToken);

      const token = jwt.sign(payload, secret, { expiresIn });

      expect(token).toBe(expectedToken);
      expect(jwt.sign).toHaveBeenCalledTimes(1);
      expect(jwt.sign).toHaveBeenCalledWith(payload, secret, { expiresIn });
    });

    it('should generate different token for each call', () => {
      jwt.sign.mockReturnValueOnce('token-1');
      jwt.sign.mockReturnValueOnce('token-2');

      const token1 = jwt.sign(TEST_USERS.qa, 'secret', { expiresIn: '5s' });
      const token2 = jwt.sign({ user: 'user2' }, 'secret', { expiresIn: '5s' });

      expect(token1).toBe('token-1');
      expect(token2).toBe('token-2');
      expect(jwt.sign).toHaveBeenCalledTimes(2);
    });
  });

  describe('Token Verification', () => {
    it('should validate valid token', () => {
      const validToken = TOKENS.valid;
      const secret = 'secret-key';
      const decoded = { ...TEST_USERS.qa, iat: 1234567 };

      jwt.verify.mockReturnValue(decoded);

      const result = jwt.verify(validToken, secret);

      expect(result).toEqual(decoded);
      expect(jwt.verify).toHaveBeenCalledWith(validToken, secret);
    });

    it('should reject invalid token with error', () => {
      const invalidToken = TOKENS.invalid;
      const secret = 'secret-key';

      mockInvalidToken();

      expect(() => {
        jwt.verify(invalidToken, secret);
      }).toThrow('invalid signature');

      expect(jwt.verify).toHaveBeenCalledWith(invalidToken, secret);
    });

    it('should reject expired token', () => {
      const expiredToken = TOKENS.expired;

      mockExpiredToken();

      expect(() => {
        jwt.verify(expiredToken, 'secret');
      }).toThrow('jwt expired');
    });
  });

  describe('Token Decoding', () => {
    it('should decode token WITHOUT validating signature', () => {
      const token = TOKENS.valid;
      const expectedDecoded = {
        ...TEST_USERS.qa,
        iat: 1234567,
        exp: 1234572,
      };

      mockTokenDecode(expectedDecoded);

      const result = jwt.decode(token);

      expect(result).toEqual(expectedDecoded);
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('should return null if token is invalid', () => {
      mockInvalidDecode();

      const result = jwt.decode('invalid');

      expect(result).toBeNull();
    });
  });

  describe('Mock Call Tracking', () => {
    it('should track how many times jwt.sign was called', () => {
      mockValidJWTSign('token');

      jwt.sign({ user: 'user1' }, 'secret', {});
      jwt.sign({ user: 'user2' }, 'secret', {});
      jwt.sign({ user: 'user3' }, 'secret', {});

      expect(jwt.sign).toHaveBeenCalledTimes(3);
    });

    it('should verify last mock call', () => {
      mockValidJWTSign('token');

      jwt.sign({ user: 'user1' }, 'secret', {});
      jwt.sign({ user: 'user2' }, 'secret', {});
      jwt.sign({ user: 'user3' }, 'secret', {});

      expect(jwt.sign).toHaveBeenLastCalledWith(
        { user: 'user3' },
        'secret',
        {}
      );
    });

    it('should verify nth mock call', () => {
      mockValidJWTSign('token');

      jwt.sign({ user: 'user1' }, 'secret', {});
      jwt.sign({ user: 'user2' }, 'secret', {});
      jwt.sign({ user: 'user3' }, 'secret', {});

      expect(jwt.sign).toHaveBeenNthCalledWith(
        2,
        { user: 'user2' },
        'secret',
        {}
      );
    });

    it('should verify mock was returned with specific value', () => {
      const expectedToken = 'token-success';
      mockValidJWTSign(expectedToken);

      const result = jwt.sign(TEST_USERS.qa, 'secret', {});

      expect(jwt.sign).toHaveReturned();
      expect(jwt.sign).toHaveReturnedWith(expectedToken);
      expect(result).toBe(expectedToken);
    });
  });

});
