
# Sample Logging Backend (Final)

This backend is provided **as-is** for QA automation take-home challenges.
Candidates must NOT modify backend code.

## Default Behaviors
- Flaky processing: ENABLED
- Rate limiting: ENABLED (undocumented)
- Auth token expiry: short-lived
- Async processing delay
- Optional memory leak

## Environment Variables
- FAILURE_RATE (default 0.3)
- MEMORY_LEAK_MODE=true|false
- SLOW_DEP_MS (ms artificial delay)

## Run
docker-compose up --build

## Swagger
http://localhost:3000/docs
