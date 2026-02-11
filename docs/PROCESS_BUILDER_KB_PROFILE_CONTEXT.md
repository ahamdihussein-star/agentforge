# Process Builder Knowledge Base — User/Profile Context (v1)
The workflow engine runs with a **logged-in user context** (the person who started the process).

## Available runtime context (engine)

### Basic profile (always available)
- `currentUser.id`
- `currentUser.name`
- `currentUser.email`
- `currentUser.roles` (array)
- `currentUser.groups` (array)
- `currentUser.orgId`

### Extended profile (from Identity Directory — available when org has identity configured)
- `currentUser.managerId` — direct manager's user ID
- `currentUser.managerName` — direct manager's full name
- `currentUser.managerEmail` — direct manager's email
- `currentUser.departmentId` — department ID
- `currentUser.departmentName` — department name
- `currentUser.jobTitle` — job title
- `currentUser.employeeId` — HR employee identifier

## How to use it in a workflow

### 1) Prefill start form fields (recommended)
For user-entered fields that are already known from the profile (like email, name), prefer:
- a read-only field with `prefill: { "source": "currentUser", "key": "email" }`, OR
- omit the field entirely and use `currentUser.email` in notifications.

Extended prefill keys (from Identity Directory):
- `prefill: { "source": "currentUser", "key": "managerId" }` — manager's user ID
- `prefill: { "source": "currentUser", "key": "managerName" }` — manager's name
- `prefill: { "source": "currentUser", "key": "managerEmail" }` — manager's email
- `prefill: { "source": "currentUser", "key": "departmentName" }` — department name
- `prefill: { "source": "currentUser", "key": "jobTitle" }` — job title
- `prefill: { "source": "currentUser", "key": "employeeId" }` — HR employee ID

### 2) Avoid asking the user to re-type profile information
If a field can be inferred from the logged-in user (email, name, employee ID, department, manager), do not make it required input unless business rules require confirmation.

### 3) Identity-aware approval routing
When the process needs manager approval, use `assignee_source: "user_directory"` with `directory_assignee_type: "dynamic_manager"` instead of asking the user to enter their manager's ID. See **PROCESS_BUILDER_KB_IDENTITY.md** for full details.

## Anti-hallucination note
Do NOT invent profile keys. Only use the keys listed above (basic + extended).

