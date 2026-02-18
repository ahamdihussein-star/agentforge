# Process Builder Knowledge Base — Tools Integration & Dynamic Matching (v5)

This document teaches the AI wizard how to intelligently use configured platform tools
when generating process definitions from user prompts.

## What Are Tools?

Tools are external systems, APIs, databases, and services that organizations configure in the platform.
Each tool has:
- **id**: Unique identifier (used in `tool.config.toolId` or `ai.config.enabledToolIds`)
- **name**: Human-readable name (e.g., "SAP HR System", "Employee Database", "Slack Notifications")
- **type**: Category (`api`, `database`, `knowledge_base`, `email`, `website`)
- **description**: What the tool does
- **input_parameters**: What data the tool expects (parameters with names, types, descriptions)

## Two Ways to Use Tools

### 1. Tool Node (`tool`) — Direct tool call as a workflow step
Use when the tool call is a discrete workflow step: fetch data, send data, query a system.
The tool runs, returns results, and the workflow continues to the next step.

```json
{
  "type": "tool",
  "name": "Query External System",
  "config": {
    "toolId": "<matched tool id>",
    "params": {
      "<param_name>": "{{fieldName}}",
      "<param_name>": "fixed_value"
    }
  },
  "output_variable": "toolResult"
}
```

### 2. Connected Tools on AI Step (`ai.config.enabledToolIds`) — AI-driven tool calling
Use when the AI should autonomously decide when and how to call tools during its reasoning.
The AI can call multiple tools, chain results, and incorporate tool data into its analysis.

```json
{
  "type": "ai",
  "name": "Analyze with live data",
  "config": {
    "aiMode": "analyze",
    "prompt": "Analyze the request and check relevant systems",
    "enabledToolIds": ["tool_crm_api", "tool_hr_db"],
    "outputFields": [...]
  }
}
```

**When to use which:**

| Scenario | Use |
|----------|-----|
| Simple fetch data → use in next step | `tool` node |
| Simple send data to external system | `tool` node |
| AI needs data from tools during its reasoning | `ai` node with `enabledToolIds` |
| AI should decide which tools to call based on context | `ai` node with `enabledToolIds` |
| Multiple tool calls needed with AI-driven logic | `ai` node with `enabledToolIds` |
| Direct API call with known parameters | `tool` node |

## Tool Name Matching (CRITICAL)

When the user mentions a system, tool, or service by name:

### Matching Priority
1. **Exact name match** — User mentions the exact tool name.
2. **Keyword match** — User mentions key words in the tool name.
3. **Type/capability match** — User describes what they need and a tool's description matches.
4. **No match** — Do NOT create a tool node; use an AI step or notification instead.

### Examples

| User says | Match tool with name containing |
|-----------|-------------------------------|
| "use SAP" | "SAP" |
| "query the HR system" | "HR" |
| "connect to Salesforce" | "Salesforce" |
| "send via Slack" | "Slack" (or use notification node if no Slack tool) |
| "check the employee database" | "Employee" + "Database" |
| "use the knowledge base" | "Knowledge" |
| "verify in Active Directory" | "Active Directory" or "AD" |
| "update the CRM" | "CRM" |
| "call the ERP" | "ERP" |
| "check inventory" | "Inventory" |

## Parameter Mapping Rules

- Map tool `input_parameters` from available process data (form fields, upstream outputs, user context).
- Use `{{fieldName}}` syntax for dynamic values from the process.
- Use fixed values only when the parameter has a known constant.
- If a required parameter cannot be mapped, include it with an empty value (the user will configure it in the visual builder).
- ALWAYS set `output_variable` to store the tool response for downstream steps.

## Tool Type Guidelines

| Tool Type | Typical Use | Example |
|-----------|------------|---------|
| `api` | External REST API calls | CRM, ERP, HR system |
| `database` | Query organizational databases | Employee records, product catalog |
| `knowledge_base` | Search knowledge repositories | Company policies, FAQ, documentation |
| `email` | Send emails via external service | Transactional email service |
| `website` | Scrape or interact with web services | Price checker, status page |

## When NOT to Use a Tool

| Need | Use Instead |
|------|-------------|
| Send email/Slack/Teams/SMS | `notification` node (built-in) |
| Get approval from a person | `approval` node |
| AI analysis, extraction, classification | `ai` node |
| Extract content from files | `ai` node with `aiMode: "extract_file"` |
| Generate documents | `ai` node with `aiMode: "create_doc"` |
| Compute totals, averages | `calculate` node |
| Collect user input | `form` node |

Only use a tool node for these if the user specifically mentions an external service by name.

## Published Processes (for `call_process` nodes)

The wizard also receives a list of **PUBLISHED PROCESSES** — existing process workflows in the organization.

When the user mentions running, calling, or reusing another process by name, create a `call_process` node.

### Published Process Matching
1. Match by name similarity (same as tool matching).
2. Check the process description for capability match.
3. Review input fields to understand what data the sub-process needs.
4. Map input fields using `inputMapping`.

### When NOT to Use `call_process`
- If no published processes are listed — do NOT create call_process nodes.
- If the goal is completely self-contained — no need for sub-processes.
- NEVER invent process IDs — only use IDs from the published processes list.

## Dynamic Discovery

The tool list is dynamic — it reflects whatever tools the organization has configured.
New tools added to the platform are automatically available in subsequent process generations.

The wizard should ALWAYS check `tools_json` before deciding whether to use a built-in node type or a tool node.

If `tools_json` is empty (`[]`), no external tools are configured:
- Do NOT create any `tool` nodes.
- Do NOT add any `enabledToolIds` to AI steps.
- Use only built-in node types.
- If the user mentions a specific system, note that the tool needs to be configured first.

## Anti-Hallucination Rules

- NEVER invent tool IDs — only use IDs from `tools_json`.
- NEVER assume a tool exists — check `tools_json` first.
- NEVER create a tool node without a valid `toolId` from the available tools list.
- If user mentions a system but no matching tool exists, use an AI step as a fallback and note the gap.
- Parameter names MUST match the tool's `input_parameters` exactly.
- Tool capabilities are defined by their `description` and `input_parameters` — do not assume additional capabilities.
- NEVER invent published process IDs — only use IDs from the published processes list.
