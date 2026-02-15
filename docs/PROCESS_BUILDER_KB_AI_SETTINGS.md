# Process Builder — AI Step Configuration (Instructions, Creativity, Confidence, Output Fields) (v4)

## AI Node Config Schema

Every `"type": "ai"` node supports these configuration properties alongside `prompt` and `model`:

```json
{
  "type": "ai",
  "name": "Parse Document Data",
  "config": {
    "prompt": "Extract structured data from: {{extractedText}}. Identify all relevant fields based on the document type.",
    "model": "gpt-4o",
    "output_format": "json",
    "instructions": [
      "Only extract data EXPLICITLY present in the text — never invent values",
      "If a value is unclear, set it to null",
      "Return amounts as numbers, not strings"
    ],
    "creativity": 2,
    "confidence": 3,
    "outputFields": [
      {"label": "<Friendly Name>", "name": "<camelCaseKey>"},
      {"label": "<Friendly Name>", "name": "<camelCaseKey>"}
    ]
  },
  "output_variable": "parsedData"
}
```

> **Note:** `outputFields` are always dynamic — the fields are determined by the specific workflow's business context. The wizard infers them from the user's goal and what downstream steps need.

## Prompt vs Instructions — Separation Rule

| Field | Purpose | Content |
|-------|---------|---------|
| `config.prompt` | **Task description only** — what the AI should do | "Extract expense data from {{extractedData}}..." |
| `config.instructions` | **Array of individual rules** — constraints and guardrails | Each string is one rule the AI must follow |

### Rules:
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
  "prompt": "Analyze customer feedback from: {{feedbackText}}. IMPORTANT: Classify sentiment as positive, negative, or neutral only. Do NOT extract more than 5 themes. If language is ambiguous, default to neutral. Always return results in English.",
  "instructions": []
}
```

## Instructions (Array of Strings)

Each instruction is a separate rule displayed as an individual item in the UI. Users see numbered rules with add/remove controls.

### When Generating Instructions:
- For **data extraction** steps: include anti-hallucination rules, data format rules, handling of unclear values
- For **content generation** steps: include tone/style rules, length constraints, format requirements
- For **classification** steps: include the valid categories, default behavior for edge cases
- For **any step**: include business-specific rules relevant to the workflow's domain

### Default Instructions for Common Patterns:

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

## Creativity (Integer 1-5)

Controls how much the AI infers beyond the explicit data. Mapped to LLM temperature.

| Level | Label | Temperature | Best For |
|-------|-------|-------------|----------|
| 1 | Very strict | 0.1 | Exact data extraction, OCR parsing |
| 2 | Strict | 0.2 | Data extraction with minimal inference |
| 3 | Balanced | 0.4 | General tasks, moderate inference |
| 4 | Moderate | 0.6 | Content generation, summarization |
| 5 | Creative | 0.8 | Creative writing, brainstorming |

### Default values when generating:
- OCR/document extraction (after `read_document`): **creativity = 1** (Very strict — never hallucinate extracted data)
- Other extraction/parsing steps with `output_variable`: **creativity = 2** (Strict)
- General AI steps: **creativity = 3** (Balanced)

## Confidence (Integer 1-5)

Controls how the AI handles uncertain or ambiguous data. Injected as a `CONFIDENCE RULE:` in the system prompt.

| Level | Label | Behavior |
|-------|-------|----------|
| 1 | Very cautious | Leaves unknowns empty (null). Never guesses. |
| 2 | Cautious | Only fills values it's fairly sure about. |
| 3 | Balanced | Uses reasonable judgment for ambiguous values. |
| 4 | Confident | Makes best-guess decisions for ambiguous data. |
| 5 | Very confident | Always provides a value, even with limited data. |

### Default value when generating: **confidence = 3** (Balanced)

## Output Fields (Array of Objects)

Defines the individual data fields the AI step will produce. Each field gets a friendly label and a camelCase key.
These fields appear as **selectable options** in all downstream steps (conditions, notifications, AI prompts, approvals, etc.) — just like form input fields.

### Schema

```json
"outputFields": [
  {"label": "Human Readable Name", "name": "camelCaseKey"}
]
```

### How it Works

- Each output field maps to a nested path: `{{output_variable.fieldName}}` (e.g., `{{parsedData.amount}}`)
- Downstream steps show these as clickable chips — users never need to type `{{variable.field}}` syntax
- Fields are **fully dynamic** — determined by the business context of each workflow, never hardcoded
- The wizard auto-generates outputFields from downstream references during normalization
- Users can add/remove fields manually from the AI step's properties panel

### When Generating outputFields

- **ALWAYS** derive fields from the workflow's business purpose — never use a fixed set
- Include every field that downstream conditions, notifications, or approvals will reference
- For multi-file workflows, include aggregate fields (totals, counts, item arrays) as appropriate
- Label should be business-friendly (what a non-technical user would understand)
- Name should be camelCase (the technical key used in variable interpolation)

## How the Engine Applies These at Runtime

1. **Instructions**: Joined with bullet points and injected into the system prompt inside a `=== STEP RULES ===` block.
2. **Creativity**: Mapped to LLM `temperature` parameter. Only applies if the node doesn't have an explicit `temperature` in config.
3. **Confidence**: Adds a `CONFIDENCE RULE:` instruction to the system prompt with the corresponding behavior.
4. **Output Fields**: Stored in the node's `config.outputFields` array. The visual builder reads these to populate downstream step dropdowns and chips. The wizard normalization auto-generates them from downstream field references.

All properties are stored in the node's `config` object and persist with the process definition — no separate storage needed.
