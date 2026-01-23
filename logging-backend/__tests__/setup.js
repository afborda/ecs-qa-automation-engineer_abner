/**
 * Jest Global Setup
 * Configurações aplicadas a TODOS os testes da suite
 *
 * Responsabilidades:
 * 1. Custom matchers (UUID, JWT)
 * 2. Timeout padrão para testes async
 * 3. Reset de mocks entre testes
 * 4. Cleanup de recursos após testes
 */

// ============================================
// SEÇÃO 0: Environment Configuration
// ============================================
/**
 * Desabilita worker do backend em testes para prevenir:
 * - Memory leaks (setInterval nunca limpo)
 * - Jest não sair após testes
 * - Operações assíncronas órfãs
 *
 * ⚠️ NOTA: Testes de integração que PRECISAM do worker devem
 * deletar esta variável ANTES de importar index.js
 */
if (!process.env.ENABLE_WORKER_FOR_TESTS) {
  process.env.DISABLE_WORKER = 'true';
}

// ============================================
// SEÇÃO 1: Custom Matchers
// ============================================
/**
 * Matchers customizados para validação de formatos
 * Uso: expect(value).toBeValidUUID()
 */
expect.extend({
  /**
   * Valida formato UUID v4
   * @example expect('123e4567-e89b-12d3-a456-426614174000').toBeValidUUID()
   */
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

  /**
   * Valida formato JWT (3 partes separadas por ponto)
   * @example expect('header.payload.signature').toBeValidJWT()
   */
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

// ============================================
// SEÇÃO 2: Global Configuration
// ============================================
/**
 * Timeout padrão: 30 segundos
 * Razão: Testes async com polling podem levar até 25s (worker com 30% failure rate)
 * Testes específicos podem sobrescrever com jest.setTimeout() local
 */
const { TIMEOUTS } = require('./fixtures/testConstants');
jest.setTimeout(TIMEOUTS.REQUEST_TIMEOUT);

// ============================================
// SEÇÃO 3: Mock Reset Between Tests
// ============================================
/**
 * Limpa mocks entre cada teste para garantir isolamento
 * Usa clearAllMocks() em vez de resetAllMocks() para preservar implementações
 */
beforeEach(() => {
  jest.clearAllMocks();
  // NÃO usar jest.resetAllMocks() - pode resetar implementações de custom matchers
});

// ============================================
// SEÇÃO 4: Global Cleanup After All Tests
// ============================================
/**
 * Cleanup final após TODOS os testes
 * Previne memory leaks de timers/listeners não limpos
 */
afterAll(() => {
  // Limpar todos os timers pendentes
  jest.clearAllTimers();

  // Restaurar todas as implementações mockadas
  jest.restoreAllMocks();
});
