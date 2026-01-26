
const waitForCondition = async (
  condition,
  options = {}
) => {
  const { maxAttempts = 20, delayMs = 100 } = options;

  for (let i = 0; i < maxAttempts; i++) {
    if (await condition()) {
      return true;
    }

    if (i < maxAttempts - 1) {
      await sleep(delayMs);
    }
  }

  throw new Error(
    `Condition not met after ${maxAttempts} attempts (${maxAttempts * delayMs}ms)`
  );
};

const pollWithBackoff = async (fn, options = {}) => {
  const { maxAttempts = 20, initialDelayMs = 50 } = options;
  let lastError;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (i < maxAttempts - 1) {
        // Exponential backoff: 50ms, 75ms, 112ms, 168ms, etc
        const delay = initialDelayMs * Math.pow(1.5, i);
        await sleep(delay);
      }
    }
  }

  const totalTime = initialDelayMs * (Math.pow(1.5, maxAttempts) - 1) / 0.5;
  throw new Error(
    `Failed after ${maxAttempts} attempts (~${Math.round(totalTime)}ms): ${lastError.message}`
  );
};

const pollWithFixedDelay = async (fn, options = {}) => {
  const { maxAttempts = 20, delayMs = 500 } = options;
  let lastError;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (i < maxAttempts - 1) {
        await sleep(delayMs);
      }
    }
  }

  throw new Error(
    `Failed after ${maxAttempts} attempts (${maxAttempts * delayMs}ms): ${lastError.message}`
  );
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  waitForCondition,
  pollWithBackoff,
  pollWithFixedDelay,
  sleep,
};
