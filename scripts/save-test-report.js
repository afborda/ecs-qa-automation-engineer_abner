#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const MAX_REPORTS = 30;

function main() {
  const reportPath = process.argv[2];
  const testType = process.argv[3] || 'remote';

  if (!reportPath) {
    console.error('Error: Report path is required');
    console.log('Usage: node scripts/save-test-report.js <report-path> [local|remote]');
    process.exit(1);
  }

  if (!fs.existsSync(reportPath)) {
    console.error(`Error: File not found: ${reportPath}`);
    process.exit(1);
  }

  const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);

  const reportsDir = path.dirname(reportPath);

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const filename = `e2e-${testType}-${timestamp}.json`;
  const destPath = path.join(reportsDir, filename);

  fs.copyFileSync(reportPath, destPath);

  console.log(`\n=== E2E ${testType.toUpperCase()} Report Saved ===\n`);
  console.log(`File: ${filename}`);
  console.log(`Location: ${reportsDir}`);
  console.log(`Date: ${now.toISOString()}`);
  console.log(`\nResults:`);
  console.log(`  Passed: ${reportData.numPassedTests}/${reportData.numTotalTests}`);
  console.log(`  Failed: ${reportData.numFailedTests}`);
  console.log(`  Status: ${reportData.success ? 'Success' : 'Failure'}`);

  cleanOldReports(reportsDir, MAX_REPORTS);
  compareWithPrevious(reportsDir, filename, reportData);
}

function cleanOldReports(reportsDir, maxReports) {
  const files = fs.readdirSync(reportsDir)
    .filter(f => f.startsWith('e2e-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length > maxReports) {
    const toDelete = files.slice(maxReports);
    console.log(`\nCleaning ${toDelete.length} old report(s)...`);
    toDelete.forEach(file => {
      fs.unlinkSync(path.join(reportsDir, file));
    });
  }
}

function compareWithPrevious(reportsDir, currentFilename, currentData) {
  const files = fs.readdirSync(reportsDir)
    .filter(f => f.startsWith('e2e-') && f.endsWith('.json') && f !== currentFilename)
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log('\nFirst report saved. Nothing to compare.');
    return;
  }

  const previousFile = files[0];
  const previousPath = path.join(reportsDir, previousFile);
  const previousData = JSON.parse(fs.readFileSync(previousPath, 'utf8'));

  console.log(`\n=== Comparison with Previous ===`);
  console.log(`Previous: ${previousFile}`);

  const currentRate = (currentData.numPassedTests / currentData.numTotalTests) * 100;
  const previousRate = (previousData.numPassedTests / previousData.numTotalTests) * 100;
  const rateDiff = currentRate - previousRate;

  console.log(`\nSuccess Rate:`);
  console.log(`  Previous: ${previousRate.toFixed(1)}% (${previousData.numPassedTests}/${previousData.numTotalTests})`);
  console.log(`  Current:  ${currentRate.toFixed(1)}% (${currentData.numPassedTests}/${currentData.numTotalTests})`);

  if (rateDiff > 0) {
    console.log(`  Improved: +${rateDiff.toFixed(1)}%`);
  } else if (rateDiff < 0) {
    console.log(`  Degraded: ${rateDiff.toFixed(1)}%`);
  } else {
    console.log(`  No change`);
  }

  const testDiff = currentData.numTotalTests - previousData.numTotalTests;
  if (testDiff !== 0) {
    console.log(`\nTotal Tests:`);
    console.log(`  Previous: ${previousData.numTotalTests}`);
    console.log(`  Current:  ${currentData.numTotalTests}`);
    console.log(`  Difference: ${Math.abs(testDiff)} test(s)`);
  }
}

main();
