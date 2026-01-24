#!/bin/bash
# Script para enviar métricas de exemplo para o Pushgateway

PUSHGATEWAY_URL="${PUSHGATEWAY_URL:-https://abnerfonseca.com.br/push}"

METRICS="# HELP qa_test_total Total number of tests
# TYPE qa_test_total gauge
qa_test_total{branch=\"main\",build=\"local-1\"} 15
# HELP qa_test_passed Number of passed tests
# TYPE qa_test_passed gauge
qa_test_passed{branch=\"main\",build=\"local-1\"} 14
# HELP qa_test_failed Number of failed tests
# TYPE qa_test_failed gauge
qa_test_failed{branch=\"main\",build=\"local-1\"} 1
# HELP qa_test_skipped Number of skipped tests
# TYPE qa_test_skipped gauge
qa_test_skipped{branch=\"main\",build=\"local-1\"} 0
# HELP qa_test_duration_seconds Duration of test suite in seconds
# TYPE qa_test_duration_seconds gauge
qa_test_duration_seconds{branch=\"main\",build=\"local-1\"} 45.5
# HELP qa_test_pass_rate Percentage of tests passing
# TYPE qa_test_pass_rate gauge
qa_test_pass_rate{branch=\"main\",build=\"local-1\"} 93.33
# HELP qa_test_suites_total Total number of test suites
# TYPE qa_test_suites_total gauge
qa_test_suites_total{branch=\"main\",build=\"local-1\"} 5
# HELP qa_test_suites_passed Number of passed test suites
# TYPE qa_test_suites_passed gauge
qa_test_suites_passed{branch=\"main\",build=\"local-1\"} 4
# HELP qa_coverage_lines Line coverage percentage
# TYPE qa_coverage_lines gauge
qa_coverage_lines{branch=\"main\",build=\"local-1\"} 85
# HELP qa_coverage_statements Statement coverage percentage
# TYPE qa_coverage_statements gauge
qa_coverage_statements{branch=\"main\",build=\"local-1\"} 85
# HELP qa_coverage_functions Function coverage percentage
# TYPE qa_coverage_functions gauge
qa_coverage_functions{branch=\"main\",build=\"local-1\"} 85
# HELP qa_coverage_branches Branch coverage percentage
# TYPE qa_coverage_branches gauge
qa_coverage_branches{branch=\"main\",build=\"local-1\"} 80
# HELP qa_test_timestamp_seconds Timestamp of last test run
# TYPE qa_test_timestamp_seconds gauge
qa_test_timestamp_seconds{branch=\"main\",build=\"local-1\"} $(date +%s)
# HELP qa_security_auth_tests_passed Number of auth security tests passed
# TYPE qa_security_auth_tests_passed gauge
qa_security_auth_tests_passed{branch=\"main\",build=\"local-1\"} 5
# HELP qa_security_injection_tests_passed Number of injection tests passed
# TYPE qa_security_injection_tests_passed gauge
qa_security_injection_tests_passed{branch=\"main\",build=\"local-1\"} 4
# HELP qa_security_xss_tests_passed Number of XSS tests passed
# TYPE qa_security_xss_tests_passed gauge
qa_security_xss_tests_passed{branch=\"main\",build=\"local-1\"} 3
# HELP qa_security_rate_limit_tests_passed Number of rate limit tests passed
# TYPE qa_security_rate_limit_tests_passed gauge
qa_security_rate_limit_tests_passed{branch=\"main\",build=\"local-1\"} 2
# HELP qa_security_headers_tests_passed Number of security headers tests passed
# TYPE qa_security_headers_tests_passed gauge
qa_security_headers_tests_passed{branch=\"main\",build=\"local-1\"} 4
# HELP qa_security_total_tests Total number of security tests
# TYPE qa_security_total_tests gauge
qa_security_total_tests{branch=\"main\",build=\"local-1\"} 20
# HELP qa_security_tests_passed Total security tests passed
# TYPE qa_security_tests_passed gauge
qa_security_tests_passed{branch=\"main\",build=\"local-1\"} 18
# HELP qa_security_tests_failed Total security tests failed
# TYPE qa_security_tests_failed gauge
qa_security_tests_failed{branch=\"main\",build=\"local-1\"} 2
# HELP qa_perf_response_time_p50 P50 response time in ms
# TYPE qa_perf_response_time_p50 gauge
qa_perf_response_time_p50{branch=\"main\",build=\"local-1\"} 45
# HELP qa_perf_response_time_p95 P95 response time in ms
# TYPE qa_perf_response_time_p95 gauge
qa_perf_response_time_p95{branch=\"main\",build=\"local-1\"} 120
# HELP qa_perf_response_time_p99 P99 response time in ms
# TYPE qa_perf_response_time_p99 gauge
qa_perf_response_time_p99{branch=\"main\",build=\"local-1\"} 250
# HELP qa_perf_requests_total Total number of requests
# TYPE qa_perf_requests_total gauge
qa_perf_requests_total{branch=\"main\",build=\"local-1\"} 5000
# HELP qa_perf_errors_total Total number of errors
# TYPE qa_perf_errors_total gauge
qa_perf_errors_total{branch=\"main\",build=\"local-1\"} 5
# HELP qa_perf_rps Requests per second
# TYPE qa_perf_rps gauge
qa_perf_rps{branch=\"main\",build=\"local-1\"} 125
"

echo "Sending metrics to $PUSHGATEWAY_URL..."
echo "$METRICS" | curl -s -X POST --data-binary @- "${PUSHGATEWAY_URL}/metrics/job/qa-tests/instance/ci"
RESULT=$?

if [ $RESULT -eq 0 ]; then
    echo "Metrics sent successfully!"
else
    echo "Failed to send metrics (exit code: $RESULT)"
fi
