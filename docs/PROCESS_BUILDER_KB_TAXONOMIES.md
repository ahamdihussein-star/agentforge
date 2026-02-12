# Process Builder Knowledge Base — Dropdown Options & Taxonomies (v2)

This document defines rules for when and how to use dropdown (select) fields in workflows.

## Core Rule: Do NOT Hardcode Options

The platform serves ANY type of organization (enterprise, government, healthcare, education, etc.)
building ANY type of process. Dropdown options MUST come from one of these sources:

1. **Organization's configured tools** — If a tool provides a list of valid options, use `optionsSource: "tool:<toolId>"`.
2. **Organization's taxonomy configuration** — If the platform has a taxonomy configured, use `optionsSource: "taxonomy:<taxonomyId>"`.
3. **The user's goal description** — If the user explicitly lists the options they want in their process description, use those exact options.
4. **Universal/generic options** — Only use universally understood options that apply to ANY organization (e.g., Yes/No, Approve/Reject, High/Medium/Low priority).

## When to Use a Dropdown vs. Free Text

| Scenario | Use |
|----------|-----|
| Options are explicitly provided by the user in their goal | `select` with those options |
| Options come from a configured tool | `select` with `optionsSource: "tool:<id>"` |
| Options come from a configured taxonomy | `select` with `optionsSource: "taxonomy:<id>"` |
| Options are universally standard (yes/no, approve/reject) | `select` with those options |
| Options are organization-specific and NOT provided | `text` field — let the user type freely |
| You're unsure whether options exist | `text` field — NEVER guess |

## Universally Safe Options (can be used without org-specific knowledge)

These are generic options that apply universally across all organizations:

- **Priority**: Low, Medium, High, Urgent
- **Binary choice**: Yes, No
- **Approval outcome**: Approve, Reject
- **Status**: Pending, In Progress, Completed, Cancelled

Any other option list (department names, job titles, category names, product lists, service types,
location names, etc.) is organization-specific and MUST NOT be invented.

## Anti-Hallucination Rules
- NEVER invent organization-specific lists (departments, teams, products, services, locations, etc.).
- NEVER assume what types of categories an organization has.
- If the user mentions specific options in their goal (e.g., "leave types: annual, sick, personal"), use those exact options.
- If no options are specified and no tool/taxonomy provides them, use a free-text field.
- When in doubt, a text field is ALWAYS the safer choice.
