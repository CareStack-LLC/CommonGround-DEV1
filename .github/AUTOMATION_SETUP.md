# GitHub Actions Automation Setup for CommonGround

## 🎯 Overview

This automation provides:
- ✅ **Automated Testing** on every push/PR
- 🚀 **Automated Deployment** to Vercel (frontend) and Render (backend)
- 🤖 **AI Code Review** with Claude 3.5 Sonnet on every PR
- 🔒 **Security Scanning** for vulnerabilities and secrets
- 📊 **Code Coverage** tracking

---

## 📋 Quick Setup Checklist

### 1. Gather Required Secrets (15 minutes)

You need to add these secrets to GitHub at:
`https://github.com/simpletech310/CommonGround/settings/secrets/actions`

#### **Vercel Secrets** (Frontend Deployment)

| Secret Name | Where to Find It | Required |
|-------------|------------------|----------|
| `VERCEL_TOKEN` | [Vercel Account Settings → Tokens](https://vercel.com/account/tokens) - Create new token | ✅ Yes |
| `VERCEL_ORG_ID` | Run: `cat cg-v1.110.26/frontend/.vercel/project.json` | ✅ Yes |
| `VERCEL_PROJECT_ID` | Run: `cat cg-v1.110.26/frontend/.vercel/project.json` | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | ✅ Yes |

#### **Render Secrets** (Backend Deployment)

| Secret Name | Where to Find It | Required |
|-------------|------------------|----------|
| `RENDER_API_KEY` | [Render Dashboard → Account Settings → API Keys](https://dashboard.render.com/u/settings#api-keys) | ✅ Yes |
| `RENDER_SERVICE_ID_BACKEND` | Go to your Render service → URL will show the service ID (e.g., `srv-xxxxx`) | ✅ Yes |

#### **AI Review Secrets** (Optional but Recommended)

| Secret Name | Where to Find It | Required |
|-------------|------------------|----------|
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/settings/keys) | 🔵 Optional |

---

### 2. Get Your Secret Values

#### Get Vercel IDs:
```bash
# If .vercel/project.json exists:
cat cg-v1.110.26/frontend/.vercel/project.json

# You'll see something like:
{
  "orgId": "team_xxxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxxx"
}
```

If you don't have `.vercel/project.json`, link your project:
```bash
cd cg-v1.110.26/frontend
npx vercel link
# Follow prompts, then check .vercel/project.json
```

#### Get Render Service ID:
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click on your `commonground-api` service
3. Look at the URL: `https://dashboard.render.com/web/srv-XXXXXXXXX`
4. The `srv-XXXXXXXXX` part is your `RENDER_SERVICE_ID_BACKEND`

---

### 3. Add Secrets to GitHub

1. Go to: `https://github.com/simpletech310/CommonGround/settings/secrets/actions`
2. Click **"New repository secret"**
3. Add each secret from the table above

**Screenshot guide:**
```
Repository → Settings → Secrets and variables → Actions → New repository secret
```

---

### 4. Enable GitHub Actions

1. Go to: `https://github.com/simpletech310/CommonGround/actions`
2. If prompted, click **"I understand my workflows, go ahead and enable them"**

---

### 5. Test the Setup

#### Option A: Push the workflow files
```bash
git add .github/
git commit -m "ci: add GitHub Actions automation"
git push origin main
```

Then visit: `https://github.com/simpletech310/CommonGround/actions`

You should see workflows running!

#### Option B: Test on a branch first (Recommended)
```bash
git checkout -b test/github-actions
git add .github/
git commit -m "ci: add GitHub Actions automation"
git push origin test/github-actions
```

Then create a PR to see everything in action.

---

## 🔄 How It Works

### When you push to `main`:

```
┌─────────────────────────────────────────────┐
│  Developer: git push origin main            │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│  GitHub Actions triggers                    │
│                                             │
│  Backend Workflow                Frontend   │
│  ├─ Test Python code           ├─ Lint     │
│  ├─ Run pytest                 ├─ Type     │
│  ├─ Check coverage             │   check   │
│  └─ Deploy to Render           └─ Deploy   │
│                                    to       │
│                                    Vercel   │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│  ✅ Tests pass                              │
│  ✅ Backend: commonground-api.onrender.com  │
│  ✅ Frontend: common-ground-blue.vercel.app │
└─────────────────────────────────────────────┘
```

### When you open a PR:

```
┌─────────────────────────────────────────────┐
│  Developer creates PR                       │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│  1. Run all tests                           │
│  2. AI Code Review (Claude)                 │
│  3. Security scan                           │
│  4. Deploy Vercel preview                   │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│  Bot comments on PR with:                   │
│  - AI review feedback                       │
│  - Preview deployment URL                   │
│  - Test results                             │
└─────────────────────────────────────────────┘
```

---

## 📁 Files Created

```
.github/
├── workflows/
│   ├── backend-ci.yml       # Backend testing + Render deployment
│   ├── frontend-ci.yml      # Frontend testing + Vercel deployment
│   └── ai-code-review.yml   # AI review + security scanning
└── AUTOMATION_SETUP.md      # This file
```

---

## 🎛️ Workflow Details

### [backend-ci.yml](workflows/backend-ci.yml)

**Triggers:**
- Push to `main` or `develop` (when backend files change)
- Pull requests to `main` or `develop`

**What it does:**
1. Spins up PostgreSQL test database
2. Installs Python dependencies
3. Runs linting (ruff, black)
4. Runs type checking (mypy)
5. Runs pytest with coverage
6. Deploys to Render (main branch only)
7. Performs health check

**Deployment:**
- Only runs on `main` branch
- Triggers Render deployment via API
- Waits for health check at `/health` endpoint

---

### [frontend-ci.yml](workflows/frontend-ci.yml)

**Triggers:**
- Push to `main` or `develop` (when frontend files change)
- Pull requests to `main` or `develop`

**What it does:**
1. Installs Node.js dependencies
2. Runs ESLint
3. Runs TypeScript type checking
4. Builds Next.js application
5. Deploys to Vercel

**Deployment:**
- Production: on `main` branch → https://common-ground-blue.vercel.app
- Preview: on pull requests → temporary preview URL

---

### [ai-code-review.yml](workflows/ai-code-review.yml)

**Triggers:**
- When PRs are opened, updated, or reopened

**What it does:**
1. **AI Review**: Claude 3.5 Sonnet reviews code changes
   - Checks for security issues
   - Identifies type safety problems
   - Suggests performance improvements
   - Comments on PR with feedback

2. **Security Scan**: Trivy + TruffleHog
   - Scans for vulnerabilities
   - Checks for leaked secrets
   - Reports to GitHub Security tab

---

## 💰 Cost Estimate

| Service | Free Tier | Expected Usage | Cost |
|---------|-----------|----------------|------|
| GitHub Actions | 2,000 min/month | ~200 min/month | **$0** |
| Vercel | 100 GB-hours | Plenty for this project | **$0** |
| Render | 750 hours/month | Plenty for this project | **$0-7** |
| Anthropic API | Pay per use | ~$1-5/month for reviews | **$1-5** |
| **Total** | | | **$1-12/month** |

---

## 🚨 Troubleshooting

### Workflow fails with "Resource not accessible by integration"

**Fix:** Enable workflow permissions:
1. Go to `Settings → Actions → General`
2. Scroll to "Workflow permissions"
3. Select "Read and write permissions"
4. Check "Allow GitHub Actions to create and approve pull requests"
5. Click "Save"

### Backend deployment fails

**Check:**
1. Is `RENDER_API_KEY` correct?
2. Is `RENDER_SERVICE_ID_BACKEND` correct?
3. Does your Render service exist?
4. Check Render dashboard for deployment logs

### Frontend deployment fails

**Check:**
1. Is `VERCEL_TOKEN` correct?
2. Are `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` correct?
3. Run `npx vercel link` to re-link project

### AI review doesn't appear

**Check:**
1. Is `ANTHROPIC_API_KEY` added to secrets?
2. Do you have Anthropic API credits?
3. Check workflow logs for API errors

### Tests fail locally but pass in CI (or vice versa)

**Common causes:**
- Environment variable differences
- Python/Node version mismatch
- Database state issues

**Fix:**
```bash
# Backend - use same Python version as CI (3.11)
cd cg-v1.110.26/backend
python3.11 -m pytest tests/

# Frontend - use same Node version as CI (20)
cd cg-v1.110.26/frontend
nvm use 20
npm test
```

---

## 🔐 Security Best Practices

1. **Never commit secrets to Git**
   - Always use GitHub Secrets
   - Check `.gitignore` includes `.env` files

2. **Rotate API keys regularly**
   - Update GitHub Secrets when you rotate keys
   - Update Vercel/Render environment variables too

3. **Review AI feedback carefully**
   - AI can make mistakes
   - Always use human judgment for security decisions

4. **Monitor security alerts**
   - Check GitHub Security tab regularly
   - Address high-severity issues promptly

---

## 📚 Next Steps

After setup is complete:

1. **Create a test PR** to see everything in action
2. **Share this doc** with your team
3. **Set up Slack notifications** (optional):
   - Add Slack webhook to secrets
   - Uncomment notification steps in workflows

4. **Configure branch protection** (recommended):
   - Require status checks to pass
   - Require PR reviews
   - Enable "Require branches to be up to date"

5. **Add badges to README** (optional):
   ```markdown
   ![Backend CI](https://github.com/simpletech310/CommonGround/workflows/Backend%20CI%2FCD/badge.svg)
   ![Frontend CI](https://github.com/simpletech310/CommonGround/workflows/Frontend%20CI%2FCD/badge.svg)
   ```

---

## 🤝 Team Workflow

### For Developers:

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit
3. Push: `git push origin feature/my-feature`
4. Open PR on GitHub
5. Wait for CI checks and AI review
6. Address feedback
7. Get human review approval
8. Merge to `main`
9. Automatic deployment happens! 🚀

### For Reviewers:

1. Check AI review comments first
2. Review code changes
3. Check test results
4. Test preview deployment
5. Approve or request changes

---

## 📞 Support

- **GitHub Actions Issues**: Check workflow logs in Actions tab
- **Vercel Issues**: [Vercel Dashboard](https://vercel.com/dashboard)
- **Render Issues**: [Render Dashboard](https://dashboard.render.com/)
- **General Questions**: Open an issue in this repo

---

## ✅ Setup Validation

Run this checklist after setup:

```bash
# 1. Check workflows are present
ls -la .github/workflows/
# Should see: backend-ci.yml, frontend-ci.yml, ai-code-review.yml

# 2. Check secrets are added (do this via GitHub UI)
# Visit: https://github.com/simpletech310/CommonGround/settings/secrets/actions
# Verify all required secrets are listed

# 3. Push and verify
git add .github/
git commit -m "ci: add GitHub Actions automation"
git push origin main

# 4. Check workflows run
# Visit: https://github.com/simpletech310/CommonGround/actions
# You should see workflows running!
```

---

**Your automation is ready! 🎉**

Time to deploy features faster than ever.
