# Process Builder Knowledge Base — Identity & Approval Routing (v2)

This document describes how the platform automatically resolves approvers, notifies the right people,
and routes workflows based on organizational hierarchy — without hardcoding any specific person or structure.

## Core Principle: Dynamic Resolution Over Static Assignment

The platform has a **User Directory Service** that resolves organizational relationships at runtime.
This means:
- The process does NOT need to know WHO the manager is — the engine resolves it automatically.
- The process does NOT need to know the org structure — the engine queries the identity source.
- Approval routing works for ANY employee in ANY department without changes.

## Identity Sources (transparent to the workflow)

The organization configures ONE of these (the workflow designer does NOT need to know which):
- `internal` — Built-in org chart inside the platform.
- `ldap` — LDAP / Active Directory / Azure AD.
- `hr_api` — External HR system (SAP, Workday, BambooHR, etc.).
- `hybrid` — Internal + external combined.

## Approval Routing Options

When a workflow needs someone's approval, use `assignee_source: "user_directory"` with the
appropriate `directory_assignee_type`. The engine resolves the actual person(s) at runtime.

### Available Routing Types

| `directory_assignee_type` | What It Does | When to Use |
|---------------------------|-------------|-------------|
| `dynamic_manager` | Routes to the requester's direct manager | Any approval that needs the requester's supervisor/manager/boss |
| `department_manager` | Routes to the head of the requester's department | Approvals that need the department head, not the direct manager |
| `management_chain` | Routes to Nth-level manager (set `management_level: N`) | Senior/executive approvals (2 = manager's manager, 3 = one level higher, etc.) |
| `role` | Routes to users with a specific platform role (set `role_ids`) | Cross-organizational approvals by function (e.g., anyone with a specific role) |
| `group` | Routes to users in a specific platform group (set `group_ids`) | Committee or team-based approvals |
| `department_members` | Routes to all members of a department (set `department_id`) | When an entire department needs to be involved |
| `expression` | Dynamic from form field or variable (set `expression`) | When the user selects their approver, or the approver is determined by a previous step |
| `static` | Fixed user IDs (set `user_ids`) | When specific individuals are always the approvers regardless of who submits |

### Expression-Based Dynamic Routing

When the approver is determined at runtime (e.g., from a form field or a previous step's output):
- `expression: "{{ trigger_input.selectedApprover }}"` — From a form field
- `expression: "{{ variables.resolvedApprover }}"` — From a process variable
- `expression: "{{ context.user_id }}"` — The requester themselves (for acknowledgment/self-review)

### Sequential Multi-Level Approvals

For processes requiring multiple levels of approval, use separate approval nodes in sequence:
- First approval node: `dynamic_manager` (immediate supervisor)
- Second approval node: `management_chain` with `management_level: 2` (next level up)
- Third approval node: `management_chain` with `management_level: 3` (another level up)

Use a `condition` node between approval levels to decide whether escalation is needed based on process data.

## Smart Notification Recipients

Notification nodes auto-resolve recipients at runtime:

| Recipient Value | What Happens |
|----------------|-------------|
| `"requester"` | Auto-resolves to the submitter's email |
| `"manager"` | Auto-resolves to the submitter's manager's email |
| A UUID string | Resolves the user ID to their email |
| An email address | Sent directly |
| `"{{ trigger_input._user_context.email }}"` | Requester's email from context |
| `"{{ trigger_input._user_context.manager_email }}"` | Manager's email from context |

## Decision Rules

1. **Any approval that should go to the requester's supervisor/manager** → Use `dynamic_manager`. NEVER ask the user to enter their manager's information.

2. **Any approval that needs escalation beyond the direct manager** → Use `management_chain` with the appropriate level.

3. **Any approval by a specific organizational function** (regardless of department) → Use `role` with the role ID.

4. **Any approval by a specific team or committee** → Use `group` with the group ID.

5. **Any approval where the approver is selected in the form** → Use `expression` with the form field reference.

6. **Only use `platform_user` with static IDs** when the approval ALWAYS goes to the same specific person(s) regardless of who submits. This is rare — prefer dynamic resolution.

7. **For notifications**, use `"requester"` and `"manager"` shortcuts. NEVER ask users to enter email addresses for notifications when the system can resolve them.

## Anti-Hallucination Rules
- Only use `directory_assignee_type` values listed in the table above.
- Do NOT generate nodes that manually "look up" or "call HR" to find managers — the engine does this automatically.
- Do NOT ask users to enter their manager's name, email, or ID — use `dynamic_manager`.
- Do NOT hardcode specific user IDs in approval nodes for processes that should work for any requester.
- Expression paths MUST follow the syntax: `{{ trigger_input.fieldName }}`, `{{ variables.varName }}`, `{{ context.user_id }}`.
