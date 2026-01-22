#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL_GIT || process.env.DISCORD_WEBHOOK_URL || '';

function loadReport(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return null;
  }
}

function formatMs(ms) {
  return `${ms.toFixed(1)} ms`;
}

function generateReport(name, data) {
  if (!data) {
    console.log(`\n${name}: Data not available\n`);
    return;
  }

  const agg = data.aggregate;
  const counters = agg.counters || {};
  const summaries = agg.summaries || {};
  const http_rt = summaries['http.response_time'] || {};

  // Basic tallies
  const totalRequests = counters['http.requests'] || 0;
  const totalResponses = counters['http.responses'] || totalRequests;
  const ok2xx = (counters['http.codes.200'] || 0) + (counters['http.codes.201'] || 0) + (counters['http.codes.202'] || 0);
  const code429 = counters['http.codes.429'] || 0;
  const errorsTimeout = counters['errors.ETIMEDOUT'] || 0;
  const vusersCompleted = counters['vusers.completed'] || 0;
  const vusersCreated = counters['vusers.created'] || 0;

  const successPct = totalResponses ? ((ok2xx / totalResponses) * 100) : 0;
  const failCount = Math.max(0, totalResponses - ok2xx);
  const failPct = totalResponses ? ((failCount / totalResponses) * 100) : 0;
  const rate429Pct = totalResponses ? ((code429 / totalResponses) * 100) : 0;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${name}`);
  console.log(`${'='.repeat(60)}\n`);

  console.log(`Latency: p95 ${formatMs(http_rt.p95 || 0)} | p99 ${formatMs(http_rt.p99 || 0)}`);
  console.log(`Success: ${successPct.toFixed(1)}% | Fail: ${failPct.toFixed(1)}% | 429: ${rate429Pct.toFixed(1)}%`);
  console.log(`Requests: ${totalRequests} | Responses: ${totalResponses} | VUs: ${vusersCompleted}/${vusersCreated}`);
  console.log(`Codes: 2xx=${ok2xx}, 429=${code429} | Timeouts: ${errorsTimeout}\n`);
}

function getSummary(data) {
  if (!data) return null;
  const agg = data.aggregate || {};
  const counters = agg.counters || {};
  const summaries = agg.summaries || {};
  const rt = summaries['http.response_time'] || {};
  const responses = counters['http.responses'] || counters['http.requests'] || 0;
  const ok2xx = (counters['http.codes.200'] || 0) + (counters['http.codes.201'] || 0) + (counters['http.codes.202'] || 0);
  const code429 = counters['http.codes.429'] || 0;
  const failCount = Math.max(0, responses - ok2xx);
  return {
    p50: rt.p50 || 0,
    p95: rt.p95 || 0,
    p99: rt.p99 || 0,
    totalRequests: counters['http.requests'] || 0,
    ok200: counters['http.codes.200'] || 0,
    ok202: counters['http.codes.202'] || 0,
    code429: counters['http.codes.429'] || 0,
    responses,
    ok2xx,
    failCount,
    successPct: responses ? (ok2xx / responses) * 100 : 0,
    failPct: responses ? (failCount / responses) * 100 : 0,
    rate429Pct: responses ? (code429 / responses) * 100 : 0,
    errorsTimeout: counters['errors.ETIMEDOUT'] || 0,
  };
}

function findPreviousReports() {
  const localDir = path.join(__dirname, '..', 'perf', 'reports', 'local');
  const remoteDir = path.join(__dirname, '..', 'perf', 'reports', 'remote');
  let prevLocal = null, prevRemote = null;
  try {
    const localFiles = fs.readdirSync(localDir).filter(f => /^report-local-.*\.json$/.test(f)).sort().reverse();
    const remoteFiles = fs.readdirSync(remoteDir).filter(f => /^report-remote-.*\.json$/.test(f)).sort().reverse();
    if (localFiles.length > 1) prevLocal = loadReport(path.join(localDir, localFiles[1]));
    if (remoteFiles.length > 1) prevRemote = loadReport(path.join(remoteDir, remoteFiles[1]));
  } catch {}
  return { prevLocal, prevRemote };
}

function sendToDiscord(localData, remoteData, { prevLocal, prevRemote }) {
  return new Promise((resolve, reject) => {
    if (!DISCORD_WEBHOOK_URL) {
      return reject(new Error('Discord webhook not configured'));
    }

    const local = getSummary(localData);
    const remote = getSummary(remoteData);
    const localPrev = prevLocal ? getSummary(prevLocal) : null;
    const remotePrev = prevRemote ? getSummary(prevRemote) : null;

    const fields = [];
    let color = 3447003;

    let localStatus = 'First run';
    if (localPrev && local) {
      const deltaP95 = local.p95 - localPrev.p95;
      const percP95 = localPrev.p95 ? ((deltaP95 / localPrev.p95) * 100) : 0;
      if (Math.abs(deltaP95) < 0.1) {
        localStatus = 'Stable';
      } else if (deltaP95 < 0) {
        localStatus = `Improved ${Math.abs(percP95).toFixed(0)}%`;
        color = 5763719;
      } else {
        localStatus = `Degraded ${percP95.toFixed(0)}%`;
        color = 15105570;
      }
    }

    if (local) {
      fields.push({
        name: 'LOCAL (localhost:3000)',
        value: [
          `**p95:** ${local.p95.toFixed(1)}ms | **Status:** ${localStatus}`,
          `**Requests:** ${local.totalRequests} | **Success:** ${local.successPct.toFixed(1)}% | **Fail:** ${local.failPct.toFixed(1)}% | **429:** ${local.rate429Pct.toFixed(1)}%`
        ].join('\n'),
        inline: false,
      });
    }

    let remoteStatus = 'First run';
    if (remotePrev && remote) {
      const deltaP95 = remote.p95 - remotePrev.p95;
      const percP95 = remotePrev.p95 ? ((deltaP95 / remotePrev.p95) * 100) : 0;
      if (Math.abs(deltaP95) < 1) {
        remoteStatus = 'Stable';
      } else if (deltaP95 < 0) {
        remoteStatus = `Improved ${Math.abs(percP95).toFixed(0)}%`;
        if (color === 3447003) color = 5763719;
      } else {
        remoteStatus = `Degraded ${percP95.toFixed(0)}%`;
        color = 15105570;
      }
    }

    if (remote) {
      fields.push({
        name: 'REMOTE (abnerfonseca.com.br)',
        value: [
          `**p95:** ${remote.p95.toFixed(1)}ms | **Status:** ${remoteStatus}`,
          `**Requests:** ${remote.totalRequests} | **Success:** ${remote.successPct.toFixed(1)}% | **Fail:** ${remote.failPct.toFixed(1)}% | **429:** ${remote.rate429Pct.toFixed(1)}%`
        ].join('\n'),
        inline: false,
      });
    }

    if (local || remote) {
      fields.push({
        name: 'Details',
        value: [
          local ? `Local: responses=${local.responses} | 2xx=${local.ok2xx} | fail=${local.failCount} | timeouts=${local.errorsTimeout}` : '',
          remote ? `Remote: responses=${remote.responses} | 2xx=${remote.ok2xx} | fail=${remote.failCount} | timeouts=${remote.errorsTimeout}` : '',
        ].filter(Boolean).join('\n'),
        inline: false,
      });
    }

    const embed = {
      title: 'Performance Report',
      color,
      timestamp: new Date().toISOString(),
      fields,
    };

      const payload = {
        username: 'QA Performance Bot',
        embeds: [embed],
      };

    const url = new URL(DISCORD_WEBHOOK_URL);
    const postData = JSON.stringify(payload);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 204) return resolve();
        return reject(new Error(`Discord returned ${res.statusCode}`));
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function main() {
  const localPath = path.join(__dirname, '..', 'perf', 'reports', 'local', 'report-local.json');
  const remotePath = path.join(__dirname, '..', 'perf', 'reports', 'remote', 'report-remote.json');

  const localData = loadReport(localPath);
  const remoteData = loadReport(remotePath);

  console.log('\nPERFORMANCE RESULTS\n');

  generateReport('LOCAL (localhost:3000)', localData);
  generateReport('REMOTE (abnerfonseca.com.br)', remoteData);

  const { prevLocal, prevRemote } = findPreviousReports();

  sendToDiscord(localData, remoteData, { prevLocal, prevRemote })
    .then(() => console.log('\nReport sent to Discord'))
    .catch((err) => console.error(`\nFailed to send to Discord: ${err.message}`));
}

main();
