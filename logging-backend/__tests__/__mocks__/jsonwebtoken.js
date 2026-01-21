const mockJWT = {
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

module.exports = mockJWT;
