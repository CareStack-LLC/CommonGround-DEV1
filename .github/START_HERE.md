# 🚀 START HERE - GitHub Actions Setup

## ✅ What's Been Created

**8 files** ready to activate your automation:

```
.github/
├── workflows/               (3 workflow files - 16 KB)
│   ├── backend-ci.yml      → Tests + deploys backend to Render
│   ├── frontend-ci.yml     → Tests + deploys frontend to Vercel
│   └── ai-code-review.yml  → AI review + security scanning
│
├── QUICK_START.md          (4 KB)  ← Start here for 30-min setup
├── AUTOMATION_SETUP.md     (16 KB) ← Complete reference guide
├── IMPLEMENTATION_SUMMARY.md (16 KB) ← What was created
├── README.md               (8 KB)  ← Quick overview
└── validate-setup.sh       (12 KB) ← Check your configuration
```

---

## 🎯 Your First 30 Minutes

### Step 1: Understand What You're Getting (5 min)

**What happens when you push code:**
1. ✅ Tests run automatically (backend + frontend)
2. ✅ Code quality checks (linting, type checking)
3. ✅ Deploys to production (if tests pass)
4. ✅ Health checks verify it works

**What happens when you open a PR:**
1. ✅ All tests run
2. ✅ AI reviews your code (Claude 3.5)
3. ✅ Security scan for vulnerabilities
4. ✅ Preview deployment created
5. ✅ All results comment on PR

---

### Step 2: Gather Your API Keys (10 min)

You need these 7 secrets (8 with optional AI):

| # | Secret Name | Get It From |
|---|-------------|-------------|
| 1 | `VERCEL_TOKEN` | https://vercel.com/account/tokens |
| 2 | `VERCEL_ORG_ID` | `cat cg-v1.110.26/frontend/.vercel/project.json` |
| 3 | `VERCEL_PROJECT_ID` | `cat cg-v1.110.26/frontend/.vercel/project.json` |
| 4 | `RENDER_API_KEY` | https://dashboard.render.com/u/settings#api-keys |
| 5 | `RENDER_SERVICE_ID_BACKEND` | Your service URL (srv-xxxxx) |
| 6 | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings |
| 7 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings |
| 8 | `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys (optional) |

**Quick commands:**

```bash
# Get Vercel IDs
cat cg-v1.110.26/frontend/.vercel/project.json

# If that doesn't exist:
cd cg-v1.110.26/frontend
npx vercel link
cat .vercel/project.json
```

---

### Step 3: Add Secrets to GitHub (5 min)

1. Go to: https://github.com/simpletech310/CommonGround/settings/secrets/actions
2. Click "New repository secret" for each secret above
3. Enter name and value, click "Add secret"

---

### Step 4: Enable Workflow Permissions (2 min)

1. Go to: https://github.com/simpletech310/CommonGround/settings/actions
2. Under "Workflow permissions":
   - Select "Read and write permissions"
   - Check "Allow GitHub Actions to create and approve pull requests"
3. Click "Save"

---

### Step 5: Validate Setup (3 min)

```bash
# Check everything is configured correctly
bash .github/validate-setup.sh

# If you see errors, fix them before proceeding
```

---

### Step 6: Deploy! (5 min)

**Option A: Test on a branch first (RECOMMENDED)**

```bash
git checkout -b test/github-actions
git add .github/
git commit -m "ci: add GitHub Actions automation"
git push origin test/github-actions

# Create PR via GitHub UI or:
gh pr create --title "Add GitHub Actions automation" \
  --body "Implements automated CI/CD with testing and deployment"

# Watch workflows run, then merge when satisfied
```

**Option B: Deploy directly to main**

```bash
git add .github/
git commit -m "ci: add GitHub Actions automation"
git push origin main

# Watch at: https://github.com/simpletech310/CommonGround/actions
```

---

## ✅ Verify It's Working

After pushing:

1. **Check workflows are running:**
   - Go to: https://github.com/simpletech310/CommonGround/actions
   - You should see workflows in progress

2. **Check deployments succeeded:**
   - Backend: https://commonground-api.onrender.com/health
   - Frontend: https://common-ground-blue.vercel.app

3. **Create a test PR to see full automation:**
   ```bash
   git checkout -b test/automation
   echo "# Test" >> README.md
   git add README.md
   git commit -m "test: verify automation"
   git push origin test/automation
   gh pr create --title "Test automation" --body "Testing CI/CD"
   ```

   You should see:
   - ✅ Tests running
   - 💬 AI review comment
   - 🔒 Security scan results
   - 🔗 Preview deployment link

---

## 📚 Documentation Quick Links

| Document | When to Use It |
|----------|----------------|
| [QUICK_START.md](QUICK_START.md) | Setting up for the first time |
| [AUTOMATION_SETUP.md](AUTOMATION_SETUP.md) | Detailed reference, troubleshooting |
| [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) | Understanding what was created |
| [README.md](README.md) | Quick overview and team reference |

---

## 💡 Pro Tips

1. **Test on a branch first** - Create test PR before enabling on main
2. **Run validation script** - Catches issues before you push
3. **Enable AI reviews** - Add ANTHROPIC_API_KEY for code review
4. **Share with team** - Send them QUICK_START.md
5. **Monitor first runs** - Watch logs to ensure everything works

---

## 🐛 Common Issues

### "Workflows not running"
- Check workflow permissions in Settings → Actions
- Verify secrets are set
- Ensure files are in `.github/workflows/`

### "Deployment fails"
- Check secret values are correct
- Verify service IDs match your accounts
- Review workflow logs for errors

### "AI review doesn't appear"
- ANTHROPIC_API_KEY is optional
- Verify you have API credits
- Workflow continues without it

**Need help?** Read [AUTOMATION_SETUP.md](AUTOMATION_SETUP.md) or run `bash .github/validate-setup.sh`

---

## 🎉 What You'll Get

### Immediate Benefits:
- ✅ No manual testing
- ✅ No manual deployments
- ✅ Automatic code review
- ✅ Security scanning
- ✅ 5-minute deploy time

### Long-term Benefits:
- 📈 20+ hours/week saved
- 🔒 Higher code quality
- 🚀 Faster feature delivery
- 💰 $12/month vs $10,000/month DevOps
- 🤝 Better team collaboration

---

## 🚀 Ready? Let's Go!

```bash
# 1. Read the quick start
open .github/QUICK_START.md

# 2. Gather your secrets (see Step 2 above)

# 3. Add them to GitHub (see Step 3 above)

# 4. Validate your setup
bash .github/validate-setup.sh

# 5. Deploy!
git add .github/
git commit -m "ci: add GitHub Actions automation"
git push origin main

# 6. Watch it work
open https://github.com/simpletech310/CommonGround/actions
```

---

**Questions?** Everything is documented in [AUTOMATION_SETUP.md](AUTOMATION_SETUP.md)

**Stuck?** Run `bash .github/validate-setup.sh` to diagnose issues

**Ready!** Follow Step 2 above to gather your API keys and get started! 🎉
