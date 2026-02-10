# Process Builder Knowledge Base — Shapes & Capabilities (v1)
This document describes what the platform **can** build in the visual Process Builder.
It is intended to ground the LLM so it does **not** invent unsupported steps or properties.

## Guiding principles (anti-hallucination)
- Only use shapes listed here.
- Only use properties listed here for each shape.
- If a required value (like dropdown options) is not known from this KB, org settings, or tools, prefer a **free-text field** rather than guessing.

## Visual Builder shapes (business-friendly)

### 1) Start (Trigger/Form) — `trigger`
Purpose: collect input and define how the workflow starts.

Supported start modes (stored in `trigger.config.triggerType`):
- `manual`: user fills a form and starts the workflow
- `schedule`: workflow runs on a schedule
- `webhook`: workflow starts from an incoming HTTP request

Common properties (all optional except `fields` for manual):
- `formTitle` (string): form title shown to users
- `submitText` (string): submit button label
- `fields` (array): input fields shown to user (required for `manual`)
- `cron` (string): cron expression (for `schedule`)
- `timezone` (string): e.g. `UTC` (for `schedule`)
- `method` (string): `POST` / `GET` (for `webhook`)
- `path` (string): webhook path (for `webhook`)

Field schema (each item in `fields`):
- `name` (lowerCamelCase, internal key)
- `label` (string, business-friendly)
- `type` (`text` | `textarea` | `number` | `date` | `email` | `select` | `file`)
- `required` (boolean)
- `placeholder` (string)
- `options` (array of strings) — only for `select`
- `optionsSource` (string) — only for `select`, required when using a dropdown:
  - `taxonomy:<taxonomyId>` (preferred), e.g. `taxonomy:leaveType`
  - `tool:<toolId>` (when options come from a tool)
- `readOnly` (boolean) — for derived/prefilled fields
- `derived` (object) — for derived fields: `{ "expression": "daysBetween(startDate, endDate)" }`
- `prefill` (object) — for profile prefill: `{ "source": "currentUser", "key": "email" }`

Derived expressions (allowed functions):
- `daysBetween(startDate, endDate)` → number
- `concat(a, " ", b)` → string
- `sum(a, b, c...)` → number
- `round(value, decimals)` → number

### 2) Decision (If/Else) — `condition`
Purpose: route to one of two paths.

Properties (`condition.config`):
- `field` (string): a start field key
- `operator` (`equals` | `not_equals` | `greater_than` | `less_than` | `contains` | `is_empty`)
- `value` (string|number)

Connections:
- MUST have exactly two outgoing edges:
  - `type: "yes"`
  - `type: "no"`

### 3) AI Step — `ai`
Purpose: use the configured LLM to generate text/insights/structured output.

Properties (`ai.config`):
- `prompt` (string): business-friendly instructions; can reference fields via `{{fieldKey}}`
- `model` (string): e.g. `gpt-4o`

Optional:
- `output_variable` (string): where to store the result (e.g., `result`)

### 4) Tool Step — `tool`
Purpose: call a platform-configured tool (API, DB, knowledge base, etc.)

Properties (`tool.config`):
- `toolId` (string): must match an available tool ID
- `params` (object): arguments for the tool; may reference variables via `{{fieldKey}}`

Optional:
- `output_variable` (string)

### 5) Approval — `approval`
Purpose: pause until an approver approves/rejects.

Properties (`approval.config`):
- `message` (string): what needs approval (business-friendly)
- `assignee_source` (string): `platform_user` | `role` | `group` | `tool`
- `assignee_type` (string): `user` | `role` | `group`
- `assignee_ids` (array of strings): user/role/group ids (can be empty if source=tool)
- `timeout_hours` (number)

### 6) Notification — `notification`
Purpose: send message to user (email/slack/teams/sms).

Properties (`notification.config`):
- `channel` (string): `email` | `slack` | `teams` | `sms`
- `recipient` (string): can be `{{employeeEmail}}` or fixed email
- `template` (string): message body; can reference variables

### 7) Wait — `delay`
Purpose: delay execution.

Properties (`delay.config`):
- `duration` (number)
- `unit` (string): `seconds` | `minutes` | `hours` | `days`

### 8) End — `end`
Purpose: finish workflow.

Properties (`end.config`):
- `output` (string): `""` to output all variables; or `{{someVar}}` for single value

### 9) Advanced Action (internal) — `action`
Purpose: represent an advanced engine capability while keeping UI business-friendly.
Use only when needed and keep it editable via friendly properties (no raw JSON).

Properties (`action.config`):
- `actionType` (string): `httpRequest` | `runScript` | `transformData` | `fileOperation` | `generateDocument`
- Additional properties depend on `actionType` (see other KB docs).

## Notes on tools and dropdown options
- Use dropdown fields only when options are known from:
  - this KB (taxonomies), or
  - org settings, or
  - a configured tool that returns allowed values.
- Otherwise, use a text field.

