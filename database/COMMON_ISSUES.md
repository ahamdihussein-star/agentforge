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
| 2026-01-12 | `metadata` reserved | ✅ Fixed | Renamed to `extra_metadata` in 5 models |
| 2026-01-11 | ForeignKey circular deps | ⚠️ Workaround | Removed FKs temporarily |
| 2026-01-11 | Relationships without FKs | ⚠️ Workaround | Removed relationships |

---

**💡 Remember: Prevention is better than debugging on production!**

