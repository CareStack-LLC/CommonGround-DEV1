# 🚀 Deployment Debugging Guide

## Quick Start

When deployments fail in GitHub Actions, use these scripts to diagnose and fix issues:

```bash
# 1. Run the debugger to see what's wrong
./deploy-debug.sh

# 2. Deploy manually if needed
./quick-deploy.sh
```

---

## Scripts Overview

### 1. `deploy-debug.sh` - Comprehensive Diagnostics

**What it does:**
- Checks GitHub Actions workflow status
- Tests Vercel and Render deployments
- Validates environment variables
- Provides interactive troubleshooting

**Usage:**
```bash
./deploy-debug.sh
```

**Interactive Options:**
1. Test Vercel (frontend) build locally
2. Test Render (backend) locally
3. View Vercel deployment logs
4. Deploy frontend to Vercel manually
5. View GitHub Actions logs
6. Skip tests

---

### 2. `quick-deploy.sh` - Fast Manual Deployment

**What it does:**
- Quickly deploy frontend or backend manually
- Bypass GitHub Actions when needed
- Test builds without deploying

**Usage:**
```bash
./quick-deploy.sh
```

**Options:**
1. Deploy Frontend to Vercel (Production)
2. Deploy Frontend to Vercel (Preview)
3. Deploy Backend to Render
4. Deploy Both (Frontend + Backend)
5. Just test builds

---

## Common Issues & Fixes

### Vercel Deployment Fails

**Symptom:** Frontend CI workflow fails on Vercel deployment

**Common Causes:**
1. **TypeScript errors**
2. **Missing environment variables**
3. **Import path issues (case-sensitive)**
4. **Build timeout**

**Fix:**
```bash
# 1. Test build locally
cd cg-v1.110.26/frontend
npm install
npm run build

# 2. Fix any errors shown
# 3. Deploy manually
vercel --prod

# Or use quick script
./quick-deploy.sh
# Select option 1
```

**Check logs:**
```bash
cd cg-v1.110.26/frontend
vercel logs
```

---

### Render Deployment Fails

**Symptom:** Backend CI workflow fails on Render deployment

**Common Causes:**
1. **Python dependency issues**
2. **Database migration failures**
3. **Environment variable missing**
4. **Out of memory**

**Fix:**
```bash
# 1. Test backend locally
cd cg-v1.110.26/backend
source venv/bin/activate
python -m pytest tests/

# 2. Check Render logs
# Visit: https://dashboard.render.com

# 3. Trigger manual deployment
export RENDER_API_KEY=your_key
./quick-deploy.sh
# Select option 3
```

---

### Build Succeeds Locally But Fails in CI

**Possible causes:**
1. **Environment differences** (Node version, dependencies)
2. **Missing secrets in GitHub**
3. **Case-sensitive file paths** (works on Mac, fails on Linux)

**Fix:**
```bash
# Check GitHub secrets
# https://github.com/simpletech310/CommonGround/settings/secrets/actions

# Verify all these are set:
# - VERCEL_TOKEN
# - VERCEL_ORG_ID
# - VERCEL_PROJECT_ID
# - RENDER_API_KEY
# - RENDER_SERVICE_ID_BACKEND
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - ANTHROPIC_API_KEY (optional)
# - OPENAI_API_KEY (optional)
```

---

## Manual Deployment Commands

### Deploy Frontend to Vercel

```bash
cd cg-v1.110.26/frontend

# Preview deployment
vercel

# Production deployment
vercel --prod

# View logs
vercel logs

# List deployments
vercel ls
```

### Deploy Backend to Render

**Option 1: Via Render Dashboard**
1. Go to https://dashboard.render.com
2. Find your backend service
3. Click "Manual Deploy" → "Deploy latest commit"

**Option 2: Via API**
```bash
export RENDER_API_KEY=your_key
curl -X POST "https://api.render.com/v1/services/srv-gdxg/deploys" \
     -H "Authorization: Bearer ${RENDER_API_KEY}" \
     -H "Content-Type: application/json" \
     -d '{"clearCache": false}'
```

---

## Checking Deployment Status

### Frontend (Vercel)

```bash
# Check if site is live
curl -I https://common-ground-blue.vercel.app

# Should return: HTTP/2 200
```

### Backend (Render)

```bash
# Check health endpoint
curl https://commonground-api-gdxg.onrender.com/health

# Should return: {"status":"healthy"}
```

---

## Environment Variables

### Frontend (.env.production)

Required variables:
```bash
NEXT_PUBLIC_API_URL=https://commonground-api-gdxg.onrender.com/api/v1
NEXT_PUBLIC_WS_URL=wss://commonground-api-gdxg.onrender.com/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_NAME=CommonGround
NEXT_PUBLIC_APP_URL=https://common-ground-blue.vercel.app
```

### Backend (Render Environment)

Set these in Render dashboard:
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key
- `SECRET_KEY` - JWT secret
- `ANTHROPIC_API_KEY` - For AI features
- `OPENAI_API_KEY` - Fallback AI
- `DAILY_API_KEY` - For video calls
- `STRIPE_SECRET_KEY` - For payments

---

## Troubleshooting Workflow

1. **Check GitHub Actions**
   ```bash
   # View in browser
   gh run view --web
   
   # Or visit manually
   open https://github.com/simpletech310/CommonGround/actions
   ```

2. **Run Debug Script**
   ```bash
   ./deploy-debug.sh
   ```

3. **Test Build Locally**
   ```bash
   # Frontend
   cd cg-v1.110.26/frontend
   npm run build
   
   # Backend
   cd cg-v1.110.26/backend
   source venv/bin/activate
   pytest tests/
   ```

4. **Check Deployment Logs**
   ```bash
   # Vercel
   cd cg-v1.110.26/frontend
   vercel logs
   
   # Render
   # Visit dashboard: https://dashboard.render.com
   ```

5. **Deploy Manually**
   ```bash
   ./quick-deploy.sh
   ```

6. **Verify Deployment**
   ```bash
   # Frontend
   curl https://common-ground-blue.vercel.app
   
   # Backend
   curl https://commonground-api-gdxg.onrender.com/health
   ```

---

## Getting Help

### Check Documentation
- `.github/AUTOMATION_SETUP.md` - CI/CD setup
- `.github/QUICK_START.md` - Getting started
- `cg-v1.110.26/CLAUDE.md` - Project overview

### Useful Commands
```bash
# View GitHub workflow runs
gh run list --limit 10

# View specific run
gh run view RUN_ID

# View workflow logs
gh run view RUN_ID --log

# Re-run failed workflows
gh run rerun RUN_ID
```

### Links
- **GitHub Actions:** https://github.com/simpletech310/CommonGround/actions
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Render Dashboard:** https://dashboard.render.com
- **Supabase Dashboard:** https://supabase.com/dashboard

---

## Emergency Rollback

If deployment breaks production:

### Vercel (Frontend)
```bash
cd cg-v1.110.26/frontend

# List recent deployments
vercel ls

# Promote a previous deployment to production
vercel promote DEPLOYMENT_URL --prod
```

### Render (Backend)
1. Go to https://dashboard.render.com
2. Find your backend service
3. Click "Rollback" next to the last successful deployment

### Git Revert
```bash
# Revert last commit
git revert HEAD
git push origin main

# Or reset to previous commit
git reset --hard COMMIT_HASH
git push --force origin main
```

---

## Prevention Tips

1. **Always test locally first**
   ```bash
   npm run build  # Frontend
   pytest tests/  # Backend
   ```

2. **Use preview deployments for testing**
   ```bash
   vercel  # Creates preview URL
   ```

3. **Monitor deployment health**
   - Enable Vercel notifications
   - Set up Render alerts
   - Watch GitHub Actions tab

4. **Keep dependencies updated**
   ```bash
   npm update  # Frontend
   pip list --outdated  # Backend
   ```

---

**Quick Reference Card:**

| Issue | Command |
|-------|---------|
| Debug deployments | `./deploy-debug.sh` |
| Deploy manually | `./quick-deploy.sh` |
| Test build | `npm run build` |
| View logs | `vercel logs` |
| GitHub Actions | `gh run view --web` |
| Health check | `curl /health` |

