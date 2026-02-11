# Security & Identity Architecture

> Last Updated: February 11, 2026

## Overview

AgentForge implements a multi-layered security architecture following enterprise best practices. The system provides granular access control without unnecessary complexity, balancing security with user experience.

---

## Security Layers

### Layer 1: Platform Access Control (Authentication & Authorization)

**Who can access the platform and what can they do?**

| Component | Implementation | Status |
|-----------|---------------|--------|
| Authentication | Local, OAuth (Google/Microsoft), LDAP, MFA | Complete |
| Session Management | Token-based with configurable expiry | Complete |
| Platform RBAC | Roles, Permissions, Groups, Departments | Complete |
| Portal Access | Admin Portal vs End User Portal | Complete |
| Audit Logging | Comprehensive security event logging | Complete |

**Permission Categories:**
- **Security**: `users:*`, `roles:*`, `security:settings`, `mfa:manage`
- **AI Agents**: `agents:*`, `tools:*`, `chat:*`
- **Process**: `process:execute`, `process:view_executions`, `process:view_all_executions`, `process:cancel`, `process:manage_approvals`
- **Analytics**: `audit:*`, `analytics:*`, `reports:*`
- **System**: `system:admin`, `system:settings`

### Layer 2: Agent Access Control (Who Can Use Which Agent)

**Three sub-layers for both Conversational and Process agents:**

| Sub-Layer | Purpose | Applies To |
|-----------|---------|-----------|
| Agent Access | Who can see/use the agent | Both |
| Task Permissions | Which tasks/capabilities are available per user | Conversational |
| Tool Permissions | Which tools the agent can use per user | Both |

**Access Types:**
- `public` - Anyone can access
- `authenticated` - Any logged-in user
- `specific` - Specific users, roles, groups, or departments
- `agent_admin` - Delegated admin permissions

**Key Principles:**
- **Private by default** - Only owner can access until configured
- **Owner always has full access** - Cannot be revoked
- **Task permissions match by NAME** (not ID) - IDs change on wizard reload
- **Delegated admins** can have granular permissions + chat restrictions

### Layer 3: Process Execution Security

**Additional security for process/workflow agents:**

| Check | When | Description |
|-------|------|-------------|
| Agent Access | Before execution | Same as conversational (Layer 2) |
| Execution Permission | Before execution | User must have `process:execute` or be owner |
| Tool Filtering | During execution | Denied tools removed from available list |
| Execution Visibility | Listing | Creator sees own, admin sees all |
| Resume/Cancel | Runtime | Creator, owner, or delegated permission |
| Approval Routing | At approval node | Dynamic via User Directory |

### Layer 4: Identity & User Directory

**Where does user information come from?**

The User Directory Service (`core/identity/service.py`) provides a unified interface for resolving user attributes regardless of identity source.

| Source | Configuration | Use Case |
|--------|--------------|----------|
| **Internal** (default) | Built-in org chart | Small-medium orgs, standalone deployment |
| **LDAP/AD** | LDAP server config | Enterprise with Active Directory |
| **HR API** | REST API config | Integration with SAP, Workday, BambooHR, etc. |
| **Hybrid** | Internal + external | Gradual migration, enrichment |

Configured per-organization via `Organization.directory_source`.

---

## Identity Integration Scenarios

### Scenario 1: Built-in Org Chart (Internal)

**Use Case:** Organization manages everything within AgentForge.

```
Organization.directory_source = "internal"

Hierarchy:
  User.manager_id → links to another User
  User.department_id → links to Department
  Department.manager_id → department head
  Department.parent_id → parent department
  User.employee_id → optional HR identifier
```

**How it works for processes:**
1. Admin builds org chart in AgentForge (Settings > Org Chart)
2. Sets `manager_id` and `department_id` for each user
3. Process approval nodes use `assignee_source: "user_directory"` with `directory_assignee_type: "dynamic_manager"`
4. User Directory resolves manager from `users.manager_id`

### Scenario 2: LDAP / Azure AD

**Use Case:** Enterprise with Active Directory integration.

```
Organization.directory_source = "ldap"
Organization.ldap_config_id → LDAPConfig (server, credentials, attribute mapping)
```

**How it works for processes:**
1. Admin configures LDAP connection (Settings > LDAP)
2. Users sync from LDAP with mapped attributes
3. Process approval nodes resolve managers from LDAP `manager` attribute
4. LDAP DN is resolved to internal user IDs
5. Group-to-role mapping applies LDAP groups as AgentForge roles

### Scenario 3: External HR System API

**Use Case:** Integration with SAP SuccessFactors, Workday, BambooHR, etc.

```
Organization.directory_source = "hr_api"
Organization.hr_api_config = {
    "base_url": "https://hr-api.company.com/v1",
    "auth_type": "bearer",
    "auth_config": { "token": "..." },
    "endpoints": {
        "get_user": "/employees/{employee_id}",
        "get_manager": "/employees/{employee_id}/manager",
        "get_department_members": "/departments/{department_id}/members"
    },
    "attribute_mapping": {
        "employee_id": "employeeId",
        "email": "workEmail",
        "manager_id": "managerId",
        "department": "departmentName",
        "job_title": "jobTitle"
    }
}
```

**How it works for processes:**
1. Admin configures HR API endpoint and authentication
2. When process starts, user context is enriched from HR API
3. `trigger_input._user_context` contains all resolved attributes
4. Manager ID from HR is resolved to internal user for approval routing

### Scenario 4: Hybrid (Internal + External)

**Use Case:** Gradual migration, or basic internal management with HR enrichment.

```
Organization.directory_source = "hybrid"
```

**How it works:**
1. Internal data used as primary source
2. External source (LDAP or HR API) enriches with additional attributes
3. External data takes precedence for organizational attributes (manager, department)
4. If external lookup fails, internal data is used as fallback

---

## Process Approval Flow

### How Dynamic Assignees Work

```
Process starts → User Directory enriches context
    │
    ▼
Approval Node reached
    │
    ├── assignee_source: "platform_user" → Use static IDs
    ├── assignee_source: "user_directory" → Resolve via UserDirectoryService
    │       ├── type: "dynamic_manager" → Get user's direct manager
    │       ├── type: "department_manager" → Get department head
    │       ├── type: "management_chain" → Get Nth-level manager
    │       ├── type: "role" → All users with specific roles
    │       ├── type: "group" → All users in specific groups
    │       └── type: "expression" → Evaluate {{ trigger_input.manager_id }}
    └── assignee_source: "tool" → Run API tool to resolve
```

### Example: HR Vacation Request Process

```
1. Employee logs in → AuthToken contains user_id
2. Starts "Vacation Request" process with form data
3. ProcessAPIService enriches context:
   - Calls UserDirectoryService.enrich_process_context(user_id, org_id)
   - Result: {manager_id, department_id, employee_id, job_title, ...}
   - Sets trigger_input.manager_id = resolved manager
4. Process executes:
   - Start Node: Collects form (dates, type, reason)
   - Condition: Check available days
   - Approval Node: 
       assignee_source: "user_directory"
       directory_assignee_type: "dynamic_manager"
       → Resolves to user's direct manager
   - Notification: Email to employee with result
   - End: Output approval status
```

---

## API Endpoints

### Identity & Org Chart API (`/api/identity/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/{id}` | Get user attributes |
| GET | `/users/{id}/manager` | Get user's manager |
| GET | `/users/{id}/direct-reports` | Get direct reports |
| GET | `/users/{id}/management-chain` | Get management chain |
| GET | `/org-chart` | Get full org chart tree |
| PUT | `/users/{id}/manager` | Update user's manager |
| PUT | `/users/{id}/employee-id` | Update employee ID |
| POST | `/org-chart/bulk-update` | Bulk update hierarchy |
| GET | `/departments` | List departments |
| GET | `/departments/{id}` | Get department details |
| GET | `/departments/{id}/members` | Get department members |
| POST | `/departments` | Create department |
| PUT | `/departments/{id}` | Update department |
| DELETE | `/departments/{id}` | Delete department |
| GET | `/directory-config` | Get identity source config |
| PUT | `/directory-config` | Update identity source config |
| POST | `/resolve-assignees` | Resolve dynamic assignees |

---

## Database Schema Changes

### users table additions:
```sql
ALTER TABLE users ADD COLUMN manager_id VARCHAR(36);
ALTER TABLE users ADD COLUMN employee_id VARCHAR(100);
CREATE INDEX ix_users_manager_id ON users(manager_id);
CREATE INDEX ix_users_employee_id ON users(employee_id);
```

### organizations table additions:
```sql
ALTER TABLE organizations ADD COLUMN directory_source VARCHAR(20) DEFAULT 'internal';
ALTER TABLE organizations ADD COLUMN hr_api_config TEXT;
```

Migration: `alembic/versions/008_add_identity_fields.py`

---

## Configuration Per Agent

### Conversational Agent
Access Control configured in Agent Wizard Step 4:
- Access Type (public/authenticated/specific)
- Entity selection (users, roles, groups)
- Task permissions matrix (per entity)
- Tool permissions matrix (per entity)
- Delegated admin management

### Process Agent
Same access control PLUS:
- Execution permissions (who can start processes)
- Approval node configuration:
  - Static assignees (platform users/roles/groups)
  - Dynamic assignees (User Directory: manager, department manager, etc.)
  - Tool-based assignees (API call to resolve)
- Execution visibility (creator only, org-wide, admin)

---

## Security Best Practices Applied

1. **NIST RBAC** - Hierarchical role-based access control with inheritance
2. **ABAC Support** - Attribute-based policies via Policy engine
3. **Principle of Least Privilege** - Private by default, explicit grant required
4. **Separation of Duties** - Owner vs delegated admin vs end user
5. **Defense in Depth** - Multiple security layers (platform → agent → task → tool)
6. **Audit Trail** - All security events logged
7. **Zero Trust** - Every request authenticated and authorized
8. **Standard Identity Protocols** - OAuth 2.0, LDAP, planned SAML/OIDC
9. **SCIM-compatible** - User attributes follow standard naming
10. **Database Agnostic** - No vendor-specific security features
