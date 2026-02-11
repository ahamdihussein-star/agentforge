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
| Type | Description | Config needed | When to use |
|------|-------------|---------------|-------------|
| `dynamic_manager` | User's direct manager | (none) | Leave requests, expense reports, any manager approval |
| `department_manager` | Head of user's department | (none) or `department_id` | Budget approvals, department-level decisions |
| `management_chain` | Nth-level manager | `management_level: N` | Senior/executive approval (2=director, 3=VP) |
| `role` | Users with specific platform roles | `role_ids: ["id"]` | Cross-department approval by role (e.g., Finance role) |
| `group` | Users in specific platform groups | `group_ids: ["id"]` | Committee or team approvals (e.g., IT Team) |
| `department_members` | All members of a department | `department_id: "id"` | Department-wide notifications/tasks |
| `expression` | Dynamic from form field or variable | `expression: "{{ trigger_input.field }}"` | When the user selects their approver in the form |
| `static` | Fixed user IDs | `user_ids: ["id1", "id2"]` | Known, specific approvers |

### 6) Expression-based dynamic routing
When a form field determines who should approve (e.g., user picks a reviewer), use:
```json
{
  "assignee_source": "user_directory",
  "directory_assignee_type": "expression",
  "expression": "{{ trigger_input.selectedApproverId }}"
}
```
Supported expression paths:
- `{{ trigger_input.<fieldName> }}` — from form field value
- `{{ variables.<varName> }}` — from process variable
- `{{ context.user_id }}` — the triggering user (for self-routing/acknowledgment)

### 7) Sequential multi-level approvals
For processes requiring multiple approval levels, use separate approval nodes in sequence:
- Node 1: `dynamic_manager` (immediate manager)
- Node 2: `management_chain` with `management_level: 2` (director)
- Node 3: `management_chain` with `management_level: 3` (VP)

Or use a condition node to decide which level based on form data:
- If amount > 5000 → route to `management_chain` level 2
- Else → route to `dynamic_manager`

### 8) All available prefill keys
| Key | Description |
|-----|-------------|
| `email` | User's email |
| `name` | Full display name |
| `firstName` | First name |
| `lastName` | Last name |
| `phone` | Phone number |
| `id` | User ID |
| `orgId` | Organization ID |
| `roles` | Role IDs |
| `roleNames` | Human-readable role names |
| `groups` | Group IDs |
| `groupNames` | Human-readable group names |
| `managerId` | Direct manager user ID |
| `managerName` | Manager display name |
| `managerEmail` | Manager email |
| `departmentId` | Department ID |
| `departmentName` | Department name |
| `jobTitle` | Job title |
| `employeeId` | HR employee identifier |
| `isManager` | Whether the user is a manager (true/false) |

## Best Practices for Identity-Aware Workflows

1. **DO** use `assignee_source: "user_directory"` with `directory_assignee_type: "dynamic_manager"` when the process goal mentions "manager approval" or "supervisor review".
2. **DO** use prefill with `readOnly: true` for user attributes like email, name, employee ID, phone, department — never ask the user to re-enter information the system already knows.
3. **DO NOT** ask the user to manually enter their manager's name or ID — use the dynamic manager resolution instead.
4. **DO NOT** hardcode specific manager user IDs in approval nodes for HR processes — use `user_directory` so it works for any employee.
5. **If** the process mentions "department head approval" or "department manager", use `directory_assignee_type: "department_manager"`.
6. **If** the process mentions "VP approval" or "senior management approval", use `directory_assignee_type: "management_chain"` with an appropriate `management_level`.
7. **If** the process has a form field where the user selects an approver, use `directory_assignee_type: "expression"`.
8. **For** multi-level approval chains (manager → director → VP), use sequential approval nodes.
9. **For** group/committee approvals (e.g., "needs IT team sign-off"), use `directory_assignee_type: "group"`.
10. **For** role-based approvals (e.g., "anyone with Finance role"), use `directory_assignee_type: "role"`.

## Anti-hallucination note
- Only use `directory_assignee_type` values listed in the table above.
- Only use prefill keys listed in the table above.
- The engine resolves identity automatically — do NOT generate nodes that "call HR API" or "look up manager" unless the user specifically asks for custom integration steps.
- Expression paths must match the exact syntax: `{{ trigger_input.fieldName }}`, `{{ variables.varName }}`, `{{ context.user_id }}`.
