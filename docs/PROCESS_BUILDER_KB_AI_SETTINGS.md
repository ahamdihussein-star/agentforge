# Process Builder — AI Step Configuration (v5)

## AI Node Config Schema

Every `"type": "ai"` node supports these configuration properties:

```json
{
  "type": "ai",
  "name": "Parse Document Data",
  "config": {
    "aiMode": "extract_file",
    "sourceField": "uploadedDocument",
    "prompt": "Extract structured data from the uploaded document",
    "model": "gpt-4o",
    "instructions": [
      "Only extract data EXPLICITLY present in the text — never invent values",
      "If a value is unclear, set it to null",
      "Return amounts as numbers, not strings"
    ],
    "creativity": 1,
    "confidence": 3,
    "outputFields": [
      {"label": "Title", "name": "docTitle", "type": "text"},
      {"label": "Total Amount", "name": "totalAmount", "type": "currency"},
      {"label": "Date", "name": "documentDate", "type": "date"}
    ],
    "enabledToolIds": []
  },
  "output_variable": "parsedData"
}
```

## Prompt vs Instructions — Separation Rule (MANDATORY)

| Field | Purpose | Content |
|-------|---------|---------|
| `config.prompt` | **Task description only** — what the AI should do | "Extract structured data from the uploaded document" |
| `config.instructions` | **Array of individual rules** — constraints and guardrails | Each string is one rule |

### Rules
- **NEVER** put rules, constraints, or "IMPORTANT:" directives inside `config.prompt`.
- **ALWAYS** put them as separate items in `config.instructions`.
- Each instruction is a single, clear rule — one concern per item.
- The engine injects all instructions into the AI's system prompt as a `=== STEP RULES ===` block automatically.
- Users can add, edit, or remove individual instructions from the step's properties panel.

### Good Example (separated):
```json
{
  "prompt": "Analyze customer feedback from: {{feedbackText}}. Categorize sentiment and extract key themes.",
  "instructions": [
    "Classify sentiment as positive, negative, or neutral only",
    "Extract a maximum of 5 key themes",
    "If language is ambiguous, default to neutral sentiment",
    "Return results in English regardless of input language"
  ]
}
```

### Bad Example (mixed — DO NOT do this):
```json
{
  "prompt": "Analyze customer feedback from: {{feedbackText}}. IMPORTANT: Classify sentiment as positive, negative, or neutral only. Do NOT extract more than 5 themes.",
  "instructions": []
}
```

## Instructions (Array of Strings)

Each instruction is a separate rule displayed as a numbered item in the UI.

### When Generating Instructions

| AI Task Type | Include These Instructions |
|-------------|---------------------------|
| **Data extraction** | Anti-hallucination rules, data format rules, null handling |
| **Content generation** | Tone/style rules, length constraints, format requirements |
| **Classification** | Valid categories, default for edge cases, confidence scoring |
| **Summarization** | Length limits, language, key facts requirement |
| **Batch analysis** | File counting rules, aggregation method, handling of missing data |
| **Document creation** | Structure, formatting, sections, language |

### Default Instructions for Common Patterns

**Data extraction from documents:**
```json
[
  "Only extract data that is EXPLICITLY present in the text — do NOT invent or estimate values",
  "Each file section (--- File: ... ---) is exactly ONE item — count carefully",
  "If a value is unclear or missing, omit it or set it to null",
  "Return amounts as numbers, not strings"
]
```

**Content summarization:**
```json
[
  "Keep the summary concise — maximum 3 paragraphs",
  "Use professional business language",
  "Include all key facts and figures from the source"
]
```

**Classification/routing:**
```json
[
  "Use only the categories provided — do not create new ones",
  "If uncertain between two categories, choose the more conservative option",
  "Always provide a confidence score between 0 and 1"
]
```

**Cross-file calculations:**
```json
[
  "Process data from EVERY file — do not skip any",
  "Calculate totals from actual extracted numbers only",
  "If a file cannot be read, report it in the output — do not silently ignore"
]
```

**Content generation (emails, reports):**
```json
[
  "Use professional, business-appropriate tone",
  "Keep the language clear and concise",
  "Include all relevant data points from the input"
]
```

## Creativity (Integer 1-5)

Controls how much the AI infers beyond the explicit data. Mapped to LLM temperature by the engine.

| Level | Label | Temperature | Best For |
|-------|-------|-------------|----------|
| 1 | Very strict | 0.1 | Exact data extraction, OCR parsing, document processing |
| 2 | Strict | 0.2 | Data extraction with minimal inference, form parsing |
| 3 | Balanced | 0.4 | General tasks, analysis, moderate inference |
| 4 | Moderate | 0.6 | Content generation, summarization, reports |
| 5 | Creative | 0.8 | Creative writing, brainstorming, marketing copy |

### Default Values When Generating

| Task | Creativity |
|------|-----------|
| File/image extraction (`aiMode: "extract_file"`) | **1** (Very strict) |
| Batch file analysis (`aiMode: "batch_files"`) | **1** (Very strict) |
| Other extraction/parsing with `output_variable` | **2** (Strict) |
| Classification / routing | **2** (Strict) |
| Analysis / summarization | **3** (Balanced) |
| Content generation / reports | **4** (Moderate) |
| General AI steps | **3** (Balanced) |

## Confidence (Integer 1-5)

Controls how the AI handles uncertain or ambiguous data. The engine injects a `CONFIDENCE RULE:` instruction into the system prompt.

| Level | Label | Engine Behavior |
|-------|-------|-----------------|
| 1 | Very cautious | "If ANY value is uncertain or ambiguous, leave it empty (null). Never guess." |
| 2 | Cautious | "Only fill in values you are fairly confident about. When in doubt, use null." |
| 3 | Balanced | "Use reasonable judgment for ambiguous values. Leave truly unclear data as null." |
| 4 | Confident | "Make your best-guess for ambiguous data based on context. Only use null for completely unknown values." |
| 5 | Very confident | "Always provide a value, even for ambiguous data. Use your best judgment and context clues. Never leave fields empty." |

### Default value: **3** (Balanced)

## Output Fields (Array of Objects)

Defines the individual data fields the AI step will produce.

### Schema
```json
"outputFields": [
  {"label": "Human Readable Name", "name": "camelCaseKey", "type": "text"}
]
```

### Supported Output Field Types

| Type | Description | Example Value |
|------|-------------|---------------|
| `text` | Free text | `"John Smith"` |
| `number` | Numeric value | `42`, `3.14` |
| `date` | Date value | `"2026-01-15"` |
| `currency` | Monetary amount | `1250.00` |
| `email` | Email address | `"john@example.com"` |
| `boolean` | Yes/No | `true`, `false` |
| `list` | Array of items | `["item1", "item2"]` |

### How Output Fields Work

- Each field maps to a nested path: `{{output_variable.fieldName}}` (e.g., `{{parsedData.totalAmount}}`).
- Downstream steps show these as clickable chips — users never type `{{variable.field}}` syntax.
- Fields are **fully dynamic** — determined by the business context of each workflow.
- The wizard auto-generates `outputFields` from downstream references during normalization.
- Users can add/remove fields manually from the AI step's properties panel.
- The engine performs **type coercion** on AI output to match declared types (e.g., strings → numbers, date parsing).

### Variable Wiring Rule (MANDATORY)

All downstream steps (conditions, notifications, approvals) MUST reference AI output fields using the full dot-notation path: `{{output_variable.fieldName}}`.

**Correct:**
- Condition field: `classificationResult.severity` (not just `severity`)
- Notification: `Severity: {{classificationResult.severity}}` (not `{{severity}}`)

**Wrong:**
- Condition field: `severity` ← This does NOT resolve to the AI output
- Notification: `{{severity}}` ← Empty at runtime because no form field named "severity" exists
- Condition field: `classificationResult.severity` when the AI node has `output_variable: "classifySeverity"` ← **Mismatched prefix** breaks the UI dropdown

Variables in conditions and notifications must ALWAYS come from one of:
1. A form/trigger input field name (direct, e.g., `{{supplierName}}`)
2. An AI step's `output_variable.fieldName` (dot-notation, e.g., `{{classificationResult.severity}}`)
3. A user context path (e.g., `{{trigger_input._user_context.display_name}}`)

**Variable Name Consistency (CRITICAL):** The `output_variable` name you choose for an AI node is the EXACT prefix that must appear in all downstream references. Never invent a different prefix. If the AI node has `output_variable: "classifySeverity"`, use `classifySeverity.severity` everywhere — not `classificationResult.severity`. A mismatch causes the condition to show as "Enter manually" instead of the user-friendly dropdown.

### When Generating outputFields

- **ALWAYS** derive fields from the workflow's business purpose — never use a fixed set.
- Include every field that downstream conditions, notifications, or approvals will reference.
- For multi-file workflows, include aggregate fields (totals, counts, item arrays) as appropriate.
- Label: business-friendly (what a non-technical user would understand).
- Name: lowerCamelCase (the technical key used in variable interpolation).
- Type: most specific type that matches the data (prefer `currency` over `number` for monetary values).

## Human Review (Optional)

AI steps support an optional `humanReview` flag that pauses the process after extraction/analysis for human verification:

```json
{
  "aiMode": "extract_file",
  "sourceField": "invoices",
  "prompt": "Extract invoice details...",
  "humanReview": true,
  "outputFields": [...]
}
```

When `humanReview: true`:
- After the AI completes extraction, the process **pauses** and creates a review task.
- The reviewer sees a **split-screen UI**: source documents on the left, extracted data (editable) on the right.
- If anomalies are detected (fields with names containing "anomaly", "discrepancy", "risk", "fraud", "mismatch", "warning"), they are highlighted with animated banners.
- The reviewer can **edit** any extracted value before confirming.
- Once confirmed, the process continues with the verified (potentially corrected) data.

**When to use `humanReview`:**
- Data extraction where accuracy is critical (financial documents, legal contracts, compliance evidence)
- Processes that detect anomalies and need human judgment
- Regulatory workflows requiring human verification before proceeding
- Any step where the user asks for review, verification, or confirmation of AI output

**When NOT to use:**
- Simple classification or routing decisions
- Auto-approved flows where speed matters
- Steps where human review would add unnecessary delay

## Connected Tools

AI steps can optionally connect to platform tools via `enabledToolIds`:

```json
{
  "aiMode": "custom",
  "prompt": "Research the customer and provide a summary",
  "enabledToolIds": ["tool_crm_api", "tool_knowledge_base"],
  "outputFields": [...]
}
```

When connected:
- The AI autonomously decides when and how to call each tool during execution.
- Tool calls happen in a loop (up to 5 rounds) until the AI has all the data it needs.
- The AI can call different tools in sequence, using results from one tool to query another.
- Runtime permission checks ensure the tool is still allowed for the user.

Only add `enabledToolIds` when the AI needs live data or external system interaction during its reasoning.

## How the Engine Applies These at Runtime

1. **Prompt**: Used as the user message to the LLM. Variable references (`{{fieldName}}`) are interpolated with actual values.
2. **Instructions**: Joined with bullet points and injected into the system prompt inside a `=== STEP RULES ===` block.
3. **Creativity**: Mapped to LLM `temperature` parameter. Only applies if the node doesn't have an explicit `temperature` in config.
4. **Confidence**: Adds a `CONFIDENCE RULE:` instruction to the system prompt with the corresponding behavior text.
5. **Output Fields**: Stored in `config.outputFields`. The visual builder reads these to populate downstream step dropdowns and chips. The engine generates an `output_schema` for structured JSON output.
6. **Connected Tools**: Resolved into OpenAI-format tool definitions. The LLM can call them during a tool-calling loop (max 5 rounds).
7. **Source Fields** (`batch_files`): Files from selected fields are read and their contents injected into the system prompt as `=== FILE CONTENTS ===` block.

All properties persist in the node's `config` object with the process definition — no separate storage needed.
