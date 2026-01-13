#!/usr/bin/env python3
"""
AgentForge Platform - Comprehensive Automated Test Suite
=========================================================

Tests all critical functionality after Super Admin login.

Usage:
    python scripts/test_platform.py

Environment Variables Required:
    - ADMIN_EMAIL: Super Admin email (default: admin@agentforge.app)
    - ADMIN_PASSWORD: Super Admin password
    - API_BASE_URL: Platform URL (default: http://localhost:8080)
"""

import os
import sys
import json
import time
import requests
from datetime import datetime
from typing import Dict, List, Tuple

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configuration
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@agentforge.app')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', '')
API_BASE_URL = os.environ.get('API_BASE_URL', 'http://localhost:8080')

# Test Results
test_results = {
    'passed': 0,
    'failed': 0,
    'skipped': 0,
    'total': 0,
    'failures': []
}

# Global session
session = requests.Session()
auth_token = None
current_user = None


def print_header(title: str):
    """Print a formatted test section header."""
    print("\n" + "="*80)
    print(f"🧪 {title}")
    print("="*80 + "\n")


def print_test(name: str, status: str, message: str = ""):
    """Print a test result."""
    symbols = {
        'pass': '✅',
        'fail': '❌',
        'skip': '⏭️',
        'info': 'ℹ️'
    }
    symbol = symbols.get(status, '•')
    print(f"   {symbol} {name}")
    if message:
        print(f"      {message}")


def assert_test(condition: bool, test_name: str, error_msg: str = ""):
    """Assert a test condition and track results."""
    test_results['total'] += 1
    
    if condition:
        test_results['passed'] += 1
        print_test(test_name, 'pass')
        return True
    else:
        test_results['failed'] += 1
        test_results['failures'].append(f"{test_name}: {error_msg}")
        print_test(test_name, 'fail', error_msg)
        return False


def login_as_admin() -> bool:
    """Test: Login as Super Admin."""
    global auth_token, current_user
    
    print_header("PRIORITY 1: AUTHENTICATION TESTS")
    
    if not ADMIN_PASSWORD:
        print_test("Login as Super Admin", 'skip', "ADMIN_PASSWORD not set in environment")
        test_results['skipped'] += 1
        return False
    
    try:
        response = session.post(
            f"{API_BASE_URL}/api/security/auth/login",
            json={'email': ADMIN_EMAIL, 'password': ADMIN_PASSWORD},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            auth_token = data.get('access_token')
            current_user = data.get('user')
            
            if auth_token and current_user:
                session.headers.update({'Authorization': f'Bearer {auth_token}'})
                assert_test(True, "Login as Super Admin", f"Token received, User: {current_user.get('email')}")
                return True
            else:
                assert_test(False, "Login as Super Admin", "No token or user in response")
                return False
        else:
            assert_test(False, "Login as Super Admin", f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        assert_test(False, "Login as Super Admin", f"Exception: {e}")
        return False


def test_get_current_user():
    """Test: GET /api/security/auth/me."""
    try:
        response = session.get(f"{API_BASE_URL}/api/security/auth/me", timeout=10)
        
        if response.status_code == 200:
            user = response.json()
            
            # Check permissions
            permissions = user.get('permissions', [])
            has_perms = len(permissions) > 0
            assert_test(has_perms, "User has permissions", f"Found {len(permissions)} permissions")
            
            # Check roles
            role_ids = user.get('role_ids', [])
            has_roles = len(role_ids) > 0
            assert_test(has_roles, "User has roles", f"Assigned {len(role_ids)} role(s)")
            
            # Check Super Admin permissions count
            if len(permissions) == 32:
                assert_test(True, "Super Admin permissions complete", "All 32 permissions present")
            else:
                assert_test(False, "Super Admin permissions complete", f"Expected 32, got {len(permissions)}")
            
            return user
        else:
            assert_test(False, "Get current user", f"HTTP {response.status_code}")
            return None
            
    except Exception as e:
        assert_test(False, "Get current user", f"Exception: {e}")
        return None


def test_critical_permissions():
    """Test: Verify critical permissions are present."""
    try:
        response = session.get(f"{API_BASE_URL}/api/security/auth/me", timeout=10)
        
        if response.status_code == 200:
            user = response.json()
            permissions = user.get('permissions', [])
            
            critical_perms = [
                'users:view', 'users:create', 'users:edit', 'users:delete',
                'roles:view', 'roles:create', 'roles:edit', 'roles:delete',
                'agents:view', 'agents:create', 'agents:edit', 'agents:delete',
                'tools:view', 'tools:create', 'tools:edit', 'tools:delete',
                'system:admin', 'system:settings'
            ]
            
            missing = [p for p in critical_perms if p not in permissions]
            
            if not missing:
                assert_test(True, "All critical permissions present", f"Verified {len(critical_perms)} permissions")
            else:
                assert_test(False, "All critical permissions present", f"Missing: {', '.join(missing)}")
                
        else:
            assert_test(False, "Critical permissions check", f"HTTP {response.status_code}")
            
    except Exception as e:
        assert_test(False, "Critical permissions check", f"Exception: {e}")


def test_database_health():
    """Test: Database connection health."""
    print_header("PRIORITY 1: DATABASE HEALTH")
    
    try:
        response = session.get(f"{API_BASE_URL}/api/health", timeout=10)
        
        if response.status_code == 200:
            health = response.json()
            status = health.get('status')
            
            if status == 'healthy':
                assert_test(True, "System health check", "Status: healthy")
            else:
                assert_test(False, "System health check", f"Status: {status}")
        else:
            assert_test(False, "System health check", f"HTTP {response.status_code}")
            
    except Exception as e:
        assert_test(False, "System health check", f"Exception: {e}")


def test_list_users():
    """Test: List all users."""
    print_header("PRIORITY 2: USER MANAGEMENT")
    
    try:
        response = session.get(f"{API_BASE_URL}/api/security/users", timeout=10)
        
        if response.status_code == 200:
            users = response.json()
            user_count = len(users)
            
            assert_test(user_count >= 2, "List users", f"Found {user_count} user(s)")
            return users
        else:
            assert_test(False, "List users", f"HTTP {response.status_code}")
            return []
            
    except Exception as e:
        assert_test(False, "List users", f"Exception: {e}")
        return []


def test_list_roles():
    """Test: List all roles."""
    print_header("PRIORITY 2: ROLE MANAGEMENT")
    
    try:
        response = session.get(f"{API_BASE_URL}/api/security/roles", timeout=10)
        
        if response.status_code == 200:
            roles = response.json()
            role_count = len(roles)
            
            assert_test(role_count >= 3, "List roles", f"Found {role_count} role(s)")
            
            # Check Super Admin role
            super_admin = next((r for r in roles if r.get('name') == 'Super Admin'), None)
            if super_admin:
                perms = super_admin.get('permissions', [])
                perm_count = len(perms)
                
                if perm_count == 32:
                    assert_test(True, "Super Admin role permissions", f"{perm_count} permissions")
                else:
                    assert_test(False, "Super Admin role permissions", f"Expected 32, got {perm_count}")
            else:
                assert_test(False, "Super Admin role exists", "Role not found")
            
            return roles
        else:
            assert_test(False, "List roles", f"HTTP {response.status_code}")
            return []
            
    except Exception as e:
        assert_test(False, "List roles", f"Exception: {e}")
        return []


def test_list_agents():
    """Test: List agents."""
    print_header("PRIORITY 2: AGENT MANAGEMENT")
    
    try:
        response = session.get(f"{API_BASE_URL}/api/agents", timeout=10)
        
        if response.status_code == 200:
            agents = response.json()
            agent_count = len(agents)
            
            assert_test(True, "List agents", f"Found {agent_count} agent(s)")
            return agents
        else:
            assert_test(False, "List agents", f"HTTP {response.status_code}")
            return []
            
    except Exception as e:
        assert_test(False, "List agents", f"Exception: {e}")
        return []


def test_list_tools():
    """Test: List tools."""
    print_header("PRIORITY 2: TOOL MANAGEMENT")
    
    try:
        response = session.get(f"{API_BASE_URL}/api/tools", timeout=10)
        
        if response.status_code == 200:
            tools = response.json()
            tool_count = len(tools)
            
            assert_test(tool_count >= 1, "List tools", f"Found {tool_count} tool(s)")
            return tools
        else:
            assert_test(False, "List tools", f"HTTP {response.status_code}")
            return []
            
    except Exception as e:
        assert_test(False, "List tools", f"Exception: {e}")
        return []


def test_data_integrity():
    """Test: Database data integrity (direct DB check)."""
    print_header("PRIORITY 3: DATA INTEGRITY")
    
    try:
        from database.base import get_db_session
        from database.models.user import User
        from database.models.role import Role
        from database.models.organization import Organization
        
        with get_db_session() as db_session:
            # Test 1: Users count
            user_count = db_session.query(User).count()
            assert_test(user_count == 2, "Database: User count", f"Expected 2, found {user_count}")
            
            # Test 2: Roles count
            role_count = db_session.query(Role).count()
            assert_test(role_count == 3, "Database: Role count", f"Expected 3, found {role_count}")
            
            # Test 3: Super Admin permissions in DB
            super_admin = db_session.query(Role).filter_by(name="Super Admin").first()
            if super_admin:
                perms_raw = super_admin.permissions
                
                # Parse JSON
                if isinstance(perms_raw, str):
                    perms = json.loads(perms_raw)
                else:
                    perms = perms_raw or []
                
                perm_count = len(perms)
                assert_test(perm_count == 32, "Database: Super Admin permissions", f"Found {perm_count} permissions")
            else:
                assert_test(False, "Database: Super Admin exists", "Role not found in DB")
            
            # Test 4: User role assignments
            users_with_roles = 0
            for user in db_session.query(User).all():
                role_ids_raw = user.role_ids
                
                # Parse JSON
                if isinstance(role_ids_raw, str):
                    role_ids = json.loads(role_ids_raw)
                else:
                    role_ids = role_ids_raw or []
                
                if len(role_ids) > 0:
                    users_with_roles += 1
            
            assert_test(users_with_roles == user_count, "Database: Users have roles", 
                       f"{users_with_roles}/{user_count} users have role assignments")
            
            # Test 5: Organizations
            org_count = db_session.query(Organization).count()
            assert_test(org_count >= 1, "Database: Organizations", f"Found {org_count} organization(s)")
            
    except ImportError:
        print_test("Data integrity tests", 'skip', "Database modules not available (might be on Railway)")
        test_results['skipped'] += 5
    except Exception as e:
        assert_test(False, "Data integrity tests", f"Exception: {e}")


def test_invalid_auth():
    """Test: Invalid authentication attempts."""
    print_header("PRIORITY 4: SECURITY TESTS")
    
    # Test 1: No token
    try:
        temp_session = requests.Session()
        response = temp_session.get(f"{API_BASE_URL}/api/security/auth/me", timeout=10)
        
        assert_test(response.status_code == 401, "Reject request without token", 
                   f"Got HTTP {response.status_code}")
    except Exception as e:
        assert_test(False, "Reject request without token", f"Exception: {e}")
    
    # Test 2: Invalid token
    try:
        temp_session = requests.Session()
        temp_session.headers.update({'Authorization': 'Bearer invalid_token_12345'})
        response = temp_session.get(f"{API_BASE_URL}/api/security/auth/me", timeout=10)
        
        assert_test(response.status_code == 401, "Reject invalid token", 
                   f"Got HTTP {response.status_code}")
    except Exception as e:
        assert_test(False, "Reject invalid token", f"Exception: {e}")
    
    # Test 3: Wrong password (skip if no password set)
    if ADMIN_PASSWORD:
        try:
            temp_session = requests.Session()
            response = temp_session.post(
                f"{API_BASE_URL}/api/security/auth/login",
                json={'email': ADMIN_EMAIL, 'password': 'WrongPassword123!'},
                timeout=10
            )
            
            assert_test(response.status_code == 401, "Reject wrong password", 
                       f"Got HTTP {response.status_code}")
        except Exception as e:
            assert_test(False, "Reject wrong password", f"Exception: {e}")


def print_summary():
    """Print test summary."""
    print("\n" + "="*80)
    print("📊 TEST SUMMARY")
    print("="*80 + "\n")
    
    total = test_results['total']
    passed = test_results['passed']
    failed = test_results['failed']
    skipped = test_results['skipped']
    
    pass_rate = (passed / total * 100) if total > 0 else 0
    
    print(f"   Total Tests:   {total}")
    print(f"   ✅ Passed:     {passed} ({pass_rate:.1f}%)")
    print(f"   ❌ Failed:     {failed}")
    print(f"   ⏭️  Skipped:    {skipped}")
    
    if failed > 0:
        print("\n   Failed Tests:")
        for failure in test_results['failures']:
            print(f"      • {failure}")
    
    print("\n" + "="*80)
    
    if failed == 0 and total > 0:
        print("🎉 ALL TESTS PASSED! Platform is working correctly! 🎉")
    elif failed > 0:
        print(f"⚠️  {failed} TEST(S) FAILED - Review errors above")
    else:
        print("⚠️  NO TESTS RUN - Check configuration")
    
    print("="*80 + "\n")


def main():
    """Run all tests."""
    print("\n" + "█"*80)
    print("█" + " "*78 + "█")
    print("█" + " "*20 + "🧪 AGENTFORGE PLATFORM TEST SUITE" + " "*25 + "█")
    print("█" + " "*78 + "█")
    print("█"*80)
    
    print(f"\n📋 Configuration:")
    print(f"   API Base URL: {API_BASE_URL}")
    print(f"   Admin Email:  {ADMIN_EMAIL}")
    print(f"   Password Set: {'Yes' if ADMIN_PASSWORD else 'No (will skip auth tests)'}")
    print(f"   Time:         {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Run tests
    if login_as_admin():
        test_get_current_user()
        test_critical_permissions()
        test_database_health()
        test_list_users()
        test_list_roles()
        test_list_agents()
        test_list_tools()
        test_data_integrity()
        test_invalid_auth()
    else:
        print("\n⚠️  Login failed - skipping remaining tests")
        print("   Make sure ADMIN_PASSWORD environment variable is set")
        print("   Example: ADMIN_PASSWORD='your_password' python scripts/test_platform.py")
    
    # Print summary
    print_summary()
    
    # Exit with appropriate code
    sys.exit(0 if test_results['failed'] == 0 else 1)


if __name__ == "__main__":
    main()

