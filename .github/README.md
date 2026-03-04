# GitHub Actions Automation for CommonGround

## 📦 What's Included

This directory contains automated CI/CD workflows for the CommonGround co-parenting platform.

```
.github/
├── workflows/
│   ├── backend-ci.yml       # Backend testing + Render deployment
│   ├── frontend-ci.yml      # Frontend testing + Vercel deployment
│   └── ai-code-review.yml   # AI code review + security scanning
├── AUTOMATION_SETUP.md      # Detailed setup guide
├── QUICK_START.md           # 30-minute quick start
├── validate-setup.sh        # Setup validation script
└── README.md                # This file
```

## 🚀 Quick Start

**New to this? Start here:**

1. Read [QUICK_START.md](QUICK_START.md) - Get up and running in 30 minutes
2. Run validation: `bash .github/validate-setup.sh`
3. Add required secrets to GitHub
4. Push and watch it work!

**Want all the details?**

Read [AUTOMATION_SETUP.md](AUTOMATION_SETUP.md) for comprehensive documentation.

## 🎯 What This Does

### On Every Push to `main`:
- ✅ Runs all tests (backend + frontend)
- ✅ Checks code quality (linting, type checking)
- ✅ Deploys backend to Render
- ✅ Deploys frontend to Vercel
- ✅ Performs health checks

### On Every Pull Request:
- ✅ Runs all tests
- ✅ AI code review with Claude 3.5 Sonnet
- ✅ Security scanning (vulnerabilities + secrets)
- ✅ Deploys preview to Vercel
- ✅ Comments on PR with feedback

## 📋 Required Secrets

Add these at: https://github.com/simpletech310/CommonGround/settings/secrets/actions

| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN` | Deploy to Vercel |
| `VERCEL_ORG_ID` | Vercel organization |
| `VERCEL_PROJECT_ID` | Vercel project |
| `RENDER_API_KEY` | Deploy to Render |
| `RENDER_SERVICE_ID_BACKEND` | Render service ID |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase connection |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase auth |
| `ANTHROPIC_API_KEY` | AI reviews (optional) |

See [QUICK_START.md](QUICK_START.md) for how to get these values.

## 🔧 Workflows

### [backend-ci.yml](workflows/backend-ci.yml)
**Backend Testing & Deployment**

Runs on: Push/PR to `main` or `develop` (when backend files change)

**What it does:**
1. Sets up Python 3.11 + PostgreSQL test database
2. Installs dependencies from requirements.txt
3. Runs ruff, black, mypy
4. Runs pytest with coverage
5. Deploys to Render (main only)
6. Health check at `/health`

### [frontend-ci.yml](workflows/frontend-ci.yml)
**Frontend Testing & Deployment**

Runs on: Push/PR to `main` or `develop` (when frontend files change)

**What it does:**
1. Sets up Node.js 20
2. Installs dependencies with npm ci
3. Runs ESLint
4. Runs TypeScript type checking
5. Builds Next.js app
6. Deploys to Vercel
   - Production: on `main` branch
   - Preview: on pull requests

### [ai-code-review.yml](workflows/ai-code-review.yml)
**AI Code Review & Security**

Runs on: All pull requests

**What it does:**
1. **AI Review**: Claude analyzes code for:
   - Security issues (XSS, SQL injection, etc.)
   - Type safety problems
   - Performance concerns
   - Best practice violations

2. **Security Scanning**:
   - Trivy: Scans for vulnerabilities
   - TruffleHog: Detects leaked secrets

3. Comments on PR with findings

## ✅ Validation

Check if everything is set up correctly:

```bash
bash .github/validate-setup.sh
```

This script checks:
- ✅ Directory structure
- ✅ Workflow files
- ✅ Project configuration
- ✅ Git setup
- ✅ Vercel/Render configuration

## 📊 Monitoring

### View Workflow Runs
https://github.com/simpletech310/CommonGround/actions

### Check Deployment Status

**Frontend (Vercel):**
- Production: https://common-ground-blue.vercel.app
- Dashboard: https://vercel.com/dashboard

**Backend (Render):**
- Production: https://commonground-api.onrender.com/health
- Dashboard: https://dashboard.render.com/

## 🐛 Troubleshooting

### Workflows not running?

1. **Check workflow permissions:**
   - Go to: Settings → Actions → General
   - Select "Read and write permissions"
   - Enable "Allow GitHub Actions to create and approve pull requests"

2. **Verify secrets are set:**
   - Go to: Settings → Secrets and variables → Actions
   - Ensure all required secrets are present

3. **Check workflow files:**
   ```bash
   ls -la .github/workflows/
   ```
   Should show all three `.yml` files

### Deployment failing?

**Backend (Render):**
- Check `RENDER_API_KEY` is correct
- Verify `RENDER_SERVICE_ID_BACKEND` matches your service
- Check Render dashboard for deployment logs

**Frontend (Vercel):**
- Check `VERCEL_TOKEN` is valid
- Verify `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`
- Run `npx vercel link` to re-link if needed

### AI review not working?

- Check `ANTHROPIC_API_KEY` is set
- Verify you have API credits
- Check workflow logs for API errors

## 🎓 Team Workflow

### For Developers:

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes, commit
git add .
git commit -m "feat: add new feature"

# 3. Push
git push origin feature/my-feature

# 4. Create PR on GitHub
# 5. Wait for CI checks and AI review
# 6. Address feedback
# 7. Get approval and merge
# 8. Automatic deployment! 🚀
```

### What Happens Automatically:

```
Developer pushes code
         ↓
GitHub Actions triggers
         ↓
   ┌──────────┬──────────────┐
   ↓          ↓              ↓
Backend    Frontend    AI Review
Tests      Tests       Security
   ↓          ↓              ↓
Deploy     Deploy      Comment
Render     Vercel      on PR
   ↓          ↓              ↓
Health     Preview     Report
Check      URL         Results
```

## 💰 Cost Estimate

- GitHub Actions: **Free** (2,000 min/month)
- Vercel: **Free** tier
- Render: **$0-7**/month
- Anthropic API: **$1-5**/month

**Total: ~$1-12/month**

## 📚 Documentation

- **Quick Start**: [QUICK_START.md](QUICK_START.md) - 30 min setup
- **Full Guide**: [AUTOMATION_SETUP.md](AUTOMATION_SETUP.md) - Complete documentation
- **Validation**: `bash .github/validate-setup.sh` - Check setup

## 🤝 Contributing

When modifying workflows:

1. Test on a feature branch first
2. Verify workflows run successfully
3. Update documentation if needed
4. Get team review before merging

## 📞 Support

- **Workflow Issues**: Check Actions tab for logs
- **Deployment Issues**: Check Vercel/Render dashboards
- **Setup Help**: See [AUTOMATION_SETUP.md](AUTOMATION_SETUP.md)

---

**Ready to get started?** Read [QUICK_START.md](QUICK_START.md) →
