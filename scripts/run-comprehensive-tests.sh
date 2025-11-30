#!/bin/bash

# Comprehensive Test Runner
# Runs all tests across all phases

set -e

echo "=========================================="
echo "EcoComply Comprehensive Test Suite"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
SKIPPED=0

# Function to run tests and capture results
run_test_suite() {
    local suite_name=$1
    local test_command=$2
    
    echo -e "${YELLOW}Running: ${suite_name}${NC}"
    echo "Command: ${test_command}"
    echo ""
    
    if eval "${test_command}"; then
        echo -e "${GREEN}✓ ${suite_name} PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ ${suite_name} FAILED${NC}"
        ((FAILED++))
    fi
    echo ""
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from project root${NC}"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

echo "Phase 1: Database & RLS Tests"
echo "----------------------------"
run_test_suite "Phase 1 - Database Schema" "npm test -- tests/comprehensive/phase-1-database-comprehensive.test.ts"
run_test_suite "Phase 1 - RLS Security" "npm test -- tests/security/rls-production.test.ts"

echo "Phase 2: API Tests"
echo "------------------"
run_test_suite "Phase 2 - API Comprehensive" "npm test -- tests/comprehensive/phase-2-api-comprehensive.test.ts"
run_test_suite "Phase 2 - Auth" "npm test -- tests/integration/api/auth.test.ts"
run_test_suite "Phase 2 - RLS Enforcement" "npm test -- tests/integration/api/rls-enforcement.test.ts"
run_test_suite "Phase 2 - Rate Limiting" "npm test -- tests/integration/api/rate-limiting.test.ts"
run_test_suite "Phase 2 - Pagination" "npm test -- tests/integration/api/pagination.test.ts"
run_test_suite "Phase 2 - Error Handling" "npm test -- tests/integration/api/error-handling.test.ts"
run_test_suite "Phase 2 - Documents" "npm test -- tests/integration/api/documents.test.ts"

echo "Phase 3: AI/Extraction Tests"
echo "----------------------------"
run_test_suite "Phase 3 - AI Extraction" "npm test -- tests/integration/ai/phase3-1.test.ts"
run_test_suite "Phase 3 - Rule Library" "npm test -- tests/integration/ai/phase3-2-rule-library.test.ts"
run_test_suite "Phase 3 - Document Processing" "npm test -- tests/integration/ai/phase3-3-document-processing.test.ts"
run_test_suite "Phase 3 - End-to-End" "npm test -- tests/integration/ai/phase3-end-to-end.test.ts"

echo "Phase 4: Background Jobs Tests"
echo "------------------------------"
run_test_suite "Phase 4 - Queue Manager" "npm test -- tests/integration/jobs/queue-manager.test.ts"
run_test_suite "Phase 4 - Document Processing Job" "npm test -- tests/integration/jobs/document-processing.test.ts"
run_test_suite "Phase 4 - Monitoring Schedule" "npm test -- tests/integration/jobs/monitoring-schedule.test.ts"
run_test_suite "Phase 4 - Deadline Alert" "npm test -- tests/integration/jobs/deadline-alert.test.ts"
run_test_suite "Phase 4 - Pack Generation" "npm test -- tests/integration/jobs/pack-generation.test.ts"
run_test_suite "Phase 4 - Excel Import" "npm test -- tests/integration/jobs/excel-import.test.ts"

echo "Phase 5: Frontend Tests"
echo "-----------------------"
run_test_suite "Phase 5 - Frontend Auth" "npm test -- tests/frontend/auth/login.test.tsx tests/frontend/auth/signup.test.tsx"
run_test_suite "Phase 5 - Frontend Dashboard" "npm test -- tests/frontend/dashboard/dashboard-home.test.tsx"
run_test_suite "Phase 5 - Frontend Documents" "npm test -- tests/frontend/dashboard/documents-list.test.tsx tests/frontend/dashboard/documents-upload.test.tsx"

echo "Phase 6: E2E Tests"
echo "------------------"
run_test_suite "Phase 6 - User Journey" "npm run test:e2e -- tests/e2e/user-journey.test.ts"
run_test_suite "Phase 6 - Consultant Workflow" "npm run test:e2e -- tests/e2e/consultant-workflow.test.ts"
run_test_suite "Phase 6 - Production Readiness" "npm run test:e2e -- tests/e2e/production-readiness.test.ts"

echo "Phase 7: Performance & Security"
echo "--------------------------------"
run_test_suite "Phase 7 - Performance" "npm test -- tests/performance/api-benchmark.test.ts tests/performance/page-load.test.ts"
run_test_suite "Phase 7 - Security" "npm test -- tests/security/rls-production.test.ts"

echo "Phase 8: Module Tests"
echo "--------------------"
run_test_suite "Phase 8 - Module 2" "npm test -- tests/integration/api/module-2.test.ts"
run_test_suite "Phase 8 - Module 3" "npm test -- tests/integration/api/module-3.test.ts"

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo -e "${YELLOW}Skipped: ${SKIPPED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please review the output above.${NC}"
    exit 1
fi

