# 🚨 Database Common Issues & Pitfalls

## ⚠️ CRITICAL - ALWAYS CHECK BEFORE ADDING MODELS

This file documents all issues encountered during database development to prevent repetition.

---

## 🔴 **RESERVED WORDS IN SQLALCHEMY**

### Issue #1: `metadata` is Reserved
**Date:** 2026-01-12  
**Severity:** CRITICAL  
**Occurrences:** 2 times (user.py, then all new models)

#### Problem:
```python
# ❌ WRONG - SQLAlchemy reserves 'metadata'
class Agent(Base):
    metadata = Column(JSONB)
```

#### Error:
```
sqlalchemy.exc.InvalidRequestError: Attribute name 'metadata' 
is reserved when using the Declarative API.
```

#### Solution:
```python
# ✅ CORRECT - Use alternative name
class Agent(Base):
    extra_metadata = Column(JSONB)
    # OR
    user_metadata = Column(JSONB)
    # OR
    custom_data = Column(JSONB)
```

#### Why:
SQLAlchemy uses `metadata` internally for table/schema management. It's part of `Base.metadata`.

#### Prevention:
**ALWAYS search existing models for reserved words before creating new ones!**

---

## 🔴 **FOREIGN KEY ISSUES**

### Issue #2: Circular Dependencies in Foreign Keys
**Date:** 2026-01-11  
**Severity:** HIGH

#### Problem:
Foreign keys between tables can cause circular dependency errors during table creation.

#### Error:
```
Foreign key associated with column 'users.org_id' could not find 
table 'organizations' with which to generate a foreign key
```

#### Solutions:
1. **Temporary:** Remove ForeignKey constraints, keep column as UUID
```python
# ✅ Works for now
org_id = Column(UUID(as_uuid=True), index=True)
```

2. **With use_alter:**
```python
# ✅ Deferred constraint creation
org_id = Column(UUID(as_uuid=True), 
                ForeignKey('organizations.id', use_alter=True, 
                          name='fk_user_organization'))
```

3. **Future:** Use Alembic migrations with explicit order

---

## 🟡 **RELATIONSHIP DEFINITIONS WITHOUT FOREIGN KEYS**

### Issue #3: Relationships Require ForeignKeys
**Date:** 2026-01-11  
**Severity:** MEDIUM

#### Problem:
```python
# ❌ WRONG - relationship() needs ForeignKey
org_id = Column(UUID)  # No ForeignKey
organization = relationship("Organization", back_populates="users")
```

#### Error:
```
NoForeignKeysError: Could not determine join condition between 
parent/child tables on relationship User.sessions
```

#### Solution:
Either:
1. Add ForeignKey to column
2. OR remove relationship() definition
3. OR specify explicit primaryjoin

**Current Strategy:** Remove both FKs and relationships temporarily.

---

## 🟡 **PYDANTIC WARNINGS**

### Issue #4: Protected Namespace Warnings
**Date:** Ongoing  
**Severity:** LOW (warning only)

#### Warning:
```
UserWarning: Field "model_id" has conflict with protected namespace "model_"
```

#### Solution:
Add to model config:
```python
from pydantic import BaseModel, ConfigDict

class MyModel(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_id: str  # Now allowed
```

**Status:** Not blocking, can be addressed later.

---

## 🔴 **DATA MIGRATION ISSUES**

### Issue #5: Duplicate Key Violations on Unique Constraints
**Date:** 2026-01-12  
**Severity:** HIGH  
**Occurrences:** 1 time (organization slug during migration)

#### Problem:
Migration script checked only for existing `id` (primary key) but not for other unique constraints like `slug`, `email`, etc.

```python
# ❌ WRONG - Only checks primary key
existing = session.query(Organization).filter_by(id=org_uuid).first()
if not existing:
    session.add(org)  # Can fail if slug already exists!
```

#### Error:
```
psycopg2.errors.UniqueViolation: duplicate key value violates 
unique constraint "ix_organizations_slug"
DETAIL: Key (slug)=(default) already exists.
```

#### Root Cause:
- First migration: Creates org with `id=uuid1`, `slug='default'`
- Second migration: New UUID generated `id=uuid2`, but `slug='default'` still exists
- Database rejects because `slug` has unique constraint

#### Solution:
```python
# ✅ CORRECT - Check ALL unique constraints
existing = session.query(Organization).filter(
    (Organization.id == org_uuid) | 
    (Organization.slug == slug)
).first()

if existing:
    # UPDATE existing record
    existing.name = org_data['name']
    existing.settings = org_data['settings']
    existing.updated_at = datetime.utcnow()
    print(f"⏭️  Organization '{name}' already exists (updating)")
else:
    # CREATE new record
    org = Organization(...)
    session.add(org)
    print(f"✅ Migrated organization: {name}")

session.commit()
```

#### Best Practices for Migration Scripts:

1. **Check ALL unique constraints, not just primary key:**
   ```python
   # For Organizations:
   - id (primary key)
   - slug (unique)
   
   # For Users:
   - id (primary key)
   - email (unique)
   
   # For Roles:
   - id (primary key)
   - (org_id, name) if org-scoped
   ```

2. **Use UPDATE instead of failing:**
   ```python
   # ✅ IDEMPOTENT - Can run multiple times safely
   if existing:
       update_record(existing, new_data)
   else:
       create_record(new_data)
   ```

3. **Log clearly:**
   ```python
   if existing:
       print(f"⏭️  Record already exists (updating)")
   else:
       print(f"✅ Created new record")
   ```

4. **Test migration script multiple times:**
   ```bash
   # Should be safe to run repeatedly
   python scripts/migrate_to_db.py  # Run 1
   python scripts/migrate_to_db.py  # Run 2 - should update, not fail
   ```

#### Why This Matters:
- **Railway deployments:** May run migration on every deploy
- **Rollbacks:** Old deployment with migration can re-run
- **Development:** Developers run migrations multiple times locally
- **Data fixes:** Need to re-run migration after fixing source data

#### Prevention:
- ✅ Always identify ALL unique constraints in target table
- ✅ Use filter with OR conditions for all unique fields
- ✅ Implement UPSERT pattern (update if exists, insert if not)
- ✅ Test migration scripts at least 2 times consecutively
- ✅ Use database constraints as checklist for migration logic

---

## 🔴 **ENUM TYPE MISMATCHES**

### Issue #6: Invalid Enum Value During Migration
**Date:** 2026-01-12  
**Severity:** HIGH  
**Occurrences:** 1 time (tool type during migration)

#### Problem:
JSON data contains enum values that don't exist in the database Enum definition.

```python
# ❌ JSON has: type = "website"
# ❌ Database Enum: API, DATABASE, RAG, EMAIL, WEB_SCRAPING, WEB_SEARCH...
# ❌ No "WEBSITE" in enum!
```

#### Error:
```
psycopg2.errors.InvalidTextRepresentation: invalid input value 
for enum tooltype: "website"
LINE 1: ...'::UUID, 'website',...
```

#### Root Cause:
- **Mismatch between legacy data and schema:**
  - Old JSON files use `type = "website"`
  - New database schema didn't include `"website"` in ToolType enum
  - PostgreSQL strictly validates enum values

#### Solution - Two Approaches:

**1. Add Missing Enum Values (Preferred):**
```python
# ✅ Update Enum to include all legacy values
class ToolType(str, Enum):
    API = "api"
    DATABASE = "database"
    RAG = "rag"
    EMAIL = "email"
    WEB_SCRAPING = "web_scraping"
    WEB_SEARCH = "web_search"
    WEBSITE = "website"  # ← Add missing value
    SLACK = "slack"
    # ... etc
```

**2. Map Legacy Values in Migration Script:**
```python
# ✅ Normalize/map legacy values during migration
TYPE_MAPPING = {
    'website': 'website',      # Direct mapping
    'web': 'web_scraping',     # Legacy → New
    'scraper': 'web_scraping',
    'scraping': 'web_scraping',
    'search': 'web_search',
}

tool_type = tool_data.get('type', 'api').lower()
if tool_type in TYPE_MAPPING:
    tool_type = TYPE_MAPPING[tool_type]
elif tool_type not in VALID_TYPES:
    print(f"⚠️  Unknown tool type '{tool_type}', using 'custom'")
    tool_type = 'custom'
```

#### Best Practices for Enums:

1. **Include 'CUSTOM' or 'OTHER' catch-all:**
   ```python
   class ToolType(str, Enum):
       # ... other types ...
       CUSTOM = "custom"  # Catch-all for unknown types
   ```

2. **Document enum values in migration:**
   ```python
   # At top of migration script
   VALID_TOOL_TYPES = ['api', 'database', 'rag', 'email', ...]
   ```

3. **Validate before migrating:**
   ```python
   # Pre-migration validation
   for tool in tools:
       if tool['type'] not in VALID_TOOL_TYPES:
           print(f"WARNING: Invalid type '{tool['type']}'")
   ```

4. **Use TYPE_MAPPING for backward compatibility:**
   - Old system uses different type names
   - New system standardizes enum values
   - Migration script bridges the gap

5. **PostgreSQL Enum Alterations:**
   ```sql
   -- Adding new enum value to existing enum type
   ALTER TYPE tooltype ADD VALUE 'website';
   -- Note: This requires Alembic migration, not CREATE TABLE
   ```

#### Why This Matters:
- **Data integrity:** PostgreSQL enforces enum constraints strictly
- **Migration safety:** Legacy data must map to new schema
- **Type evolution:** Systems evolve, enums grow over time
- **Multi-source data:** Different sources may use different terminology

#### Prevention:
- ✅ Audit existing JSON data for all unique enum values BEFORE creating models
- ✅ Include "CUSTOM" or "OTHER" as catch-all in all enums
- ✅ Create TYPE_MAPPING dictionary in migration scripts
- ✅ Log warnings for unknown values (don't fail silently)
- ✅ Use Alembic for enum alterations in production

#### ⚠️ **IMPORTANT: Enterprise-Grade Solution Applied**

The initial quick fix (adding 'WEBSITE' to model, hard-coded TYPE_MAPPING) was **NOT enterprise-ready**.

**✅ Proper Enterprise Solution Implemented:**

1. **Centralized Enum Management** (`database/enums.py`):
   ```python
   # Single source of truth for all enums
   class ToolType(str, Enum):
       API = "api"
       DATABASE = "database"
       # ... all types
       CUSTOM = "custom"
       
       @classmethod
       def from_legacy(cls, value: str) -> 'ToolType':
           """Convert legacy value, fallback to CUSTOM"""
           # Handles normalization and mapping
   
   # Centralized legacy mapping
   TOOL_TYPE_LEGACY_MAPPING = {
       'web': ToolType.WEB_SCRAPING,
       'website': ToolType.WEBSITE,
       # ... all legacy mappings
   }
   ```

2. **Alembic Migrations** (Not direct model changes):
   ```bash
   # Proper way to alter enums in production
   alembic init alembic
   alembic revision -m "add_website_to_tooltype"
   alembic upgrade head
   ```

3. **Models Import from Centralized Enums**:
   ```python
   # database/models/tool.py
   from ..enums import ToolType  # Not local definition!
   ```

4. **Migration Script Uses Enum Methods**:
   ```python
   # Use centralized logic
   tool_type_enum = ToolType.from_legacy(legacy_value)
   # Not hard-coded TYPE_MAPPING in migration script
   ```

**Why This Matters:**
- ✅ **Single Source of Truth:** One place to manage all enums
- ✅ **Reusability:** API validators, migrations, models all use same enums
- ✅ **Type Safety:** Centralized validation logic
- ✅ **Maintainability:** Add new type once, works everywhere
- ✅ **Schema Versioning:** Alembic tracks all enum changes
- ✅ **Rollback Capability:** Can revert enum changes via Alembic

**Enterprise Best Practices:**
- 🏢 Never modify models directly in production
- 🏢 Always use migration tools (Alembic)
- 🏢 Centralize business logic (enums, validators)
- 🏢 Document all schema changes
- 🏢 Test migrations before production
- 🏢 Provide rollback paths

#### ⚠️ **CRITICAL: PostgreSQL Enum Types Are Separate from Python Enums!**

**Issue #6 Continued - The REAL Problem:**

Even after adding `WEBSITE` to Python enum and using centralized `database/enums.py`, migration still failed with:

```
invalid input value for enum tooltype: "WEBSITE"
'type': 'WEBSITE'
```

**Root Cause:**
- ✅ Python enum has `WEBSITE` (code level)
- ❌ PostgreSQL `tooltype` enum does NOT have `'website'` (database level)
- 🔥 **Python enums ≠ PostgreSQL enum types!**

**Why:**
1. When `CREATE TABLE tools` first ran, PostgreSQL created `tooltype` enum with only original values
2. Adding to Python enum (`database/enums.py`) only affects Python code
3. PostgreSQL enum type is **separate** and must be altered explicitly
4. ALTER TYPE requires migration, not just model changes

**Enterprise Solution Applied:**

**1. Alembic Migration Created:**
```python
# alembic/versions/001_add_website_tooltype.py
def upgrade():
    # Check if 'website' exists in PostgreSQL enum
    # If not, add it via ALTER TYPE
    op.execute("COMMIT")  # Must be outside transaction
    op.execute("ALTER TYPE tooltype ADD VALUE 'website'")
```

**2. Automatic Migration Execution:**
```python
# database/init_db.py
def main():
    init_db()  # Create tables
    
    # Run Alembic migrations
    from alembic.config import Config
    from alembic import command
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")
```

**3. Dockerfile Integration:**
```bash
# Already calls init_db.py which now runs migrations
python database/init_db.py
```

**Key Learnings:**
- 📚 PostgreSQL enum types exist independently of Python enums
- 📚 Changing Python code does NOT change database schema
- 📚 Must use ALTER TYPE or DROP/CREATE to modify PostgreSQL enums
- 📚 Alembic migrations are the proper enterprise way
- 📚 First migration must add missing enum value
- 📚 Future enum additions follow same pattern

**Prevention:**
- ✅ Never assume Python enum changes affect database
- ✅ Always create Alembic migration for enum modifications
- ✅ Test migrations in dev environment before production
- ✅ Document all schema changes in migration files
- ✅ Verify PostgreSQL enum values match Python enum values

---

## 🔴 **IMPORT ERRORS AFTER TYPE CONVERSION**

### Issue #7: NameError After Database-Agnostic Conversion
**Date:** 2026-01-12  
**Severity:** HIGH  
**Occurrences:** 1 time (after conversion script)

#### Problem:
After converting from PostgreSQL-specific types to database-agnostic types, models had import errors.

```python
# ❌ WRONG Import Pattern:
from ..types import UUID, JSON as JSONB

# Code uses:
user_metadata = Column(JSON, default={})
# Error: NameError: name 'JSON' is not defined
```

#### Error:
```
NameError: name 'JSON' is not defined. Did you mean: 'JSONB'?
```

#### Root Cause:
- Conversion script changed `Column(JSONB, ...)` to `Column(JSON, ...)`
- BUT import was `JSON as JSONB` (only JSONB available in scope)
- Code now references `JSON` which doesn't exist
- Inconsistent naming between import and usage

#### Solution:
```python
# ✅ CORRECT Import Pattern:
from ..types import UUID, JSON, JSONArray
JSONB = JSON  # Alias for backward compatibility

# Now both work:
user_metadata = Column(JSON, default={})  # ✅
config = Column(JSONB, default={})        # ✅
```

#### Best Practices for Type Conversions:

1. **Import Both Names:**
   ```python
   from ..types import UUID, JSON, JSONArray
   JSONB = JSON  # Keep alias for compatibility
   ```

2. **Update Conversion Script:**
   ```python
   # Pattern for replacements:
   REPLACEMENTS = [
       # Import: Add all needed types
       (r'from sqlalchemy\.dialects\.postgresql import UUID, JSONB',
        'from ..types import UUID, JSON, JSONArray\nJSONB = JSON'),
       
       # Usage: Update column definitions
       (r'Column\(JSONB', 'Column(JSON'),
   ]
   ```

3. **Test Imports Before Commit:**
   ```bash
   # Quick validation
   python -c "from database.models import User, Agent, Tool"
   # Should not raise ImportError
   ```

4. **Consistent Naming Strategy:**
   - Choose: `JSON` (new standard) OR `JSONB` (PostgreSQL legacy)
   - Use consistently across all models
   - Keep alias for transition period

5. **Automated Validation:**
   ```bash
   # Check for undefined names in models
   grep -r "Column(JSON" database/models/*.py
   # Ensure JSON is imported in all files
   ```

#### Why This Matters:
- **Deployment Failures:** ImportError crashes application startup
- **Silent Errors:** May not be caught until runtime
- **Inconsistency:** Mix of JSON/JSONB confuses developers
- **Migration Risk:** Type conversion scripts must be tested

#### Prevention:
- ✅ Always import all types used in model
- ✅ Test imports immediately after conversion
- ✅ Keep alias during transition (JSONB = JSON)
- ✅ Run `python -c "from database.models import *"` before commit
- ✅ Update conversion script to handle imports correctly
- ✅ Document which name to use (JSON preferred)

---

## 🔴 **INET TYPE - PostgreSQL-Specific**

### Issue #8: INET Column Type (PostgreSQL-Specific)
**Date:** 2026-01-12  
**Severity:** HIGH  
**Occurrences:** 1 time (found in audit.py)

#### Problem:
Using PostgreSQL's `INET` type for IP addresses breaks database agnosticism.

```python
# ❌ WRONG - PostgreSQL-specific:
from sqlalchemy.dialects.postgresql import INET
ip_address = Column(INET, nullable=False)
```

#### Error:
```
NameError: name 'INET' is not defined
```

Or on other databases:
```
sqlalchemy.exc.CompileError: INET type is not supported on this database
```

#### Root Cause:
- `INET` is PostgreSQL-specific for IPv4/IPv6 addresses
- Not available in MySQL, SQLite, SQL Server, Oracle
- Breaks multi-database compatibility

#### Solution:
```python
# ✅ CORRECT - Database-agnostic:
ip_address = Column(String(45), nullable=False)  # IPv4/IPv6
```

**Why String(45)?**
- IPv4 max: `255.255.255.255` (15 chars)
- IPv6 max: `ffff:ffff:ffff:ffff:ffff:ffff:255.255.255.255` (45 chars)
- Works on ALL databases
- Application-level validation if needed

#### Fixed Files:
```bash
✅ database/models/audit.py (3 occurrences)
   - AuditLog.ip_address
   - SecurityEvent.ip_address
   - DataExport.ip_address
```

#### Why This Matters:
- **Enterprise Requirement:** Platform must work with any database
- **Customer Choice:** Let customers use their preferred database
- **Migration Freedom:** Easy to switch databases
- **No Vendor Lock-in:** Not tied to PostgreSQL

#### Prevention:
```bash
# Check before committing:
grep -r "INET" database/models/
grep -r "from sqlalchemy.dialects.postgresql" database/models/

# Or run comprehensive check:
./scripts/comprehensive_db_check.sh
```

**Rule:** For IP addresses, ALWAYS use `String(45)` to support both IPv4 and IPv6 on all databases.

---

## 🔴 **POSTGRESQL ENUM TYPE PERSISTS**

### Issue #9: Native PostgreSQL Enum in Database Despite Model Fix
**Date:** 2026-01-12  
**Severity:** CRITICAL  
**Occurrences:** 1 time (tools table)

#### Problem:
Even after changing model from `SQLEnum` to `String(50)`, the database table STILL has the old PostgreSQL enum type.

```python
# ✅ Model is CORRECT:
type = Column(String(50), nullable=False)

# ❌ But Database has:
CREATE TABLE tools (
    type tooltype NOT NULL  -- ← PostgreSQL enum still exists!
);
```

#### Error:
```
sqlalchemy.exc.DataError: invalid input value for enum tooltype: "website"
```

#### Root Cause:
- **Changing Python code does NOT change existing database schema**
- PostgreSQL enum type `tooltype` was created in the past
- SQLAlchemy doesn't automatically drop old enum types
- Table must be dropped and recreated to remove enum

#### Solution:

**Option 1: Drop & Recreate Table (✅ Used)**
```python
# scripts/fix_tools_table.py
conn.execute(text("DROP TABLE IF EXISTS tools CASCADE"))
conn.execute(text("DROP TYPE IF EXISTS tooltype CASCADE"))
Tool.__table__.create(engine)  # Recreates with VARCHAR
```

**Option 2: Alembic Migration (Enterprise)**
```python
# alembic/versions/002_remove_tool_enum.py
def upgrade():
    # Create new column
    op.add_column('tools', sa.Column('type_new', sa.String(50)))
    # Copy data
    op.execute("UPDATE tools SET type_new = type::text")
    # Drop old column and enum
    op.drop_column('tools', 'type')
    op.execute("DROP TYPE IF EXISTS tooltype")
    # Rename column
    op.alter_column('tools', 'type_new', new_column_name='type')

def downgrade():
    # Reverse process
    pass
```

#### Why This Happened:
1. Originally used `SQLEnum(ToolType, native_enum=True)`
2. PostgreSQL created `CREATE TYPE tooltype AS ENUM (...)`
3. Changed model to `String(50)` (correct!)
4. BUT: Existing database schema didn't change
5. Migration script tried to insert 'website' into enum (not allowed)

#### Fixed Files:
```bash
✅ database/models/tool.py (already correct - String(50))
✅ scripts/fix_tools_table.py (NEW - drops/recreates table)
✅ Dockerfile (runs fix script before migration)
```

#### Prevention:
```bash
# NEVER use native PostgreSQL enums:
❌ type = Column(SQLEnum(ToolType, native_enum=True, ...))

# ALWAYS use String + Python enum validation:
✅ type = Column(String(50), nullable=False)
✅ # Validate with: ToolType(value)  # raises ValueError if invalid
```

**Key Learning:** 
- **Code changes ≠ Database changes**
- Always use migrations for schema changes
- SQLAlchemy doesn't auto-drop unused enum types
- Native database enums are not database-agnostic

#### Deployment Strategy:
```bash
1. Database init creates all tables
2. fix_tools_table.py drops/recreates tools table
3. Migration script inserts data
4. Result: VARCHAR column, works on all databases
```

---

## 🔵 **BEST PRACTICES LEARNED**

### 1. Column Naming Conventions
```python
# ✅ GOOD
extra_metadata = Column(JSONB)
user_metadata = Column(JSONB)
custom_data = Column(JSONB)
additional_info = Column(JSONB)

# ❌ AVOID
metadata = Column(JSONB)      # Reserved by SQLAlchemy
type = Column(String)         # Python builtin
id = Column(String)           # Use UUID or Integer
```

### 2. Reserved Words to NEVER Use
- `metadata` - SQLAlchemy internal
- `registry` - SQLAlchemy internal  
- `__tablename__` - Already used by SQLAlchemy
- `__mapper__` - SQLAlchemy internal
- `__table__` - SQLAlchemy internal

### 3. Import Order Matters
When using ForeignKeys, import models in dependency order:
```python
# ✅ CORRECT ORDER
from .organization import Organization  # No dependencies
from .role import Role                  # Depends on Organization
from .user import User                  # Depends on Organization + Role
```

### 4. Index Naming
```python
# ✅ GOOD - Explicit names
Index('idx_user_org_email', User.org_id, User.email)

# ❌ AVOID - Auto-generated names can clash
Index(User.org_id, User.email)  # No explicit name
```

---

## 📋 **PRE-COMMIT CHECKLIST**

Before committing any database model changes:

- [ ] Search for `metadata = Column` in all models
- [ ] Search for Python reserved words (type, id as simple String, etc.)
- [ ] Check all ForeignKey definitions have `use_alter=True` if circular
- [ ] Verify import order (dependencies first)
- [ ] Run `python database/init_db.py` locally
- [ ] Check for Pydantic namespace conflicts
- [ ] Ensure all timestamps use `datetime.utcnow` not `datetime.now()`
- [ ] Verify all UUID columns use `UUID(as_uuid=True)`
- [ ] Check index names are explicit and unique
- [ ] **Test imports:** `python -c "from database.models import *"` ← NEW!
- [ ] **Check database-agnostic types:** No PostgreSQL-specific imports
- [ ] **Verify JSON imports:** If `Column(JSON` exists, `JSON` must be imported

**Before committing migration scripts:**

- [ ] Identify ALL unique constraints in target tables (not just primary keys)
- [ ] Use UPSERT pattern (check existence, update if exists, insert if not)
- [ ] Check with OR conditions for all unique fields: `(Model.id == x) | (Model.slug == y)`
- [ ] Test migration script at least 2 times consecutively (must be idempotent)
- [ ] Verify all relationship mappings (e.g., org_id, role_ids)
- [ ] Handle both UUID and non-UUID legacy IDs with smart mapping
- [ ] Log clear messages for create vs. update vs. skip
- [ ] Include error handling with rollback on each record
- [ ] Add verification step at end to count migrated records

**Before committing type conversion scripts:**

- [ ] Test resulting imports: `python -c "from database.models import User, Agent, Tool"`
- [ ] Verify both old and new type names work (e.g., JSON and JSONB)
- [ ] Check all Column definitions use correct type names
- [ ] Ensure no duplicate imports (e.g., `UUID, UUID`)
- [ ] Run validation script: `./scripts/validate_db_models.sh`

---

## 🔍 **QUICK SEARCH COMMANDS**

Before adding new models, run these searches:

```bash
# Check for 'metadata' usage
grep -r "metadata = Column" database/models/

# Check for common reserved words
grep -r "type = Column" database/models/
grep -r "id = Column(String" database/models/

# Check for relationship definitions
grep -r "relationship(" database/models/

# Check for ForeignKey usage
grep -r "ForeignKey(" database/models/
```

---

## 📚 **REFERENCES**

- [SQLAlchemy Reserved Attributes](https://docs.sqlalchemy.org/en/14/orm/mapping_api.html#sqlalchemy.orm.registry)
- [SQLAlchemy use_alter for FKs](https://docs.sqlalchemy.org/en/14/core/constraints.html#use-alter)
- [Pydantic Protected Namespaces](https://docs.pydantic.dev/latest/concepts/models/#protected-namespaces)

---

## 🔄 **UPDATE LOG**

| Date | Issue | Status | Notes |
|------|-------|--------|-------|
| 2026-01-12 | **AUTOMATED PREVENTION** | ✅ **ACTIVE** | Pre-commit hook + comprehensive checks |
| 2026-01-12 | PostgreSQL enum persists in DB | ✅ Fixed | Drop/recreate tools table |
| 2026-01-12 | INET type (PostgreSQL-specific) | ✅ Fixed | Changed to String(45) for IP addresses |
| 2026-01-12 | audit.py syntax error | ✅ Fixed | JSONB = JSON, INET → JSONB = JSON |
| 2026-01-12 | ARRAY(Float) not converted | ✅ Fixed | Changed to JSONArray |
| 2026-01-12 | role.py still imports PG types | ✅ Fixed | Updated to use ..types |
| 2026-01-12 | Import error after conversion | ✅ Fixed | Import JSON + JSONB alias AFTER imports |
| 2026-01-12 | PostgreSQL enum not updated | ⚠️ Abandoned | Switched to VARCHAR (industry standard) |
| 2026-01-12 | Enum type mismatch | ✅ Fixed | Centralized enums + VARCHAR instead of PG enum |
| 2026-01-12 | Migration duplicate key | ✅ Fixed | Check all unique constraints, use UPSERT pattern |
| 2026-01-12 | `metadata` reserved | ✅ Fixed | Renamed to `extra_metadata` in 5 models |
| 2026-01-11 | ForeignKey circular deps | ⚠️ Workaround | Removed FKs temporarily |
| 2026-01-11 | Relationships without FKs | ⚠️ Workaround | Removed relationships |

---

## 🛡️ **AUTOMATED PREVENTION SYSTEM (NEW!)**

### System Overview:
**3-Layer Defense Against Repeated Mistakes:**

1. **Pre-Commit Hook** (`.git/hooks/pre-commit`)
   - Runs automatically before EVERY commit
   - Blocks commits with database issues
   - Cannot be bypassed easily

2. **Comprehensive Check Script** (`scripts/comprehensive_db_check.sh`)
   - Checks all 7 documented issues
   - Validates PostgreSQL-agnostic design
   - Exit code 1 if ANY error found

3. **Enhanced Documentation** (this file + `.cursorrules`)
   - All issues documented with examples
   - Clear prevention strategies
   - Quick reference checklist

### Usage:

**Manual Check (anytime):**
```bash
./scripts/comprehensive_db_check.sh
```

**Auto Check (on commit):**
```bash
git add database/models/user.py
git commit -m "Update user model"
# ✅ Pre-commit hook runs automatically
# ❌ Commit blocked if issues found
```

**Check Status:**
```bash
ls -la .git/hooks/pre-commit  # Should be executable
cat .git/hooks/pre-commit      # Verify content
```

### What It Checks:

| Check | Issue # | Description |
|-------|---------|-------------|
| `metadata` column | #1 | Reserved SQLAlchemy word |
| PostgreSQL imports | #7 | `sqlalchemy.dialects.postgresql` forbidden |
| `ARRAY(...)` usage | #7 | Must use `JSONArray` |
| `UUID(as_uuid=True)` | #7 | Must use `UUID` from `..types` |
| Native enums | #6 | Should use `String` + Python enum |
| Import consistency | #7 | Verify JSON/JSONB imports |
| ForeignKeys | #2 | Circular dependency checks |
| UTC timestamps | Best Practice | All times must be UTC |

---

**💡 Remember: Prevention is better than debugging on production!**
**🚨 ZERO TOLERANCE for repeated mistakes - system will block them!**

