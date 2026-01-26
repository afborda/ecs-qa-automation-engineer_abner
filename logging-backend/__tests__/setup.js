
if (!process.env.ENABLE_WORKER_FOR_TESTS) {
  process.env.DISABLE_WORKER = 'true';
}

expect.extend({

  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} NOT to be valid UUID`
          : `expected ${received} to be valid UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx), got: ${received}`,
    };
  },

  toBeValidJWT(received) {
    if (typeof received !== 'string') {
      return {
        pass: false,
        message: () => `expected value to be a string, got ${typeof received}`,
      };
    }

    const parts = received.split('.');
    const pass = parts.length === 3 && parts.every(part => part.length > 0);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} NOT to be valid JWT`
          : `expected valid JWT format (header.payload.signature), got ${parts.length} parts: ${received}`,
    };
  },
});

const { TIMEOUTS } = require('./fixtures/testConstants');
jest.setTimeout(TIMEOUTS.REQUEST_TIMEOUT);

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.clearAllTimers();
  jest.restoreAllMocks();
});
