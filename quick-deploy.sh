#!/bin/bash

# Quick deployment script for CommonGround
# Use this to manually deploy when GitHub Actions fails

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  CommonGround Quick Deploy                    ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"
echo ""

# Menu
echo "What do you want to deploy?"
echo ""
echo "1) Frontend to Vercel (Production)"
echo "2) Frontend to Vercel (Preview)"
echo "3) Backend to Render"
echo "4) Both (Frontend + Backend)"
echo "5) Just test builds (no deploy)"
echo ""
read -p "Enter choice (1-5): " choice

deploy_frontend() {
    echo ""
    echo -e "${BLUE}═══ Deploying Frontend to Vercel ═══${NC}"
    echo ""
    
    cd cg-v1.110.26/frontend
    
    # Check for environment variables
    if [ ! -f ".env.production" ]; then
        echo -e "${RED}✗ .env.production not found${NC}"
        echo "Create it with:"
        echo "  NEXT_PUBLIC_API_URL=https://commonground-api-gdxg.onrender.com/api/v1"
        echo "  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url"
        echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key"
        cd ../..
        exit 1
    fi
    
    echo "Step 1: Installing dependencies..."
    npm install || {
        echo -e "${RED}✗ npm install failed${NC}"
        cd ../..
        exit 1
    }
    
    echo ""
    echo "Step 2: Running build..."
    npm run build || {
        echo -e "${RED}✗ Build failed${NC}"
        echo ""
        echo "Common fixes:"
        echo "  - Fix TypeScript errors shown above"
        echo "  - Check import statements (case-sensitive)"
        echo "  - Ensure all dependencies are installed"
        cd ../..
        exit 1
    }
    
    echo ""
    echo "Step 3: Deploying to Vercel..."
    
    if [ "$1" = "prod" ]; then
        vercel --prod || {
            echo -e "${RED}✗ Vercel deployment failed${NC}"
            echo "Check: vercel logs"
            cd ../..
            exit 1
        }
    else
        vercel || {
            echo -e "${RED}✗ Vercel deployment failed${NC}"
            cd ../..
            exit 1
        }
    fi
    
    echo ""
    echo -e "${GREEN}✓ Frontend deployed successfully!${NC}"
    cd ../..
}

deploy_backend() {
    echo ""
    echo -e "${BLUE}═══ Deploying Backend to Render ═══${NC}"
    echo ""
    
    if [ -z "$RENDER_API_KEY" ]; then
        echo -e "${RED}✗ RENDER_API_KEY not set${NC}"
        echo "Export it: export RENDER_API_KEY=your_key"
        exit 1
    fi
    
    echo "Triggering Render deployment..."
    
    # Get service ID from URL
    SERVICE_ID="srv-gdxg"  # From commonground-api-gdxg.onrender.com
    
    curl -X POST "https://api.render.com/v1/services/${SERVICE_ID}/deploys" \
         -H "Authorization: Bearer ${RENDER_API_KEY}" \
         -H "Content-Type: application/json" \
         -d '{"clearCache": false}' || {
        echo -e "${RED}✗ Render deployment trigger failed${NC}"
        exit 1
    }
    
    echo ""
    echo -e "${GREEN}✓ Backend deployment triggered!${NC}"
    echo "Monitor at: https://dashboard.render.com"
}

test_builds() {
    echo ""
    echo -e "${BLUE}═══ Testing Builds ═══${NC}"
    echo ""
    
    # Test frontend
    echo "Testing frontend build..."
    cd cg-v1.110.26/frontend
    npm install && npm run build
    BUILD_SUCCESS=$?
    cd ../..
    
    if [ $BUILD_SUCCESS -eq 0 ]; then
        echo -e "${GREEN}✓ Frontend build succeeded${NC}"
    else
        echo -e "${RED}✗ Frontend build failed${NC}"
        exit 1
    fi
    
    # Test backend
    echo ""
    echo "Testing backend..."
    cd cg-v1.110.26/backend
    if [ -d "venv" ]; then
        source venv/bin/activate
        python -c "from app.main import app; print('✓ Backend imports OK')"
    else
        echo -e "${YELLOW}⚠ No venv found, skipping backend test${NC}"
    fi
    cd ../..
}

case $choice in
    1)
        deploy_frontend "prod"
        ;;
    2)
        deploy_frontend "preview"
        ;;
    3)
        deploy_backend
        ;;
    4)
        deploy_frontend "prod"
        deploy_backend
        ;;
    5)
        test_builds
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  - Frontend: https://common-ground-blue.vercel.app"
echo "  - Backend: https://commonground-api-gdxg.onrender.com/health"
echo "  - GitHub Actions: https://github.com/simpletech310/CommonGround/actions"
echo ""

