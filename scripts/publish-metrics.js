#!/usr/bin/env node
/**
 * =============================================================================
 * Publish Metrics to Prometheus Pushgateway
 * =============================================================================
 *
 * Este script lê os resultados do Jest (JSON) e coverage (JSON), transforma
 * em métricas Prometheus e envia para o Pushgateway.
 *
 * COMO FUNCIONA:
 * 1. Lê o arquivo de resultado do Jest (--json --outputFile=results.json)
 * 2. Lê o arquivo de coverage (coverage/coverage-summary.json)
 * 3. Extrai métricas: total, passed, failed, duration, coverage
 * 4. Formata no padrão Prometheus (texto plano)
 * 5. Envia via HTTP POST para o Pushgateway
 *
 * USO:
 *   node scripts/publish-metrics.js [opções]
 *
 * OPÇÕES (via env):
 *   PUSHGATEWAY_URL   - URL do Pushgateway (default: http://localhost:9091)
 *   JEST_RESULTS_FILE - Arquivo JSON do Jest (default: test-results.json)
 *   COVERAGE_FILE     - Arquivo de coverage (default: coverage/coverage-summary.json)
 *   JOB_NAME          - Nome do job no Prometheus (default: qa-tests)
 *   BRANCH_NAME       - Nome da branch (default: main)
 *   BUILD_NUMBER      - Número do build (default: local)
 *
 * EXEMPLO:
 *   PUSHGATEWAY_URL=http://vps:9091 BRANCH_NAME=develop node scripts/publish-metrics.js
 *
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// =============================================================================
// CONFIGURAÇÃO
// =============================================================================

const config = {
  pushgatewayUrl: process.env.PUSHGATEWAY_URL || 'http://localhost:9091',
  jestResultsFile: process.env.JEST_RESULTS_FILE || 'test-results.json',
  coverageFile: process.env.COVERAGE_FILE || 'coverage/coverage-summary.json',
  securityResultsFile: process.env.SECURITY_RESULTS_FILE || 'security-results.json',
  jobName: process.env.JOB_NAME || 'qa-tests',
  branchName: process.env.BRANCH_NAME || process.env.GITHUB_REF_NAME || 'main',
  buildNumber: process.env.BUILD_NUMBER || process.env.GITHUB_RUN_NUMBER || 'local',
  instance: process.env.INSTANCE || 'ci',
};

// =============================================================================
// LEITURA DE ARQUIVOS
// =============================================================================

/**
 * Lê o arquivo JSON de resultados do Jest
 * @returns {Object} Resultados do Jest ou objeto vazio
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
 * Lê o arquivo JSON de coverage do Jest
 * @returns {Object} Coverage ou null
 */
function readCoverage() {
  const filePath = path.resolve(process.cwd(), config.coverageFile);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Arquivo coverage não encontrado: ${filePath}`);
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Erro ao ler coverage: ${error.message}`);
    return null;
  }
}

/**
 * Lê o arquivo JSON de resultados de segurança
 * @returns {Object} Security results ou null
 */
function readSecurityResults() {
  const filePath = path.resolve(process.cwd(), config.securityResultsFile);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Arquivo security não encontrado: ${filePath}`);
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Erro ao ler security results: ${error.message}`);
    return null;
  }
}

// =============================================================================
// EXTRAÇÃO DE MÉTRICAS
// =============================================================================

/**
 * Extrai métricas do resultado do Jest
 * @param {Object} jestResults - Resultado do Jest
 * @returns {Object} Métricas extraídas
 */
function extractJestMetrics(jestResults) {
  if (!jestResults) {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      passRate: 0,
      suites: 0,
      suitesPassed: 0,
    };
  }

  const total = jestResults.numTotalTests || 0;
  const passed = jestResults.numPassedTests || 0;
  const failed = jestResults.numFailedTests || 0;
  const skipped = jestResults.numPendingTests || 0;

  // Duração em segundos (Jest retorna em ms)
  const startTime = jestResults.startTime || Date.now();
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  // Taxa de sucesso
  const passRate = total > 0 ? (passed / total) * 100 : 0;

  // Suites
  const suites = jestResults.numTotalTestSuites || 0;
  const suitesPassed = jestResults.numPassedTestSuites || 0;

  return {
    total,
    passed,
    failed,
    skipped,
    duration,
    passRate,
    suites,
    suitesPassed,
  };
}

/**
 * Extrai métricas de coverage
 * @param {Object} coverage - Coverage do Jest
 * @returns {Object} Métricas de coverage
 */
function extractCoverageMetrics(coverage) {
  if (!coverage || !coverage.total) {
    return {
      lines: 0,
      statements: 0,
      functions: 0,
      branches: 0,
    };
  }

  const total = coverage.total;

  return {
    lines: total.lines?.pct || 0,
    statements: total.statements?.pct || 0,
    functions: total.functions?.pct || 0,
    branches: total.branches?.pct || 0,
  };
}

/**
 * Extrai métricas de segurança
 * @param {Object} securityResults - Resultados de testes de segurança
 * @returns {Object} Métricas de segurança
 */
function extractSecurityMetrics(securityResults) {
  if (!securityResults) {
    return {
      authTestsPassed: 0,
      injectionTestsPassed: 0,
      xssTestsPassed: 0,
      rateLimitTestsPassed: 0,
      headersTestsPassed: 0,
      totalTests: 0,
      testsPassed: 0,
      testsFailed: 0,
    };
  }

  return {
    authTestsPassed: securityResults.authTestsPassed || 0,
    injectionTestsPassed: securityResults.injectionTestsPassed || 0,
    xssTestsPassed: securityResults.xssTestsPassed || 0,
    rateLimitTestsPassed: securityResults.rateLimitTestsPassed || 0,
    headersTestsPassed: securityResults.headersTestsPassed || 0,
    totalTests: securityResults.totalTests || 0,
    testsPassed: securityResults.testsPassed || 0,
    testsFailed: securityResults.testsFailed || 0,
  };
}

// =============================================================================
// FORMATAÇÃO PROMETHEUS
// =============================================================================

/**
 * Gera métricas no formato Prometheus
 * @param {Object} jestMetrics - Métricas do Jest
 * @param {Object} coverageMetrics - Métricas de coverage
 * @param {Object} securityMetrics - Métricas de segurança
 * @returns {string} Texto no formato Prometheus
 */
function formatPrometheusMetrics(jestMetrics, coverageMetrics, securityMetrics) {
  const labels = `branch="${config.branchName}",build="${config.buildNumber}"`;

  const lines = [
    '# HELP qa_test_total Total number of tests',
    '# TYPE qa_test_total gauge',
    `qa_test_total{${labels}} ${jestMetrics.total}`,
    '',
    '# HELP qa_test_passed Number of passed tests',
    '# TYPE qa_test_passed gauge',
    `qa_test_passed{${labels}} ${jestMetrics.passed}`,
    '',
    '# HELP qa_test_failed Number of failed tests',
    '# TYPE qa_test_failed gauge',
    `qa_test_failed{${labels}} ${jestMetrics.failed}`,
    '',
    '# HELP qa_test_skipped Number of skipped tests',
    '# TYPE qa_test_skipped gauge',
    `qa_test_skipped{${labels}} ${jestMetrics.skipped}`,
    '',
    '# HELP qa_test_duration_seconds Duration of test suite in seconds',
    '# TYPE qa_test_duration_seconds gauge',
    `qa_test_duration_seconds{${labels}} ${jestMetrics.duration.toFixed(2)}`,
    '',
    '# HELP qa_test_pass_rate Percentage of tests passing',
    '# TYPE qa_test_pass_rate gauge',
    `qa_test_pass_rate{${labels}} ${jestMetrics.passRate.toFixed(2)}`,
    '',
    '# HELP qa_test_suites_total Total number of test suites',
    '# TYPE qa_test_suites_total gauge',
    `qa_test_suites_total{${labels}} ${jestMetrics.suites}`,
    '',
    '# HELP qa_test_suites_passed Number of passed test suites',
    '# TYPE qa_test_suites_passed gauge',
    `qa_test_suites_passed{${labels}} ${jestMetrics.suitesPassed}`,
    '',
    '# HELP qa_coverage_lines Line coverage percentage',
    '# TYPE qa_coverage_lines gauge',
    `qa_coverage_lines{${labels}} ${coverageMetrics.lines}`,
    '',
    '# HELP qa_coverage_statements Statement coverage percentage',
    '# TYPE qa_coverage_statements gauge',
    `qa_coverage_statements{${labels}} ${coverageMetrics.statements}`,
    '',
    '# HELP qa_coverage_functions Function coverage percentage',
    '# TYPE qa_coverage_functions gauge',
    `qa_coverage_functions{${labels}} ${coverageMetrics.functions}`,
    '',
    '# HELP qa_coverage_branches Branch coverage percentage',
    '# TYPE qa_coverage_branches gauge',
    `qa_coverage_branches{${labels}} ${coverageMetrics.branches}`,
    '',
    '# HELP qa_test_timestamp_seconds Timestamp of last test run',
    '# TYPE qa_test_timestamp_seconds gauge',
    `qa_test_timestamp_seconds{${labels}} ${Math.floor(Date.now() / 1000)}`,
    '',
    '# ============ SECURITY METRICS ============',
    '',
    '# HELP qa_security_auth_tests_passed Number of auth security tests passed',
    '# TYPE qa_security_auth_tests_passed gauge',
    `qa_security_auth_tests_passed{${labels}} ${securityMetrics.authTestsPassed}`,
    '',
    '# HELP qa_security_injection_tests_passed Number of injection tests passed',
    '# TYPE qa_security_injection_tests_passed gauge',
    `qa_security_injection_tests_passed{${labels}} ${securityMetrics.injectionTestsPassed}`,
    '',
    '# HELP qa_security_xss_tests_passed Number of XSS tests passed',
    '# TYPE qa_security_xss_tests_passed gauge',
    `qa_security_xss_tests_passed{${labels}} ${securityMetrics.xssTestsPassed}`,
    '',
    '# HELP qa_security_rate_limit_tests_passed Number of rate limit tests passed',
    '# TYPE qa_security_rate_limit_tests_passed gauge',
    `qa_security_rate_limit_tests_passed{${labels}} ${securityMetrics.rateLimitTestsPassed}`,
    '',
    '# HELP qa_security_headers_tests_passed Number of security headers tests passed',
    '# TYPE qa_security_headers_tests_passed gauge',
    `qa_security_headers_tests_passed{${labels}} ${securityMetrics.headersTestsPassed}`,
    '',
    '# HELP qa_security_total_tests Total number of security tests',
    '# TYPE qa_security_total_tests gauge',
    `qa_security_total_tests{${labels}} ${securityMetrics.totalTests}`,
    '',
    '# HELP qa_security_tests_passed Total security tests passed',
    '# TYPE qa_security_tests_passed gauge',
    `qa_security_tests_passed{${labels}} ${securityMetrics.testsPassed}`,
    '',
    '# HELP qa_security_tests_failed Total security tests failed',
    '# TYPE qa_security_tests_failed gauge',
    `qa_security_tests_failed{${labels}} ${securityMetrics.testsFailed}`,
  ];

  // Prometheus requer newline no final
  return lines.join('\n') + '\n';
}

// =============================================================================
// ENVIO PARA PUSHGATEWAY
// =============================================================================

/**
 * Envia métricas para o Pushgateway via HTTP POST
 * @param {string} metrics - Métricas no formato Prometheus
 * @returns {Promise<void>}
 */
function pushMetrics(metrics) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${config.pushgatewayUrl}/metrics/job/${config.jobName}/instance/${config.instance}`);

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(metrics),
      },
    };

    const client = url.protocol === 'https:' ? https : http;

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ Métricas enviadas com sucesso (status ${res.statusCode})`);
          resolve();
        } else {
          reject(new Error(`Pushgateway retornou status ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Erro de conexão: ${error.message}`));
    });

    req.write(metrics);
    req.end();
  });
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('📊 Publish Metrics to Prometheus Pushgateway');
  console.log('============================================');
  console.log(`   Pushgateway: ${config.pushgatewayUrl}`);
  console.log(`   Job: ${config.jobName}`);
  console.log(`   Branch: ${config.branchName}`);
  console.log(`   Build: ${config.buildNumber}`);
  console.log('');

  // 1. Ler arquivos
  console.log('📖 Lendo arquivos de resultado...');
  const jestResults = readJestResults();
  const coverage = readCoverage();
  const securityResults = readSecurityResults();

  // 2. Extrair métricas
  console.log('📈 Extraindo métricas...');
  const jestMetrics = extractJestMetrics(jestResults);
  const coverageMetrics = extractCoverageMetrics(coverage);
  const securityMetrics = extractSecurityMetrics(securityResults);

  console.log(`   Testes: ${jestMetrics.passed}/${jestMetrics.total} (${jestMetrics.passRate.toFixed(1)}%)`);
  console.log(`   Duração: ${jestMetrics.duration.toFixed(1)}s`);
  console.log(`   Coverage: ${coverageMetrics.lines}% linhas`);
  console.log(`   Security: ${securityMetrics.testsPassed}/${securityMetrics.totalTests} passed`);
  console.log('');

  // 3. Formatar métricas
  const metrics = formatPrometheusMetrics(jestMetrics, coverageMetrics, securityMetrics);

  // 4. Enviar para Pushgateway
  console.log('📤 Enviando para Pushgateway...');
  try {
    await pushMetrics(metrics);
    console.log('');
    console.log('✅ Publicação concluída com sucesso!');
  } catch (error) {
    console.error(`❌ Falha ao publicar: ${error.message}`);

    // Não falhar o CI se o Pushgateway estiver offline
    if (process.env.FAIL_ON_PUSH_ERROR === 'true') {
      process.exit(1);
    } else {
      console.log('⚠️  Continuando sem falhar (FAIL_ON_PUSH_ERROR != true)');
    }
  }
}

// Executar
main().catch(console.error);
