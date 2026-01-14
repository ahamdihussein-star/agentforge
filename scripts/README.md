# 🛡️ Database Validation Scripts

## Overview
Automated checks to prevent database-related errors before they reach production.

---

## Scripts

### 1. `comprehensive_db_check.sh` ⭐ **RECOMMENDED**
**Most complete check - runs ALL validations**

```bash
./scripts/comprehensive_db_check.sh
```

**Checks:**
- ✅ Reserved `metadata` column (Issue #1)
- ✅ PostgreSQL-specific imports (Issue #7)
- ✅ `ARRAY(...)` usage (must use `JSONArray`)
- ✅ `UUID(as_uuid=True)` (must use `UUID` from `..types`)
- ✅ Native PostgreSQL enums (Issue #6)
- ✅ Import consistency
- ✅ JSONB import patterns

**Exit Codes:**
- `0` = All checks passed ✅
- `1` = Errors found, commit should be blocked ❌

---

### 2. `migrate_to_db_complete.py`
**Data migration script**

Migrates data from JSON files to PostgreSQL database.

```bash
python scripts/migrate_to_db_complete.py
```

**Migrates:**
- ✅ Organizations
- ✅ Roles & Permissions
- ✅ Users
- ✅ Tools
- ✅ Agents
- ✅ Conversations
- ✅ Knowledge Bases

---

## Pre-Commit Hook

**Location:** `.git/hooks/pre-commit`

**What it does:**
- Automatically runs `comprehensive_db_check.sh` before every commit
- Blocks commit if ANY error found
- Ensures database issues are caught BEFORE pushing

**Verify it's installed:**
```bash
ls -la .git/hooks/pre-commit
# Should show: -rwxr-xr-x (executable)
```

**Test it:**
```bash
# Try to commit - should run validation
git add .
git commit -m "Test"
# Output:
# 🔍 Running Pre-Commit Database Validation...
# ...
# ✅ Pre-commit validation passed!
```

---

## Usage Workflow

### Before Creating/Modifying Database Models:

**1. Read Documentation:**
```bash
cat database/COMMON_ISSUES.md  # Review known issues
cat .cursorrules               # Review rules
```

**2. Make Changes:**
```bash
vim database/models/user.py
```

**3. Run Validation:**
```bash
./scripts/comprehensive_db_check.sh
```

**4. If Errors Found:**
- Read error messages
- Check `database/COMMON_ISSUES.md` for similar issues
- Fix errors
- Re-run validation

**5. Commit:**
```bash
git add database/models/user.py
git commit -m "Update user model"
# Pre-commit hook runs automatically ✅
```

---

## Common Errors & Fixes

### Error: PostgreSQL-specific imports found
```bash
❌ ERROR: Found PostgreSQL-specific imports
   Use: from ..types import UUID, JSON, JSONArray
```

**Fix:**
```python
# ❌ WRONG:
from sqlalchemy.dialects.postgresql import UUID, JSONB

# ✅ CORRECT:
from ..types import UUID, JSON, JSONArray
JSONB = JSON  # After all imports
```

---

### Error: Found ARRAY usage
```bash
❌ ERROR: Found ARRAY usage (PostgreSQL-specific)
   Use: JSONArray
```

**Fix:**
```python
# ❌ WRONG:
scores = Column(ARRAY(Float))

# ✅ CORRECT:
scores = Column(JSONArray)  # Stores as JSON array
```

---

### Error: Found metadata column
```bash
❌ ERROR: Found 'metadata' column (reserved word)
```

**Fix:**
```python
# ❌ WRONG:
metadata = Column(JSON)

# ✅ CORRECT:
extra_metadata = Column(JSON)
# OR: user_metadata, custom_data, etc.
```

---

## References

- `database/COMMON_ISSUES.md` - Detailed issue documentation
- `.cursorrules` - Project-wide rules
- `database/types.py` - Database-agnostic type definitions
- `database/enums.py` - Centralized enum definitions

---

## Troubleshooting

### Pre-commit hook not running?
```bash
# Check if installed:
ls -la .git/hooks/pre-commit

# Re-install:
chmod +x .git/hooks/pre-commit

# Test manually:
.git/hooks/pre-commit
```

### Validation script fails to run?
```bash
# Make executable:
chmod +x scripts/comprehensive_db_check.sh

# Run with bash:
bash scripts/comprehensive_db_check.sh
```

---

**🎯 Goal: Catch ALL database issues BEFORE deployment!**
**🚨 Zero tolerance for repeated mistakes!**

