/**
 * Setup Específico para Testes de Async Worker
 *
 * Este arquivo DEVE ser importado ANTES de index.js
 * para garantir que o worker esteja ativo.
 */

// Habilitar worker para estes testes
process.env.ENABLE_WORKER_FOR_TESTS = 'true';
delete process.env.DISABLE_WORKER;

console.log('✅ Worker habilitado para testes de integração do async worker');
