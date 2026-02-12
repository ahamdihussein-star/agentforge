# Process Builder Knowledge Base — Dropdown Options & Taxonomies (v2)

This document defines rules for when and how to use dropdown (select) fields in workflows.

## Core Principle: Smart Dropdowns

The LLM is an intelligent assistant with deep business and industry knowledge.
When generating a process, dropdown fields should provide **useful, meaningful options**
that make the user's life easier — not empty or overly generic lists.

## Option Sources (in order of priority)

1. **User-provided options** — If the user explicitly lists the options in their prompt (e.g., "leave types: annual, sick, personal"), use those exact options.
2. **Organization's configured tools** — If a tool provides a list of valid options, use `optionsSource: "tool:<toolId>"`.
3. **Organization's taxonomy configuration** — If the platform has a taxonomy configured, use `optionsSource: "taxonomy:<taxonomyId>"`.
4. **LLM's business/industry knowledge** — For industry-standard or universally understood categories, the LLM MUST generate a comprehensive and practical list of options using its own expertise. This is the DEFAULT behavior when the user doesn't specify options and no tool/taxonomy exists.

## When to Use a Dropdown vs. Free Text

| Scenario | Use |
|----------|-----|
| Options are explicitly provided by the user in their goal | `select` with those options |
| Options come from a configured tool | `select` with `optionsSource: "tool:<id>"` |
| Options come from a configured taxonomy | `select` with `optionsSource: "taxonomy:<id>"` |
| The field has standard/industry options the LLM can infer | `select` — LLM populates from its knowledge |
| The field is truly unique to the organization AND cannot be reasonably inferred | `text` field |
| The field is a person's name, free-form description, or unique identifier | `text` field |

## LLM-Generated Options — Guidelines

The LLM should confidently populate dropdown options for categories that are **industry-standard or universally understood**. Examples include (but are NOT limited to):

- **Priority**: Low, Medium, High, Urgent/Critical
- **Approval outcome**: Approve, Reject, Request More Info
- **Status**: Pending, In Progress, Completed, Cancelled
- **Expense categories**: Travel, Meals & Entertainment, Office Supplies, Software & Subscriptions, Transportation, Accommodation, Training & Education, Communication, Equipment, Other
- **Leave types**: Annual Leave, Sick Leave, Personal Leave, Maternity/Paternity Leave, Bereavement Leave, Unpaid Leave, Other
- **Urgency/SLA**: Immediate, Within 24 Hours, Within 3 Days, Within a Week, No Rush
- **Currencies**: AED, USD, EUR, GBP, SAR, EGP, etc. (based on context)
- **Payment methods**: Cash, Credit Card, Bank Transfer, Company Card, Petty Cash
- **Document types**: Invoice, Receipt, Contract, Report, Proposal, Certificate, Other
- **Risk levels**: Low, Medium, High, Critical
- **Satisfaction ratings**: Very Satisfied, Satisfied, Neutral, Dissatisfied, Very Dissatisfied

The above are EXAMPLES — the LLM should generate appropriate options for ANY domain it understands. The key principle: **if a reasonable business person would expect a dropdown here, create one with sensible options.**

## Anti-Hallucination Rules

- NEVER invent **organization-specific** lists (specific department names, employee names, internal product catalogs, internal project codes, or customer-specific data unique to one company).
- If the user mentions specific options in their goal, use those EXACT options — do not add or remove from them.
- For industry-standard categories (expense types, leave types, priorities, currencies, etc.), the LLM IS the expert and SHOULD generate a comprehensive list. This is NOT hallucination — this is applied knowledge.
- When a field is truly about organization-specific data that cannot be inferred (e.g., "which internal project?", "which client name?"), use a `text` field.
- The distinction is clear: **universal/industry knowledge = LLM generates options** vs. **organization-specific data = text field or tool/taxonomy source**.
