# Process Builder Knowledge Base — User Profile & Prefill (v5)

The workflow engine runs with a **logged-in user context**. This means the platform already knows
who started the process and can automatically fill in their information.

## Core Principle: Never Ask for What the System Already Knows

If a piece of information is available from the user's profile, the workflow MUST auto-fill it
using `prefill` with `readOnly: true` instead of asking the user to type it.

This applies to ANY attribute the organization's identity source provides — the system is fully dynamic.

## How the Platform Resolves User Data (Runtime Flow)

When a process starts, the platform automatically:
1. Identifies the logged-in user from their session
2. Calls `enrich_process_context(user_id, org_id)` on the configured Identity Directory
3. The Identity Directory queries the configured source (Built-in, LDAP, AD, HR API, or Hybrid)
4. ALL resolved attributes are injected into `trigger_input._user_context`
5. Custom attributes from HR/LDAP are **flattened** into the context (directly accessible)

The workflow designer does NOT need to know which identity source is configured.
The engine handles this transparently.

## How Prefill Works

For any start form field that matches a known user attribute:
```json
{
  "name": "fieldName",
  "label": "Friendly Label",
  "type": "text",
  "readOnly": true,
  "prefill": { "source": "currentUser", "key": "<attributeKey>" }
}
```

The engine resolves the value at runtime from whichever identity source the organization has configured.

## Available Attribute Categories

### Always Available (platform core)
- `id` — User ID
- `name` — Full display name
- `email` — Email address
- `firstName`, `lastName` — Name parts
- `phone` — Phone number
- `roles`, `roleNames` — Platform roles
- `groups`, `groupNames` — Platform groups
- `orgId` — Organization ID

### Available When Identity Source Is Configured
- `managerId`, `managerName`, `managerEmail` — Direct manager info (resolved automatically)
- `departmentId`, `departmentName` — Department info
- `jobTitle` — Job title
- `employeeId` — HR employee identifier
- `isManager` — Whether the user manages others
- `directReportCount` — Number of direct reports

### Custom Attributes (Fully Dynamic)
Any attribute configured in the organization's identity source (HR system, LDAP, Active Directory)
is automatically available as a prefill key. The engine resolves custom attributes dynamically —
if the attribute exists in the directory, it works.

Examples of possible custom attributes (organization-dependent):
`nationalId`, `hireDate`, `officeLocation`, `costCenter`, `badgeNumber`, `grade`, `division`, etc.

## Decision Rules for Prefill

1. **If the process asks for the user's name, email, phone, department, job title, employee ID,
   or any profile information** → Use prefill with `readOnly: true`. NEVER make the user type it.

2. **If the process mentions "manager" or "supervisor" in the context of notifications or approvals** →
   The system resolves this automatically via the identity directory. Do NOT ask the user to enter
   their manager's information. Do NOT add a "Manager Email" form field.

3. **If a field could be ANY user attribute** → Check if it matches a known prefill key.
   The system supports ANY camelCase key that maps to a snake_case attribute in the user's profile.

4. **If you're unsure whether an attribute exists** → It's safe to use prefill anyway.
   If the attribute doesn't exist, the field will simply be empty and the user can fill it in.

## Using User Context in Other Nodes

Beyond form prefill, user context is available in templates and expressions throughout the process:
- `{{ trigger_input._user_context.email }}` — Requester's email
- `{{ trigger_input._user_context.display_name }}` — Requester's full name
- `{{ trigger_input._user_context.manager_email }}` — Manager's email (resolved from identity directory)
- `{{ trigger_input._user_context.manager_name }}` — Manager's name
- `{{ trigger_input._user_context.department_name }}` — Department name
- `{{ trigger_input._user_context.job_title }}` — Job title
- `{{ trigger_input._user_context.employee_id }}` — Employee ID

## Anti-Hallucination Rules
- The prefill system is dynamic — ANY camelCase key works if the attribute exists.
- Do NOT generate steps that "look up" or "fetch" user profile data manually — the engine does this automatically.
- Do NOT ask users to re-enter information the system already has.
- Do NOT add "Manager Email" as a form field — this is resolved from the identity directory automatically.
- When using prefill, ALWAYS set `readOnly: true` to prevent the user from accidentally changing auto-filled data.
