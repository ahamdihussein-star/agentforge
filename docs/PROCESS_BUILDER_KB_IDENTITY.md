# Process Builder Knowledge Base — Identity & User Directory (v1)
This document describes the platform's **identity resolution** capabilities for process workflows.
It is intended to ground the LLM so it can generate **identity-aware approval routing** and **auto-filled user fields**.

## Overview
The platform has a **User Directory Service** that resolves user attributes (manager, department, employee ID, job title) from the organization's configured identity source.

When a workflow starts, the engine **automatically enriches** the execution context with the logged-in user's full profile from the directory. This means:
- The process knows who the user's **manager** is.
- The process knows the user's **department**, **job title**, and **employee ID**.
- Approval nodes can **automatically route** to the user's manager without the user entering this information.

## Identity Sources (configured per organization)
The organization chooses one of these identity sources in their settings:
- `internal` — Built-in org chart managed inside the platform (departments, managers, employee IDs).
- `ldap` — LDAP / Active Directory / Azure AD. Users and managers are synced from the directory.
- `hr_api` — External HR system API (SAP SuccessFactors, Workday, BambooHR, etc.).
- `hybrid` — Internal + external source combined. External data enriches internal records.

**As a workflow designer, you do NOT need to know which source is configured.** The engine handles resolution transparently. Just use the features below.

## Extended User Context (available at runtime)
In addition to the basic `currentUser` profile, the engine provides these **extended attributes** (resolved from the directory):

| Key | Type | Description |
|-----|------|-------------|
| `currentUser.id` | string | User ID |
| `currentUser.name` | string | Full name |
| `currentUser.email` | string | Email address |
| `currentUser.roles` | array | Platform roles |
| `currentUser.groups` | array | Platform groups |
| `currentUser.orgId` | string | Organization ID |
| `currentUser.managerId` | string | Direct manager's user ID |
| `currentUser.managerName` | string | Direct manager's name |
| `currentUser.managerEmail` | string | Direct manager's email |
| `currentUser.departmentId` | string | Department ID |
| `currentUser.departmentName` | string | Department name |
| `currentUser.jobTitle` | string | Job title |
| `currentUser.employeeId` | string | HR employee identifier |

## How to Use in Workflows

### 1) Auto-fill user fields with prefill (recommended)
For start form fields that can be resolved from the user's profile, use **prefill** with `readOnly: true`:

```json
{
  "name": "employeeEmail",
  "label": "Your Email",
  "type": "email",
  "readOnly": true,
  "prefill": { "source": "currentUser", "key": "email" }
}
```

Extended prefill keys (from identity directory):
```json
{ "prefill": { "source": "currentUser", "key": "managerId" } }
{ "prefill": { "source": "currentUser", "key": "managerName" } }
{ "prefill": { "source": "currentUser", "key": "managerEmail" } }
{ "prefill": { "source": "currentUser", "key": "departmentId" } }
{ "prefill": { "source": "currentUser", "key": "departmentName" } }
{ "prefill": { "source": "currentUser", "key": "jobTitle" } }
{ "prefill": { "source": "currentUser", "key": "employeeId" } }
```

### 2) Dynamic manager approval (recommended for HR workflows)
For approval nodes that should go to the **user's direct manager**, use `assignee_source: "user_directory"`:

```json
{
  "assignee_source": "user_directory",
  "directory_assignee_type": "dynamic_manager",
  "message": "Please review and approve this request"
}
```

The engine will automatically resolve the logged-in user's manager from the configured directory.

### 3) Department manager approval
Route approval to the **head of the user's department**:

```json
{
  "assignee_source": "user_directory",
  "directory_assignee_type": "department_manager",
  "message": "Department head approval required"
}
```

### 4) Management chain approval
Escalate to Nth-level manager (e.g., manager's manager):

```json
{
  "assignee_source": "user_directory",
  "directory_assignee_type": "management_chain",
  "management_level": 2,
  "message": "Senior management approval required"
}
```

### 5) Available directory_assignee_type options
| Type | Description | When to use |
|------|-------------|-------------|
| `dynamic_manager` | User's direct manager | Leave requests, expense reports, any manager approval |
| `department_manager` | Head of user's department | Budget approvals, department-level decisions |
| `management_chain` | Nth-level manager (set `management_level`) | Senior/executive approval |
| `role` | Users with specific platform roles | Cross-department approval by role |
| `group` | Users in specific platform groups | Committee or team approvals |
| `department_members` | All members of a department | Department-wide notifications |

## Best Practices for Identity-Aware Workflows

1. **DO** use `assignee_source: "user_directory"` with `directory_assignee_type: "dynamic_manager"` when the process goal mentions "manager approval" or "supervisor review".
2. **DO** use prefill with `readOnly: true` for user attributes like email, name, employee ID — never ask the user to re-enter information the system already knows.
3. **DO NOT** ask the user to manually enter their manager's name or ID — use the dynamic manager resolution instead.
4. **DO NOT** hardcode specific manager user IDs in approval nodes for HR processes — use `user_directory` so it works for any employee.
5. **If** the process mentions "department head approval" or "department manager", use `directory_assignee_type: "department_manager"`.
6. **If** the process mentions "VP approval" or "senior management approval", use `directory_assignee_type: "management_chain"` with an appropriate `management_level`.

## Anti-hallucination note
- Only use `directory_assignee_type` values listed above.
- Only use extended prefill keys listed above.
- The engine resolves identity automatically — do NOT generate nodes that "call HR API" or "look up manager" unless the user specifically asks for custom integration steps.
