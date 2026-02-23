# Process Builder Knowledge Base — Shape Catalog (v5)

This document describes ALL shapes (node types) available in the visual Process Builder.
The LLM MUST only use node types listed here. Do NOT invent unsupported nodes or properties.

## Guiding Principles
- Only use node types listed in this document.
- Only use properties listed for each node type.
- ALL labels shown to users MUST be business-friendly (no snake_case, no internal IDs).
- Internal field keys MUST use lowerCamelCase (e.g., `employeeEmail`, `startDate`).
- The process should be as simple as possible while fulfilling the user's goal.
- This platform is for NON-TECHNICAL business users. All UI and configuration must be self-explanatory.

---

## Category: Start & End

### 1) Start — `trigger`
How the process begins. Every workflow MUST have exactly ONE start node.
The Start node defines HOW the process is triggered — it does NOT collect form input.
To collect user input, use a **Collect Information** (`form`) step after the Start.

Trigger modes (`trigger.config.triggerType`):

**Manual** (`"manual"`):
A person starts the process manually. Follow it with a Collect Information step.
Config:
- `triggerType`: `"manual"` (required)

**Scheduled** (`"schedule"`):
Runs automatically on a recurring schedule. No form fields needed.
Config:
- `triggerType`: `"schedule"` (required)
- `cron` (string): Cron expression (e.g., `"0 9 * * *"` for daily 9AM, `"0 9 * * 1"` for weekly Monday 9AM).
- `timezone` (string): `"UTC"`, `"Africa/Cairo"`, `"Asia/Dubai"`, `"America/New_York"`, `"Europe/London"`, `"Asia/Tokyo"`.
- `_schedFreq` (string): Visual picker frequency: `hourly` | `daily` | `weekdays` | `weekly` | `monthly` | `custom`.
- `_schedTime` (string): Time in HH:MM format (e.g., `"09:00"`).
- `_schedDay` (string): Day of week 0-6 for weekly (0=Sunday).
- `_schedDate` (string): Day of month 1-28 or `L` (last) for monthly.

**Webhook** (`"webhook"`):
Triggered by an external HTTP call (e.g., from another system).
Config:
- `triggerType`: `"webhook"` (required)
- `method` (string): `"POST"` | `"GET"` | `"PUT"` | `"PATCH"` (default: `"POST"`).
- `path` (string): Webhook URL path (e.g., `"/trigger"`).
- `auth` (string): `"none"` | `"api_key"` | `"bearer"`.

IMPORTANT: The Start node does NOT have form `fields`. All form input collection belongs in the `form` (Collect Information) shape.

### 2) Finish — `end`
Process complete. Every workflow MUST have exactly ONE Finish node. It MUST be the last node in the nodes array.

Config (`end.config`):
- `output` (string): `""` to output ALL variables, or `"{{variable_name}}"` for a specific variable.
- `successMessage` (string, optional): Completion message shown to the person who started the process.

---

## Category: People

### 3) Collect Information — `form`
Pause the process and show a form to collect information from a person.
Use it right after Start for initial data collection, or mid-workflow for additional information.

Config (`form.config`):
- `formTitle` (string): Title shown above the form.
- `submitText` (string): Submit button label (default: `"Submit"`).
- `fields` (array): Input fields — see **Field Schema** below.
- `assignee` (string, optional): Who should fill this form (`"requester"`, `"manager"`, specific user email).

**Field Schema** (each item in `fields`):

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Internal key, lowerCamelCase (e.g., `employeeEmail`). Used in `{{name}}` references. |
| `label` | string | Business-friendly label shown to the user. |
| `type` | string | Field type (see table below). |
| `required` | boolean | Whether the field must be filled. |
| `placeholder` | string | Hint text displayed inside the field. |
| `options` | string[] | For `select` type — list of dropdown options. |
| `optionsSource` | string | Optional: `"taxonomy:<id>"` or `"tool:<toolId>"` for dynamic options. |
| `multiple` | boolean | For `file` type — allow multiple uploads. Default `true` when in doubt. |
| `readOnly` | boolean | For auto-filled or calculated fields. |
| `prefill` | object | `{ "source": "currentUser", "key": "<attribute>" }` for profile auto-fill. |
| `derived` | object | `{ "expression": "<formula>" }` for calculated fields. |

**Available Field Types:**

| Type | Use For | Notes |
|------|---------|-------|
| `text` | Short free-form input (names, descriptions, comments, notes, addresses, custom IDs) | ONLY for truly free-form input |
| `textarea` | Long text (multi-line descriptions, detailed notes) | |
| `number` | Numeric values (amounts, quantities, counts) | |
| `date` | Date values (start date, end date, due date) | |
| `email` | Email addresses | |
| `select` | Dropdown list (categories, types, statuses, priorities, methods) | MUST use for any classifying field — see rules below |
| `file` | File/image upload (PDF, Word, Excel, PNG, JPG, receipts, invoices, photos, etc.) | Set `multiple: true` for multi-file |

**FIELD TYPE SELECTION RULE**: A field MUST be `"select"` (dropdown) if ANY of these apply:
1. The field name contains: category, type, status, priority, level, method, currency, rating, frequency, severity, department, classification, source, reason.
2. The user mentions "select", "choose", "pick", "dropdown", "list of", or describes a set of values.
3. The field represents a well-known business concept with standard values (expense categories, leave types, payment methods, currencies, urgency levels).
4. A business user would benefit from picking from a predefined list rather than typing free text.

When in doubt, use `"select"` — the admin can always edit the options later.

**Prefill System** (auto-fill from user profile):
Set `readOnly: true` + `prefill: { "source": "currentUser", "key": "<key>" }`.
The system is FULLY DYNAMIC — any attribute from the user's identity source is available.
Common keys: `name`, `email`, `firstName`, `lastName`, `phone`, `jobTitle`, `employeeId`, `departmentName`, `departmentId`, `managerName`, `managerEmail`, `managerId`, `isManager`, `directReportCount`, `groupNames`, `roleNames`.
Custom keys (from HR/LDAP): `nationalId`, `hireDate`, `officeLocation`, `costCenter`, `badgeNumber`, or ANY field the organization configured.
BEST PRACTICE: ALWAYS prefill every piece of information the system already knows. NEVER ask users to type what the system knows.

**Derived Expressions** (auto-calculated fields):
Set `readOnly: true` + `derived: { "expression": "<formula>" }`.
Supported formulas: `daysBetween(startDate, endDate)`, `concat(firstName, " ", lastName)`, `sum(a, b)`, `round(val, decimals)`.

### 4) Send Message — `notification`
Send a message to one or more recipients.

Config (`notification.config`):
- `channel` (string): `"email"` (default) | `"slack"` | `"teams"` | `"sms"`.
- `recipient` (string): Who receives the message:
  - `"requester"` — The person who started this process (PREFERRED for employee notifications).
  - `"manager"` — The requester's direct manager (PREFERRED for manager notifications).
  - `"{{fieldName}}"` — From a form field (e.g., `"{{employeeEmail}}"`).
  - An email address — sent directly (rarely used).
- `title` (string): Subject line / notification title.
- `template` (string): Message body with `{{fieldName}}` references. MUST be non-empty.
  Can use `{{trigger_input._user_context.<key>}}` for person information (name, email, department, etc.).

**CRITICAL RULES:**
- `recipient` MUST be non-empty. NEVER leave it blank or use `"-- Select Field --"`.
- `template` MUST be a rich, informative, business-friendly message.
- ALWAYS reference SPECIFIC scalar fields (e.g., `{{parsedData.totalAmount}}`). NEVER dump entire objects/arrays.
- Use variable interpolation: `{{fieldName}}` for form fields, `{{parsedData.fieldName}}` for AI output.
- Write as if writing to a professional colleague — warm, clear, and complete.

### 5) Request Approval — `approval`
Pause the workflow until someone approves or rejects.

Config (`approval.config`):
- `message` (string): What needs to be approved (business-friendly).
- `assignee_source` (string): How to find the approver:
  - `"platform_user"` — A specific person (static).
  - `"user_directory"` — Resolve dynamically from org hierarchy (RECOMMENDED).
  - `"platform_role"` — Anyone with a specific role.
  - `"platform_group"` — Anyone in a specific group.
  - `"tool"` — Resolve via a configured tool.
- `assignee_type` (string): `"user"` | `"role"` | `"group"`.
- `assignee_ids` (array): User/role/group IDs (can be empty for dynamic resolution).
- `timeout_hours` (number): Hours before timeout (default: 24).

**When `assignee_source` is `"user_directory"` (RECOMMENDED for organizational hierarchy):**
- `directory_assignee_type` (string):
  - `"dynamic_manager"` — Direct manager/supervisor of the requester.
  - `"department_manager"` — Department head.
  - `"management_chain"` — Higher management (skip-level). Set `management_level` (2=next level, 3=above that).
  - `"role"` — Role-based. Set `role_ids: ["<role_id>"]`.
  - `"group"` — Group/team/committee. Set `group_ids: ["<group_id>"]`.
  - `"department_members"` — All members of a department. Set `assignee_department_name: "<name>"` (RECOMMENDED) or `assignee_department_id`.
  - `"expression"` — Dynamic from form field. Set `expression: "{{trigger_input.fieldName}}"`.

**IMPORTANT:**
- ALWAYS prefer `"user_directory"` over `"platform_user"` when the approval follows organizational hierarchy.
- Approval nodes have built-in notification — they automatically notify the assignee. Only add a separate notification for OTHER people (like the requester).
- For sequential multi-level approvals, use MULTIPLE approval nodes in sequence.

---

## Category: Intelligence

### 6) AI Step — `ai`
Use AI to analyze data, extract information, generate content, classify, or perform any intelligent task.

Config (`ai.config`):
- `prompt` (string): Task description ONLY — what the AI should do. Reference data with `{{fieldName}}`.
- `instructions` (array of strings): Individual rules/constraints the AI must follow. Each string is one rule.
- `creativity` (integer 1-5): 1=Very strict (for extraction), 3=Balanced, 5=Creative.
- `confidence` (integer 1-5): 1=Very cautious (leaves unknowns null), 3=Balanced, 5=Always fills a value.
- `model` (string): AI model (default: `"gpt-4o"`).
- `aiMode` (string): Determines what the AI step does (see modes below).
- `outputFields` (array): Named output fields the AI produces. Each:
  `{ "label": "Human Name", "name": "camelCaseKey", "type": "<type>" }`
  Types: `text` | `number` | `date` | `currency` | `email` | `boolean` | `list`.
- `output_variable` (string): Variable name to store the AI result (e.g., `"parsedData"`).
- `enabledToolIds` (array): Optional — IDs of platform tools the AI can call during execution.

**CRITICAL — prompt vs instructions separation:**
- `config.prompt` = ONLY the task description (what to do, with `{{field}}` refs).
- `config.instructions` = Array of individual rule strings (constraints, formatting, guardrails).
- NEVER put rules inside `prompt`. ALWAYS use the `instructions` array.

**AI Modes (`config.aiMode`):**

**1. `"extract_file"` — Extract data from a file or image:**
- `sourceField` (string): File field name from the form.
- `prompt`: Describe what data to extract.
- `outputFields`: Array of typed fields the AI will extract.
- `creativity`: Set to 1 (strict extraction).
- Supports ALL file types: PDF, Word, Excel, images (receipts, IDs, photos), and more.
- For multi-file uploads (`multiple: true`): the engine processes ALL files automatically.

**2. `"batch_files"` — Analyze & calculate across multiple files:**
- `sourceFields` (array of strings): File field names to include (e.g., `["invoices", "receipts"]`).
- `prompt`: What to calculate or analyze across all files.
- `outputFields`: Typed output fields for the calculation results.
- The engine reads ALL files from all selected fields and sends their contents to the AI.
- Use for cross-file calculations: sums, comparisons, aggregations, trend analysis.

**3. `"create_doc"` — Generate a document:**
- `docTitle` (string): Document title.
- `docFormat` (string): `"docx"` | `"pdf"` | `"xlsx"` | `"pptx"` | `"txt"`.
- `prompt`: What the document should contain (can use `{{fieldName}}` refs).

**4. `"analyze"` — Analyze or summarize data.**
**5. `"generate"` — Generate content (emails, reports, text).**
**6. `"classify"` — Classify or categorize items.**
**7. `"custom"` — Custom AI task (default).**

For modes 4-7: use `prompt`, `instructions`, `outputFields`, `creativity`, `confidence` as described above.

**Connected Tools (optional — any AI mode):**
- `enabledToolIds` (array of strings): IDs of platform tools the AI can call during execution.
- When connected, the AI can invoke these tools to fetch real-time data, query databases, call APIs, etc.
- The AI autonomously decides when and how to use each tool based on the task.
- Use when the AI needs live data or must interact with external systems during its work.

Note: `read_document` and `create_document` are legacy node types automatically converted to AI modes.

---

## Category: Logic

### 7) Decision — `condition`
Route the workflow based on one or more business rules (yes/no).

Config (`condition.config`):
- `rules` (array): One or more rules to evaluate. Each rule has:
  - `field` (string): The field or variable to evaluate (e.g., `"totalAmount"`, `"parsedData.category"`).
  - `operator` (string): Comparison operator (see table below).
  - `value` (string|number): The value to compare against (leave empty for `is_empty`/`is_not_empty`).
- `connectors` (array, optional): Connectors between rules. Each item is `"and"` or `"or"`. Length must be `rules.length - 1`.
  - Mixed logic is allowed. The engine evaluates with standard precedence: AND groups are evaluated before OR groups.
  - If omitted, the system defaults to AND between rules.
- Legacy compat fields: `field`, `operator`, `value` (mirror the first rule).

**Available Operators:**

| Operator | Meaning |
|----------|---------|
| `equals` | Is equal to |
| `not_equals` | Is not equal to |
| `greater_than` | Is greater than |
| `less_than` | Is less than |
| `contains` | Contains (text) |
| `not_contains` | Does not contain |
| `starts_with` | Starts with |
| `is_empty` | Is empty / null |
| `is_not_empty` | Has a value |

**Examples:**
- Single rule: `"rules": [{"field":"totalAmount","operator":"less_than","value":"500"}]`
- Multi-rule AND: `"rules": [{"field":"amount","operator":"greater_than","value":"1000"},{"field":"department","operator":"equals","value":"Finance"}], "connectors":["and"]`
- Multi-rule OR: `"rules": [{"field":"priority","operator":"equals","value":"urgent"},{"field":"amount","operator":"greater_than","value":"5000"}], "connectors":["or"]`
- Mixed: `"rules": [{"field":"isVIP","operator":"equals","value":"true"},{"field":"amount","operator":"less_than","value":"100"},{"field":"department","operator":"equals","value":"Finance"}], "connectors":["or","and"]`

Connection rules: MUST have exactly two outgoing edges — `type: "yes"` and `type: "no"`.
Layout: "yes" path goes LEFT (x - 300), "no" path goes RIGHT (x + 300). Both reconverge to a shared node below.

### 8) Run in Parallel — `parallel`
Execute multiple paths simultaneously. All connected next steps run at the same time.

Config (`parallel.config`):
- Branches are automatically determined from connections — no manual branch configuration needed.
- `merge_strategy` (string): `"wait_all"` (default — wait for all paths) | `"wait_any"` (continue when any finishes).

Usage: Connect this node to multiple next steps. All connected paths run simultaneously.
Layout: Place parallel branches side by side, each offset by ±300px horizontally.

### 9) Call Process — `call_process`
Invoke another published process as a sub-step.

Config (`call_process.config`):
- `processId` (string): ID of the published process to invoke. MUST match an ID from the platform's published processes list.
- `inputMapping` (object): Map current process data to the sub-process inputs. Keys = sub-process field names, values = `{{currentProcessField}}` references.
- `outputVariable` (string): Variable name to store the sub-process result.

IMPORTANT: NEVER invent process IDs. Only use IDs from the PUBLISHED PROCESSES list.

---

## Category: Data

### 10) Calculate — `calculate`
Compute a value, transform data, or apply a formula.

Config (`calculate.config`):
- `operation` (string): `"sum"` | `"average"` | `"count"` | `"concat"` | `"custom"`.
- `expression` (string): Formula with `{{fieldName}}` references (e.g., `"{{parsedData.totalAmount}} * 1.05"`).
- `dataLabel` (string): Friendly name for the result (shown in the UI).
- `output_variable` (string): Store the computed result for later steps.

---

## Category: Integration

### 11) Connect to System — `tool`
Use a platform-configured tool or API to send/receive data.

Config (`tool.config`):
- `toolId` (string): Must match an available tool ID from the platform's tools list.
- `params` (object): Arguments with `{{fieldName}}` references mapped to the tool's input parameters.
- `output_variable` (string): Store the tool response for later steps.

---

## Decision Guide

| Need | Shape | Key Config |
|------|-------|------------|
| Collect input from a person | Collect Information (`form`) | `fields` array |
| Run process on a timer | Start (`trigger`) | `triggerType: "schedule"`, `cron` |
| Receive external HTTP trigger | Start (`trigger`) | `triggerType: "webhook"` |
| Yes/no decision | Decision (`condition`) | `field`, `operator`, `value` |
| Route by amount threshold | Decision (`condition`) | `field: "amount"`, `operator: "greater_than"` |
| Run steps simultaneously | Run in Parallel (`parallel`) | Connect to multiple next steps |
| Invoke another published process | Call Process (`call_process`) | `processId`, `inputMapping` |
| Extract data from files/images | AI Step (`ai`) | `aiMode: "extract_file"`, `sourceField` |
| Calculate across multiple files | AI Step (`ai`) | `aiMode: "batch_files"`, `sourceFields` |
| Generate a document | AI Step (`ai`) | `aiMode: "create_doc"`, `docTitle`, `docFormat` |
| Analyze / summarize | AI Step (`ai`) | `aiMode: "analyze"`, `prompt` |
| Generate content | AI Step (`ai`) | `aiMode: "generate"`, `prompt` |
| Classify / categorize | AI Step (`ai`) | `aiMode: "classify"`, `prompt` |
| Custom AI task | AI Step (`ai`) | `aiMode: "custom"`, `prompt` |
| Compute totals, averages, formulas | Calculate (`calculate`) | `operation`, `expression` |
| Call external system or API | Connect to System (`tool`) | `toolId`, `params` |
| Get someone's approval | Request Approval (`approval`) | `assignee_source`, `message` |
| Multi-level approval chain | Multiple approvals in sequence | Chain approval nodes |
| Auto-approve under conditions | Decision → skip approval | Condition checks threshold |
| Send email/Slack/Teams/SMS | Send Message (`notification`) | `channel`, `recipient`, `template` |
| End the workflow | Finish (`end`) | `output` |

## Variable Reference Syntax

| Source | Syntax | Example |
|--------|--------|---------|
| Form field | `{{fieldName}}` | `{{amount}}`, `{{employeeEmail}}` |
| AI output | `{{outputVar.fieldName}}` | `{{parsedData.totalAmount}}` |
| Tool output | `{{outputVar.fieldName}}` | `{{toolResult.record}}` |
| Calculate output | `{{outputVar}}` | `{{taxAmount}}` |
| User profile | `{{trigger_input._user_context.<key>}}` | `{{trigger_input._user_context.display_name}}` |
| Sub-process output | `{{outputVar.fieldName}}` | `{{subResult.status}}` |

## Deprecated Shapes (backward compatibility only)

These shapes are NOT available in the palette but old processes using them will still load and execute:
- **Wait** (`delay`) — Use schedule triggers or approval timeouts instead.
- **Repeat** (`loop`) — Use an AI Step to handle iteration logic internally.
- **Action** (`action`) — Replaced by purpose-specific shapes (AI Step modes, Calculate).
- **Read File** (`read_document`) — Now AI Step mode `extract_file`.
- **Create Document** (`create_document`) — Now AI Step mode `create_doc`.

## Anti-Hallucination Rules

### Node & Schema Rules
- NEVER invent node types not listed here.
- NEVER invent field types not listed here.
- NEVER use deprecated types in new processes.
- Every `condition` node MUST have exactly two outgoing edges (`yes` and `no`).
- Every workflow MUST have exactly ONE Start and exactly ONE Finish.
- The Finish node MUST be the last entry in the nodes array.

### Data Integrity Rules
- AI steps parsing extracted text MUST only return data explicitly present in the input.
- NEVER invent, fabricate, or estimate values.
- When multiple files are provided, aggregate data from ALL files.
- AI `outputFields` MUST list every field that downstream steps reference.

### Identity & Recipient Rules
- NEVER add form fields for manager email/name/ID — the engine resolves these automatically.
- For notifications to the requester: use `"requester"`.
- For notifications to the manager: use `"manager"`.
- Use `{{trigger_input._user_context.<key>}}` for any user profile attribute in templates.
- ALWAYS prefill user profile data — never ask users to type what the system knows.

### Published Processes & Tools Rules
- NEVER invent process IDs or tool IDs — only use IDs from the provided lists.
- If no published processes/tools exist, do NOT create call_process/tool nodes.
- Parameter names MUST match the tool's `input_parameters` exactly.

### User Profile Data (Dynamic — Unlimited Fields)
The platform loads ALL available user profile fields dynamically from the configured identity source.
Standard fields: name, email, phone, jobTitle, employeeId, departmentName, managerName, managerEmail, directReportCount, isManager.
Custom fields: Any attribute configured in the organization's HR system, LDAP, or identity provider (e.g., costCenter, officeLocation, badgeNumber, nationalId, hireDate).
All profile fields are available for:
- Form field prefill (`prefill.key`)
- Person Information in notification/approval/AI templates (`{{trigger_input._user_context.<key>}}`)
