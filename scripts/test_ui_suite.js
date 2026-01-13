/**
 * AgentForge Platform - Browser Console Test Suite
 * =================================================
 * 
 * Run this in the browser console after logging in as Super Admin.
 * 
 * Usage:
 * 1. Open DevTools (F12)
 * 2. Go to Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 
 * The script will automatically run all tests and display results.
 */

(async function runAgentForgeTests() {
    'use strict';
    
    console.log('\n' + '='.repeat(80));
    console.log('🧪 AGENTFORGE PLATFORM - BROWSER TEST SUITE');
    console.log('='.repeat(80) + '\n');
    
    const results = {
        passed: 0,
        failed: 0,
        total: 0,
        failures: []
    };
    
    function printTest(name, passed, message = '') {
        results.total++;
        if (passed) {
            results.passed++;
            console.log(`✅ ${name}`);
            if (message) console.log(`   ${message}`);
        } else {
            results.failed++;
            results.failures.push(`${name}: ${message}`);
            console.log(`❌ ${name}`);
            if (message) console.log(`   ${message}`);
        }
    }
    
    function printHeader(title) {
        console.log('\n' + '='.repeat(80));
        console.log(`🧪 ${title}`);
        console.log('='.repeat(80) + '\n');
    }
    
    // Get auth token
    const token = localStorage.getItem('agentforge_token');
    if (!token) {
        console.error('❌ No auth token found! Please login first.');
        return;
    }
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    // ========================================================================
    // PRIORITY 1: AUTHENTICATION & PERMISSIONS
    // ========================================================================
    
    printHeader('PRIORITY 1: AUTHENTICATION & PERMISSIONS');
    
    try {
        const meResponse = await fetch('/api/security/auth/me', { headers });
        const user = await meResponse.json();
        
        printTest(
            'Current user loaded',
            meResponse.status === 200,
            `Email: ${user.email}`
        );
        
        printTest(
            'User has permissions',
            user.permissions && user.permissions.length > 0,
            `Found ${user.permissions?.length || 0} permissions`
        );
        
        printTest(
            'User has roles',
            user.role_ids && user.role_ids.length > 0,
            `Assigned ${user.role_ids?.length || 0} role(s)`
        );
        
        printTest(
            'Super Admin permissions complete',
            user.permissions?.length === 32,
            `Expected 32, got ${user.permissions?.length || 0}`
        );
        
        // Check critical permissions
        const criticalPerms = [
            'users:view', 'users:create', 'users:edit', 'users:delete',
            'roles:view', 'roles:create', 'agents:view', 'agents:create',
            'tools:view', 'tools:create', 'system:admin', 'system:settings'
        ];
        
        const missingPerms = criticalPerms.filter(p => !user.permissions?.includes(p));
        
        printTest(
            'Critical permissions present',
            missingPerms.length === 0,
            missingPerms.length > 0 ? `Missing: ${missingPerms.join(', ')}` : 'All present'
        );
        
    } catch (error) {
        printTest('Authentication tests', false, `Error: ${error.message}`);
    }
    
    // ========================================================================
    // PRIORITY 2: USER MANAGEMENT
    // ========================================================================
    
    printHeader('PRIORITY 2: USER MANAGEMENT');
    
    try {
        const usersResponse = await fetch('/api/security/users', { headers });
        const users = await usersResponse.json();
        
        printTest(
            'List users',
            usersResponse.status === 200 && Array.isArray(users),
            `Found ${users.length} user(s)`
        );
        
        printTest(
            'Expected user count',
            users.length >= 2,
            `Expected at least 2, found ${users.length}`
        );
        
    } catch (error) {
        printTest('User management tests', false, `Error: ${error.message}`);
    }
    
    // ========================================================================
    // PRIORITY 2: ROLE MANAGEMENT
    // ========================================================================
    
    printHeader('PRIORITY 2: ROLE MANAGEMENT');
    
    try {
        const rolesResponse = await fetch('/api/security/roles', { headers });
        const roles = await rolesResponse.json();
        
        printTest(
            'List roles',
            rolesResponse.status === 200 && Array.isArray(roles),
            `Found ${roles.length} role(s)`
        );
        
        printTest(
            'Expected role count',
            roles.length === 3,
            `Expected 3, found ${roles.length}`
        );
        
        // Check Super Admin role
        const superAdmin = roles.find(r => r.name === 'Super Admin');
        
        printTest(
            'Super Admin role exists',
            !!superAdmin,
            superAdmin ? `ID: ${superAdmin.id.substring(0, 8)}...` : 'Not found'
        );
        
        if (superAdmin) {
            const permCount = superAdmin.permissions?.length || 0;
            printTest(
                'Super Admin permissions in DB',
                permCount === 32,
                `Expected 32, got ${permCount}`
            );
        }
        
    } catch (error) {
        printTest('Role management tests', false, `Error: ${error.message}`);
    }
    
    // ========================================================================
    // PRIORITY 2: AGENT MANAGEMENT
    // ========================================================================
    
    printHeader('PRIORITY 2: AGENT MANAGEMENT');
    
    try {
        const agentsResponse = await fetch('/api/agents', { headers });
        const agents = await agentsResponse.json();
        
        printTest(
            'List agents',
            agentsResponse.status === 200,
            `Found ${agents.length} agent(s)`
        );
        
    } catch (error) {
        printTest('Agent management tests', false, `Error: ${error.message}`);
    }
    
    // ========================================================================
    // PRIORITY 2: TOOL MANAGEMENT
    // ========================================================================
    
    printHeader('PRIORITY 2: TOOL MANAGEMENT');
    
    try {
        const toolsResponse = await fetch('/api/tools', { headers });
        const tools = await toolsResponse.json();
        
        printTest(
            'List tools',
            toolsResponse.status === 200,
            `Found ${tools.length} tool(s)`
        );
        
        printTest(
            'Expected tool count',
            tools.length >= 1,
            `Expected at least 1, found ${tools.length}`
        );
        
    } catch (error) {
        printTest('Tool management tests', false, `Error: ${error.message}`);
    }
    
    // ========================================================================
    // PRIORITY 3: UI MENU VISIBILITY
    // ========================================================================
    
    printHeader('PRIORITY 3: UI MENU VISIBILITY');
    
    try {
        // Check if menu items are visible in DOM
        const menuItems = {
            'Chat': document.querySelector('[data-menu="chat"], a[href*="chat"]'),
            'Agents': document.querySelector('[data-menu="agents"], a[href*="agents"]'),
            'Tools': document.querySelector('[data-menu="tools"], a[href*="tools"]'),
            'Settings': document.querySelector('[data-menu="settings"], a[href*="settings"]'),
            'Security': document.querySelector('[data-menu="security"], a[href*="security"]')
        };
        
        Object.entries(menuItems).forEach(([name, element]) => {
            printTest(
                `Menu item: ${name}`,
                !!element,
                element ? 'Visible' : 'Not found in DOM'
            );
        });
        
    } catch (error) {
        printTest('UI menu tests', false, `Error: ${error.message}`);
    }
    
    // ========================================================================
    // PRIORITY 4: SECURITY TESTS
    // ========================================================================
    
    printHeader('PRIORITY 4: SECURITY TESTS');
    
    try {
        // Test 1: Request without token
        const noTokenResponse = await fetch('/api/security/auth/me');
        
        printTest(
            'Reject request without token',
            noTokenResponse.status === 401,
            `Got HTTP ${noTokenResponse.status}`
        );
        
        // Test 2: Request with invalid token
        const invalidTokenResponse = await fetch('/api/security/auth/me', {
            headers: { 'Authorization': 'Bearer invalid_token_12345' }
        });
        
        printTest(
            'Reject invalid token',
            invalidTokenResponse.status === 401,
            `Got HTTP ${invalidTokenResponse.status}`
        );
        
    } catch (error) {
        printTest('Security tests', false, `Error: ${error.message}`);
    }
    
    // ========================================================================
    // SUMMARY
    // ========================================================================
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80) + '\n');
    
    const passRate = results.total > 0 ? (results.passed / results.total * 100) : 0;
    
    console.log(`   Total Tests:   ${results.total}`);
    console.log(`   ✅ Passed:     ${results.passed} (${passRate.toFixed(1)}%)`);
    console.log(`   ❌ Failed:     ${results.failed}`);
    
    if (results.failed > 0) {
        console.log('\n   Failed Tests:');
        results.failures.forEach(failure => {
            console.log(`      • ${failure}`);
        });
    }
    
    console.log('\n' + '='.repeat(80));
    
    if (results.failed === 0 && results.total > 0) {
        console.log('🎉 ALL TESTS PASSED! Platform is working correctly! 🎉');
    } else if (results.failed > 0) {
        console.log(`⚠️  ${results.failed} TEST(S) FAILED - Review errors above`);
    }
    
    console.log('='.repeat(80) + '\n');
    
    // Return results for programmatic access
    return results;
    
})();

