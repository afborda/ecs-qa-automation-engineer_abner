#!/usr/bin/env node
/**
 * =============================================================================
 * Extract Security Metrics from Jest Results
 * =============================================================================
 *
 * Este script extrai métricas de segurança do resultado do Jest e gera um
 * arquivo JSON para ser consumido pelo publish-metrics.js
 *
 * USO:
 *   node scripts/extract-security-metrics.js
 *
 * OPÇÕES (via env):
 *   JEST_RESULTS_FILE    - Arquivo JSON do Jest (default: test-results.json)
 *   SECURITY_OUTPUT_FILE - Arquivo de saída (default: security-results.json)
 *
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// CONFIGURAÇÃO
// =============================================================================

const config = {
  jestResultsFile: process.env.JEST_RESULTS_FILE || 'test-results.json',
  outputFile: process.env.SECURITY_OUTPUT_FILE || 'security-results.json',
};

// =============================================================================
// CATEGORIAS DE SEGURANÇA
// =============================================================================

const securityCategories = {
  auth: [
    'auth',
    'authentication',
    'token',
    'jwt',
    'bearer',
    'unauthorized',
    '401',
    'login',
    'credential',
  ],
  injection: [
    'injection',
    'sql',
    'nosql',
    'command',
    'ldap',
    'xpath',
    'sanitiz',
  ],
  xss: [
    'xss',
    'cross-site',
    'script',
    'html',
    'escape',
    'encoding',
  ],
  rateLimit: [
    'rate',
    'limit',
    'throttle',
    'dos',
    'ddos',
    '429',
    'too many',
  ],
  headers: [
    'header',
    'cors',
    'csp',
    'content-security',
    'x-frame',
    'x-content-type',
    'hsts',
    'strict-transport',
  ],
};

// =============================================================================
// FUNÇÕES
// =============================================================================

/**
 * Lê o arquivo JSON de resultados do Jest
 */
function readJestResults() {
  const filePath = path.resolve(process.cwd(), config.jestResultsFile);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Arquivo Jest não encontrado: ${filePath}`);
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Erro ao ler Jest results: ${error.message}`);
    return null;
  }
}

/**
 * Verifica se um teste é de segurança
 */
function isSecurityTest(testName, filePath) {
  const combined = `${testName} ${filePath}`.toLowerCase();
  return combined.includes('security') ||
         combined.includes('seguranca') ||
         combined.includes('owasp') ||
         Object.values(securityCategories).some(keywords =>
           keywords.some(keyword => combined.includes(keyword))
         );
}

/**
 * Categoriza um teste de segurança
 */
function categorizeTest(testName) {
  const name = testName.toLowerCase();

  for (const [category, keywords] of Object.entries(securityCategories)) {
    if (keywords.some(keyword => name.includes(keyword))) {
      return category;
    }
  }

  return 'other';
}

/**
 * Extrai métricas de segurança dos resultados do Jest
 */
function extractSecurityMetrics(jestResults) {
  if (!jestResults || !jestResults.testResults) {
    return {
      authTestsPassed: 0,
      injectionTestsPassed: 0,
      xssTestsPassed: 0,
      rateLimitTestsPassed: 0,
      headersTestsPassed: 0,
      totalTests: 0,
      testsPassed: 0,
      testsFailed: 0,
      details: [],
    };
  }

  const metrics = {
    auth: { passed: 0, failed: 0 },
    injection: { passed: 0, failed: 0 },
    xss: { passed: 0, failed: 0 },
    rateLimit: { passed: 0, failed: 0 },
    headers: { passed: 0, failed: 0 },
    other: { passed: 0, failed: 0 },
  };

  const details = [];

  for (const testFile of jestResults.testResults) {
    const filePath = testFile.name || '';

    for (const test of testFile.assertionResults || []) {
      const testName = test.fullName || test.title || '';

      if (isSecurityTest(testName, filePath)) {
        const category = categorizeTest(testName);
        const status = test.status === 'passed' ? 'passed' : 'failed';

        metrics[category][status]++;

        details.push({
          name: testName,
          category,
          status,
          file: path.basename(filePath),
        });
      }
    }
  }

  const totalPassed = Object.values(metrics).reduce((sum, m) => sum + m.passed, 0);
  const totalFailed = Object.values(metrics).reduce((sum, m) => sum + m.failed, 0);

  return {
    authTestsPassed: metrics.auth.passed,
    injectionTestsPassed: metrics.injection.passed,
    xssTestsPassed: metrics.xss.passed,
    rateLimitTestsPassed: metrics.rateLimit.passed,
    headersTestsPassed: metrics.headers.passed,
    totalTests: totalPassed + totalFailed,
    testsPassed: totalPassed,
    testsFailed: totalFailed,
    details,
    breakdown: metrics,
  };
}

/**
 * Salva as métricas em arquivo JSON
 */
function saveMetrics(metrics) {
  const outputPath = path.resolve(process.cwd(), config.outputFile);

  try {
    fs.writeFileSync(outputPath, JSON.stringify(metrics, null, 2));
    console.log(`✅ Métricas de segurança salvas em: ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao salvar métricas: ${error.message}`);
    return false;
  }
}

// =============================================================================
// MAIN
// =============================================================================

function main() {
  console.log('🔒 Extract Security Metrics from Jest Results');
  console.log('==============================================');
  console.log(`   Input: ${config.jestResultsFile}`);
  console.log(`   Output: ${config.outputFile}`);
  console.log('');

  const jestResults = readJestResults();

  if (!jestResults) {
    console.log('⚠️  Nenhum resultado Jest encontrado. Gerando métricas vazias...');
  }

  const metrics = extractSecurityMetrics(jestResults);

  console.log('📊 Métricas extraídas:');
  console.log(`   Auth: ${metrics.authTestsPassed} passed`);
  console.log(`   Injection: ${metrics.injectionTestsPassed} passed`);
  console.log(`   XSS: ${metrics.xssTestsPassed} passed`);
  console.log(`   Rate Limit: ${metrics.rateLimitTestsPassed} passed`);
  console.log(`   Headers: ${metrics.headersTestsPassed} passed`);
  console.log(`   Total: ${metrics.testsPassed}/${metrics.totalTests}`);
  console.log('');

  if (saveMetrics(metrics)) {
    console.log('✅ Extração concluída com sucesso!');
  } else {
    process.exit(1);
  }
}

main();
