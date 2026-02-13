# Process Builder Knowledge Base — AI Settings (Workflow-Level)

The **AI Settings** panel (🧠 button in toolbar) lets the process owner configure how ALL AI steps in the workflow behave. These settings are saved with the workflow and applied at runtime.

## Settings Overview

### 1. AI Instructions (Text)
Custom rules injected into every AI step's system prompt. These override or supplement the AI-generated defaults.

**Use cases:**
- Enforce business rules: "Always extract amounts in AED currency"
- Add constraints: "Ignore expenses under 10 AED"
- Control formatting: "Report all dates in DD/MM/YYYY format"
- Domain-specific guidance: "Vendor names should be the company name, not the brand"

**How it works:** At runtime, the instructions are appended to each AI node's system prompt as:
```
=== WORKFLOW RULES (set by the process owner — MUST follow) ===
<user's instructions here>
=== END WORKFLOW RULES ===
```
The AI treats these as mandatory rules it must follow.

### 2. Creativity (1–5 Slider)
Controls how much the AI infers beyond explicit data.

| Level | Label      | Temperature | Behavior |
|-------|-----------|-------------|----------|
| 1     | Very Strict | 0.1        | Extracts only exactly what it sees, never infers |
| 2     | Strict      | 0.2        | Minimal inference, sticks to explicit data |
| 3     | Balanced    | 0.4        | Follows data closely with light inference |
| 4     | Moderate    | 0.6        | Makes reasonable inferences from context |
| 5     | Creative    | 0.8        | Infers missing data from context and patterns |

**Best practice:** Use 1–2 for data extraction/parsing workflows, 3–4 for content generation.

### 3. Confidence (1–5 Slider)
Controls how the AI handles uncertain or ambiguous data.

| Level | Label          | Behavior |
|-------|---------------|----------|
| 1     | Very Cautious  | Marks anything uncertain as empty (null) |
| 2     | Cautious       | Only fills values it is fairly sure about |
| 3     | Balanced       | Reasonable judgment for ambiguous values |
| 4     | Confident      | Makes best-guess decisions for ambiguous data |
| 5     | Very Confident | Always provides a value, even with limited data |

**Best practice:** Use 1–2 for financial/compliance workflows, 3–4 for general workflows.

## How the AI Generator Uses These Settings

When the AI wizard generates a workflow:
1. It detects whether the workflow contains data extraction (AI nodes with output variables)
2. It sets **Creativity = 2** (Strict) for extraction-heavy workflows, **3** (Balanced) otherwise
3. It sets **Confidence = 3** (Balanced) as the default
4. **Instructions** are left empty — the user fills them if needed

The user can change these at any time from the AI Settings panel before or after testing.

## Interaction with Node-Level Settings

- **AI Instructions** apply to ALL AI nodes in the workflow
- **Creativity** sets the default temperature, but individual AI nodes can override it (if the node has an explicit temperature in its config, that takes precedence)
- **Confidence** adds a confidence rule to the system prompt of ALL AI nodes

Node-level system prompts and workflow-level instructions are COMBINED (not replaced).
