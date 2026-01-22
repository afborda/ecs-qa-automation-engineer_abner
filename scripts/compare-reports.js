#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL_GIT || process.env.DISCORD_WEBHOOK_URL || '';

function main() {
  let file1, file2;
  const testType = process.argv[2] || 'remote';

  if (process.argv.length >= 4 && !['local', 'remote'].includes(process.argv[2])) {
    file1 = process.argv[2];
    file2 = process.argv[3];
  } else {
    const reportsDir = path.join(__dirname, `../logging-backend/__tests__/e2e/reports/${testType}`);

    if (!fs.existsSync(reportsDir)) {
      console.error('Reports folder not found');
      process.exit(1);
    }

    const files = fs.readdirSync(reportsDir)
      .filter(f => f.startsWith(`e2e-${testType}-`) && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length < 2) {
      console.error('Need at least 2 reports to compare');
      process.exit(1);
    }

    file1 = path.join(reportsDir, files[1]);
    file2 = path.join(reportsDir, files[0]);
  }

  if (!fs.existsSync(file1) || !fs.existsSync(file2)) {
    console.error('One or both files not found');
    process.exit(1);
  }

  const report1 = JSON.parse(fs.readFileSync(file1, 'utf8'));
  const report2 = JSON.parse(fs.readFileSync(file2, 'utf8'));

  console.log(`\n=== E2E ${testType.toUpperCase()} Report Comparison ===\n`);
  console.log(`Report 1: ${path.basename(file1)}`);
  console.log(`Report 2: ${path.basename(file2)}`);

  const comparisonData = {
    testType,
    file1: path.basename(file1),
    file2: path.basename(file2),
    report1,
    report2
  };

  compareOverview(report1, report2, comparisonData);
  compareTests(report1, report2, comparisonData);

  sendToDiscord(comparisonData).catch(err => {
    console.error('\nFailed to send to Discord:', err.message);
  });
}

function compareOverview(report1, report2, comparisonData) {
  console.log('\n=== Overview ===');

  const rate1 = (report1.numPassedTests / report1.numTotalTests) * 100;
  const rate2 = (report2.numPassedTests / report2.numTotalTests) * 100;

  console.log('\nReport 1:');
  console.log(`  Passed: ${report1.numPassedTests}/${report1.numTotalTests} (${rate1.toFixed(1)}%)`);
  console.log(`  Failed: ${report1.numFailedTests}`);

  console.log('\nReport 2:');
  console.log(`  Passed: ${report2.numPassedTests}/${report2.numTotalTests} (${rate2.toFixed(1)}%)`);
  console.log(`  Failed: ${report2.numFailedTests}`);

  const rateDiff = rate2 - rate1;
  console.log('\nChange:');
  if (rateDiff > 0) {
    console.log(`  Improved: +${rateDiff.toFixed(1)}%`);
  } else if (rateDiff < 0) {
    console.log(`  Degraded: ${rateDiff.toFixed(1)}%`);
  } else {
    console.log(`  No change`);
  }

  comparisonData.overview = { rate1, rate2, rateDiff };
}

function compareTests(report1, report2, comparisonData) {
  const tests1 = extractTests(report1);
  const tests2 = extractTests(report2);

  const nowFailing = [];
  const nowPassing = [];
  const durationChanges = [];

  tests2.forEach(test2 => {
    const test1 = tests1.find(t => t.fullName === test2.fullName);
    if (!test1) return;

    if (test1.status === 'passed' && test2.status === 'failed') {
      nowFailing.push(test2.title);
    } else if (test1.status === 'failed' && test2.status === 'passed') {
      nowPassing.push(test2.title);
    }

    if (test1.duration && test2.duration) {
      const change = ((test2.duration - test1.duration) / test1.duration) * 100;
      if (Math.abs(change) > 20) {
        durationChanges.push({
          title: test2.title,
          before: test1.duration,
          after: test2.duration,
          change
        });
      }
    }
  });

  comparisonData.changes = { nowFailing, nowPassing, durationChanges };

  if (nowFailing.length > 0) {
    console.log('\n=== Tests Now Failing ===');
    nowFailing.forEach(test => console.log(`  - ${test}`));
  }

  if (nowPassing.length > 0) {
    console.log('\n=== Tests Now Passing ===');
    nowPassing.forEach(test => console.log(`  - ${test}`));
  }

  if (durationChanges.length > 0) {
    console.log('\n=== Duration Changes (>20%) ===');
    durationChanges.forEach(({ title, before, after, change }) => {
      console.log(`  ${title}: ${before}ms -> ${after}ms (${change > 0 ? '+' : ''}${change.toFixed(1)}%)`);
    });
  }

  if (nowFailing.length === 0 && nowPassing.length === 0 && durationChanges.length === 0) {
    console.log('\nNo significant changes detected');
  }
}

function extractTests(report) {
  const tests = [];

  if (report.testResults && report.testResults.length > 0) {
    report.testResults.forEach(suite => {
      if (suite.assertionResults) {
        suite.assertionResults.forEach(test => {
          tests.push({
            title: test.title,
            fullName: test.fullName,
            status: test.status,
            duration: test.duration
          });
        });
      }
    });
  }

  return tests;
}

async function sendToDiscord(data) {
  const { testType, file1, file2, report1, report2, overview, changes } = data;

  let color = 3066993;
  if (overview.rateDiff < 0) {
    color = 15158332;
  } else if (changes.nowFailing.length > 0) {
    color = 16776960;
  }

  const embed = {
    title: `E2E ${testType.toUpperCase()} Report Comparison`,
    color: color,
    timestamp: new Date().toISOString(),
    fields: [
      {
        name: 'Reports',
        value: `**Previous:** ${file1}\n**Current:** ${file2}`,
        inline: false
      },
      {
        name: 'Previous',
        value: `Passed: ${report1.numPassedTests}/${report1.numTotalTests} (${overview.rate1.toFixed(1)}%)\nFailed: ${report1.numFailedTests}`,
        inline: true
      },
      {
        name: 'Current',
        value: `Passed: ${report2.numPassedTests}/${report2.numTotalTests} (${overview.rate2.toFixed(1)}%)\nFailed: ${report2.numFailedTests}`,
        inline: true
      }
    ],
    footer: { text: 'QA Automation' }
  };

  if (overview.rateDiff !== 0) {
    embed.fields.push({
      name: 'Change',
      value: `${overview.rateDiff > 0 ? '+' : ''}${overview.rateDiff.toFixed(1)}%`,
      inline: false
    });
  }

  if (changes.nowFailing.length > 0) {
    embed.fields.push({
      name: 'Tests Now Failing',
      value: changes.nowFailing.map(t => `- ${t}`).join('\n').substring(0, 1024),
      inline: false
    });
  }

  if (changes.nowPassing.length > 0) {
    embed.fields.push({
      name: 'Tests Now Passing',
      value: changes.nowPassing.map(t => `- ${t}`).join('\n').substring(0, 1024),
      inline: false
    });
  }

  const payload = {
    username: 'QA Bot',
    embeds: [embed]
  };

  return new Promise((resolve, reject) => {
    const url = new URL(DISCORD_WEBHOOK_URL);
    const postData = JSON.stringify(payload);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 204) {
          console.log('\nReport sent to Discord');
          resolve();
        } else {
          reject(new Error(`Discord returned ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

main();
