
# Scoring Auto-Checklist

## Automation
- [ ] Async polling implemented
- [ ] CorrelationId used correctly
- [ ] Retry/backoff strategy present

## Stability
- [ ] Flaky behavior acknowledged
- [ ] Tests resilient to randomness
- [ ] No blind sleeps

## Performance
- [ ] Measures latency or throughput
- [ ] Detects slowdown when SLOW_DEP_MS > 0

## Security
- [ ] Handles token expiry
- [ ] Tests unauthorized access
- [ ] No sensitive data logged

## Observability
- [ ] Uses /metrics
- [ ] Notes memory growth risks

## CI/CD Thinking
- [ ] Differentiates PR vs nightly tests
