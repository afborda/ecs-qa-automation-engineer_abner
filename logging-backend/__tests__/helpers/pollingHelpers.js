/**
 * Polling and Retry Helpers
 * Padrões reutilizáveis para polling assíncrono com retry inteligente
 * Usado por testes de integração e segurança
 */

/**
 * Aguarda até que uma condição seja verdadeira
 * @param {Function} condition - Função que retorna Promise<boolean>
 * @param {Object} options - { maxAttempts: 20, delayMs: 100 }
 * @returns {Promise<boolean>}
 */
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

/**
 * Executa função com retry e backoff exponencial
 * @param {Function} fn - Função assíncrona a executar
 * @param {Object} options - { maxAttempts: 20, initialDelayMs: 50 }
 * @returns {Promise<T>}
 */
const pollWithBackoff = async (fn, options = {}) => {
  const { maxAttempts = 20, initialDelayMs = 50 } = options;
  let lastError;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (i < maxAttempts - 1) {
        // Backoff exponencial: 50ms, 75ms, 112ms, 168ms, etc
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

/**
 * Aguarda com retry fixo (delay constante)
 * @param {Function} fn - Função assíncrona a executar
 * @param {Object} options - { maxAttempts: 20, delayMs: 500 }
 * @returns {Promise<T>}
 */
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

/**
 * Helper para sleep (delay)
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  waitForCondition,
  pollWithBackoff,
  pollWithFixedDelay,
  sleep,
};
