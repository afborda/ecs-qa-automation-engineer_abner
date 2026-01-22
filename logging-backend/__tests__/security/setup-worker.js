/**
 * Setup Específico para Testes de Security
 *
 * Habilita o worker para testes que precisam verificar
 * o processamento de payloads (Payload Size Validation, Response Validation)
 */

// Habilitar worker para estes testes
process.env.ENABLE_WORKER_FOR_TESTS = 'true';
delete process.env.DISABLE_WORKER;

console.log('✅ Worker habilitado para testes de security (XSS payload validation)');
