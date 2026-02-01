#!/bin/bash

# CommonGround E2E Test Suite - Master Orchestration Script
# This script runs all backend E2E tests sequentially

set -e  # Exit on error

echo "================================================================"
echo "COMMONGROUND E2E TEST SUITE - BACKEND TESTS"
echo "================================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
BACKEND_DIR="/Users/tj/Desktop/CommonGround/cg-v1.110.26/backend"
SEED_SCRIPT="$BACKEND_DIR/scripts/seed_e2e_data.py"
TEST_DIR="$BACKEND_DIR/tests/e2e"

# Track test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
    local test_name=$1
    local test_file=$2
    
    echo ""
    echo "================================================================"
    echo "Running: $test_name"
    echo "================================================================"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if python "$test_file"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✅ $test_name PASSED${NC}"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}❌ $test_name FAILED${NC}"
        return 1
    fi
}

# Change to backend directory
cd "$BACKEND_DIR"

# Step 1: Clean and seed test data
echo ""
echo "================================================================"
echo "STEP 1: Seeding Test Data"
echo "================================================================"
echo ""

if python "$SEED_SCRIPT" --clean; then
    echo -e "${GREEN}✅ Test data seeded successfully${NC}"
else
    echo -e "${RED}❌ Test data seeding failed${NC}"
    exit 1
fi

# Wait a moment for database to settle
sleep 2

# Step 2: Run all E2E tests
echo ""
echo "================================================================"
echo "STEP 2: Running E2E Tests"
echo "================================================================"

# Track if any test fails
ANY_FAILURE=0

# Test 1: Messages & ARIA
if ! run_test "Messages & ARIA System" "$TEST_DIR/test_agent_messages.py"; then
    ANY_FAILURE=1
fi

# Test 2: Events & Attendance
if ! run_test "Events & Attendance Tracking" "$TEST_DIR/test_agent_events.py"; then
    ANY_FAILURE=1
fi

# Test 3: Custody Tracking
if ! run_test "Custody Tracking & Exchanges" "$TEST_DIR/test_agent_custody.py"; then
    ANY_FAILURE=1
fi

# Test 4: Payments (if exists)
if [ -f "$TEST_DIR/test_agent_payments.py" ]; then
    if ! run_test "Payment & ClearFund System" "$TEST_DIR/test_agent_payments.py"; then
        ANY_FAILURE=1
    fi
fi

# Test 5: Agreements (if exists)
if [ -f "$TEST_DIR/test_agent_agreements.py" ]; then
    if ! run_test "Agreement Workflows" "$TEST_DIR/test_agent_agreements.py"; then
        ANY_FAILURE=1
    fi
fi

# Step 3: Generate summary report
echo ""
echo "================================================================"
echo "E2E TEST SUITE SUMMARY"
echo "================================================================"
echo ""
echo "Total Tests:  $TOTAL_TESTS"
echo -e "Passed:       ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:       ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $ANY_FAILURE -eq 0 ]; then
    echo -e "${GREEN}================================================================"
    echo "✅ ALL E2E TESTS PASSED"
    echo "================================================================${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}================================================================"
    echo "❌ SOME E2E TESTS FAILED"
    echo "================================================================${NC}"
    echo ""
    exit 1
fi
