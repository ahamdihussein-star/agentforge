# 🚂 Railway Deployment with PostgreSQL

## 🎯 Overview
Railway automatically provisions PostgreSQL and connects it to your app.

---

## 📋 Pre-Deployment Checklist

### 1. Add PostgreSQL to Railway Project
```
1. Go to Railway dashboard
2. Click your project (agentforge2)
3. Click "+ New"
4. Select "Database" → "PostgreSQL"
5. Wait for provisioning (~30 seconds)
6. ✅ DATABASE_URL automatically created
```

### 2. Set Environment Variables
In Railway dashboard, add these variables:

**Required:**
```bash
# Generate encryption key first
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Then add to Railway:
ENCRYPTION_KEY=<generated_key>
JWT_SECRET=<your_jwt_secret>
```

**Optional (LLM APIs):**
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
SENDGRID_API_KEY=SG...
```

**Auto-Set by Railway:**
```bash
DATABASE_URL=postgresql://...  # ✅ Automatic
PORT=8000                       # ✅ Automatic
```

---

## 🚀 Deployment Steps

### Option 1: Git Push (Current Setup)
```bash
# Already configured!
git push origin main
# Railway auto-deploys ✅
```

### Option 2: Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

---

## 🗄️ Database Initialization

Railway will run `database/init_db.py` automatically on first deploy.

**If not, run manually:**
```bash
# In Railway dashboard
railway run python database/init_db.py
```

---

## ✅ Verify Deployment

### 1. Check Database Connection
```bash
# Visit
https://agentforge2.up.railway.app/api/health/db

# Should return:
{
  "status": "healthy",
  "database": {
    "type": "postgresql",
    "connected": true,
    "host": "containers-us-west-xxx.railway.app"
  }
}
```

### 2. Check Logs
```bash
# Railway CLI
railway logs

# Look for:
# ✅ Database engine created: postgresql
# ✅ Database connection successful
# ✅ Health check endpoints registered
```

### 3. Test API
```bash
curl https://agentforge2.up.railway.app/api/health
```

---

## 🔧 Database Management

### Connect to PostgreSQL (Railway)
```bash
# Get connection string from Railway dashboard
# Or use Railway CLI:
railway connect postgres

# Manual connection:
psql $DATABASE_URL
```

### View Tables
```sql
\dt                    -- List all tables
\d users              -- Describe users table
SELECT * FROM users;  -- Query users
```

### Backup Database
```bash
# Railway CLI
railway run pg_dump > backup.sql

# Restore
railway run psql < backup.sql
```

---

## 🐛 Troubleshooting

### Database Connection Failed
1. Check if PostgreSQL is provisioned in Railway
2. Verify DATABASE_URL is set
3. Check logs: `railway logs`

### Tables Not Created
```bash
# Manually initialize
railway run python database/init_db.py
```

### Environment Variables Missing
```bash
# List all variables
railway variables

# Add missing ones in Railway dashboard
```

---

## 📊 Monitoring

### Health Checks
- Main: `https://agentforge2.up.railway.app/api/health`
- Database: `https://agentforge2.up.railway.app/api/health/db`

### Metrics (Railway Dashboard)
- Database size
- Connection pool usage
- Query performance
- Memory/CPU usage

---

## 🔄 Migration Strategy

### Current Setup (JSON files)
```
data/
├── agents.json
├── tools.json
└── security/
    └── users.json
```

### After Database
```
PostgreSQL (Railway)
├── users          ✅
├── roles          ✅
├── permissions    ✅
├── organizations  ✅
└── ... (more tables)
```

### Parallel Run (Recommended)
```python
# Write to both
save_to_json(data)      # Old
save_to_database(data)  # New

# Read from database first
data = get_from_db() or get_from_json()
```

---

## 🎉 Expected Results

After successful deployment:
- ✅ PostgreSQL running on Railway
- ✅ Database tables created
- ✅ Health check endpoints working
- ✅ API connected to database
- ✅ JSON files still work (parallel)
- ✅ Zero downtime

---

**Next Step:** Push to main branch and Railway will handle everything! 🚀

