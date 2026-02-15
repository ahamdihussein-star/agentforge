# Process Builder Knowledge Base — Shape Catalog (v3)

This document describes ALL shapes (node types) available in the visual Process Builder.
The LLM MUST only use node types listed here. Do NOT invent unsupported nodes or properties.

## Guiding Principles
- Only use node types listed in this document.
- Only use properties listed for each node type.
- ALL labels shown to users MUST be business-friendly (no snake_case, no internal IDs).
- Internal field keys MUST use lowerCamelCase (e.g., `employeeEmail`, `startDate`).
- The process should be as simple as possible while fulfilling the user's goal.

## Shape Catalog (13 shapes)

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
- `output_schema` (object): Expected output structure (for JSON).

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
- `recipients` (array of strings): Who receives the message:
  - `"requester"` — The person who started this process.
  - `"manager"` — The requester's direct manager.
  - A user ID (UUID) — resolved to email.
  - An email address — sent directly.
  - `"{{fieldName}}"` — From a form field.
- `title` (string): Subject line.
- `message` (string): Message body with `{{fieldName}}` references.

#### 7) Request Approval — `approval`
Pause the workflow until someone approves or rejects.

Config (`approval.config`):
- `message` (string): What needs to be approved (business-friendly).
- `assignee_source` (string): How to find the approver:
  - `platform_user` — A specific person.
  - `user_directory` — Resolve dynamically from org hierarchy (RECOMMENDED).
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

#### 10) Wait — `delay`
Pause for a specified duration.

Config (`delay.config`):
- `duration` (number): How long to wait.
- `unit` (string): `minutes` | `hours` | `days`

#### 11) Repeat — `loop`
Repeat steps for each item in a list.

Config (`loop.config`):
- `collection` (string): The variable containing the array (e.g., `{{parsedData.items}}`).
- `itemVar` (string): Variable name for the current item (default: `item`).
- `maxIterations` (number): Safety limit (default: 100).

---

### Category: Data

#### 12) Calculate — `calculate`
Compute a value, transform data, or apply a formula.

Config (`calculate.config`):
- `operation` (string): `sum` | `average` | `count` | `concat` | `format_date` | `custom`
- `input` (string): The field or variable to operate on.
- `field` (string): For sum/average — which field in each item to aggregate.
- `expression` (string): For custom — a formula expression with `{{fieldName}}` references.

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
| Repeat steps for each item | Repeat |
| AI analysis, extraction, classification | AI Step |
| Read uploaded file content | Read Document |
| Generate a document | Create Document |
| Compute totals, averages, formulas | Calculate |
| Call external system or API | Connect to System |
| Get someone's approval | Request Approval |
| Send email/Slack/Teams/SMS | Send Message |
| Pause the process | Wait |
| End the workflow | Finish |

## Anti-Hallucination Rules

### Node & Schema Rules
- NEVER invent node types not listed here.
- NEVER invent field types not listed here.
- Every `condition`/`decision` node MUST have exactly two outgoing edges (`yes` and `no`).
- Every workflow MUST have exactly one Start and at least one Finish.

### Data Integrity Rules
- AI steps that parse extracted text MUST only return data explicitly present in the input.
- NEVER invent, fabricate, or estimate values.
- When multiple files are provided, aggregate data from ALL files.

### Identity & Recipient Rules
- NEVER add form fields for manager email/name/ID — the engine resolves these automatically.
- For notifications to the requester: use `"requester"`.
- For notifications to the manager: use `"manager"`.
