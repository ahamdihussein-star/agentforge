# 🚀 Pre-Deployment Checklist

## ⚠️ CRITICAL - RUN BEFORE EVERY COMMIT/DEPLOYMENT

This checklist ensures zero repeated mistakes and production-ready code.

---

## 📋 **Phase 1: Before Code Changes**

### ✅ **Step 1: Review Common Issues**
```bash
# ALWAYS read before ANY database-related change
cat database/COMMON_ISSUES.md

# Current issues to avoid: 14 documented problems
# - Reserved words (metadata)
- Schema mismatches (DB vs Core models)
- Import errors (PBKDF2, ambiguous imports)
- Syntax errors (extra parentheses)
- Missing columns
- And more...
```

**Action:** Mentally check if planned change might trigger any documented issue.

---

### ✅ **Step 2: Schema Compatibility Check**

**If modifying Database Models:**
```bash
# Compare Database model with Core/Pydantic model
# Example: database/models/user.py vs core/security/models.py

# Check:
# 1. All fields in Core model exist in Database model
# 2. Field types are compatible
# 3. Field names match (or have proper mapping)
# 4. Enums are compatible
```

**Questions to ask:**
- ❓ Does Core model have fields that Database model lacks?
- ❓ Are field names identical or properly mapped?
- ❓ Are enum values compatible?
- ❓ Are JSON/Array fields using correct types (JSONArray, not ARRAY)?

---

### ✅ **Step 3: Service Layer Validation**

**If modifying Service/Mapping code:**
```python
# Check user_service.py, session_service.py, etc.

# Ensure:
# 1. Import aliases used (User as DBUser)
# 2. All Core model fields mapped from Database model
# 3. Enum conversions handled properly
# 4. Default values for missing/optional fields
```

**Example:**
```python
# ✅ GOOD:
from core.security import User
from ..models.user import User as DBUser

def _db_to_core_user(db_user: DBUser) -> User:
    # Map ALL fields, check Core model schema first!
    return User(
        id=db_user.id,
        role_ids=db_user.role_ids or [],  # ← Check DB model has this!
        # ... all other fields
    )
```

---

## 📋 **Phase 2: Before Commit**

### ✅ **Step 4: Syntax & Import Validation**
```bash
# 1. Check Python syntax
python3 -m compileall database/ core/ api/

# 2. Try importing modified modules
python3 -c "from database.services import UserService; print('✅ OK')"
python3 -c "from database.models import User; print('✅ OK')"

# 3. Check for common issues
./scripts/comprehensive_db_check.sh
```

**If any error:** Fix before committing!

---

### ✅ **Step 5: Pre-Commit Hook Review**

Pre-commit hook runs automatically, but mentally review:
- ❓ No `metadata` column?
- ❓ No PostgreSQL-specific imports?
- ❓ Using database-agnostic types?
- ❓ Import aliases for DB models?

---

## 📋 **Phase 3: Before Deployment (Production)**

### ✅ **Step 6: Production Data Impact Analysis**

**CRITICAL:** Think about existing production data!

**Questions:**
- ❓ Are there existing tables that need ALTER TABLE?
- ❓ Did I add new columns to an existing model?
- ❓ Do I need a migration script?
- ❓ Will existing data still work?

**Action Required If:**
- ✅ **Added columns to model** → Create ALTER TABLE script
- ✅ **Changed column types** → Create migration + data conversion
- ✅ **Removed columns** → Create migration + backup old data
- ✅ **Changed relationships** → Update foreign keys carefully

---

### ✅ **Step 7: Migration Script Checklist**

**If schema changed:**
```bash
# Created migration script in scripts/?
# - add_user_columns.py (ALTER TABLE)
# - fix_tools_table.py (DROP/CREATE)
# - migrate_to_db_complete.py (data migration)

# Script must:
# ✅ Be idempotent (can run multiple times safely)
# ✅ Use IF NOT EXISTS / IF EXISTS
# ✅ Have error handling
# ✅ Be database-agnostic (or handle different DBs)
# ✅ Be added to Dockerfile startup sequence
```

---

### ✅ **Step 8: Dockerfile Startup Sequence**

**Verify order in Dockerfile:**
```bash
1. Database connection check
2. init_db.py (CREATE TABLE IF NOT EXISTS)
3. fix_*_table.py (DROP/CREATE specific tables) ← Schema fixes
4. add_*_columns.py (ALTER TABLE) ← Add missing columns
5. migrate_to_db_complete.py (Data migration)
6. Start server
```

**Order matters!** Schema fixes before data migration.

---

## 📋 **Phase 4: After Deployment**

### ✅ **Step 9: Monitor First Logs**

**Watch for:**
```
✅ Database connection successful
✅ Tables created/updated
✅ Columns added
✅ Data migrated
✅ Users loaded from database ← KEY SUCCESS INDICATOR
❌ Any AttributeError
❌ Any ImportError
❌ Any falling back to files
```

---

### ✅ **Step 10: Document New Issues**

**If new error occurs:**
1. ✅ Understand root cause
2. ✅ Fix the issue
3. ✅ **Add to `database/COMMON_ISSUES.md`**
   - Problem
   - Error message
   - Root cause
   - Solution
   - Prevention strategy
4. ✅ **Update `UPDATE LOG`** (add to top)
5. ✅ **Enhance validation scripts** if possible
6. ✅ **Update `.cursorrules`** if needed

---

## 🎯 **Quick Reference: Common Mistakes to Avoid**

| Mistake | Check |
|---------|-------|
| Reserved words (`metadata`) | Search codebase before using |
| Schema mismatch (DB vs Core) | Compare models side-by-side |
| Missing imports (PBKDF2HMAC) | Check library docs |
| Ambiguous imports | Use aliases (User as DBUser) |
| Syntax errors (extra `)`) | Run `python -m compileall` |
| Missing columns | Compare DB model with Core model |
| No migration for schema change | Create ALTER TABLE script |
| PostgreSQL-specific types | Use `database/types.py` |
| Enum type mismatches | Use centralized `database/enums.py` |
| Forgot to update Dockerfile | Add new scripts to startup sequence |

---

## 🔥 **Red Flags (STOP AND REVIEW)**

If you see yourself:
- ❌ Adding a column to a model without checking Core model
- ❌ Importing from `sqlalchemy.dialects.postgresql`
- ❌ Using `metadata` as a column name
- ❌ Modifying a model without thinking about existing tables
- ❌ Committing without running validation scripts
- ❌ Seeing same error for the 2nd time

**STOP! Review this checklist again!**

---

## 📊 **Success Metrics**

✅ **Zero repeated issues**
✅ **Pre-commit hooks catch errors before push**
✅ **Deployments succeed on first try**
✅ **Database loading works immediately**
✅ **All issues documented**

---

## 🎯 **My Promise**

**Before EVERY commit, I will:**
1. ✅ Read `database/COMMON_ISSUES.md`
2. ✅ Check schema compatibility
3. ✅ Validate syntax and imports
4. ✅ Think about production impact
5. ✅ Create migration scripts if needed
6. ✅ Update Dockerfile if needed
7. ✅ Monitor deployment logs
8. ✅ Document any new issues

**No exceptions. No shortcuts. Zero tolerance for repeated mistakes.**

---

**Last Updated:** 2026-01-12  
**Total Documented Issues:** 15  
**Prevention Success Rate:** Improving! 🎯

