#!/usr/bin/env node
/**
 * =============================================================================
 * Publish Metrics to Prometheus Pushgateway
 * =============================================================================
 *
 * This script reads Jest results (JSON) and coverage (JSON), transforms
 * them into Prometheus metrics and sends to the Pushgateway.
 *
 * HOW IT WORKS:
 * 1. Reads Jest result file (--json --outputFile=results.json)
 * 2. Reads coverage file (coverage/coverage-summary.json)
 * 3. Extracts metrics: total, passed, failed, duration, coverage
 * 4. Formats in Prometheus format (plain text)
 * 5. Sends via HTTP POST to Pushgateway
 *
 * USAGE:
 *   node scripts/publish-metrics.js [options]
 *
 * OPTIONS (via env):
 *   PUSHGATEWAY_URL   - Pushgateway URL (default: http://localhost:9091)
 *   JEST_RESULTS_FILE - Jest JSON file (default: test-results.json)
 *   COVERAGE_FILE     - Coverage file (default: coverage/coverage-summary.json)
 *   JOB_NAME          - Job name in Prometheus (default: qa-tests)
 *   BRANCH_NAME       - Branch name (default: main)
 *   BUILD_NUMBER      - Build number (default: local)
 *
 * EXAMPLE:
 *   PUSHGATEWAY_URL=http://vps:9091 BRANCH_NAME=develop node scripts/publish-metrics.js
 *
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// =============================================================================
// CONFIGURATION
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
  notifyWebhookUrl: process.env.NOTIFY_WEBHOOK_URL || '',
};

// =============================================================================
// FILE READING
// =============================================================================

/**
 * Reads the Jest results JSON file
 * @returns {Object} Jest results or empty object
 */
function readJestResults() {
  const filePath = path.resolve(process.cwd(), config.jestResultsFile);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Jest file not found: ${filePath}`);
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error reading Jest results: ${error.message}`);
    return null;
  }
}

/**
 * Reads the Jest coverage JSON file
 * @returns {Object} Coverage or null
 */
function readCoverage() {
  const filePath = path.resolve(process.cwd(), config.coverageFile);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Coverage file not found: ${filePath}`);
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error reading coverage: ${error.message}`);
    return null;
  }
}

/**
 * Reads the security results JSON file
 * @returns {Object} Security results or null
 */
function readSecurityResults() {
  const filePath = path.resolve(process.cwd(), config.securityResultsFile);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Security file not found: ${filePath}`);
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error reading security results: ${error.message}`);
    return null;
  }
}

// =============================================================================
// METRICS EXTRACTION
// =============================================================================

/**
 * Extracts metrics from Jest result
 * @param {Object} jestResults - Jest result
 * @returns {Object} Extracted metrics
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

  // Duration in seconds (Jest returns in ms)
  const startTime = jestResults.startTime || Date.now();
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  // Pass rate
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
 * Extracts coverage metrics
 * @param {Object} coverage - Jest coverage
 * @returns {Object} Coverage metrics
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
 * Extracts security metrics
 * @param {Object} securityResults - Security test results
 * @returns {Object} Security metrics
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
// PROMETHEUS FORMATTING
// =============================================================================

/**
 * Generates metrics in Prometheus format
 * @param {Object} jestMetrics - Jest metrics
 * @param {Object} coverageMetrics - Coverage metrics
 * @param {Object} securityMetrics - Security metrics
 * @returns {string} Text in Prometheus format
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

  // Prometheus requires newline at the end
  return lines.join('\n') + '\n';
}

// =============================================================================
// SEND TO PUSHGATEWAY
// =============================================================================

/**
 * Sends metrics to Pushgateway via HTTP POST
 * @param {string} metrics - Metrics in Prometheus format
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
          console.log(`✅ Metrics sent successfully (status ${res.statusCode})`);
          resolve();
        } else {
          reject(new Error(`Pushgateway returned status ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Connection error: ${error.message}`));
    });

    req.write(metrics);
    req.end();
  });
}

// =============================================================================
// OPTIONAL NOTIFICATION
// =============================================================================

function sendNotification(message) {
  if (!config.notifyWebhookUrl) {
    return Promise.resolve();
  }

  // Discord webhooks accept simple payload with "content"
  const payload = JSON.stringify({ content: message });
  const url = new URL(config.notifyWebhookUrl);

  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + (url.search || ''),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  const client = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(options, (res) => {
      // Best effort: log and move on.
      res.resume();
      resolve();
    });

    req.on('error', () => resolve());
    req.write(payload);
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

  // 1. Read files
  console.log('📖 Reading result files...');
  const jestResults = readJestResults();
  const coverage = readCoverage();
  const securityResults = readSecurityResults();

  // 2. Extract metrics
  console.log('📈 Extracting metrics...');
  const jestMetrics = extractJestMetrics(jestResults);
  const coverageMetrics = extractCoverageMetrics(coverage);
  const securityMetrics = extractSecurityMetrics(securityResults);

  console.log(`   Tests: ${jestMetrics.passed}/${jestMetrics.total} (${jestMetrics.passRate.toFixed(1)}%)`);
  console.log(`   Duration: ${jestMetrics.duration.toFixed(1)}s`);
  console.log(`   Coverage: ${coverageMetrics.lines}% lines`);
  console.log(`   Security: ${securityMetrics.testsPassed}/${securityMetrics.totalTests} passed`);
  console.log('');

  // 3. Format metrics
  const metrics = formatPrometheusMetrics(jestMetrics, coverageMetrics, securityMetrics);

  // 4. Send to Pushgateway
  console.log('📤 Sending to Pushgateway...');
  try {
    await pushMetrics(metrics);
    console.log('');
    console.log('✅ Publication completed successfully!');

    await sendNotification(
      `Metrics updated: branch=${config.branchName}, build=${config.buildNumber}, job=${config.jobName}`
    );
  } catch (error) {
    console.error(`❌ Failed to publish: ${error.message}`);

    // Don't fail CI if Pushgateway is offline
    if (process.env.FAIL_ON_PUSH_ERROR === 'true') {
      process.exit(1);
    } else {
      console.log('⚠️  Continuing without failure (FAIL_ON_PUSH_ERROR != true)');
    }
  }
}

// Execute
main().catch(console.error);
