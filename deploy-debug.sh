#!/bin/bash

# CommonGround Deployment Debugger
# Helps diagnose and fix Vercel and Render deployment issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  CommonGround Deployment Debugger                     ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print section headers
print_section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_section "Checking Prerequisites"

if ! command_exists vercel; then
    echo -e "${RED}✗ Vercel CLI not installed${NC}"
    echo "  Install: npm install -g vercel"
    MISSING_DEPS=1
else
    echo -e "${GREEN}✓ Vercel CLI installed${NC}"
fi

if ! command_exists gh; then
    echo -e "${YELLOW}⚠ GitHub CLI not installed (optional but recommended)${NC}"
    echo "  Install: brew install gh"
else
    echo -e "${GREEN}✓ GitHub CLI installed${NC}"
fi

if ! command_exists jq; then
    echo -e "${YELLOW}⚠ jq not installed (optional but helpful)${NC}"
    echo "  Install: brew install jq"
else
    echo -e "${GREEN}✓ jq installed${NC}"
fi

if [ "$MISSING_DEPS" = "1" ]; then
    echo ""
    echo -e "${RED}Please install missing dependencies and try again.${NC}"
    exit 1
fi

# Check GitHub Actions status
print_section "GitHub Actions Workflow Status"

if command_exists gh; then
    echo "Fetching latest workflow runs..."
    gh run list --limit 3 --json conclusion,name,startedAt,url,displayTitle | jq -r '.[] | "\(.name): \(.conclusion // "running") - \(.displayTitle)"'
    echo ""
    echo -e "${BLUE}View full logs: ${NC}https://github.com/simpletech310/CommonGround/actions"
else
    echo -e "${YELLOW}Install gh CLI to view workflow status automatically${NC}"
    echo -e "${BLUE}View manually: ${NC}https://github.com/simpletech310/CommonGround/actions"
fi

# Vercel Deployment Check
print_section "Vercel Deployment Status"

cd cg-v1.110.26/frontend

echo "Checking Vercel project configuration..."
if [ -f ".vercel/project.json" ]; then
    echo -e "${GREEN}✓ Vercel project linked${NC}"
    PROJECT_ID=$(jq -r '.projectId' .vercel/project.json)
    ORG_ID=$(jq -r '.orgId' .vercel/project.json)
    echo "  Project ID: $PROJECT_ID"
    echo "  Org ID: $ORG_ID"
else
    echo -e "${RED}✗ Vercel project not linked${NC}"
    echo "  Run: vercel link"
fi

echo ""
echo "Fetching recent Vercel deployments..."
vercel ls --token="${VERCEL_TOKEN:-}" 2>/dev/null | head -10 || {
    echo -e "${YELLOW}⚠ Unable to fetch deployments. Ensure VERCEL_TOKEN is set.${NC}"
    echo "  Export token: export VERCEL_TOKEN=your_token_here"
}

echo ""
echo "Checking Vercel production deployment..."
VERCEL_URL="https://common-ground-blue.vercel.app"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$VERCEL_URL" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Production deployment is live: $VERCEL_URL${NC}"
elif [ "$HTTP_CODE" = "000" ]; then
    echo -e "${RED}✗ Cannot reach deployment (network error)${NC}"
else
    echo -e "${RED}✗ Production deployment returned HTTP $HTTP_CODE${NC}"
fi

cd ../..

# Render Deployment Check
print_section "Render Deployment Status"

echo "Checking Render backend deployment..."
RENDER_URL="https://commonground-api-gdxg.onrender.com"
HEALTH_URL="$RENDER_URL/health"

echo "Testing health endpoint: $HEALTH_URL"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
    curl -s "$HEALTH_URL" | jq '.' 2>/dev/null || curl -s "$HEALTH_URL"
elif [ "$HTTP_CODE" = "000" ]; then
    echo -e "${RED}✗ Cannot reach backend (network error)${NC}"
else
    echo -e "${RED}✗ Backend health check returned HTTP $HTTP_CODE${NC}"
fi

# Environment Variables Check
print_section "Environment Variables Check"

cd cg-v1.110.26/frontend

echo "Checking frontend environment files..."
for env_file in .env.local .env.production .env; do
    if [ -f "$env_file" ]; then
        echo -e "${GREEN}✓ Found: $env_file${NC}"
        echo "  Variables:"
        grep -v "^#" "$env_file" | grep -v "^$" | sed 's/=.*/=***/' | sed 's/^/    /'
    else
        echo -e "${YELLOW}⚠ Not found: $env_file${NC}"
    fi
done

cd ../..

# Build Test
print_section "Local Build Test"

echo "What would you like to test?"
echo ""
echo "1) Test Vercel (frontend) build locally"
echo "2) Test Render (backend) locally"
echo "3) View Vercel deployment logs"
echo "4) Deploy frontend to Vercel manually"
echo "5) View GitHub Actions logs"
echo "6) Skip tests"
echo ""
read -p "Enter choice (1-6): " choice

case $choice in
    1)
        print_section "Testing Frontend Build"
        cd cg-v1.110.26/frontend
        echo "Running: npm run build"
        echo ""
        
        if npm run build; then
            echo ""
            echo -e "${GREEN}✓ Frontend build succeeded locally${NC}"
            echo ""
            echo "Next steps:"
            echo "  1. Deploy to Vercel: vercel --prod"
            echo "  2. Or commit and push to trigger CI"
        else
            echo ""
            echo -e "${RED}✗ Frontend build failed${NC}"
            echo ""
            echo "Common fixes:"
            echo "  1. Check TypeScript errors above"
            echo "  2. Run: npm install (install missing deps)"
            echo "  3. Check .env.production for missing variables"
            echo "  4. Fix import paths (case-sensitive)"
        fi
        cd ../..
        ;;
    2)
        print_section "Testing Backend Locally"
        cd cg-v1.110.26/backend
        echo "Checking Python environment..."
        
        if [ -d "venv" ]; then
            echo -e "${GREEN}✓ Virtual environment found${NC}"
            source venv/bin/activate
            echo "Running: python -m pytest tests/ -v"
            python -m pytest tests/ -v || echo -e "${RED}Some tests failed${NC}"
        else
            echo -e "${RED}✗ No virtual environment found${NC}"
            echo "  Create one: python -m venv venv"
            echo "  Activate: source venv/bin/activate"
            echo "  Install deps: pip install -r requirements.txt"
        fi
        cd ../..
        ;;
    3)
        print_section "Vercel Deployment Logs"
        cd cg-v1.110.26/frontend
        echo "Fetching recent deployment logs..."
        echo ""
        vercel logs --token="${VERCEL_TOKEN:-}" || {
            echo -e "${RED}Failed to fetch logs${NC}"
            echo "Set VERCEL_TOKEN: export VERCEL_TOKEN=your_token"
        }
        cd ../..
        ;;
    4)
        print_section "Manual Vercel Deployment"
        cd cg-v1.110.26/frontend
        echo "Starting manual deployment to Vercel..."
        echo ""
        read -p "Deploy to production? (y/N): " deploy_prod
        
        if [ "$deploy_prod" = "y" ] || [ "$deploy_prod" = "Y" ]; then
            vercel --prod --token="${VERCEL_TOKEN:-}"
        else
            vercel --token="${VERCEL_TOKEN:-}"
        fi
        cd ../..
        ;;
    5)
        print_section "GitHub Actions Logs"
        if command_exists gh; then
            echo "Opening latest workflow run..."
            gh run view --web
        else
            echo "Install gh CLI: brew install gh"
            echo "Or visit: https://github.com/simpletech310/CommonGround/actions"
        fi
        ;;
    *)
        echo "Skipping tests"
        ;;
esac

# Summary and Next Steps
print_section "Summary & Next Steps"

echo "Quick Commands:"
echo ""
echo "  ${GREEN}# Deploy frontend manually${NC}"
echo "  cd cg-v1.110.26/frontend && vercel --prod"
echo ""
echo "  ${GREEN}# View deployment logs${NC}"
echo "  cd cg-v1.110.26/frontend && vercel logs"
echo ""
echo "  ${GREEN}# Test build locally${NC}"
echo "  cd cg-v1.110.26/frontend && npm run build"
echo ""
echo "  ${GREEN}# View GitHub Actions${NC}"
echo "  gh run view --web"
echo ""
echo "  ${GREEN}# Redeploy via GitHub (commit + push)${NC}"
echo "  git commit --allow-empty -m 'chore: trigger deployment'"
echo "  git push origin main"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Debugger Complete${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

