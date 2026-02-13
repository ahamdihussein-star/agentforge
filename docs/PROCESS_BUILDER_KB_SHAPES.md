# Process Builder Knowledge Base — Node Types & Capabilities (v2)

This document describes ALL node types available in the visual Process Builder.
The LLM MUST only use node types listed here. Do NOT invent unsupported nodes or properties.

## Guiding Principles
- Only use node types listed in this document.
- Only use properties listed for each node type.
- If a value (like dropdown options) is not known from org settings, tools, or user context, use a **free-text field** instead of guessing.
- ALL labels shown to users MUST be business-friendly (no snake_case, no internal IDs).
- Internal field keys MUST use lowerCamelCase (e.g., `employeeEmail`, `startDate`).
- The process should be as simple as possible while fulfilling the user's goal.

## Available Node Types

### 1) Start (Trigger/Form) — `trigger`
Purpose: The entry point of every workflow. Collects input and defines how the workflow starts.

**Every workflow MUST have exactly ONE trigger node.**

Start modes (`trigger.config.triggerType`):
- `manual` — User fills a form and submits to start the workflow.
- `schedule` — Workflow runs automatically on a schedule (cron).
- `webhook` — Workflow starts from an external HTTP request.

Config properties:
- `formTitle` (string): Title shown above the form.
- `submitText` (string): Submit button label.
- `fields` (array): Input fields (required for `manual`). See **Field Schema** below.
- `cron` (string): Cron expression (for `schedule` mode).
- `timezone` (string): Timezone for schedule (e.g., `UTC`).
- `method` (string): HTTP method `POST`/`GET` (for `webhook` mode).
- `path` (string): Webhook endpoint path (for `webhook` mode).

**Field Schema** (each item in `fields`):
- `name` (string, lowerCamelCase): Internal key used in `{{name}}` references.
- `label` (string): Business-friendly label shown to the user.
- `type`: `text` | `textarea` | `number` | `date` | `email` | `select` | `file`
- `required` (boolean): Whether the field must be filled.
- `placeholder` (string): Hint text.
- `options` (array of strings): Only for `select` type — list of allowed values.
- `optionsSource` (string): Only for `select` — where options come from:
  - `taxonomy:<taxonomyId>` — from a platform taxonomy.
  - `tool:<toolId>` — from a configured tool.
- `readOnly` (boolean): For auto-filled or calculated fields.
- `derived` (object): For calculated fields — `{ "expression": "<formula>" }`.
- `prefill` (object): For auto-filling from user profile — `{ "source": "currentUser", "key": "<attribute>" }`.

Derived expressions (supported functions):
- `daysBetween(field1, field2)` → number of days between two date fields.
- `concat(a, " ", b)` → concatenate strings.
- `sum(a, b, c...)` → sum of numeric fields.
- `round(value, decimals)` → round a number.

### 2) Decision (If/Else) — `condition`
Purpose: Route the workflow to one of two paths based on a condition.

Config (`condition.config`):
- `field` (string): The field or variable to evaluate.
- `operator`: `equals` | `not_equals` | `greater_than` | `less_than` | `contains` | `is_empty`
- `value` (string|number): The value to compare against.

Connection rules:
- MUST have exactly two outgoing edges: one with `type: "yes"`, one with `type: "no"`.

### 3) Loop (For Each) — `loop`
Purpose: Repeat a set of steps for each item in a collection.

Config (`loop.config`):
- `collection` (string): The variable containing the array to iterate over (e.g., `{{items}}`).
- `itemVar` (string): Variable name for the current item (default: `item`).

Use when: The process needs to perform the same action on multiple items (e.g., process each line item, notify each team member, review each document).

### 4) AI Step — `ai`
Purpose: Use the LLM to generate text, analyze data, make decisions, or produce structured output.

Config (`ai.config`):
- `prompt` (string): Instructions for the AI. Reference variables using `{{fieldName}}`.
- `model` (string): Model to use (e.g., `gpt-4o`).

Optional:
- `output_variable` (string): Store the AI result in this variable for later steps.

Use when: The process needs intelligent analysis, text generation, classification, summarization, recommendations, or any task requiring reasoning.

### 5) Tool Step — `tool`
Purpose: Call a platform-configured tool (API, database, knowledge base, etc.)

Config (`tool.config`):
- `toolId` (string): Must match an available tool ID from the platform.
- `params` (object): Arguments for the tool. Can reference variables via `{{fieldName}}`.

Optional:
- `output_variable` (string): Store the tool result for later steps.

Use when: The process needs to interact with an external system, fetch data from an API, query a database, or perform an action through a configured tool. Only use if tools are available.

### 6) Approval — `approval`
Purpose: Pause the workflow until an authorized person approves or rejects.

Config (`approval.config`):
- `message` (string): What needs to be approved (business-friendly description).
- `assignee_source` (string): How to find the approver:
  - `platform_user` — Specific user IDs.
  - `user_directory` — Resolve dynamically from the organization's identity source (RECOMMENDED for any organizational role-based approval).
  - `tool` — Resolve via a tool.
- `assignee_type` (string): `user` | `role` | `group`
- `assignee_ids` (array): User/role/group IDs (can be empty when using `user_directory`).
- `timeout_hours` (number): Hours before timeout.

When `assignee_source` is `user_directory` (recommended for any approval that follows organizational hierarchy):
- `directory_assignee_type`: Specifies HOW to resolve the approver:
  - `dynamic_manager` — The requester's direct manager (auto-resolved).
  - `department_manager` — Head of the requester's department.
  - `management_chain` — Nth-level manager (use `management_level: N`).
  - `role` — Users with a specific platform role (use `role_ids`).
  - `group` — Users in a specific platform group (use `group_ids`).
  - `department_members` — All members of a department.
  - `expression` — Dynamic from a form field or variable (use `expression`).
  - `static` — Fixed user IDs.

See **PROCESS_BUILDER_KB_IDENTITY.md** for full identity-aware approval details.

Department routing fields (use when needed by `department_manager` / `department_members`):
- Prefer `department_name` (string) when the workflow is created by an LLM from a user prompt (because IDs are not known at design time).
- Use `department_id` (string UUID) if already available.
- For backward compatibility, the engine also accepts `assignee_department_id` / `assignee_department_name` in `approval.config`.

### 7) Notification — `notification`
Purpose: Send a message to one or more recipients.

Config (`notification.config`):
- `channel` (string): `email` | `slack` | `teams` | `sms`
- `recipients` (array of strings): Who receives the message. Supports:
  - `"requester"` — Auto-resolves to the person who submitted the form.
  - `"manager"` — Auto-resolves to the requester's direct manager.
  - A user ID (UUID) — Auto-resolved to email.
  - An email address — Sent directly.
  - `"{{ trigger_input._user_context.email }}"` — From context.
- `title` (string): Subject line.
- `message` (string): Message body. Can reference variables using `{{fieldName}}`.

### 8) Wait/Delay — `delay`
Purpose: Pause workflow execution for a specified duration.

Config (`delay.config`):
- `duration` (number): How long to wait.
- `unit` (string): `seconds` | `minutes` | `hours` | `days`

### 9) Advanced Action — `action`
Purpose: Perform advanced operations. Use when other node types don't cover the requirement.

Config (`action.config`):
- `actionType` (string): What kind of action:
  - `httpRequest` — Make an HTTP request to any URL.
  - `runScript` — Execute a custom script.
  - `transformData` — Transform data between formats.
  - `fileOperation` — Read/write/delete files.
  - `generateDocument` — Generate a document (PDF, DOCX, etc.).
  - `extractDocumentText` — Extract text from an uploaded file.

For document extraction (when the workflow includes a file upload):
- Set `sourceField` to the file field name.
- Set `output_variable` to store the extracted text.
- AI steps should reference the extracted text variable, NOT the raw file.

### 10) Form Input — `form`
Purpose: Collect additional input from a user mid-workflow (not the initial trigger form).

Config (`form.config`):
- `fields` (array): Same field schema as the trigger form fields.

Use when: The workflow needs to collect information at a step OTHER than the start (e.g., an approver needs to add comments, a reviewer needs to fill in additional details).

### 11) End — `end`
Purpose: Finish the workflow.

**Every workflow MUST have at least ONE end node.**

Config (`end.config`):
- `output` (string): `""` to output all variables, or `{{variableName}}` for a specific result.

## Decision Guide — When to Use Which Node

| Need | Node Type |
|------|-----------|
| Collect user input at start | `trigger` (with fields) |
| Collect user input mid-workflow | `form` |
| Make a yes/no decision | `condition` |
| Repeat steps for multiple items | `loop` |
| Generate text, analyze, classify, summarize | `ai` |
| Call an external API or system | `tool` (if tool configured) or `action` (httpRequest) |
| Get someone's approval | `approval` |
| Send a message to someone | `notification` |
| Wait before continuing | `delay` |
| Upload and read a document | `trigger` (file field) + `action` (extractDocumentText) |
| Generate a document as output | `action` (generateDocument) |
| End the workflow | `end` |

## Anti-Hallucination Rules

### Node & Schema Rules
- NEVER invent node types not listed here.
- NEVER invent field types not listed here.
- NEVER invent operator types not listed here.
- If unsure whether a capability exists, use the simplest available alternative.
- Use `text` fields instead of `select` when options are unknown.
- Every `condition` node MUST have exactly two outgoing edges (`yes` and `no`).
- Every workflow MUST have exactly one `trigger` and at least one `end`.

### Data Integrity Rules (CRITICAL for AI Steps)
- AI steps that parse extracted text MUST only return data that is **explicitly present** in the input.
- NEVER invent, fabricate, or estimate values — if a value cannot be found in the source text, return `null`.
- When extracting amounts/numbers, extract them **exactly** as they appear in the source — do not round, estimate, or average.
- When multiple files are provided, aggregate data from **all** files, not just the first one.
- The `details` or `summary` field MUST contain **specific data** from the actual extraction (e.g., "Parking fee: 100 AED, Flight ticket: 1500 AED"), NEVER vague descriptions like "Extracted data from receipts".

### Error Propagation Rules
- If a step fails, the error MUST propagate to the process result with the **actual error message** — never swallow errors silently.
- If a data extraction step fails or returns empty data, downstream steps (like conditions or notifications) MUST receive a clear indication of the failure rather than operating on empty/null values.
- Condition nodes should handle `null`/`None` values gracefully — the AI should configure conditions with safe defaults when possible.
- Notification templates MUST reference actual variables from previous steps — never use placeholder text that could be mistaken for real data.

### Identity & Recipient Rules
- NEVER add form fields for manager email, manager name, or manager ID — the engine resolves these automatically from the Identity Directory.
- For notifications to the requester: use `"requester"` as the recipient.
- For notifications to the manager: use `"manager"` as the recipient.
- NEVER try to manually resolve emails — the platform does this automatically.
