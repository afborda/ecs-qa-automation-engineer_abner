const originalSetInterval = global.setInterval;
const intervalHandles = [];
const setIntervalSpy = jest
  .spyOn(global, 'setInterval')
  .mockImplementation((fn, ms, ...args) => {
    const handle = originalSetInterval(fn, ms, ...args);
    intervalHandles.push(handle);
    return handle;
  });

afterAll(() => {
  intervalHandles.forEach((handle) => clearInterval(handle));
  setIntervalSpy.mockRestore();
});

expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} NOT to be valid UUID`
          : `expected ${received} to be valid UUID`,
    };
  },

  toBeValidJWT(received) {
    const parts = received.split('.');
    const pass = parts.length === 3;

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} NOT to be valid JWT`
          : `expected ${received} to be valid JWT (format: header.payload.signature)`,
    };
  },
});

jest.setTimeout(10000);
