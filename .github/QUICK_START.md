# 🚀 Quick Start - 30 Minute Setup

## Step 1: Get Vercel Info (5 min)

```bash
# Check if you already have it
cat cg-v1.110.26/frontend/.vercel/project.json

# If not, link your project
cd cg-v1.110.26/frontend
npx vercel link
# Answer: Y, select your team/account, select existing project
cat .vercel/project.json
```

Copy these values:
- `orgId` → This is your `VERCEL_ORG_ID`
- `projectId` → This is your `VERCEL_PROJECT_ID`

## Step 2: Get Vercel Token (2 min)

1. Go to: https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: `GitHub Actions`
4. Scope: Full Access
5. Click "Create"
6. **Copy the token immediately** (you won't see it again)

This is your `VERCEL_TOKEN`

## Step 3: Get Render Info (5 min)

### Get API Key:
1. Go to: https://dashboard.render.com/u/settings#api-keys
2. Click "Create API Key"
3. Name: `GitHub Actions`
4. Click "Create"
5. **Copy the key immediately**

This is your `RENDER_API_KEY`

### Get Service ID:
1. Go to: https://dashboard.render.com/
2. Click on your `commonground-api` service
3. Look at URL: `https://dashboard.render.com/web/srv-xxxxx`
4. Copy the `srv-xxxxx` part

This is your `RENDER_SERVICE_ID_BACKEND`

## Step 4: Get Supabase Info (2 min)

1. Go to your Supabase project settings
2. Copy your project URL → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy your anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 5: Get Anthropic API Key (Optional - 3 min)

1. Go to: https://console.anthropic.com/settings/keys
2. Click "Create Key"
3. Name: `GitHub Actions AI Review`
4. Copy the key

This is your `ANTHROPIC_API_KEY` (optional but recommended)

## Step 6: Add Secrets to GitHub (10 min)

1. Go to: https://github.com/simpletech310/CommonGround/settings/secrets/actions
2. Click "New repository secret" for each:

| Name | Value (from above) |
|------|-------------------|
| `VERCEL_TOKEN` | From Step 2 |
| `VERCEL_ORG_ID` | From Step 1 |
| `VERCEL_PROJECT_ID` | From Step 1 |
| `RENDER_API_KEY` | From Step 3 |
| `RENDER_SERVICE_ID_BACKEND` | From Step 3 |
| `NEXT_PUBLIC_SUPABASE_URL` | From Step 4 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Step 4 |
| `ANTHROPIC_API_KEY` | From Step 5 (optional) |

## Step 7: Enable Workflow Permissions (2 min)

1. Go to: https://github.com/simpletech310/CommonGround/settings/actions
2. Scroll to "Workflow permissions"
3. Select "Read and write permissions"
4. Check "Allow GitHub Actions to create and approve pull requests"
5. Click "Save"

## Step 8: Push and Test (3 min)

```bash
# Commit the workflows
git add .github/
git commit -m "ci: add GitHub Actions automation"
git push origin main

# Watch them run
# Open: https://github.com/simpletech310/CommonGround/actions
```

## ✅ Done!

Your automation is now live. Every push to `main` will:
- Run tests
- Deploy backend to Render
- Deploy frontend to Vercel

Every PR will:
- Run tests
- Get AI code review
- Get security scan
- Deploy preview to Vercel

---

## 🧪 Test It

Create a test PR:

```bash
git checkout -b test/automation
echo "# Test" >> README.md
git add README.md
git commit -m "test: verify GitHub Actions"
git push origin test/automation
```

Then:
1. Go to GitHub and create PR from `test/automation` to `main`
2. Watch the magic happen! ✨
3. You'll see:
   - Tests running
   - AI review comment
   - Preview deployment link
   - Security scan results

---

## 📋 Checklist

- [ ] Got Vercel token and IDs
- [ ] Got Render API key and service ID
- [ ] Got Supabase URL and anon key
- [ ] (Optional) Got Anthropic API key
- [ ] Added all secrets to GitHub
- [ ] Enabled workflow permissions
- [ ] Pushed workflows to main
- [ ] Verified workflows run
- [ ] Created test PR to see full automation

**Total time: ~30 minutes** ⏱️

Need more details? Read [AUTOMATION_SETUP.md](AUTOMATION_SETUP.md)
