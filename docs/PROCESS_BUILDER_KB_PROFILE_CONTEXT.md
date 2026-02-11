# Process Builder Knowledge Base — User/Profile Context (v1)
The workflow engine runs with a **logged-in user context** (the person who started the process).

## Available runtime context (engine)

### Basic profile (always available)
- `currentUser.id`
- `currentUser.name`
- `currentUser.email`
- `currentUser.firstName`
- `currentUser.lastName`
- `currentUser.phone`
- `currentUser.roles` (array of role IDs)
- `currentUser.roleNames` (array of human-readable role names)
- `currentUser.groups` (array of group IDs)
- `currentUser.groupNames` (array of human-readable group names)
- `currentUser.orgId`

### Extended profile (from Identity Directory — available when org has identity configured)
- `currentUser.managerId` — direct manager's user ID
- `currentUser.managerName` — direct manager's full name
- `currentUser.managerEmail` — direct manager's email
- `currentUser.departmentId` — department ID
- `currentUser.departmentName` — department name
- `currentUser.jobTitle` — job title
- `currentUser.employeeId` — HR employee identifier
- `currentUser.isManager` — whether the user manages others (boolean)

## How to use it in a workflow

### 1) Prefill start form fields (recommended)
For user-entered fields that are already known from the profile (like email, name), prefer:
- a read-only field with `prefill: { "source": "currentUser", "key": "email" }`, OR
- omit the field entirely and use `currentUser.email` in notifications.

All available prefill keys:
- Basic: `email`, `name`, `firstName`, `lastName`, `phone`, `id`, `orgId`
- Roles/Groups: `roles`, `roleNames`, `groups`, `groupNames`
- Identity: `managerId`, `managerName`, `managerEmail`, `departmentId`, `departmentName`, `jobTitle`, `employeeId`
- Hierarchy: `isManager`

### 2) Avoid asking the user to re-type profile information
If a field can be inferred from the logged-in user (email, name, phone, employee ID, department, manager, job title), do not make it required input unless business rules require confirmation. Use prefill with `readOnly: true` instead.

### 3) Identity-aware approval routing
When the process needs manager approval, use `assignee_source: "user_directory"` with `directory_assignee_type: "dynamic_manager"` instead of asking the user to enter their manager's ID. See **PROCESS_BUILDER_KB_IDENTITY.md** for full details on all routing types (manager, department head, management chain, role, group, expression, etc.).

## Anti-hallucination note
Do NOT invent profile keys. Only use the keys listed above (basic + extended).
