# Technical Documentation - QA Automation Engineer Assignment

## Project Links

| Resource | URL |
|----------|-----|
| 📊 **Grafana Dashboard** | [Real-Time Metrics](https://abnerfonseca.com.br/grafana/public-dashboards/2879980a53e44762b7dfe250e845f949?orgId=1&refresh=30s) |
| 📦 **GitHub Repository** | [afborda/ecs-qa-automation-engineer_abner](https://github.com/afborda/ecs-qa-automation-engineer_abner) |
| 🚀 **Production API** | [abnerfonseca.com.br/api/docs/](https://abnerfonseca.com.br/api/docs/) |

---

## Development Timeline

- **Days 19 and 20**: Implementation study, planning, environment configuration, selection of the initial tools and libraries to be used in the project.
- **Days 21, 22, 23 + 2 hours on day 24 + 6 hours on day 26**: Implementation, configuration, development, adjustments, and addition of sufficient tests for the project.

## Project Premises

The premises I planned for this test project are:
- Easy learning curve
- Speed
- Maintainability
- Separation of concerns
- Less rework
- Priority

## Test Planning

### Initial System Analysis
Before writing any test, I analyzed:
1. **Available endpoints**: POST /auth/token, POST /logs, GET /logs/:id, GET /metrics
2. **Intentional behaviors**: Token expires in 5s, 30% failure rate, rate limiting
3. **Async flow**: Log is queued → Worker processes → Status changes

### Coverage Strategy
| Test Type | What to Validate | Priority |
|-----------|------------------|----------|
| **Unit** | Mocked JWT authentication logic | High |
| **Integration** | Complete endpoint flow | High |
| **Security** | OWASP Top 10 (XSS, JWT bypass, info leakage) | Critical |
| **E2E** | Real workflow with polling | Medium |
| **Performance** | Throughput under load (Artillery) | Medium |

### Test Design Decisions
1. **Polling vs Sleep**: Chose polling with backoff to handle 30% failures
2. **Mocking JWT**: Manual mock to isolate authentication tests
3. **Centralized fixtures**: Reuse of OWASP payloads
4. **Disableable worker**: Environment variable for deterministic tests

### Identified Risks and Mitigations
| Risk | Mitigation |
|------|------------|
| Token expires in 5s | Generate new token before each test |
| 30% flaky | Retry with exponential backoff |
| Worker memory leak | `DISABLE_WORKER=true` in setup.js |
| Slow tests | Parallelization with `maxWorkers: 3` |

---

## Express Export Pattern

One of the defined premises was that I couldn't modify the API code, change it. And I didn't. What I did was adjust and add a best practice that allows exporting the Express instance **WITHOUT** starting the server, making tests import the app directly.

### The Code Explained

```javascript
// Export app for tests
module.exports = app;

// Only start server if not in test mode
if (require.main === module) {
  app.listen(3000, () => {
    console.log('Sample logging backend running on port 3000');
  });
}
```
### Why Is It Essential For Tests?

```
                    WITHOUT THE PATTERN                    WITH THE PATTERN
              ┌──────────────────────┐            ┌──────────────────────┐
              │                      │            │                      │
              │  ❌ Test imports     │            │  ✅ Test imports     │
              │     index.js         │            │     index.js         │
              │        ↓             │            │        ↓             │
              │  ❌ Server starts    │            │  ✅ Only app         │
              │     on port 3000     │            │     is exported      │
              │        ↓             │            │        ↓             │
              │  ❌ Port conflicts   │            │  ✅ supertest        │
              │     between Jest     │            │     manages the      │
              │     workers          │            │     port             │
              │        ↓             │            │        ↓             │
              │  ❌ Tests fail       │            │  ✅ Tests pass       │
              │     EADDRINUSE       │            │     in parallel      │
              │                      │            │                      │
              └──────────────────────┘            └──────────────────────┘
```

### Technical Benefits

| Aspect | Without Pattern | With Pattern |
|--------|-----------------|--------------|
| **Parallelization** | ❌ Port conflicts | ✅ Each worker independent |
| **Isolation** | ❌ Shared state | ✅ Each test has its own server |
| **Speed** | ❌ Slow (separate processes) | ✅ Fast (in-memory) |
| **CI/CD** | ❌ Intermittent failures | ✅ Stable execution |
| **Debug** | ❌ Hard to trace | ✅ Easy to debug |

### How Supertest Leverages This

```javascript
const request = require('supertest');
const app = require('../../index');  // Import app WITHOUT server

// Supertest creates temporary server automatically
const res = await request(app)
  .post('/logs')
  .send({ message: 'test' });
```
"This pattern is fundamental for automated testing in Node.js. By exporting the Express app without starting the server (app.listen), I allow Supertest to create temporary server instances on ephemeral (random) ports. This solves three critical problems:

Port Conflict (EADDRINUSE): When Jest runs tests in parallel with multiple workers, each worker would try to use the same port 3000. With the conditional pattern, each worker has its own temporary server.

Test Isolation: Each test operates on its own instance, preventing one test's state from affecting another.

Performance: Tests run in-memory without real networking overhead, increasing speed by ~5x compared to tests against a real server."

---

## Test Architecture

I chose this architecture for several reasons:
- Separation of concerns
- Organization and maintainability
- Lower learning curve
- Less rework

### Structure Diagram

```
logging-backend/
├── __tests__/
│   ├── setup.js                    ← Jest global setup
│   ├── __mocks__/
│   │   └── jsonwebtoken.js         ← Manual JWT mock
│   │
│   ├── fixtures/                   ← Centralized test data
│   │   ├── mockData.js             ← Tokens, payloads, configs
│   │   ├── testConstants.js        ← Constants (timeouts, status)
│   │   ├── testData.js             ← Generic data
│   │   └── testDataSecurity.js     ← OWASP payloads (XSS, SQLi)
│   │
│   ├── helpers/                    ← Utility functions
│   │   ├── authMocks.js            ← JWT mock helpers
│   │   ├── mockHelpers.js          ← Mock factory
│   │   ├── pollingHelpers.js       ← Polling with backoff
│   │   └── testUtils.js            ← General utilities
│   │
│   ├── unit/                       ← Unit tests (mocked)
│   │   └── auth.test.js
│   │
│   ├── integration/                ← Integration tests
│   │   ├── endpoints.test.js
│   │   ├── async-worker.test.js
│   │   └── setup-worker.js         ← Enables worker for these tests
│   │
│   ├── e2e/                        ← End-to-end tests
│   │   ├── local.test.js           ← Against local app
│   │   ├── remote.test.js          ← Against production API
│   │   └── reports/
│   │
│   └── security/                   ← Security tests
│       ├── auth-jwt.test.js        ← JWT validation
│       ├── xss.test.js             ← XSS protection
│       ├── error-handling.test.js  ← Information leakage
│       └── setup-worker.js
```
### Implemented Test Pyramid

```
                        ┌─────────────┐
                        │    E2E      │  ← 2 files
                        │  (Remote)   │     Tests complete flow
                        └──────┬──────┘     against real API
                               │
                        ┌──────┴──────┐
                        │    E2E      │  ← 1 file
                        │  (Local)    │     Tests complete flow
                        └──────┬──────┘     against local app
                               │
                  ┌────────────┴────────────┐
                  │       Security          │  ← 3 files
                  │  (JWT, XSS, Leakage)    │     OWASP tests
                  └────────────┬────────────┘
                               │
         ┌─────────────────────┴─────────────────────┐
         │              Integration                   │  ← 2 files
         │     (Endpoints + Async Worker)            │     Tests integrated
         └─────────────────────┬─────────────────────┘     APIs
                               │
    ┌──────────────────────────┴──────────────────────────┐
    │                       Unit                           │  ← 1 file
    │              (JWT Mock Behavior)                     │     Tests
    └──────────────────────────────────────────────────────┘     in isolation
```
### Why This Structure?

| Layer | Purpose | Speed | Coverage |
|-------|---------|-------|----------|
| **Unit** | Validate isolated logic | ⚡ ~50ms | Low (functions) |
| **Integration** | Validate working APIs | 🚀 ~500ms | Medium (endpoints) |
| **Security** | Validate protections | 🔒 ~2s | High (OWASP) |
| **E2E Local** | Validate complete flow | 🧪 ~5s | High (workflow) |
| **E2E Remote** | Validate deploy | 🌐 ~20s | High (production) |

---

## Problems Found in API Implementation

### The Problem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PROBLEM: ASYNC PROCESSING                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. POST /logs → Returns { correlationId } immediately                      │
│  2. Worker processes in background (1 second per log)                       │
│  3. GET /logs/:id → Can return QUEUED, PROCESSED or FAILED                 │
│                                                                              │
│  ❌ NAIVE APPROACH:                                                          │
│                                                                              │
│  await request(app).post('/logs');                                          │
│  await sleep(5000);  // "Wait 5 seconds and pray"                           │
│  const res = await request(app).get('/logs/' + id);                         │
│  expect(res.body.status).toBe('PROCESSED');  // FAILS 30% of the time!      │
│                                                                              │
│  PROBLEMS:                                                                   │
│  1. Flaky (30% backend failure rate)                                        │
│  2. Slow (always waits 5s even if processed in 1s)                          │
│  3. Not resilient to timing variations                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXPONENTIAL BACKOFF VISUALIZED                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Attempt     Delay         Total Time       Behavior                         │
│  ───────     ─────         ──────────       ────────                         │
│     1          0ms              0ms          Tries immediately               │
│     2         50ms             50ms          First delay                     │
│     3         75ms            125ms          50 × 1.5                        │
│     4        112ms            237ms          75 × 1.5                        │
│     5        168ms            405ms          Growing gradually               │
│     6        253ms            658ms          ...                             │
│     7        379ms           1037ms          ≈1 second total                 │
│     ...       ...              ...                                           │
│    20       ~10s            ~30 seconds      Final timeout                   │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  DELAY GRAPH:                                                                │
│                                                                              │
│  Delay (ms)                                                                  │
│     │                                                         ╭──            │
│  10s│                                                    ╭────╯              │
│     │                                               ╭────╯                   │
│     │                                          ╭────╯                        │
│     │                                     ╭────╯                             │
│   1s│                                ╭────╯                                  │
│     │                           ╭────╯                                       │
│     │                      ╭────╯                                            │
│ 100ms                 ╭────╯                                                 │
│     │            ╭────╯                                                      │
│  50ms  ─────────╯                                                            │
│     └────────────────────────────────────────────────────────── Attempt      │
│        1    5         10          15          20                             │
│                                                                              │
│  BENEFITS:                                                                   │
│  • Respects server: doesn't overload with requests                          │
│  • Adaptable: if quick success, exits early                                 │
│  • Resilient: handles temporary failures                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Unexpected Issue with Async Worker

### The Original Problem

The backend has an async worker that processes logs in background.

**Problems in test environment:**
- **Memory Leaks**: `setInterval` is never cleaned
- **Non-deterministic tests**: Result depends on timing
- **Jest doesn't terminate**: Open handles prevent exit

### Import Order Is CRITICAL

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    IMPORT ORDER                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ❌ WRONG:                                                                   │
│                                                                              │
│  const app = require('../../index');     ← Worker already decided!          │
│  require('./setup-worker');              ← Too late                         │
│                                                                              │
│  Result: Worker DISABLED (setup.js already set DISABLE_WORKER)              │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  ✅ CORRECT:                                                                 │
│                                                                              │
│  require('./setup-worker');              ← Sets env BEFORE                   │
│  const app = require('../../index');     ← Reads env, decides worker        │
│                                                                              │
│  Result: Worker ENABLED                                                      │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  WHY?                                                                        │
│                                                                              │
│  Node.js executes module code the first time it's imported.                 │
│  index.js reads process.env.DISABLE_WORKER at require time.                 │
│  If env wasn't set BEFORE, it uses the default value.                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## CI/CD Workflows
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE CI/CD PIPELINE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TRIGGER: push/PR to main/develop                                            │
│                                                                              │
│                    ┌──────────────────────┐                                  │
│                    │      ci.yml          │                                  │
│                    │  (Quality Checks)    │                                  │
│                    └──────────┬───────────┘                                  │
│                               │                                              │
│          ┌────────────────────┼────────────────────┐                         │
│          │                    │                    │                         │
│          ↓                    ↓                    ↓                         │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐                  │
│  │    Lint       │   │  Unit Tests   │   │  Integration  │                  │
│  │   ESLint      │   │   1 file      │   │   2 files     │                  │
│  └───────────────┘   └───────────────┘   └───────────────┘                  │
│          │                    │                    │                         │
│          └────────────────────┼────────────────────┘                         │
│                               ↓                                              │
│                    ┌──────────────────────┐                                  │
│                    │   Security Tests     │                                  │
│                    │    56 tests          │                                  │
│                    │  (XSS, JWT, Leakage) │                                  │
│                    └──────────┬───────────┘                                  │
│                               │                                              │
│          ┌────────────────────┼────────────────────┐                         │
│          │                    │                    │                         │
│          ↓                    ↓                    ↓                         │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐                  │
│  │   Coverage    │   │  E2E Local    │   │  Performance  │                  │
│  │   Report      │   │    Tests      │   │   Artillery   │                  │
│  └───────────────┘   └───────────────┘   └───────────────┘                  │
│          │                    │                    │                         │
│          └────────────────────┼────────────────────┘                         │
│                               ↓                                              │
│                    ┌──────────────────────┐                                  │
│                    │  Publish Metrics     │                                  │
│                    │   → Pushgateway      │                                  │
│                    └──────────┬───────────┘                                  │
│                               │                                              │
│                               ↓                                              │
│                    ┌──────────────────────┐                                  │
│                    │   Notify Discord     │                                  │
│                    └──────────────────────┘                                  │
│                               │                                              │
│                    ═══════════╪═══════════                                   │
│                               │                                              │
│                    ┌──────────────────────┐                                  │
│                    │     deploy.yml       │                                  │
│                    │  (only if CI passed) │                                  │
│                    └──────────┬───────────┘                                  │
│                               │                                              │
│          ┌────────────────────┼────────────────────┐                         │
│          ↓                    ↓                    ↓                         │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐                  │
│  │  Build Docker │   │  Push to Hub  │   │  Deploy VPS   │                  │
│  │    Image      │   │   abnerfon/   │   │   via SSH     │                  │
│  │               │   │   logging-api │   │               │                  │
│  └───────────────┘   └───────────────┘   └───────────────┘                  │
│                               │                                              │
│                               ↓                                              │
│                    ┌──────────────────────┐                                  │
│                    │    Health Check      │                                  │
│                    │  abnerfonseca.com.br │                                  │
│                    └──────────────────────┘                                  │
│                               │                                              │
│                    ═══════════╪═══════════                                   │
│                               │                                              │
│                    ┌──────────────────────┐                                  │
│                    │   e2e-remote.yml     │                                  │
│                    │  (after deploy)      │                                  │
│                    └──────────┬───────────┘                                  │
│                               │                                              │
│          ┌────────────────────┴────────────────────┐                         │
│          ↓                                         ↓                         │
│  ┌───────────────┐                        ┌───────────────┐                  │
│  │ E2E Remote    │                        │  Perf Remote  │                  │
│  │   Tests       │                        │   Artillery   │                  │
│  └───────────────┘                        └───────────────┘                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
### Observability Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE FLOW: CODE → GRAFANA                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. DATA GENERATION                                                          │
│     ┌────────────────────────────────────────────────────────────────┐      │
│     │  GitHub Actions runs tests                                      │      │
│     │                                                                 │      │
│     │  npm run test:ci -- --json --outputFile=test-results.json      │      │
│     │                                                                 │      │
│     │  Generates:                                                     │      │
│     │  • test-results.json (Jest results)                             │      │
│     │  • coverage/coverage-summary.json (coverage)                    │      │
│     └────────────────────────────────────────────────────────────────┘      │
│                          │                                                   │
│                          ↓                                                   │
│  2. TRANSFORMATION                                                           │
│     ┌────────────────────────────────────────────────────────────────┐      │
│     │  node scripts/publish-metrics.js                                │      │
│     │                                                                 │      │
│     │  Reads JSON files:                                              │      │
│     │  ┌─────────────────────┐    ┌─────────────────────┐            │      │
│     │  │ test-results.json   │    │ coverage-summary.json│            │      │
│     │  │                     │    │                     │            │      │
│     │  │ numPassedTests: 45  │    │ lines: { pct: 85 }  │            │      │
│     │  │ numFailedTests: 0   │    │ statements: 82%     │            │      │
│     │  │ duration: 12500     │    │ functions: 90%      │            │      │
│     │  └─────────────────────┘    └─────────────────────┘            │      │
│     │                                                                 │      │
│     │  Transforms to Prometheus format:                               │      │
│     │                                                                 │      │
│     │  # HELP qa_test_total Total tests                               │      │
│     │  # TYPE qa_test_total gauge                                     │      │
│     │  qa_test_total{branch="main",build="123"} 45                   │      │
│     │                                                                 │      │
│     │  # HELP qa_coverage_lines Line coverage                         │      │
│     │  # TYPE qa_coverage_lines gauge                                 │      │
│     │  qa_coverage_lines{branch="main",build="123"} 85               │      │
│     └────────────────────────────────────────────────────────────────┘      │
│                          │                                                   │
│                          ↓                                                   │
│  3. SEND TO PUSHGATEWAY                                                      │
│     ┌────────────────────────────────────────────────────────────────┐      │
│     │  HTTP POST → https://abnerfonseca.com.br/push/                  │      │
│     │              /metrics/job/qa-tests/instance/ci                  │      │
│     │                                                                 │      │
│     │  Body: text in Prometheus format                                │      │
│     │                                                                 │      │
│     │  Pushgateway STORES metrics temporarily                         │      │
│     └────────────────────────────────────────────────────────────────┘      │
│                          │                                                   │
│                          ↓                                                   │
│  4. PROMETHEUS SCRAPE                                                        │
│     ┌────────────────────────────────────────────────────────────────┐      │
│     │  prometheus.yml:                                                │      │
│     │                                                                 │      │
│     │  scrape_configs:                                                │      │
│     │    - job_name: 'pushgateway'                                    │      │
│     │      static_configs:                                            │      │
│     │        - targets: ['pushgateway:9091']                          │      │
│     │      scrape_interval: 15s  ← Every 15s, pulls metrics          │      │
│     │                                                                 │      │
│     │  Prometheus:                                                    │      │
│     │  • Does GET /metrics on Pushgateway                             │      │
│     │  • Stores in time-series database                               │      │
│     │  • Retains for X days (configurable)                            │      │
│     └────────────────────────────────────────────────────────────────┘      │
│                          │                                                   │
│                          ↓                                                   │
│  5. GRAFANA VISUALIZATION                                                    │
│     ┌────────────────────────────────────────────────────────────────┐      │
│     │  Datasource: Prometheus                                         │      │
│     │                                                                 │      │
│     │  Query Examples:                                                │      │
│     │                                                                 │      │
│     │  • qa_test_pass_rate{branch="main"}                             │      │
│     │    → Success rate graph over time                              │      │
│     │                                                                 │      │
│     │  • qa_coverage_lines{branch=~"main|develop"}                    │      │
│     │    → Coverage comparison between branches                      │      │
│     │                                                                 │      │
│     │  • rate(qa_test_failed[24h])                                    │      │
│     │    → Failure rate in the last 24h                              │      │
│     │                                                                 │      │
│     │  Dashboard:                                                     │      │
│     │  ┌─────────────────────────────────────────────────────────┐   │      │
│     │  │  [Pass Rate]  [Coverage]  [Failed Tests]  [Duration]    │   │      │
│     │  │    98.5%       85.2%          0             12.5s       │   │      │
│     │  │                                                          │   │      │
│     │  │  [Trend Graph]                                           │   │      │
│     │  │  100% ──────●────●────●────●────────                     │   │      │
│     │  │   95% ─────────────────────────────                      │   │      │
│     │  │   90% ─────────────────────────────                      │   │      │
│     │  │       Jan 20  Jan 21  Jan 22  Jan 23                     │   │      │
│     │  └─────────────────────────────────────────────────────────┘   │      │
│     └────────────────────────────────────────────────────────────────┘      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
Macro Architecture View

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         COMPLETE ARCHITECTURE                                          │
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                    DEVELOPER MACHINE                                             │  │
│  │                                                                                                  │  │
│  │   ┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐                       │  │
│  │   │   Code     │────→│    Git     │────→│   GitHub   │────→│  Actions   │                       │  │
│  │   │   Editor   │     │   Commit   │     │    Push    │     │  Trigger   │                       │  │
│  │   └────────────┘     └────────────┘     └────────────┘     └────────────┘                       │  │
│  │                                                                  │                               │  │
│  └──────────────────────────────────────────────────────────────────│───────────────────────────────┘  │
│                                                                     │                                  │
│                                                                     ↓                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                    GITHUB ACTIONS (CI)                                           │  │
│  │                                                                                                  │  │
│  │   ┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐    │  │
│  │   │    Lint    │────→│    Unit    │────→│Integration │────→│  Security  │────→│    E2E     │    │  │
│  │   │   ESLint   │     │   Tests    │     │   Tests    │     │   Tests    │     │   Tests    │    │  │
│  │   └────────────┘     └────────────┘     └────────────┘     └────────────┘     └────────────┘    │  │
│  │                                                                                    │             │  │
│  │                                               ┌────────────────────────────────────┘             │  │
│  │                                               ↓                                                  │  │
│  │   ┌────────────────────────────────────────────────────────────────────────────────────────┐    │  │
│  │   │                              TEST OUTPUTS                                               │    │  │
│  │   │   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐          │    │  │
│  │   │   │ test-results│     │  coverage   │     │  perf.json  │     │  artifacts  │          │    │  │
│  │   │   │    .json    │     │   .json     │     │  (Artillery)│     │  (reports)  │          │    │  │
│  │   │   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └─────────────┘          │    │  │
│  │   │          │                   │                   │                                      │    │  │
│  │   │          └───────────────────┼───────────────────┘                                      │    │  │
│  │   │                              ↓                                                          │    │  │
│  │   │                   ┌──────────────────┐                                                  │    │  │
│  │   │                   │ publish-metrics  │                                                  │    │  │
│  │   │                   │      .js         │                                                  │    │  │
│  │   │                   └────────┬─────────┘                                                  │    │  │
│  │   └────────────────────────────│────────────────────────────────────────────────────────────┘    │  │
│  │                                │                                                                  │  │
│  └────────────────────────────────│──────────────────────────────────────────────────────────────────┘  │
│                                   │                                                                     │
│                          HTTP POST (Prometheus format metrics)                                          │
│                                   │                                                                     │
│                                   ↓                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              VPS (abnerfonseca.com.br)                                           │  │
│  │                                                                                                  │  │
│  │   ┌─────────────────────────────────────────────────────────────────────────────────────────┐   │  │
│  │   │                           DOCKER COMPOSE STACK                                           │   │  │
│  │   │                                                                                          │   │  │
│  │   │   ┌────────────────┐                                                                     │   │  │
│  │   │   │    TRAEFIK     │  ← Reverse Proxy + SSL Termination                                 │   │  │
│  │   │   │   (port 443)   │                                                                     │   │  │
│  │   │   └───────┬────────┘                                                                     │   │  │
│  │   │           │                                                                              │   │  │
│  │   │   ┌───────┴────────────────────────────────────────────────────────┐                    │   │  │
│  │   │   │                                                                 │                    │   │  │
│  │   │   ↓                           ↓                    ↓               ↓                    │   │  │
│  │   │ /api/*                    /grafana/*         /prometheus/*     /push/*                  │   │  │
│  │   │   │                           │                    │               │                    │   │  │
│  │   │   ↓                           ↓                    ↓               ↓                    │   │  │
│  │   │ ┌──────────────┐      ┌──────────────┐     ┌──────────────┐  ┌──────────────┐          │   │  │
│  │   │ │ LOGGING-API  │      │   GRAFANA    │     │  PROMETHEUS  │  │ PUSHGATEWAY  │          │   │  │
│  │   │ │  (Node.js)   │      │  (port 3000) │     │ (port 9090)  │  │ (port 9091)  │          │   │  │
│  │   │ │  port 3000   │      │              │     │              │  │              │          │   │  │
│  │   │ └──────────────┘      └──────────────┘     └───────┬──────┘  └──────────────┘          │   │  │
│  │   │                              │                     │               ↑                    │   │  │
│  │   │                              │     ┌───────────────┘               │                    │   │  │
│  │   │                              │     │                               │                    │   │  │
│  │   │                              │     │  scrape every 15s             │                    │   │  │
│  │   │                              │     ↓                               │                    │   │  │
│  │   │                              │  ┌──────────────────────────────────┘                    │   │  │
│  │   │                              │  │  Prometheus scrapes Pushgateway                       │   │  │
│  │   │                              │  │  for CI metrics                                        │   │  │
│  │   │                              │  │                                                        │   │  │
│  │   │                              ↓  ↓                                                        │   │  │
│  │   │                        ┌───────────────────┐                                             │   │  │
│  │   │                        │  TIME SERIES DB   │                                             │   │  │
│  │   │                        │    (Prometheus    │                                             │   │  │
│  │   │                        │     storage)      │                                             │   │  │
│  │   │                        └───────────────────┘                                             │   │  │
│  │   │                                                                                          │   │  │
│  │   └──────────────────────────────────────────────────────────────────────────────────────────┘   │  │
│  │                                                                                                  │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---
### Jest Execution Flow

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    JEST EXECUTION FLOW                                                 │
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                        │
│  npm run test                                                                                          │
│       │                                                                                                │
│       ↓                                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                     JEST MASTER PROCESS                                          │  │
│  │                                                                                                  │  │
│  │  1. Read jest.config.js                                                                          │  │
│  │  2. Find all test files matching patterns                                                        │  │
│  │  3. Load cache (if exists)                                                                       │  │
│  │  4. Spawn worker processes (maxWorkers)                                                          │  │
│  │                                                                                                  │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                    │                              │                              │                     │
│                    ↓                              ↓                              ↓                     │
│  ┌────────────────────────────┐  ┌────────────────────────────┐  ┌────────────────────────────┐       │
│  │       WORKER 1             │  │       WORKER 2             │  │       WORKER 3             │       │
│  │                            │  │                            │  │                            │       │
│  │  1. Load setup.js          │  │  1. Load setup.js          │  │  1. Load setup.js          │       │
│  │     - Set env vars         │  │     - Set env vars         │  │     - Set env vars         │       │
│  │     - Register matchers    │  │     - Register matchers    │  │     - Register matchers    │       │
│  │                            │  │                            │  │                            │       │
│  │  2. Run: auth.test.js      │  │  2. Run: endpoints.test.js │  │  2. Run: xss.test.js       │       │
│  │                            │  │                            │  │                            │       │
│  │  3. Report results         │  │  3. Report results         │  │  3. Report results         │       │
│  │                            │  │                            │  │                            │       │
│  └────────────────────────────┘  └────────────────────────────┘  └────────────────────────────┘       │
│                    │                              │                              │                     │
│                    └──────────────────────────────┼──────────────────────────────┘                     │
│                                                   ↓                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                     JEST MASTER PROCESS                                          │  │
│  │                                                                                                  │  │
│  │  5. Aggregate results from all workers                                                           │  │
│  │  6. Generate coverage report (if enabled)                                                        │  │
│  │  7. Output summary to terminal                                                                   │  │
│  │  8. Exit with code 0 (success) or 1 (failure)                                                    │  │
│  │                                                                                                  │  │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Why I Didn't Use TypeScript

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DECISION: JavaScript vs TypeScript                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CONTEXT:                                                                    │
│  • Original backend is pure JavaScript                                       │
│  • Tests should be fast and simple                                           │
│  • Assignment focuses on QA, not types                                       │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  ARGUMENTS FOR TYPESCRIPT:                                                   │
│  ✓ Type safety                                                               │
│  ✓ Better IDE autocomplete                                                   │
│  ✓ Catch errors at compile time                                              │
│                                                                              │
│  ARGUMENTS AGAINST (in project context):                                     │
│  ✗ Configuration overhead (tsconfig, build step)                             │
│  ✗ Backend is JS - types wouldn't be verified at runtime                    │
│  ✗ Jest with TS requires ts-jest or babel                                   │
│  ✗ Increases complexity without proportional benefit                        │
│                                                                              │
│  FINAL DECISION:                                                             │
│  → JavaScript with JSDoc for documentation                                   │
│  → ESLint for code quality                                                   │
│  → Focus on readability and maintainability                                  │
│                                                                              │
│  IF IT WERE A LARGER PROJECT:                                                │
│  → TypeScript would be recommended                                           │
│  → Especially with multiple contributors                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Results Achieved

| Metric | Result |
|--------|--------|
| **Coverage** | 85%+ lines |
| **Security Tests** | 56+ tests (XSS, JWT, Leakage) |
| **Performance** | Apdex calculated via Artillery |
| **CI/CD** | Complete pipeline with automated deploy |
| **Observability** | Real-time metrics in Grafana |

---

## Author

**Abner Borda Fonseca**

| Contact | |
|---------|---------|
| 📱 Phone | +55 (51) 99824-6733 |
| 📧 Email | abner.borda@gmail.com |
| 🔗 GitHub | [afborda](https://github.com/afborda) |
