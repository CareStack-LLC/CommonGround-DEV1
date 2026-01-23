# Database Reset Scripts

## Overview

These scripts allow you to reset the CommonGround database to a fresh state by deleting all user accounts and related data while preserving the database schema and migrations.

## Scripts

### 1. `reset_auth_users.py` ✅ RECOMMENDED

**What it does:**
- Deletes all users from `auth.users` (Supabase Auth table)
- Automatically cascades to delete all related application data via foreign keys
- Fast and clean (single DELETE statement)
- Preserves database schema and migrations

**Usage:**
```bash
cd backend
source venv/bin/activate
source .env
python scripts/reset_auth_users.py
```

**What gets deleted:**
- All users (auth.users)
- All user profiles
- All family files
- All children profiles
- All agreements and sections
- All messages and ARIA conversations
- All schedule events
- All custody exchanges
- All ClearFund obligations
- All court events
- All professional profiles and firms
- All KidComs sessions
- All parent call sessions
- All audit logs

**What is preserved:**
- Database schema (all tables remain)
- Alembic migrations history
- Table structure and relationships

---

### 2. `reset_database.py` (Alternative - More Verbose)

**What it does:**
- Manually truncates each table individually
- More explicit about what's being deleted
- Shows progress for each table

**Usage:**
```bash
cd backend
source venv/bin/activate
source .env
python scripts/reset_database.py
```

**Note:** May timeout on large databases. Use `reset_auth_users.py` instead.

---

## When to Use

### Use Case: Development/Testing
- Starting fresh after testing
- Clearing test data
- Resetting to demo state

### Use Case: Staging Environment
- Preparing for demo
- Starting new QA cycle
- Refreshing test data

### ⚠️ Production Warning
**DO NOT run these scripts on production without:**
1. Full database backup
2. Team approval
3. User notification
4. Maintenance window scheduled

---

## Safety Features

All scripts include:
1. **Confirmation prompt** - Must type 'RESET' to proceed
2. **3-second delay** - Time to cancel (Ctrl+C)
3. **Transaction rollback** - On any error, no changes committed
4. **Schema preservation** - Only data deleted, structure intact

---

## Example Session

```bash
$ cd backend
$ source venv/bin/activate
$ source .env
$ python scripts/reset_auth_users.py

============================================================
   COMMONGROUND DATABASE RESET
============================================================

⚠️  Type 'RESET' to confirm deletion of ALL users: RESET

🔄 Starting reset in 3 seconds...

🚨 RESETTING DATABASE...
⚠️  Deleting all users from auth.users (cascades to all data)

📋 Found 135 users to delete

🗑️  Deleting users from auth.users...

✅ DATABASE RESET COMPLETE!

📊 Summary:
   - 135 users deleted from auth.users
   - All family files cascaded (deleted)
   - All messages cascaded (deleted)
   - All agreements cascaded (deleted)
   - All children cascaded (deleted)
   - All schedule data cascaded (deleted)
   - All expense data cascaded (deleted)
   - All case data cascaded (deleted)
   - Schema and migrations preserved

🎉 System is now fresh and ready for new users!
```

---

## Verification After Reset

Check that data is deleted:
```bash
# Check user count
psql $DATABASE_URL -c "SELECT COUNT(*) FROM auth.users;"

# Check family files
psql $DATABASE_URL -c "SELECT COUNT(*) FROM public.family_files;"

# Check messages
psql $DATABASE_URL -c "SELECT COUNT(*) FROM public.messages;"
```

All should return `0`.

---

## Troubleshooting

### "Statement timeout" error
**Solution:** Use `reset_auth_users.py` instead - it's faster and more efficient.

### "Permission denied"
**Solution:** Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env`.

### "Connection refused"
**Solution:** Check that `DATABASE_URL` in `.env` is correct and accessible.

### Still seeing old data
**Solution:** Check if you're connected to the correct database (staging vs production).

---

## Recovery

If you need to restore data after reset:

1. **From backup:**
   ```bash
   pg_restore -d $DATABASE_URL backup.dump
   ```

2. **Re-run seed scripts:**
   ```bash
   python scripts/seed_demo_data.py
   ```

---

## Created

- **Date:** January 23, 2026
- **By:** Claude Code
- **Last Reset:** 135 users deleted successfully
