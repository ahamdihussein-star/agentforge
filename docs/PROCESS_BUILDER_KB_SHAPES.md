# Process Builder Knowledge Base — Shape Catalog (v4)

This document describes ALL shapes (node types) available in the visual Process Builder.
The LLM MUST only use node types listed here. Do NOT invent unsupported nodes or properties.

## Guiding Principles
- Only use node types listed in this document.
- Only use properties listed for each node type.
- ALL labels shown to users MUST be business-friendly (no snake_case, no internal IDs).
- Internal field keys MUST use lowerCamelCase (e.g., `employeeEmail`, `startDate`).
- The process should be as simple as possible while fulfilling the user's goal.
- This platform is for NON-TECHNICAL business users. All UI and configuration must be self-explanatory.

## Shape Catalog (11 shapes)

### Category: Start & End

#### 1) Start — `trigger`
How the process begins. Every workflow MUST have exactly ONE start node.

Start modes (`trigger.config.triggerType`):
- `manual` — Someone fills a form to start
- `schedule` — Runs automatically on a schedule
- `webhook` — Triggered from another system

Config properties:
- `formTitle` (string): Title shown above the form.
- `submitText` (string): Submit button label.
- `fields` (array): Input fields (required for `manual`). See **Field Schema** below.
- `cron` (string): Cron expression (for `schedule` mode — UI converts from visual picker).
- `timezone` (string): Timezone (e.g., `UTC`, `Asia/Dubai`).
- `method` (string): HTTP method (for `webhook` — auto-defaults to POST).
- `path` (string): Webhook endpoint path.

**Field Schema** (each item in `fields`):
- `name` (string, lowerCamelCase): Internal key used in `{{name}}` references.
- `label` (string): Business-friendly label shown to the user.
- `type`: `text` | `textarea` | `number` | `date` | `email` | `select` | `file`
- `required` (boolean)
- `placeholder` (string): Hint text.
- `options` (array of strings): For `select` type.
- `optionsSource` (string): `taxonomy:<id>` or `tool:<toolId>`.
- `readOnly` (boolean): For auto-filled or calculated fields.
- `derived` (object): `{ "expression": "<formula>" }` for calculated fields.
- `prefill` (object): `{ "source": "currentUser", "key": "<attribute>" }` for profile auto-fill.
  The prefill system is FULLY DYNAMIC — any attribute from the user's identity source is available.
  Common keys: `name`, `email`, `phone`, `jobTitle`, `employeeId`, `departmentName`, `managerName`, `managerEmail`, plus any custom attributes configured in the organization's HR/LDAP.
- `multiple` (boolean): For `file` type — allow multiple uploads.

Derived expressions: `daysBetween(a, b)`, `concat(a, " ", b)`, `sum(a, b)`, `round(val, dec)`.

#### 2) Finish — `end`
Process complete. Every workflow MUST have at least ONE finish node.

Config (`end.config`):
- `output` (string): `""` to return all data, or `{{variableName}}` for a specific result.
- `successMessage` (string): Completion message shown to the person who started the process.

---

### Category: Intelligence

#### 3) AI Step — `ai`
Use AI to analyze data, extract information, generate content, classify, or perform any intelligent task.

Config (`ai.config`):
- `prompt` (string): Task description only — what the AI should do. Reference variables with `{{fieldName}}`.
- `instructions` (array of strings): Individual rules/constraints the AI must follow.
- `creativity` (integer 1-5): 1=Very strict, 5=Creative.
- `confidence` (integer 1-5): 1=Very cautious, 5=Very confident.
- `model` (string): AI model (default: `gpt-4o`).
- `output_format` (string): `text` or `json`.
- `outputFields` (array): Named output fields the AI produces. Each: `{ "label": "Human Name", "name": "camelCaseKey" }`.
  These appear as selectable data chips in all downstream steps.

Optional:
- `output_variable` (string): Store the AI result for later steps.

AI sub-modes (set via `aiMode` in config for UI pre-fill, not required):
- `extract` — Extract data from files (auto-sets output_format to json, creativity to 2)
- `analyze` — Analyze or summarize text
- `generate` — Generate content
- `classify` — Classify or categorize
- `custom` — Custom task (default)

#### 4) Read Document — `read_document`
Extract text content from uploaded files (PDFs, images, Word docs, Excel, etc.).

Config (`read_document.config`):
- `sourceField` (string): Name of the file field from Start/Form.
- `dataLabel` (string): Friendly name for the extracted text (auto-generated from source field if empty).

Optional:
- `output_variable` (string): Store the extracted text for later steps (default: `extractedData`).

Note: This is a prerequisite for AI Step when analyzing uploaded documents. The pattern is: Upload (Start) -> Read Document -> AI Step (analyze the text).

#### 5) Create Document — `create_document`
Generate a document (Word, PDF, Excel, PowerPoint).

Config (`create_document.config`):
- `title` (string): Document title.
- `format` (string): `docx` | `pdf` | `xlsx` | `pptx` | `txt`
- `instructions` (string): What should be in the document. Can reference variables with `{{fieldName}}`.

Optional:
- `output_variable` (string): Store the document reference for later steps.

---

### Category: People

#### 6) Send Message — `notification`
Send a message to one or more recipients.

Config (`notification.config`):
- `channel` (string): `email` | `slack` | `teams` | `sms`
- `recipient` (string): Who receives the message:
  - `"requester"` — The person who started this process.
  - `"manager"` — The requester's direct manager.
  - `"{{fieldName}}"` — From a form field.
  - An email address — sent directly.
- `title` (string): Subject line.
- `template` (string): Message body with `{{fieldName}}` references.
  Can also use `{{trigger_input._user_context.fieldName}}` for person information (name, email, department, etc.).

#### 7) Request Approval — `approval`
Pause the workflow until someone approves or rejects.

Config (`approval.config`):
- `message` (string): What needs to be approved (business-friendly).
- `assignee_source` (string): How to find the approver:
  - `platform_user` — A specific person.
  - `user_directory` — Resolve dynamically from org hierarchy (RECOMMENDED).
  - `platform_role` — Anyone with a specific role.
  - `platform_group` — Anyone in a specific group.
  - `tool` — Resolve via a tool.
- `assignee_type` (string): `user` | `role` | `group`
- `assignee_ids` (array): User/role/group IDs.
- `timeout_hours` (number): Hours before timeout.

When `assignee_source` is `user_directory`:
- `directory_assignee_type`: `dynamic_manager` | `department_manager` | `management_chain` | `role` | `group`
- `management_level` (number): For management_chain — how many levels up.
- `role_ids` / `group_ids` (array): For role/group resolution.

#### 8) Collect Information — `form`
Pause the process and ask someone to fill a form.

Config (`form.config`):
- `fields` (array): Same field schema as Start trigger fields.
- `assignee` (string): Who should fill this form (requester, manager, specific user).

---

### Category: Logic

#### 9) Decision — `condition`
Route the workflow based on a yes/no condition.

Config (`condition.config`):
- `field` (string): The field or variable to evaluate.
- `operator`: `equals` | `not_equals` | `greater_than` | `less_than` | `contains` | `is_empty`
- `value` (string|number): The value to compare against.

Connection rules: MUST have exactly two outgoing edges — `type: "yes"` and `type: "no"`.

#### 10) Run in Parallel — `parallel`
Execute multiple paths simultaneously. All connected next steps run at the same time.

Config (`parallel.config`):
- Branches are automatically determined from the connections drawn on the canvas — no manual branch configuration needed.
- `merge_strategy` (string): `wait_all` (default — wait for all paths to finish) | `wait_any` (continue when any one path finishes).

Usage: Connect this node to multiple next steps. All connected paths run simultaneously. The process continues when all paths complete (or any one, depending on strategy).
Layout: Place parallel branches side by side horizontally, each branch offset by ±300px from the parallel node's x position.

#### 11) Call Process — `call_process`
Invoke another published process as a sub-step.

Config (`call_process.config`):
- `processId` (string): ID of the published process to invoke (selected from a dropdown in the UI). MUST match an ID from the platform's published processes list.
- `inputMapping` (object): Map current process data to the sub-process input fields. Keys = sub-process field names, values = `{{currentProcessField}}` references.
- `outputVariable` (string): Variable name to store the sub-process result so downstream steps can reference it.

Note: `outputVariable` (camelCase) is the visual builder config key. The normalization layer converts it to `output_variable` for the engine.

---

### Category: Data

#### 12) Calculate — `calculate`
Compute a value, transform data, or apply a formula.

Config (`calculate.config`):
- `operation` (string): `sum` | `average` | `count` | `concat` | `custom`
- `expression` (string): For common operations, a field reference; for custom, a formula with `{{fieldName}}` refs.
- `dataLabel` (string): Friendly name for the result.

Optional:
- `output_variable` (string): Store the result for later steps.

---

### Category: Integration

#### 13) Connect to System — `tool`
Use a platform-configured tool or API to send/receive data.

Config (`tool.config`):
- `toolId` (string): Must match an available tool ID.
- `params` (object): Arguments for the tool with `{{fieldName}}` references.

Optional:
- `output_variable` (string): Store the response for later steps.

---

## Decision Guide

| Need | Shape |
|------|-------|
| Collect input at start | Start (with fields) |
| Collect input mid-workflow | Collect Information |
| Yes/no decision | Decision |
| Run steps simultaneously | Run in Parallel |
| Invoke another process | Call Process |
| AI analysis, extraction, classification | AI Step |
| Read uploaded file content | Read Document |
| Generate a document | Create Document |
| Compute totals, averages, formulas | Calculate |
| Call external system or API | Connect to System |
| Get someone's approval | Request Approval |
| Send email/Slack/Teams/SMS | Send Message |
| End the workflow | Finish |

## Deprecated Shapes (kept for backward compatibility only)

These shapes are NOT available in the palette but old saved processes that use them will still load and execute:
- **Wait** (`delay`) — Use schedule triggers or approval timeouts instead.
- **Repeat** (`loop`) — Use an AI Step to handle iteration logic internally.
- **Action** (`action`) — Replaced by purpose-specific shapes (Read Document, Create Document, Calculate).

## Anti-Hallucination Rules

### Node & Schema Rules
- NEVER invent node types not listed here.
- NEVER invent field types not listed here.
- NEVER use deprecated types (delay, loop, action) in new processes.
- Every `condition`/`decision` node MUST have exactly two outgoing edges (`yes` and `no`).
- Every workflow MUST have exactly one Start and at least one Finish.

### Data Integrity Rules
- AI steps that parse extracted text MUST only return data explicitly present in the input.
- NEVER invent, fabricate, or estimate values.
- When multiple files are provided, aggregate data from ALL files.
- AI `outputFields` MUST list every field that downstream steps reference.

### Published Processes & call_process Rules
- NEVER invent process IDs — only use IDs from the PUBLISHED PROCESSES list provided in the platform knowledge.
- If no published processes are available, do NOT create `call_process` nodes.
- When a user mentions calling or reusing another process by name, match it to the closest published process by name similarity.
- `inputMapping` keys MUST match the sub-process input field names exactly.

### Identity & Recipient Rules
- NEVER add form fields for manager email/name/ID — the engine resolves these automatically.
- For notifications to the requester: use `"requester"`.
- For notifications to the manager: use `"manager"`.
- Use `{{trigger_input._user_context.<key>}}` to reference any user profile attribute in templates.

### User Profile Data (Dynamic — Unlimited Fields)
The platform loads ALL available user profile fields dynamically from the configured identity source.
Standard fields: name, email, phone, jobTitle, employeeId, departmentName, managerName, managerEmail, directReportCount, isManager.
Custom fields: Any attribute configured in the organization's HR system, LDAP, or identity provider (e.g., costCenter, officeLocation, badgeNumber, nationalId, hireDate).
All profile fields are available for:
- Form field prefill (`prefill.key`)
- Person Information chips in notification/approval/AI templates (`{{trigger_input._user_context.<key>}}`)
