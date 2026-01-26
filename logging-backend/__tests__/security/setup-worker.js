
process.env.ENABLE_WORKER_FOR_TESTS = 'true';
delete process.env.DISABLE_WORKER;

console.log('✅ Worker enabled for security tests (XSS payload validation)');
