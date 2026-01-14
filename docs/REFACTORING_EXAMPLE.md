# 🔄 Refactoring Example: Settings Module
## Safe Step-by-Step Migration

This is a **real example** of how to safely refactor one module without breaking anything.

---

## Step 1: Create New Module Structure

```python
# api/settings/__init__.py
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Dict, Any
from core.security.models import User
from api.security import require_auth
from database.services.system_settings_service import SystemSettingsService

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("/")
async def get_settings(user: User = Depends(require_auth)):
    """Get all platform settings"""
    # NEW CODE: Use service layer
    settings = SystemSettingsService.get_all_settings()
    return {"settings": settings}

@router.put("/{setting_key}")
async def update_setting(
    setting_key: str,
    value: Any,
    user: User = Depends(require_auth)
):
    """Update a setting"""
    # NEW CODE: Use service layer
    SystemSettingsService.update_setting(setting_key, value)
    return {"status": "success"}
```

---

## Step 2: Add Feature Flag

```python
# api/main.py
from core.feature_flags import FeatureFlags
from api.settings import router as settings_router

# Include new router (behind feature flag)
if FeatureFlags.NEW_SETTINGS_MODULE:
    app.include_router(settings_router)

# Keep old code working
@app.get("/api/settings")
async def get_settings_old(user: User = Depends(require_auth)):
    """OLD CODE: Keep this until new code is proven"""
    if FeatureFlags.NEW_SETTINGS_MODULE:
        # Redirect to new endpoint
        return await get_settings(user)
    
    # Original implementation
    # ... existing code ...
```

---

## Step 3: Test Thoroughly

```python
# tests/test_settings.py
import pytest
from api.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_get_settings_old_way():
    """Test old endpoint still works"""
    response = client.get("/api/settings")
    assert response.status_code == 200

def test_get_settings_new_way():
    """Test new endpoint works"""
    # Enable feature flag
    import os
    os.environ["FEATURE_NEW_SETTINGS_MODULE"] = "true"
    
    response = client.get("/api/settings")
    assert response.status_code == 200
    assert "settings" in response.json()
```

---

## Step 4: Deploy with Feature Flag OFF

```bash
# .env (production)
FEATURE_NEW_SETTINGS_MODULE=false
```

- Deploy new code
- Old code still runs
- Zero risk

---

## Step 5: Enable for Testing

```bash
# .env (staging)
FEATURE_NEW_SETTINGS_MODULE=true
```

- Test in staging
- Monitor for issues
- Keep old code ready

---

## Step 6: Gradual Rollout

```python
# api/main.py
import random

@app.get("/api/settings")
async def get_settings_gradual(user: User = Depends(require_auth)):
    """Gradual migration: 10% use new code"""
    if FeatureFlags.NEW_SETTINGS_MODULE and random.random() < 0.1:
        # 10% of requests use new code
        return await get_settings_new(user)
    else:
        # 90% use old code
        return await get_settings_old(user)
```

---

## Step 7: Monitor & Verify

- Check logs for errors
- Monitor performance
- Verify functionality
- User feedback

---

## Step 8: Full Migration

```python
# api/main.py
# After 1 week of successful operation

if FeatureFlags.NEW_SETTINGS_MODULE:
    # Remove old code
    # Only keep new code
    app.include_router(settings_router)
else:
    # Keep old code as fallback
    @app.get("/api/settings")
    async def get_settings_old(user: User = Depends(require_auth)):
        # ... old implementation ...
```

---

## Step 9: Cleanup (After 1 Month)

```python
# api/main.py
# Remove feature flag check
# Remove old code
# Only new code remains

app.include_router(settings_router)
```

---

## ✅ Success Checklist

- [ ] New module created
- [ ] Feature flag added
- [ ] Tests written
- [ ] Tests passing
- [ ] Deployed with flag OFF
- [ ] Tested in staging
- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Monitored for 1 week
- [ ] No issues reported
- [ ] Old code removed
- [ ] Documentation updated

---

## 🚨 Rollback Plan

If issues occur:

1. **Set feature flag to false:**
   ```bash
   FEATURE_NEW_SETTINGS_MODULE=false
   ```

2. **Redeploy** (takes 2 minutes)

3. **Old code runs again** (zero downtime)

4. **Investigate issue** in new code

5. **Fix and try again**

---

## 📊 Timeline

- **Week 1:** Create module, add feature flag
- **Week 2:** Test in staging
- **Week 3:** Gradual rollout (10% → 50% → 100%)
- **Week 4:** Monitor, verify, cleanup

**Total: 4 weeks for one module**

---

## 🎯 Key Principles

1. **Never remove old code** until new code is proven
2. **Feature flags** for instant rollback
3. **Gradual rollout** to catch issues early
4. **Comprehensive testing** before each step
5. **Monitor closely** during migration

---

This approach ensures **zero risk** and **zero downtime** while modernizing the codebase.

