
# QA Automation Engineer — Technical Interview Assignment

## Role
Senior QA Automation Engineer – Performance & Security

---

## 1. Assignment Overview

This assignment evaluates a candidate’s ability to design, implement, and reason about **quality engineering** in a **distributed, cloud-native platform**.  
Focus areas:
- End-to-end automation
- Performance & stress testing
- Security validation
- Regression quality
- CI/CD integration

Tooling is **agnostic**. Reasoning, trade-offs, and engineering maturity matter more than syntax.

---

## 2. Platform Scenario

You are working on a **multi-cloud logging and data-processing platform**.

### Workflow
1. Client sends logs via HTTP API  
2. Logs are queued (async)  
3. Logs are processed  
4. Data is indexed and searchable  
5. Metrics and errors are exposed via APIs  

Assumptions:
- API-first (no UI)
- Infrastructure exists
- QA owns quality engineering only

---

## 3. Full Assignment (Senior Level)

### Phase 1 — Test Strategy & Architecture
Deliverable: Markdown or PDF (≤ 2 pages)

Explain:
- E2E vs integration vs contract testing
- Test pyramid strategy
- Tooling choices and justification
- Environment strategy (Dev, VLab, Prod-like)

---

### Phase 2 — End-to-End Automation
Deliverable: Git repo 

Implement one E2E automated test:
- Send logs via API
- Handle async processing
- Validate output via another API
- Retry, timeout, correlation logic

---

### Phase 3 — Performance & Stress Testing
Deliverable: Test + explanation

- Load / stress / spike test
- Measure latency, throughput, error rate
- Define Apdex and release thresholds

---

### Phase 4 — Security QA Validation
Deliverable: Tests or documented scenarios

- Input validation
- Auth misuse
- Error handling (no sensitive leaks)
- One OWASP Top 10 regression

---

### Phase 5 — CI/CD & Quality Gates
Deliverable: Pipeline YAML or diagram

- When tests run
- What blocks a release
- Per-commit vs nightly strategy

---

### Phase 6 — Regression & Reporting
Explain:
- Flaky test detection
- Regression prevention
- Metrics proving QA impact

---

## 4. Numeric Scoring Sheet

Each area scored 0–5.

| Area | Score |
|----|----|
| Test Strategy & Architecture | /5 |
| Automation Code Quality | /5 |
| Async & Reliability Handling | /5 |
| Performance Testing & KPIs | /5 |
| Security Testing Mindset | /5 |
| CI/CD & Quality Gates | /5 |
| Documentation & Communication | /5 |
| **Total (Max 35)** |  |

### Score Interpretation
- **0–15**: Not ready
- **16–24**: Pass
- **25–30**: Strong
- **31–35**: Exceptional

---

## 5. Reviewer Checklist

### Strategy
- [ ] Clear E2E boundaries
- [ ] Avoids over-testing
- [ ] Realistic environments

### Automation
- [ ] Clean, readable code
- [ ] Async handled correctly
- [ ] Retries & timeouts implemented

### Performance
- [ ] KPIs defined
- [ ] Bottlenecks identified
- [ ] Release criteria clear

### Security
- [ ] Negative test cases
- [ ] OWASP awareness
- [ ] Secure-by-default thinking

### CI/CD
- [ ] Logical pipeline stages
- [ ] Clear quality gates
- [ ] Cost-aware testing

### Mindset
- [ ] Ownership
- [ ] Risk awareness
- [ ] Improvement ideas

---

## 6. Backend Example (Provided to Candidate)

A simple backend is provided so QA can focus on automation.

### Example Stack
- Node.js / Python / Java (any)
- REST API
- In-memory queue
- Async worker
- Search endpoint

### Example Endpoints
- POST /logs
- GET /logs/{correlationId}
- GET /metrics

Backend repo contains:
- OpenAPI spec
- Seed data
- Known failure scenarios

Candidates should NOT modify backend code.

---

## 7. Pass / Strong / Exceptional Signals

### Pass
- Functional automation
- Understands async basics
- Clear but simple reasoning

### Strong
- Trade-offs explained
- Stable tests
- KPIs & negative cases included

### Exceptional
- Thinks like quality owner
- Connects tests to incidents
- Anticipates scale & cost
- Clear risk articulation

---

## 8. Final Discussion Prompts

- What would you improve with more time?
- What risks remain?
- How would this scale across teams?

---

End of Assignment
