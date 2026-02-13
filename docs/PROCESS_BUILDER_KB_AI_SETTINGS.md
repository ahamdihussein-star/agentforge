# Process Builder — Per-Step AI Settings

## Overview
Each **AI action step** in a workflow has its own AI Settings in the step's properties panel.
When a user clicks on any AI step, they see **Instructions**, **Creativity**, and **Confidence** controls right alongside the prompt and model selection.

This means different steps can have different settings. For example:
- A **data-extraction** step can be set to Strict creativity (2) and Cautious confidence (2).
- A **summary-generation** step can be set to Creative (4) and Confident (4).

## Settings

### 1. Instructions (textarea)
Free-text rules that get injected into the AI's system prompt for **this specific step**.

**Examples:**
- "Always extract amounts in AED currency"
- "If vendor name is unclear, use 'Unknown Vendor'"
- "Ignore expenses under 10 AED"
- "Dates must be in DD/MM/YYYY format"

### 2. Creativity (slider 1-5)
Controls how much the AI infers beyond explicit data.

| Level | Label | Temperature | Best for |
|-------|-------|-------------|----------|
| 1 | Very strict | 0.1 | Exact data extraction |
| 2 | Strict | 0.2 | Data extraction with minimal inference |
| 3 | Balanced | 0.4 | General tasks |
| 4 | Moderate | 0.6 | Content generation |
| 5 | Creative | 0.8 | Creative writing, brainstorming |

### 3. Confidence (slider 1-5)
Controls how the AI handles uncertain or ambiguous data.

| Level | Label | Behavior |
|-------|-------|----------|
| 1 | Very cautious | Leaves unknowns empty (null) |
| 2 | Cautious | Only fills values it's sure about |
| 3 | Balanced | Reasonable judgment |
| 4 | Confident | Best-guess for ambiguous data |
| 5 | Very confident | Always fills a value |

## How the AI Generator Uses These

When the wizard generates a workflow, it automatically sets sensible defaults on each AI node:
- **Steps with data output** (extraction): Creativity = 2 (Strict), Confidence = 3 (Balanced)
- **General AI steps**: Creativity = 3 (Balanced), Confidence = 3 (Balanced)

Users can then adjust these per step in the properties panel.

## Technical: How Settings Are Applied

1. **Instructions** are appended to the step's system prompt inside a `=== STEP RULES ===` block.
2. **Creativity** maps to the LLM `temperature` parameter (only if no explicit temperature is set on the node).
3. **Confidence** adds a `CONFIDENCE RULE:` instruction to the system prompt.

All three are stored in the node's `config` object (`config.instructions`, `config.creativity`, `config.confidence`), so they persist with the process definition — no separate storage needed.
