# Process Builder Knowledge Base — Identity, User Context & Runtime Resolution (v5)

This document explains how the platform provides user identity data to running processes,
how the AI should configure steps to leverage this data, and how approvals/notifications
resolve recipients dynamically — all without hardcoding any person, email, or org structure.

## Shared Emails (Important)

The platform can be configured to allow **multiple independent users** to share the same email address
(shared mailbox / service account scenarios).

- **Do NOT assume email is unique.** Treat `email` as a delivery channel only.
- **Always identify people by `user_id`** (or dynamic directory routing) inside workflow configs.
- Notifications sent to `"requester"` / `"manager"` resolve to an email address and may land in a shared inbox if the org uses shared emails.

## How User Data Flows Into a Running Process

When a user starts a process (submits the form), the platform automatically:

1. **Identifies the user** from their login session
2. **Queries the configured Identity Directory** (Built-in, LDAP, Active Directory, HR API, or Hybrid)
3. **Enriches the process context** with ALL available user attributes as `_user_context`

This means every running process has access to:
```
trigger_input._user_context = {
  // Core (always available)
  "user_id": "...",
  "email": "user@company.com",
  "display_name": "John Smith",
  "first_name": "John",
  "last_name": "Smith",
  "phone": "+971...",
  
  // Identity (available when identity source is configured)
  "employee_id": "E-1001",
  "job_title": "Senior Engineer",
  "department_id": "...",
  "department_name": "Engineering",
  "manager_id": "...",
  "manager_email": "manager@company.com",   // ← resolved automatically
  "manager_name": "Jane Doe",               // ← resolved automatically
  "is_manager": false,
  "direct_report_count": 0,
  
  // Department Head (resolved from department's manager_id in org chart)
  "department_head_id": "...",
  "department_head_email": "head@company.com",
  "department_head_name": "Sarah Wilson",
  
  // Groups & Roles
  "role_ids": [...],
  "role_names": ["Presales", "Engineer"],
  "group_ids": [...],
  "group_names": ["Team Alpha"],
  
  // Custom attributes (org-specific, from HR/LDAP)
  "cost_center": "CC-ENG-01",
  "custom_attributes": { ... }
}
```

**The AI does NOT need to "fetch" or "look up" this data** — it is automatically available.
The AI just needs to reference it correctly in templates and configurations.

## Identity Sources (transparent to the workflow)

The organization configures ONE of these (the workflow does NOT need to know which):
- `internal` — Built-in org chart inside the platform
- `ldap` — LDAP / Active Directory / Azure AD
- `hr_api` — External HR system (SAP, Workday, BambooHR, etc.)
- `hybrid` — Internal + external combined

The AI should NEVER assume or check which source is configured. The platform handles this transparently.

## Referencing User Data in Process Steps

### In Notification Messages / Templates
```
Hello {{trigger_input._user_context.display_name}},
Your manager {{trigger_input._user_context.manager_name}} has been notified.
Department: {{trigger_input._user_context.department_name}}
```

### In Form Fields (Prefill)
```json
{
  "name": "employeeName",
  "label": "Employee Name",
  "type": "text",
  "readOnly": true,
  "prefill": { "source": "currentUser", "key": "name" }
}
```

Available prefill keys: `name`, `email`, `firstName`, `lastName`, `phone`, `departmentName`,
`jobTitle`, `employeeId`, `managerId`, `managerName`, `managerEmail`, `roles`, `groups`, `orgId`,
and any custom attribute the organization has configured.

### Job Titles / Positions (Enterprise-friendly)
- People store their free-text title in `job_title` (exposed as `jobTitle` in workflow pickers).
- Organizations may also configure an **optional suggestion list** of job titles (e.g., Director, Senior Analyst).
  - This list is used by the Identity Directory UI and exposed as safe picker options in the Process Builder.
- Job titles are managed per-user within their department via the Org Chart UI.
- New titles typed in the department modal are automatically saved to the org-wide suggestion library.

### Department Structure (Org Chart)
- Departments are managed visually in the Org Chart (drag-and-drop parent/child hierarchy).
- Each department has:
  - **Head** (`manager_id`): The person at the top of this department.
  - **Members**: Users assigned to the department, each with their own `job_title` and `manager_id`.
  - **Parent** (`parent_id`): Parent department in the hierarchy (set via drag-and-drop).
- The Org Chart shows departments as nodes, not individual users. Double-click opens the department detail modal.
- The process builder receives all department data including `parent_id`, `manager_name`, `manager_email`, `manager_title`, and `member_count` via the builder-context API.

## Approval Routing — Dynamic Resolution

When a workflow needs someone's approval, use `assignee_source: "user_directory"` with the
appropriate `directory_assignee_type`. The engine resolves the actual person(s) at runtime.

### Available Routing Types

| `directory_assignee_type` | What It Does | When to Use |
|---------------------------|-------------|-------------|
| `dynamic_manager` | Routes to the requester's direct manager | Any approval that needs the requester's supervisor/manager/boss |
| `department_manager` | Routes to the head of the requester's department | Approvals that need the department head, not the direct manager |
| `management_chain` | Routes to Nth-level manager (set `management_level: N`) | Senior/executive approvals (2 = manager's manager, etc.) |
| `role` | Routes to users with a specific platform role (set `role_ids`) | Cross-organizational approvals by function |
| `group` | Routes to users in a specific platform group (set `group_ids`) | Committee or team-based approvals |
| `department_members` | Routes to all members of a department | When an entire department needs to be involved |
| `expression` | Dynamic from form field or variable (set `expression`) | When the user selects their approver |
| `static` | Fixed user IDs (set `user_ids`) | When specific individuals are always the approvers |

### Department Routing
- When routing to a SPECIFIC department's manager or members, set BOTH:
  - `department_id` (UUID from ORGANIZATION STRUCTURE context) — required for the visual builder
  - `assignee_department_name` (string) — human-readable fallback for the engine
- For `department_manager` without specifying a department, the engine falls back to the requester's own department.
- CRITICAL: `dynamic_manager` is NOT the same as `department_manager`.
  - `dynamic_manager` = the requester's DIRECT MANAGER (their supervisor, set via Org Chart per-user)
  - `department_manager` = the HEAD of a department (set via the department's `manager_id` in the Org Chart)
  When the user says "Finance Department Manager", use `department_manager` + `assignee_department_name: "Finance"`.
- The visual builder shows the department head's name, title, and email when selecting a specific department,
  so the user can verify they're routing to the right person.
- Departments can be nested (parent/child) in the org chart. Routing always targets the selected department's head,
  regardless of hierarchy level.

### Group and Role Routing
- `platform_group` as `assignee_source` with `assignee_ids: ["<group_id>"]` routes to all members of the group.
- `platform_role` as `assignee_source` with `assignee_ids: ["<role_id>"]` routes to all users with that role.
- When the ORGANIZATION STRUCTURE context provides specific groups/roles, use their actual IDs.

### Sequential Multi-Level Approvals
For processes requiring multiple levels of approval:
- First approval: `dynamic_manager` (immediate supervisor)
- Second approval: `management_chain` with `management_level: 2` (next level up)
- Use `condition` nodes between levels to decide if escalation is needed

## Smart Notification Recipients

Notification nodes support **magic recipient shortcuts** that the engine resolves at runtime:

| Recipient Value | What Happens at Runtime |
|----------------|------------------------|
| `"requester"` | Resolves to the email of the person who submitted the form |
| `"manager"` | Resolves to the email of the requester's direct manager |
| `"department_head"` | Resolves to the email of the requester's department head |
| `"department_members"` | Resolves to ALL members of the requester's department |
| `"dept_manager:<department_id>"` | Resolves to the manager of a SPECIFIC department (by ID) |
| `"dept_members:<department_id>"` | Resolves to ALL members of a SPECIFIC department (by ID) |
| `"group:<group_id>"` | Resolves to ALL members of a specific group/team (by ID) |
| `"role:<role_id>"` | Resolves to ALL users assigned a specific role (by ID) |
| `"skip_level_N"` | Resolves to the Nth-level manager in the management chain (e.g., `skip_level_2` = manager’s manager). |
| A UUID string | Resolves the user ID to their email via user directory |
| An email address (contains @) | Sent directly as-is |

**CRITICAL**: When configuring notifications in the visual builder:
- Use `recipient` (singular string) — NOT `recipients` (array)
- The value MUST be one of the shortcuts above — the visual builder presents ALL options as categorized dropdowns (Dynamic Recipients, Departments, Groups, Roles, From Form, Specific Person). No free-text email input.
- When the user mentions a specific team, group, or role by name, use the ORGANIZATION STRUCTURE
  context (provided at generation time) to find the correct entity ID and use `group:<id>` or `role:<id>`
- "requester" and "manager" are the most common for simple workflows
- The engine handles ALL resolution — the AI should NEVER try to manually resolve emails
- The AI should NEVER generate raw email addresses as recipients. Always use a shortcut value.

### Example Notification Configurations

**Notify the employee (who submitted):**
```json
{
  "channel": "email",
  "recipient": "requester",
  "template": "Your request has been processed. Details: {{parsedData.details}}"
}
```

**Notify the manager:**
```json
{
  "channel": "email",
  "recipient": "manager",
  "template": "A new request from {{trigger_input._user_context.display_name}} requires your review."
}
```

## Using Job Titles / Positions in Workflows

The requester's `job_title` (set per-user in the department modal) is automatically available at runtime.
The AI can use it for conditions, templates, routing decisions, and form prefill.

### Referencing job_title

| Context | Syntax |
|---------|--------|
| Condition field | `trigger_input._user_context.job_title` |
| Notification template | `{{trigger_input._user_context.job_title}}` |
| Form prefill key | `jobTitle` |
| AI prompt context | `{{trigger_input._user_context.job_title}}` |

### Example: Auto-approve based on position

If the requester is a Director or above, auto-approve; otherwise route to their manager:
```json
{
  "type": "condition",
  "config": {
    "rules": [
      { "field": "trigger_input._user_context.job_title", "operator": "contains", "value": "Director" }
    ]
  }
}
```
- YES path → notification (auto-approved)
- NO path → approval (dynamic_manager)

### Example: Include position in notification

```json
{
  "channel": "email",
  "recipient": "manager",
  "template": "A new request from {{trigger_input._user_context.display_name}} ({{trigger_input._user_context.job_title}}, {{trigger_input._user_context.department_name}}) requires your review."
}
```

### Example: Show department head info

```json
{
  "channel": "email",
  "recipient": "requester",
  "template": "Your request has been forwarded to your department head {{trigger_input._user_context.department_head_name}} for approval."
}
```

### Using Other Users' Titles

- The **department head's title** is available via the builder-context as `manager_title` on each department.
- At runtime, the approval engine resolves the correct person — the workflow only needs to specify the routing type.
- To route based on a user's position within a department, use `department_manager` (routes to the head) or `dynamic_manager` (routes to the requester's direct manager, regardless of title).
- The platform does NOT support routing to "anyone with job_title = X" — use roles or groups for function-based routing instead.

### Important: Job titles are not roles

- **Job titles/positions** (e.g., "AP Manager", "Finance Director") are **profile attributes** used for conditions, templates, and AI context.
- **Roles / Groups / Departments** are **routing constructs** used to select approvers/recipients.

If a prompt mentions an approver by title:
- Prefer **department routing** when the title maps to a department head (example: "Finance Manager" → department_manager for "Finance").
- Prefer **management chain routing** when the org chart defines escalation levels (direct manager / skip levels).
- Use **group/role routing** only when those entities exist in the organization structure lists.

### Visual Builder Smart Value Pickers

When configuring condition rules in the visual builder, the **value field** automatically shows smart dropdown options based on the selected field:

| Condition Field | Value Picker Shows |
|----------------|-------------------|
| `job_title` | Org-wide job title suggestions (from the job titles library) |
| `departmentName` | All department names from the org structure |
| `roles` | All role names from the organization |
| `groups` | All group names from the organization |
| `isManager` / boolean fields | `true` / `false` dropdown |
| Form `select` fields | The field's defined options |

This means business users never need to type values manually when working with organizational data — they pick from dropdowns populated from the actual org structure.

## Decision Rules

1. **Any approval that should go to the requester's supervisor** → Use `dynamic_manager`. NEVER ask the user to enter their manager's information.
2. **Approval by a specific department's manager** (e.g., "Finance Manager") → Use `department_manager` with `assignee_department_name`. Do NOT use `dynamic_manager`.
3. **Approval by a team/group** (e.g., "Accounts Payable Team") → Use `platform_group` with the group's actual ID from the ORGANIZATION STRUCTURE context.
4. **Approval by a role** (e.g., "CFO") → Use `platform_role` with the role's actual ID from the ORGANIZATION STRUCTURE context.
5. **For notifications to the employee** → Use `"requester"` as recipient.
6. **For notifications to the manager** → Use `"manager"` as recipient.
7. **For notifications to a group/team** → Use `"group:<group_id>"` as recipient.
8. **For notifications to a role** → Use `"role:<role_id>"` as recipient.
9. **NEVER add a "Manager Email" field to the form** — the system resolves it automatically from the identity directory.
10. **NEVER hardcode email addresses** — use shortcuts or let the engine resolve from user directory.
11. **When the user mentions a specific department, group, or role by name**, ALWAYS check the ORGANIZATION STRUCTURE context (provided at generation time) for the matching entity and use the correct routing type with the real ID.

## Anti-Hallucination Rules

### Identity & Recipient Rules
- Only use `directory_assignee_type` values listed in the table above.
- Do NOT generate nodes that manually "look up" or "call HR" to find managers — the engine does this automatically.
- Do NOT ask users to enter their manager's name, email, or ID — use `dynamic_manager`.
- Do NOT hardcode specific user IDs in approval nodes for processes that should work for any requester.
- Do NOT add "Manager Email" as a form field — this is resolved automatically from the identity directory.
- Expression paths MUST follow the syntax: `{{ trigger_input.fieldName }}`, `{{ variables.varName }}`, `{{ context.user_id }}`.

### Notification Anti-Hallucination
- Notification message bodies MUST reference **actual variables** from previous steps using `{{variableName}}` syntax.
- NEVER put placeholder text that looks like real data (e.g., "Your expense of $500 has been approved") — use `{{parsedData.totalAmount}}` instead.
- If a notification depends on data from an AI parsing step, the AI step's `output_variable` MUST be referenced correctly.
- If the manager cannot be resolved (no identity configured), the notification will fail with a clear error explaining that the Identity Directory needs to be set up.

### Error Transparency
- When a step fails, the platform provides both a **business-friendly explanation** (what went wrong in plain language) and **technical details** (exact error, stack trace, variable state).
- If the error is a **configuration issue** (e.g., missing recipient, wrong field name), the business summary guides the user to fix it.
- If the error is a **technical bug** (e.g., service unavailable, code error), the business summary tells the user to share the Technical view with their IT team.
