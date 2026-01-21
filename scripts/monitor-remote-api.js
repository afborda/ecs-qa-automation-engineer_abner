#!/usr/bin/env node

const fs = require('fs');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node monitor-remote-api.js <path-to-report.json>');
  process.exit(1);
}

const reportPath = args[0];
if (!fs.existsSync(reportPath)) {
  console.error(`File not found: ${reportPath}`);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

console.log('\n=== Remote API Health Report ===\n');

let hasIssues = false;

const totalTests = report.numTotalTests || 0;
const passedTests = report.numPassedTests || 0;
const failedTests = report.numFailedTests || 0;
const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : 0;

console.log(`Tests: ${passedTests}/${totalTests} (${successRate}%)`);

if (failedTests > 0) {
  console.log(`Failures: ${failedTests}`);
  hasIssues = true;
}

const duration = (report.testResults?.[0]?.perfStats?.end - report.testResults?.[0]?.perfStats?.start) || 0;
console.log(`Duration: ${duration}ms`);

if (duration > 30000) {
  console.log('WARN: Test took more than 30s (possible degraded latency)');
  hasIssues = true;
}

const testResults = report.testResults || [];
let rateLimitDetected = false;
let timeoutDetected = false;

testResults.forEach(suite => {
  const output = suite.message || '';

  if (output.includes('429') || output.includes('Too Many Requests')) {
    console.log('WARN: Rate limit (429) detected');
    rateLimitDetected = true;
    hasIssues = true;
  }

  if (output.includes('ECONNREFUSED') || output.includes('timeout') || output.includes('Timeout')) {
    console.log('WARN: Timeout or connection refused');
    timeoutDetected = true;
    hasIssues = true;
  }
});

console.log('\nRecommendations:');

if (rateLimitDetected) {
  console.log('  - Reduce request rate or wait for quota reset');
}

if (timeoutDetected) {
  console.log('  - Check API availability');
}

if (!hasIssues) {
  console.log('  API is healthy');
}

const health = {
  timestamp: new Date().toISOString(),
  api: 'https://abnerfonseca.com.br/api',
  successRate: parseFloat(successRate),
  duration: duration,
  issues: {
    rateLimit: rateLimitDetected,
    timeout: timeoutDetected,
    slowResponse: duration > 30000,
    testsFailed: failedTests > 0
  },
  status: hasIssues ? 'degraded' : 'healthy'
};

console.log('\nStatus JSON:');
console.log(JSON.stringify(health, null, 2));

process.exit(hasIssues ? 1 : 0);
