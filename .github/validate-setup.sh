#!/bin/bash

# GitHub Actions Setup Validation Script for CommonGround
# This script helps verify your automation setup is correct

set -e

echo "🔍 Validating GitHub Actions Setup for CommonGround"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0

# Helper functions
check_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((CHECKS_PASSED++))
}

check_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    echo -e "   ${YELLOW}Fix: $2${NC}"
    ((CHECKS_FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    echo -e "   ${BLUE}Note: $2${NC}"
    ((WARNINGS++))
}

echo "📁 Checking Repository Structure..."
echo "-----------------------------------"

# Check if we're in the right directory
if [ ! -d "cg-v1.110.26" ]; then
    check_fail "Not in CommonGround root directory" "Run this script from /Users/tj/Desktop/CommonGround/"
    exit 1
fi
check_pass "In CommonGround root directory"

# Check workflows directory exists
if [ ! -d ".github/workflows" ]; then
    check_fail "No .github/workflows directory" "Create it with: mkdir -p .github/workflows"
    exit 1
fi
check_pass ".github/workflows directory exists"

# Check required workflow files
echo ""
echo "📄 Checking Workflow Files..."
echo "------------------------------"

workflows=(
    "backend-ci.yml"
    "frontend-ci.yml"
    "ai-code-review.yml"
)

for workflow in "${workflows[@]}"; do
    if [ -f ".github/workflows/$workflow" ]; then
        check_pass "Workflow file: $workflow"
    else
        check_fail "Missing workflow: $workflow" "Copy from templates or re-create"
    fi
done

# Check project structure
echo ""
echo "🏗️  Checking Project Structure..."
echo "--------------------------------"

# Backend
if [ -d "cg-v1.110.26/backend" ]; then
    check_pass "Backend directory exists"

    if [ -f "cg-v1.110.26/backend/requirements.txt" ]; then
        check_pass "Backend requirements.txt exists"
    else
        check_fail "No backend requirements.txt" "Create requirements.txt in backend directory"
    fi

    if [ -d "cg-v1.110.26/backend/tests" ]; then
        check_pass "Backend tests directory exists"
        TEST_COUNT=$(find cg-v1.110.26/backend/tests -name "test_*.py" -o -name "*_test.py" | wc -l)
        if [ $TEST_COUNT -gt 0 ]; then
            check_pass "Found $TEST_COUNT test files"
        else
            check_warn "No Python test files found" "Add tests for better CI coverage"
        fi
    else
        check_warn "No backend tests directory" "Consider adding tests for CI validation"
    fi
else
    check_fail "Backend directory not found" "Ensure cg-v1.110.26/backend exists"
fi

# Frontend
if [ -d "cg-v1.110.26/frontend" ]; then
    check_pass "Frontend directory exists"

    if [ -f "cg-v1.110.26/frontend/package.json" ]; then
        check_pass "Frontend package.json exists"

        # Check for scripts
        if grep -q '"lint"' cg-v1.110.26/frontend/package.json; then
            check_pass "Lint script found in package.json"
        else
            check_warn "No lint script in package.json" "Add lint script for CI checks"
        fi

        if grep -q '"build"' cg-v1.110.26/frontend/package.json; then
            check_pass "Build script found in package.json"
        else
            check_fail "No build script in package.json" "Add build script: 'next build'"
        fi
    else
        check_fail "No frontend package.json" "Ensure package.json exists in frontend directory"
    fi
else
    check_fail "Frontend directory not found" "Ensure cg-v1.110.26/frontend exists"
fi

# Vercel configuration
echo ""
echo "▲ Checking Vercel Configuration..."
echo "-----------------------------------"

if [ -f "cg-v1.110.26/frontend/.vercel/project.json" ]; then
    check_pass "Vercel project.json exists"

    # Check if it has required fields
    if grep -q '"orgId"' cg-v1.110.26/frontend/.vercel/project.json; then
        check_pass "Vercel orgId configured"
    else
        check_warn "No orgId in project.json" "Run: cd cg-v1.110.26/frontend && npx vercel link"
    fi

    if grep -q '"projectId"' cg-v1.110.26/frontend/.vercel/project.json; then
        check_pass "Vercel projectId configured"
    else
        check_warn "No projectId in project.json" "Run: cd cg-v1.110.26/frontend && npx vercel link"
    fi
else
    check_warn "No Vercel project.json" "Link project: cd cg-v1.110.26/frontend && npx vercel link"
fi

# Render configuration
echo ""
echo "🚀 Checking Render Configuration..."
echo "------------------------------------"

if [ -f "render.yaml" ]; then
    check_pass "render.yaml exists"

    if grep -q "commonground-api" render.yaml; then
        check_pass "Backend service configured in render.yaml"
    else
        check_warn "No backend service in render.yaml" "Ensure your Render service is configured"
    fi
else
    check_warn "No render.yaml found" "Optional but recommended for Infrastructure as Code"
fi

# Git configuration
echo ""
echo "🔀 Checking Git Configuration..."
echo "---------------------------------"

if git rev-parse --git-dir > /dev/null 2>&1; then
    check_pass "Git repository initialized"

    CURRENT_BRANCH=$(git branch --show-current)
    check_pass "Current branch: $CURRENT_BRANCH"

    # Check if we have a remote
    if git remote get-url origin > /dev/null 2>&1; then
        REMOTE_URL=$(git remote get-url origin)
        check_pass "Remote origin configured: $REMOTE_URL"

        if [[ $REMOTE_URL == *"github.com"* ]]; then
            check_pass "Remote is GitHub (required for Actions)"
        else
            check_fail "Remote is not GitHub" "GitHub Actions requires a GitHub repository"
        fi
    else
        check_fail "No git remote configured" "Add remote: git remote add origin <url>"
    fi
else
    check_fail "Not a git repository" "Initialize with: git init"
fi

# Environment files check
echo ""
echo "🔐 Checking Environment Configuration..."
echo "-----------------------------------------"

if [ -f ".env.local" ]; then
    check_warn ".env.local exists in root" "Ensure secrets are in GitHub Secrets, not committed to git"
fi

if [ -f "cg-v1.110.26/frontend/.env.local" ]; then
    check_warn "Frontend .env.local exists" "Ensure secrets are in GitHub Secrets, not committed to git"
fi

if [ -f "cg-v1.110.26/backend/.env" ]; then
    check_warn "Backend .env exists" "Ensure secrets are in GitHub Secrets, not committed to git"
fi

# Check .gitignore
if [ -f ".gitignore" ]; then
    check_pass ".gitignore exists"

    if grep -q ".env" .gitignore; then
        check_pass ".env files ignored in git"
    else
        check_warn ".env not in .gitignore" "Add .env files to .gitignore to prevent secret leaks"
    fi
else
    check_warn "No .gitignore file" "Create .gitignore to prevent committing secrets"
fi

# GitHub Secrets reminder
echo ""
echo "🔑 GitHub Secrets Checklist..."
echo "-------------------------------"
echo ""
echo "You need to manually verify these secrets are set at:"
echo "${BLUE}https://github.com/simpletech310/CommonGround/settings/secrets/actions${NC}"
echo ""

secrets=(
    "VERCEL_TOKEN:Required for Vercel deployments"
    "VERCEL_ORG_ID:Required for Vercel deployments"
    "VERCEL_PROJECT_ID:Required for Vercel deployments"
    "RENDER_API_KEY:Required for Render deployments"
    "RENDER_SERVICE_ID_BACKEND:Required for Render deployments"
    "NEXT_PUBLIC_SUPABASE_URL:Required for frontend builds"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY:Required for frontend builds"
    "ANTHROPIC_API_KEY:Optional - for AI code reviews"
)

echo "Required Secrets:"
for secret in "${secrets[@]}"; do
    IFS=':' read -r name desc <<< "$secret"
    echo "  • ${YELLOW}$name${NC}"
    echo "    └─ $desc"
done

# Final Summary
echo ""
echo "=================================================="
echo "📊 Validation Summary"
echo "=================================================="
echo -e "${GREEN}✅ Passed: $CHECKS_PASSED${NC}"
echo -e "${RED}❌ Failed: $CHECKS_FAILED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Verify GitHub Secrets are set (see list above)"
    echo "2. Enable workflow permissions at:"
    echo "   Settings → Actions → General → Workflow permissions"
    echo "3. Commit and push: git add .github/ && git commit -m 'ci: add automation' && git push"
    echo "4. Watch workflows at: https://github.com/simpletech310/CommonGround/actions"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  Some checks failed. Please fix the issues above.${NC}"
    echo ""
    exit 1
fi
