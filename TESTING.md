# 🧪 AgentForge Platform - Testing Guide

## Quick Start

### Option 1: Automated Python Tests (Recommended)

**Run all tests automatically:**

```bash
# For local testing:
ADMIN_PASSWORD='your_password' python scripts/test_platform.py

# For Railway deployment:
API_BASE_URL='https://your-app.railway.app' ADMIN_PASSWORD='your_password' python scripts/test_platform.py
```

**Or use the quick runner:**

```bash
ADMIN_PASSWORD='your_password' ./scripts/run_tests.sh
```

### Option 2: Browser Console Tests

1. Login to the platform as Super Admin
2. Open Developer Tools (F12)
3. Go to Console tab
4. Copy the contents of `scripts/test_ui_suite.js`
5. Paste into console and press Enter

The tests will run automatically and display results.

---

## Test Coverage

### ✅ Priority 1 - Critical Tests
- **Authentication Flow**
  - Login as Super Admin
  - Get current user info
  - Verify token works
  
- **Permissions Loading**
  - Check 32 permissions loaded
  - Verify critical permissions present
  - Test role assignments

- **Database Health**
  - Connection status
  - Response time

### ✅ Priority 2 - Core Functionality
- **User Management**
  - List users
  - Verify user count (2 expected)
  
- **Role Management**
  - List roles
  - Verify role count (3 expected)
  - Check Super Admin permissions (32 expected)
  
- **Agent Management**
  - List agents
  - Verify API access
  
- **Tool Management**
  - List tools
  - Verify tool count (1+ expected)

### ✅ Priority 3 - Data Integrity
- **Database Content**
  - 2 users
  - 3 roles
  - 32 permissions in Super Admin
  - All users have roles
  - 1+ organizations

- **UI Menu Visibility**
  - Chat menu visible
  - Agents menu visible
  - Tools menu visible
  - Settings menu visible
  - Security menu visible

### ✅ Priority 4 - Security Tests
- **Invalid Authentication**
  - Reject requests without token (401)
  - Reject requests with invalid token (401)
  - Reject wrong password (401)

---

## Expected Results

### ✅ All Tests Pass:
```
📊 TEST SUMMARY
================================================================================

   Total Tests:   25
   ✅ Passed:     25 (100.0%)
   ❌ Failed:     0
   ⏭️  Skipped:    0

================================================================================
🎉 ALL TESTS PASSED! Platform is working correctly! 🎉
================================================================================
```

### ⚠️ Some Tests Fail:
Review the output for specific errors. Common issues:
- **Login fails:** Check ADMIN_PASSWORD is correct
- **Permissions empty:** Run `scripts/fix_super_admin_permissions.py`
- **Connection error:** Check API_BASE_URL and server is running
- **Database errors:** Check database connection

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_BASE_URL` | `http://localhost:8080` | Platform URL |
| `ADMIN_EMAIL` | `admin@agentforge.app` | Super Admin email |
| `ADMIN_PASSWORD` | (required) | Super Admin password |

---

## Running Tests on Railway

```bash
# Set your Railway app URL and password
export API_BASE_URL='https://your-app.railway.app'
export ADMIN_PASSWORD='your_password'

# Run tests
python scripts/test_platform.py
```

---

## Troubleshooting

### "Login failed" Error
**Cause:** Wrong password or user doesn't exist  
**Fix:** Check ADMIN_PASSWORD environment variable

### "Permissions empty" Error
**Cause:** Super Admin role has no permissions  
**Fix:** Run `python scripts/fix_super_admin_permissions.py`

### "Connection refused" Error
**Cause:** Server not running or wrong URL  
**Fix:** 
- Check server is running: `curl $API_BASE_URL/api/health`
- Verify API_BASE_URL is correct

### "Module not found" Error
**Cause:** Missing Python dependencies  
**Fix:** `pip install requests`

---

## Manual Testing Checklist

If automated tests fail, you can manually verify:

```
Priority 1 - Critical:
[ ] Login works
[ ] /api/security/auth/me returns user with 32 permissions
[ ] UI menu items visible after login
[ ] Database responding

Priority 2 - Core Functionality:
[ ] Can list users
[ ] Can list roles
[ ] Can list agents
[ ] Can list tools

Priority 3 - Data Integrity:
[ ] 2 users in database
[ ] 3 roles in database
[ ] Super Admin has 32 permissions
[ ] All users have role assignments

Priority 4 - Security:
[ ] Requests without token rejected (401)
[ ] Invalid token rejected (401)
[ ] Wrong password rejected (401)
```

---

## Test Files

| File | Purpose |
|------|---------|
| `scripts/test_platform.py` | Main automated test suite (Python) |
| `scripts/test_ui_suite.js` | Browser console tests (JavaScript) |
| `scripts/run_tests.sh` | Quick test runner (Bash) |
| `TESTING.md` | This guide |

---

## CI/CD Integration

To run tests in CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  env:
    API_BASE_URL: ${{ secrets.API_URL }}
    ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
  run: |
    pip install requests
    python scripts/test_platform.py
```

---

## Support

If tests fail and you can't resolve the issue:

1. Check `database/COMMON_ISSUES.md` for known issues
2. Review Railway deployment logs
3. Check browser console for errors
4. Verify database connection

---

**Last Updated:** 2026-01-13  
**Platform Version:** 3.2.0

