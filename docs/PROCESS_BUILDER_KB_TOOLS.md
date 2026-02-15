# Process Builder Knowledge Base — Tools Integration & Dynamic Matching (v1)

This document teaches the AI wizard how to intelligently use configured platform tools
when generating process definitions from user prompts.

## What Are Tools?

Tools are external systems, APIs, databases, and services that organizations configure in the platform.
Each tool has:
- **id**: Unique identifier (used in `tool.config.toolId`)
- **name**: Human-readable name (e.g., "SAP HR System", "Employee Database", "Slack Notifications")
- **type**: Category (`api`, `database`, `knowledge_base`, `email`, `website`)
- **description**: What the tool does
- **input_parameters**: What data the tool expects (parameters with names, types, descriptions)

## How Tools Are Passed to the Wizard

When generating a process, ALL configured tools for the organization are passed as `{tools_json}`.
The wizard MUST read this list carefully and use matching tools when the user's goal requires them.

## Tool Name Matching (CRITICAL)

The most important matching rule: **match by name similarity first**.

When the user mentions a system, tool, or service by name in their prompt:
1. Scan all tools in `tools_json` for name matches
2. A match occurs when the tool's name contains keywords from the user's mention (case-insensitive)
3. Use the matched tool's `id` in the `tool` node's `toolId` config
4. Map required `input_parameters` from available process data

### Examples of Name Matching

| User says | Match tool with name containing |
|-----------|-------------------------------|
| "use SAP" or "check SAP" | "SAP" |
| "query the HR system" | "HR" |
| "connect to Salesforce" | "Salesforce" |
| "send via Slack" | "Slack" |
| "check the employee database" | "Employee" + "Database" |
| "use the knowledge base" | "Knowledge" |
| "verify in Active Directory" | "Active Directory" or "AD" |
| "update the CRM" | "CRM" |

### Matching Priority
1. **Exact name match** — User mentions the exact tool name
2. **Keyword match** — User mentions key words that appear in the tool name
3. **Type/capability match** — User describes what they need and a tool's description matches
4. **No match** — If no tool matches, do NOT create a tool node; use an AI step or notification instead

## Using Tools in Process Nodes

When a tool match is found, create a `tool` node:

```json
{
  "type": "tool",
  "name": "Check HR System",
  "config": {
    "toolId": "<matched tool id>",
    "params": {
      "<param_name>": "{{fieldName}}",
      "<param_name>": "fixed_value"
    }
  },
  "output_variable": "hrResult"
}
```

### Parameter Mapping Rules
- Map tool `input_parameters` from available process data (form fields, upstream outputs, user context)
- Use `{{fieldName}}` syntax for dynamic values from the process
- Use fixed values only when the parameter has a known constant
- If a required parameter cannot be mapped, include it with an empty value (the user will configure it)
- ALWAYS set `output_variable` to store the tool response for downstream steps

## Tool Type Guidelines

| Tool Type | Typical Use | Node Configuration |
|-----------|------------|-------------------|
| `api` | External REST API calls | Map params to API fields |
| `database` | Query organizational databases | Map query fields |
| `knowledge_base` | Search knowledge repositories | Pass search query |
| `email` | Send emails via external service | Map recipient, subject, body |
| `website` | Scrape or interact with web services | Map URL and parameters |

## When NOT to Use a Tool

- **Notifications**: Use `notification` node (not a tool) for sending emails/Slack/Teams/SMS.
  Only use a tool node for email if the user specifically mentions an external email service by name.
- **Approvals**: Use `approval` node — never a tool.
- **AI processing**: Use `ai` node — never a tool.
- **File operations**: Use `read_document` / `create_document` — never a tool.
- **Calculations**: Use `calculate` node — never a tool.

## Dynamic Discovery

The tool list is dynamic — it reflects whatever tools the organization has configured.
New tools added to the platform are automatically available in subsequent process generations.

The wizard should ALWAYS check `tools_json` before deciding whether to use:
- A built-in node type (notification, approval, etc.)
- A tool node (for systems the organization has connected)

If `tools_json` is empty (`[]`), no external tools are configured. In that case:
- Do NOT create any `tool` nodes
- Use only built-in node types
- If the user mentions a specific system, note that the tool needs to be configured first

## Anti-Hallucination Rules

- NEVER invent tool IDs — only use IDs from `tools_json`
- NEVER assume a tool exists — check `tools_json` first
- NEVER create a tool node without a valid `toolId` from the available tools list
- If user mentions a system but no matching tool exists, use an AI step as a fallback and note the gap
- Parameter names MUST match the tool's `input_parameters` exactly
- Tool capabilities are defined by their `description` and `input_parameters` — do not assume additional capabilities
