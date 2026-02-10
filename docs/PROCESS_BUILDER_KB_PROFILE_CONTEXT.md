# Process Builder Knowledge Base — User/Profile Context (v1)
The workflow engine runs with a **logged-in user context** (the person who started the process).

## Available runtime context (engine)
The engine has access to:
- `currentUser.id`
- `currentUser.name`
- `currentUser.email`
- `currentUser.roles` (array)
- `currentUser.groups` (array)
- `currentUser.orgId`

## How to use it in a workflow

### 1) Prefill start form fields (recommended)
For user-entered fields that are already known from the profile (like email, name), prefer:
- a read-only field with `prefill: { "source": "currentUser", "key": "email" }`, OR
- omit the field entirely and use `currentUser.email` in notifications.

### 2) Avoid asking the user to re-type profile information
If a field can be inferred from the logged-in user (email, name), do not make it required input unless business rules require confirmation.

## Anti-hallucination note
Do NOT invent profile keys. Only use the keys listed above.

