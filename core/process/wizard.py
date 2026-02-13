"""
Process Wizard
LLM-powered process definition generator

Similar to the Conversational AI wizard, this uses LLM to:
1. Understand user's goal
2. Generate appropriate process definition
3. Suggest node configurations
4. Create initial process structure

Usage:
    wizard = ProcessWizard(llm=llm)
    process_def = await wizard.generate_from_goal(
        goal="Create an approval workflow for expense reports",
        context={"org_settings": {...}}
    )
"""

import json
import logging
import re
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

from .platform_knowledge import retrieve_platform_knowledge, load_safe_taxonomies

try:
    # Prefer the platform LLM interface (chat-based)
    from core.llm.base import Message, MessageRole
except Exception:  # pragma: no cover - defensive for import edge cases
    Message = None
    MessageRole = None


# =============================================================================
# PROCESS TEMPLATES FOR COMMON PATTERNS
# =============================================================================

PROCESS_PATTERNS = {
    "approval_workflow": {
        "description": "Approval workflow with conditional routing and notification",
        "triggers": ["manual", "http_webhook"],
        "typical_nodes": ["start", "condition", "approval", "notification", "end"],
    },
    "document_processing": {
        "description": "Upload documents/images, extract data via AI, process and route based on content",
        "triggers": ["manual", "http_webhook"],
        "typical_nodes": ["start", "action", "ai", "condition", "approval", "notification", "end"],
    },
    "data_pipeline": {
        "description": "Data transformation and processing pipeline",
        "triggers": ["schedule", "http_webhook"],
        "typical_nodes": ["start", "http_request", "transform", "validate", "database_query", "end"],
    },
    "integration_sync": {
        "description": "Sync data between systems",
        "triggers": ["schedule", "event"],
        "typical_nodes": ["start", "http_request", "loop", "transform", "http_request", "end"],
    },
    "human_task": {
        "description": "Assign and track human tasks",
        "triggers": ["manual", "http_webhook"],
        "typical_nodes": ["start", "human_task", "delay", "condition", "notification", "end"],
    },
    "ai_workflow": {
        "description": "AI-powered decision making workflow",
        "triggers": ["manual", "http_webhook", "conversation"],
        "typical_nodes": ["start", "ai_task", "condition", "tool_call", "end"],
    },
    "scheduled_job": {
        "description": "Scheduled automated job",
        "triggers": ["schedule"],
        "typical_nodes": ["start", "database_query", "loop", "http_request", "notification", "end"],
    },
}


# =============================================================================
# WIZARD PROMPTS
# =============================================================================

GOAL_ANALYSIS_PROMPT = """You are an expert workflow designer. Analyze the user's goal and determine the best process pattern.

User's Goal: {goal}

Available Patterns:
{patterns_description}

Respond with JSON:
{{
    "pattern": "<best matching pattern name>",
    "pattern_match_confidence": <0.0-1.0>,
    "summary": "<brief summary of what the process will do>",
    "suggested_nodes": [
        {{"type": "<node_type>", "name": "<descriptive name>", "purpose": "<why this node>"}}
    ],
    "suggested_triggers": ["<trigger_type>"],
    "variables": [
        {{"name": "<var_name>", "type": "<string|number|boolean|array|object>", "description": "<purpose>"}}
    ],
    "considerations": ["<any important notes>"]
}}"""


PROCESS_GENERATION_PROMPT = """You are an expert workflow designer. Generate a complete process definition based on the analysis.

User's Goal: {goal}

Analysis:
{analysis}

Organization Settings:
- Business Hours: {business_hours}
- Timezone: {timezone}
- Default Approval Timeout: {approval_timeout} hours

Available Node Types:
{node_types}

Generate a complete process definition in JSON format. The process definition should follow this schema:

{{
    "name": "<process name>",
    "description": "<process description>",
    "version": "1.0",
    "variables": [
        {{
            "name": "<variable name>",
            "type": "<string|number|boolean|array|object>",
            "default": <default value or null>,
            "description": "<description>",
            "required": <true|false>
        }}
    ],
    "triggers": [
        {{
            "type": "<manual|http_webhook|schedule|event>",
            "config": {{}}
        }}
    ],
    "nodes": [
        {{
            "id": "<unique_id>",
            "type": "<node_type>",
            "name": "<display name>",
            "description": "<what this node does>",
            "position": {{"x": <number>, "y": <number>}},
            "config": {{}},
            "next_nodes": ["<id of next node>"],
            "output_variable": "<optional variable name to store output>"
        }}
    ],
    "edges": [
        {{
            "id": "<edge_id>",
            "source": "<source_node_id>",
            "target": "<target_node_id>",
            "condition": "<optional condition expression>"
        }}
    ],
    "settings": {{
        "max_execution_time_seconds": 3600,
        "max_node_executions": 100
    }}
}}

Rules:
1. Always start with a "start" node and end with "end" node(s)
2. Use meaningful node IDs (e.g., "validate_input", "notify_approver")
3. Position nodes in a logical flow (x for horizontal, y for vertical)
4. Include proper config for each node type
5. Use variables for dynamic data
6. Add edges to connect all nodes

Generate the complete process definition:"""


# Visual Builder schema (used by ui/process-builder.html)
VISUAL_BUILDER_GENERATION_PROMPT = """You are an expert workflow designer building workflows for a NON-technical user in a visual process builder.

User's Goal (use the same language as this goal):
{goal}

Analysis (for context):
{analysis}

Available platform tools (use these when the user's goal involves actions these tools can perform):
{tools_json}
TOOL MATCHING: Read each tool's name, type, and description carefully. When the user's goal implies an action that matches a tool, use a "tool" node with the correct toolId and params. Map user intent to tool capabilities intelligently.

Platform Knowledge Base (ground truth about platform capabilities, rules, and safe option lists):
{platform_knowledge}

IMPORTANT:
- Output ONLY valid JSON. No markdown. No extra keys outside the schema.
- This workflow will be edited in a visual builder and executed by an engine.
- Use ONLY these node types (exact strings):
  - trigger, condition, loop, ai, tool, approval, notification, delay, action, form, end
- Always include exactly ONE start node of type "trigger".
- Always include at least ONE "end" node.
- If you include a "condition" node, you MUST create exactly two outgoing edges from it:
  - one with type "yes"
  - one with type "no"
- In prompts/templates, reference form fields using double braces like {{{{amount}}}} or {{{{email}}}}.
- This platform is for business users: ALL labels shown to users must be business-friendly and human readable (no snake_case, no internal IDs).
- For internal field keys, ALWAYS use lowerCamelCase (no underscores). Example: employeeEmail, startDate, endDate, numberOfDays.

BUSINESS LOGIC REASONING (CRITICAL — think like a process expert, not a text parser):
- Do NOT follow the user's prompt word-by-word as a sequence. Instead, UNDERSTAND the business intent and design the logically correct workflow.
- Think about WHEN each step should happen in real life:
  - Notifications about pending tasks should be sent BEFORE or AT THE SAME TIME as the task, not after it is completed.
  - Example: If a manager needs to approve something, the notification to the manager should be sent BEFORE the approval step (or as part of it), because the manager needs to KNOW there is something to approve. Do NOT place a "notify manager" step AFTER the approval step — that would mean notifying them after they already approved.
  - Example: "Notify employee of approval" should happen AFTER the manager approves, not before.
- Approval nodes have built-in notification capability — when an approval is assigned to someone, the platform notifies them automatically. You only need a separate notification node for custom messages or for notifying OTHER people (like the requester).
- Always ask yourself: "In a real office, what would happen first?" and design the flow accordingly.
- Smart field inference:
  - Use your business/industry knowledge to determine what fields are needed, even if the user didn't list them explicitly. Think like a business analyst: what information would a real-world form for this process collect? Add those fields.
  - IMPORTANT: Do NOT limit the form to only what the user explicitly mentioned. If the user says "upload expense receipts", you should ALSO add fields like expense description/purpose, expense category (dropdown), date of expense, etc. — any field that is standard practice for that type of business process. But do NOT add fields for data that will be extracted automatically (e.g., amounts from receipts) or data from the user's profile (prefilled).
  - For dropdowns: ALWAYS populate options using your business/industry knowledge. You are an expert — if a field needs categories, priorities, types, statuses, or any standard list, YOU define a comprehensive and practical list of options. Only use organization-specific data (department names, employee lists, product catalogs unique to one company) from tools or the Knowledge Base, never from your general knowledge. But for universal/industry-standard options (expense categories, leave types, priority levels, currencies, etc.), YOU are the source of truth — populate them confidently.
  - For auto-fill: ANY field that matches user profile data (name, email, phone, department, job title, employee ID, manager) MUST use prefill with readOnly:true. Never ask the user to type what the system knows.
  - For derived fields: only use formulas supported by the Knowledge Base (daysBetween, concat, sum, round).
  - For data flow: store AI/tool outputs in variables and reference them in later steps (notifications, conditions, etc.).
- Scheduling and webhooks are configured on the Start node via `trigger.config.triggerType` (do NOT create separate schedule/webhook nodes).

VISUAL LAYOUT RULES (CRITICAL — follow strictly for clean, professional diagrams):
- Connection lines must NEVER pass through any node. Ensure enough spacing so edges route cleanly around nodes.
- Connection lines must take the SHORTEST path between nodes. Never loop or take long detours.
- Minimum spacing: 200px vertical gap between sequential nodes, 300px horizontal gap between branches.
- For linear flows (no conditions): place ALL nodes in a single vertical column (same x, increasing y by ~200).
- For condition branches: "yes" path goes LEFT (x - 300), "no" path goes RIGHT (x + 300). Both paths reconverge to a shared node at center x below both branches.
- Keep the main flow linear when possible. Avoid unnecessary branching — it creates visual clutter.

END NODE RULE (ABSOLUTE — NO EXCEPTIONS):
- There must be exactly ONE "end" node in the entire process.
- The "end" node must be the VERY LAST node in the nodes array.
- ALL paths (yes branch, no branch, every branch) must eventually connect to this single "end" node.
- NOTHING comes after the "end" node. No notifications, no actions, no steps of any kind.
- If both branches of a condition need different final notifications, place those notifications BEFORE the end node, then both connect to the single end node.
- The end node must be positioned BELOW every other node in the diagram.
- WRONG: Yes → Notification → End, No → Approval → Notification (after End)
- CORRECT: Yes → Notification → End, No → Approval → Notification → End (same End node, at the very bottom)

Schema to output:
{{
  "name": "Workflow Name",
  "description": "Short description",
  "nodes": [
    {{
      "id": "node_1",
      "type": "trigger",
      "name": "Start",
      "x": 400,
      "y": 100,
      "config": {{
        "triggerType": "manual",
        "formTitle": "Request details",
        "submitText": "Submit",
        "fields": [
          {{
            "name": "amount",
            "label": "Amount",
            "type": "number",
            "required": true,
            "placeholder": "Enter the amount"
          }}
        ]
      }}
    }}
  ],
  "edges": [
    {{"from":"node_1","to":"node_2"}},
    {{"from":"node_3","to":"node_4","type":"yes"}},
    {{"from":"node_3","to":"node_5","type":"no"}}
  ]
}}

Node config rules:
- trigger.config.fields is REQUIRED and must be a non-empty array when triggerType is "manual".
- Each field MUST include:
  - name (lowerCamelCase internal key; used in {{name}} references)
  - label (business-friendly label shown to users)
  - type (text | textarea | number | date | email | select | file)
  - required (true/false)
  - placeholder (business-friendly hint)
  - For file fields: accepts ANY document or image type (PDF, Word, Excel, PNG, JPG, receipts, invoices, photos, etc.). The platform handles all file types dynamically.
    IMPORTANT: If the business context implies the user may upload MORE THAN ONE file (e.g., expense receipts, supporting documents, multiple invoices, attachments), you MUST add "multiple": true. When in doubt, default to "multiple": true — it is better UX to allow multiple uploads than to force the user to submit only one.
- FIELD TYPE SELECTION RULE (MANDATORY — NEVER use "text" when "select" is appropriate):
  A field MUST be type "select" (dropdown) if ANY of these apply:
    1. The field name contains: category, type, status, priority, level, method, currency, rating, frequency, severity, department, classification, source, reason, or similar classifying words.
    2. The user's prompt mentions "select", "choose", "pick", "dropdown", "list of", "options", or describes a set of values.
    3. The field represents a well-known business concept with standard values (expense categories, leave types, payment methods, currencies, urgency levels, etc.).
    4. A business user would benefit from picking from a predefined list rather than typing free text.
  Type "text" is ONLY for truly free-form input: names, descriptions, comments, notes, addresses, custom IDs.
  When in doubt, use "select" — the admin can always edit the options later.
- For select fields, include: options (array of strings).
  The LLM MUST populate the options list using its own knowledge. Generate a comprehensive, practical list of options based on the domain. Do NOT leave the options array empty.
  Only use organization-specific data (department names, employee lists, product catalogs) from tools or the Knowledge Base, NOT from the LLM's general knowledge.
- For select fields, you MAY also include: optionsSource ("taxonomy:<id>" or "tool:<toolId>") if a matching taxonomy or tool exists in the Knowledge Base. If none exists, omit optionsSource entirely and rely on the options array populated by the LLM.
- For derived (auto-calculated) fields, include:
  - readOnly: true
  - derived: {{ "expression": "<formula>" }}
  Use formulas like: daysBetween(startDate, endDate) or concat(firstName, " ", lastName).
- For profile-prefilled fields (auto-filled from the logged-in user's profile — the user does NOT need to enter these), include:
  - readOnly: true
  - prefill: {{ "source": "currentUser", "key": "<key>" }}
  The prefill system is FULLY DYNAMIC — you can use ANY attribute available from the user's identity source.
  Common keys: email, name, firstName, lastName, phone, id, roles, groups, orgId,
    managerId, managerName, managerEmail, departmentId, departmentName, jobTitle, employeeId,
    groupNames, roleNames, isManager, directReportCount.
  Custom keys (from HR/LDAP): nationalId, hireDate, officeLocation, costCenter, badgeNumber, or ANY field the organization has configured in their HR system or LDAP directory.
  The engine resolves ALL these from the organization's configured identity source (Built-in, LDAP, or HR System) automatically at runtime. If a custom attribute exists in the directory, it will be available for prefill.
  BEST PRACTICE: For any process, ALWAYS prefill every piece of information the system already knows about the user (name, email, department, employee ID, phone, job title, manager, etc.). NEVER ask the user to manually enter data that is available from their profile. This eliminates manual entry and ensures accuracy.
- condition.config must be: {{ "field": "<field_name>", "operator": "equals|not_equals|greater_than|less_than|contains|is_empty", "value": "<string or number>" }}
- loop.config must be: {{ "collection": "{{{{items}}}}", "itemVar": "item" }}. Use when repeating steps for each item in a collection.
- form.config must include: fields (same schema as trigger fields). Use for collecting additional input mid-workflow (not the initial form).
- ai.config must be: {{ "prompt": "<task description only — what to do, with {{{{field}}}} refs>", "model": "gpt-4o", "instructions": ["<rule 1>", "<rule 2>", ...] }}
  IMPORTANT — prompt vs instructions separation:
  - config.prompt: ONLY the task description (what data to extract, what to analyze, what to generate).
  - config.instructions: An ARRAY of separate rule strings. Each rule is an individual constraint, formatting requirement, or guardrail the AI must follow for this step.
  - NEVER put rules, constraints, or "IMPORTANT:" directives inside the prompt. Always use the instructions array.
  - The engine injects each instruction into the AI's system prompt as a numbered rule automatically.
  - If the step has no special rules, instructions can be an empty array [].
- ai nodes SHOULD include: "output_variable": "<variable_name>" to store the AI output (e.g. "result" or "analysis")
- AI nodes are POWERFUL: They can parse unstructured text into structured JSON, summarize data, make classifications, calculate totals, detect languages/currencies, validate data, and more. Use them whenever the workflow needs intelligence beyond simple conditions.
- When an AI node parses data into JSON, subsequent condition nodes can reference fields from the parsed output (e.g., if AI stores result in "parsedData", a condition can check "parsedData.totalAmount").
- tool.config must be: {{ "toolId": "<id from tools_json>", "params": {{...}} }}. Only use if tools_json has items.
- tool nodes SHOULD include: "output_variable": "<variable_name>" to store tool output.
- approval.config must include: assignee_source, assignee_type, assignee_ids (can be empty), timeout_hours, message.
  IMPORTANT — Identity-aware approvals (the engine resolves assignees automatically at runtime):
  - For direct manager/supervisor approval: assignee_source: "user_directory", directory_assignee_type: "dynamic_manager", assignee_ids: [].
  - For department head approval: assignee_source: "user_directory", directory_assignee_type: "department_manager".
  - For higher management (skip-level): assignee_source: "user_directory", directory_assignee_type: "management_chain", management_level: N (2=next level, 3=above that).
  - For role-based approval: assignee_source: "user_directory", directory_assignee_type: "role", role_ids: ["<role_id>"].
  - For group/team/committee approval: assignee_source: "user_directory", directory_assignee_type: "group", group_ids: ["<group_id>"].
  - For department-wide: assignee_source: "user_directory", directory_assignee_type: "department_members", and set EITHER:
      - assignee_department_name: "<department name>" (RECOMMENDED for LLM-generated workflows), OR
      - assignee_department_id: "<dept_id>".
  - For dynamic (form field selects approver): assignee_source: "user_directory", directory_assignee_type: "expression", expression: "{{{{ trigger_input.fieldName }}}}".
  - For static (always same person): assignee_source: "platform_user".
  - ALWAYS prefer "user_directory" over "platform_user" when the approval follows organizational hierarchy.
  - For sequential multi-level approvals, use MULTIPLE approval nodes in sequence.
- notification.config must include: channel, recipient (string), template (string).
  - channel: "email" (default)
  - recipient: WHO receives this notification. Use ONE of these (string, not array):
    - "requester" → automatically sends to the person who submitted the form (PREFERRED for employee notifications)
    - "manager" → automatically sends to the requester's direct manager (PREFERRED for manager notifications)
    - "{{{{employeeEmail}}}}" → a form field reference (only if you need a custom email field)
    - "someone@example.com" → a hardcoded email (rarely used)
    BEST PRACTICE: Use "requester" and "manager" shortcuts. NEVER leave recipient empty. NEVER use "-- Select Field --".
  - template: The full email body content. MUST be a rich, informative, business-friendly message.
    RULES FOR TEMPLATES:
    - Include: What happened (approved/rejected/pending/auto-approved) + key data + context
    - Use variable interpolation: {{{{fieldName}}}} for form fields, {{{{parsedData.fieldName}}}} for AI-parsed data
    - ALWAYS reference SPECIFIC scalar fields (e.g., {{{{parsedData.totalAmount}}}}, {{{{parsedData.currency}}}})
    - NEVER dump a raw array/object variable like {{{{parsedData}}}} or {{{{parsedData.expenses}}}} directly into the template.
      Instead, reference individual scalar fields from the parsed data.
    - When the process extracts itemized data (e.g., expenses, line items), the template should reference
      summary fields (total, count) and the platform will auto-format any arrays into readable lists.
    - Write the message as if you're a professional assistant writing to a colleague — warm, clear, and complete.
    - Include enough context that the recipient understands WITHOUT logging in.
    
    GOOD examples (adapt to workflow):
      - "Hi {{{{trigger_input._user_context.display_name}}}},\n\nYour expense report '{{{{expenseReportName}}}}' has been approved by your manager.\n\nTotal Amount: {{{{parsedData.totalAmount}}}} {{{{parsedData.currency}}}}\nNumber of expenses: {{{{parsedData.expenseCount}}}}\n\nExpense breakdown:\n{{{{parsedData.expenses}}}}\n\nThank you!"
      - "A new expense report '{{{{expenseReportName}}}}' from {{{{trigger_input._user_context.display_name}}}} requires your review.\n\nTotal: {{{{parsedData.totalAmount}}}} {{{{parsedData.currency}}}}\n\nPlease log in to review and approve."
    BAD examples (NEVER do this):
      - "Details: {{{{parsedData}}}}" ← dumps entire object as text
      - "Expenses: {{{{expenses}}}}" ← dumps raw array
    
    Use variable names that match the actual fields and AI output for the specific process being generated.
    NEVER leave template empty. ALWAYS write a complete, business-friendly notification message.
  CRITICAL: Every notification node MUST have a non-empty recipient and a non-empty template. The AI must fill both — they are NEVER left for the user to configure manually.
- delay.config must include: duration (number) and unit ("seconds"|"minutes"|"hours"|"days").
- action.config MUST include: actionType.
  - Use actionType="generateDocument" only when document output is explicitly required.
  - Use actionType="extractDocumentText" when the workflow needs to read/extract data from uploaded documents or images (field type "file").
    The platform uses LLM vision (OCR) automatically to extract ALL text, numbers, tables, and structured data from ANY image or document type (receipts, invoices, forms, photos, PDFs, etc.).
    - Set action.config.sourceField to the uploaded file field name.
    - Set node.output_variable to store the extracted text/data (e.g., "extractedData").
    - CRITICAL: After extraction, ALWAYS follow with an "ai" node that parses the raw extracted text into structured data (JSON). The AI node should:
      - Reference the extracted text variable in its prompt: {{{{extractedData}}}}
      - Use its intelligence to identify and extract all relevant fields from the raw text (amounts, dates, vendors, currencies, line items, totals, etc.) based on the workflow's purpose
      - Store the parsed result as a structured variable (e.g., output_variable: "parsedData")
      - MUST set temperature: 0.1 (low temperature for accurate data extraction — never hallucinate)
      - MUST set output_format: "json"
      - PROMPT vs INSTRUCTIONS separation (MANDATORY for ALL "ai" nodes):
        config.prompt = ONLY the task description (what data to extract, what to do with it).
        config.instructions = an ARRAY of individual rule strings. Each rule is a separate item.
        NEVER mix rules/constraints into the prompt. Put them in config.instructions instead.
        Example:
          "prompt": "Extract expense data from: {{{{extractedData}}}}. For each receipt, identify expense type, date, vendor, amount, and currency. Return items array and totals.",
          "instructions": [
            "Only extract data that is EXPLICITLY present in the text — do NOT invent or estimate values",
            "Each file section (--- File: ... ---) is exactly ONE item — count them carefully",
            "If a value is unclear or missing, omit it or set it to null",
            "Return amounts as numbers, not strings"
          ]
        The engine injects each instruction into the AI's system prompt automatically.
    - MULTI-FILE UPLOADS: When the file field has multiple=true (e.g., multiple receipts, invoices, contracts, reports, images, certificates), the extraction step automatically processes ALL uploaded files (documents AND images via OCR) and returns combined text with "--- File: <name> ---" headers separating each file's content. The AI parsing node MUST handle this correctly:
      - Parse and extract relevant data from EVERY file in the text, not just the first one
      - ALWAYS return an "items" array containing each file's extracted data as a separate object, preserving per-file details (fileName, and any fields relevant to the workflow). This ensures each file's data is individually accessible to subsequent workflow steps
      - ALWAYS return "itemCount" with the number of files/documents processed
      - Based on the workflow's business context, the AI should ALSO return any computed/aggregated fields that downstream steps might need. The LLM must infer what is appropriate:
        * If the workflow involves amounts/costs → compute a total/sum across all files
        * If the workflow involves review/compliance → compile all findings and flag issues
        * If the workflow involves data collection → merge and deduplicate entries
        * If the workflow is simply gathering documents → just organize and list all extracted data
        * Any other scenario → use business judgment to decide what aggregated fields are useful
      - Do NOT hardcode specific field names — the LLM infers them from the business context
      - The structured output (items array + aggregated fields) is stored as a single variable (e.g., "parsedData") and is available to ALL subsequent steps: conditions can route based on aggregated values, notifications can reference per-item or summary data, approvals can display the full breakdown, and any other step can use any part of the data
    - Subsequent nodes (conditions, notifications, approvals) should reference the parsed data fields.
    - This pattern works for ANY document or image type — the LLM determines what to extract based on context.

- AUTOMATIC APPROVAL PATTERN (condition-based):
  When a workflow should auto-approve under certain conditions (e.g., amount below a threshold), use a CONDITION node:
  - The condition checks the relevant value (e.g., field: "totalAmount", operator: "less_than", value: "500")
  - "yes" branch → skip approval, go directly to a notification node (informing the user it was auto-approved)
  - "no" branch → go to an approval node (for manual review)
  This lets workflows intelligently route based on data without requiring human intervention in every case.

- CURRENCY AND UNITS: When the workflow involves monetary values, the AI parsing step should infer or extract the currency from the uploaded documents. If the user specifies a currency in their goal, use that currency in conditions and notifications. Do NOT hardcode currency — let the AI determine it from context.

- end.config must include: output. Use "" (empty string) to output ALL variables. If you want to output a single variable, use {{{{variable_name}}}}.

Generate the workflow JSON now:"""


NODE_CONFIG_PROMPT = """Generate the configuration for a {node_type} node.

Node Purpose: {purpose}
Node Name: {name}

Context:
- Process Goal: {goal}
- Available Variables: {variables}
- Organization Settings: {org_settings}

Generate the node config as JSON. Be specific and practical.

For reference, here are typical configs:

ai_task:
{{
    "prompt": "<detailed prompt with {{variable}} interpolation>",
    "output_format": "json|text|structured",
    "temperature": 0.7
}}

http_request:
{{
    "method": "GET|POST|PUT|DELETE",
    "url": "<URL with {{variable}} interpolation>",
    "headers": {{}},
    "body": {{}},
    "auth": {{"type": "none|basic|bearer|api_key"}}
}}

approval:
{{
    "title": "<approval title>",
    "description": "<what needs to be approved>",
    "assignee_type": "user|role|group",
    "assignee_ids": [],
    "min_approvals": 1,
    "timeout_hours": 24,
    "timeout_action": "fail|skip|escalate"
}}

condition:
{{
    "expression": "<boolean expression with variables>",
    "true_branch": "<next_node_id>",
    "false_branch": "<next_node_id>"
}}

Generate the config for this node:"""


class ProcessWizard:
    """
    LLM-powered process definition generator
    """
    
    def __init__(self, llm=None, org_settings: Dict[str, Any] = None):
        """
        Initialize wizard
        
        Args:
            llm: LLM instance for generation
            org_settings: Organization settings for defaults
        """
        self.llm = llm
        self.org_settings = org_settings or {}

    # -------------------------------------------------------------------------
    # LLM helpers
    # -------------------------------------------------------------------------

    def _extract_json(self, text: str) -> Any:
        """
        Extract a JSON object/array from LLM output.
        Handles:
        - Raw JSON
        - Markdown code fences ```json ... ```
        - Extra explanation around JSON (best-effort)
        """
        if text is None:
            raise ValueError("Empty LLM response")
        s = str(text).strip()
        if not s:
            raise ValueError("Empty LLM response")

        # Strip Markdown code fences
        if s.startswith("```"):
            s = re.sub(r"^```(?:json)?", "", s, flags=re.IGNORECASE).strip()
            if s.endswith("```"):
                s = s[:-3].strip()

        # Try direct parse
        try:
            return json.loads(s)
        except json.JSONDecodeError:
            pass

        # Best-effort: find first JSON object/array in the text
        match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", s)
        if match:
            return json.loads(match.group(1))

        raise ValueError("Failed to parse JSON from LLM response")

    async def _chat_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 2500,
    ) -> Any:
        """Call the configured LLM and parse JSON response."""
        if not self.llm:
            raise ValueError("LLM is not configured")
        if not hasattr(self.llm, "chat"):
            raise ValueError("LLM does not support chat()")

        # Build messages using platform message types when available
        if Message and MessageRole:
            messages = [
                Message(role=MessageRole.SYSTEM, content=system_prompt),
                Message(role=MessageRole.USER, content=user_prompt),
            ]
        else:
            # Fallback: some providers may accept dicts
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]

        response = await self.llm.chat(messages=messages, temperature=temperature, max_tokens=max_tokens)
        content = getattr(response, "content", None)
        return self._extract_json(content or "")
    
    async def generate_from_goal(
        self,
        goal: str,
        additional_context: Dict[str, Any] = None,
        output_format: str = "visual_builder",
    ) -> Dict[str, Any]:
        """
        Generate a complete process definition from a user's goal
        
        Args:
            goal: Natural language description of what the process should do
            additional_context: Additional context (existing tools, integrations, etc.)
            
        Returns:
            Complete process definition
        """
        if not self.llm:
            # Return a template-based definition if no LLM
            if output_format == "visual_builder":
                return self._generate_visual_from_template(goal)
            return self._generate_from_template(goal)
        
        try:
            # Step 1: Analyze the goal
            analysis = await self._analyze_goal(goal)
            
            # Step 2: Generate process definition
            if output_format == "visual_builder":
                process_def = await self._generate_visual_builder_process(goal, analysis, additional_context)
                process_def = self._validate_and_enhance_visual_builder(process_def, analysis)
            else:
                process_def = await self._generate_process(goal, analysis)
                process_def = self._validate_and_enhance(process_def)
            
            # Step 3: Suggest default AI settings based on process type
            # Inject per-step AI defaults into each AI node's config
            # (user can adjust these in the node's properties panel)
            for n in (process_def.get("nodes") or []):
                if n.get("type") == "ai":
                    cfg = n.setdefault("config", {})
                    has_output = bool(n.get("output_variable"))
                    cfg.setdefault("instructions", [])
                    cfg.setdefault("creativity", 2 if has_output else 3)  # Strict for extraction
                    cfg.setdefault("confidence", 3)                       # Balanced default
            
            return process_def
            
        except Exception as e:
            logger.error(f"Wizard generation failed: {e}")
            # Fall back to template
            if output_format == "visual_builder":
                return self._generate_visual_from_template(goal)
            return self._generate_from_template(goal)

    async def _generate_visual_builder_process(
        self,
        goal: str,
        analysis: Dict[str, Any],
        additional_context: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """Generate a process definition compatible with the Visual Builder UI."""
        tools = []
        if additional_context and isinstance(additional_context, dict):
            maybe_tools = additional_context.get("tools") or additional_context.get("available_tools")
            if isinstance(maybe_tools, list):
                for t in maybe_tools:
                    if isinstance(t, dict):
                        tools.append({
                            "id": t.get("id"),
                            "name": t.get("name"),
                            "type": t.get("type"),
                            "description": t.get("description"),
                            "input_parameters": t.get("input_parameters") or t.get("inputParameters") or t.get("parameters"),
                        })
        tools_json = json.dumps(tools[:30], ensure_ascii=False, indent=2) if tools else "[]"

        # Retrieve platform knowledge (RAG-lite) to ground generation and avoid hallucination.
        try:
            tool_names = " ".join([t.get("name") or "" for t in tools if isinstance(t, dict)])
            query = f"{goal}\n\n{(analysis or {}).get('summary') or ''}\n\n{tool_names}".strip()

            # Always include identity/approval KB keywords in the retrieval query.
            # Any process might involve approvals, notifications, or user context —
            # the identity KB should always be available for the LLM to use if needed.
            # This avoids hardcoding specific scenarios (like HR) that trigger identity retrieval.
            query += "\n\nidentity user_directory approval assignee notification prefill user profile"
            query += "\n\nrecipient requester manager _user_context enrich runtime resolution identity_source"
            query += "\n\nlayout visual spacing connection lines nodes positioning end node branches"

            platform_knowledge = retrieve_platform_knowledge(query, top_k=8, max_chars=6000)
        except Exception:
            platform_knowledge = ""

        # Build dynamic user attributes context for AI auto-detection
        user_attrs_context = ""
        if additional_context and isinstance(additional_context, dict):
            available_attrs = additional_context.get("available_user_attributes")
            if available_attrs and isinstance(available_attrs, dict):
                standard = available_attrs.get("standard", [])
                custom = available_attrs.get("custom", [])
                attr_lines = []
                for a in standard:
                    attr_lines.append(f"  - {a['key']} ({a.get('type', 'string')}): {a.get('label', '')}")
                if custom:
                    attr_lines.append("\n  Custom fields configured for this organization:")
                    for a in custom:
                        attr_lines.append(f"  - {a['key']} ({a.get('type', 'string')}): {a.get('label', '')}")
                user_attrs_context = (
                    "\n\nAVAILABLE USER PROFILE ATTRIBUTES (for this organization):\n"
                    "These fields are available for auto-fill via prefill. "
                    "If any field in the process matches one of these, use prefill with readOnly:true "
                    "instead of asking the user to type it.\n"
                    + "\n".join(attr_lines)
                )
        
        # Build identity context so the AI knows what's ACTUALLY configured
        identity_context_text = ""
        if additional_context and isinstance(additional_context, dict):
            id_ctx = additional_context.get("identity_context")
            if id_ctx and isinstance(id_ctx, dict):
                lines = [
                    f"\n\nIDENTITY DIRECTORY STATUS (for this organization):",
                    f"  Source: {id_ctx.get('source_label', 'Unknown')} ({id_ctx.get('source', 'internal')})",
                ]
                caps = id_ctx.get("capabilities", {})
                if caps.get("has_managers"):
                    mgr_pct = caps.get("manager_coverage_pct", 0)
                    lines.append(f"  Managers: YES — {mgr_pct}% of users have managers assigned. "
                                 "You CAN use 'dynamic_manager' for approvals and 'manager' for notifications.")
                else:
                    lines.append(f"  Managers: NO — No users have managers assigned. "
                                 "Do NOT use 'dynamic_manager' for approvals or 'manager' for notifications. "
                                 "Use role-based or static assignees instead, or note that manager assignment is required.")
                if caps.get("has_departments"):
                    dept_count = id_ctx.get("departments_count", 0)
                    lines.append(f"  Departments: YES — {dept_count} departments configured. "
                                 "Department-based routing is available.")
                else:
                    lines.append(f"  Departments: NO — No departments configured. "
                                 "Do NOT use department-based routing.")
                if caps.get("has_custom_attributes"):
                    lines.append(f"  Custom Attributes: YES — Organization has custom user fields.")
                
                warnings = id_ctx.get("warnings", [])
                if warnings:
                    lines.append("  ⚠️ WARNINGS:")
                    for w in warnings:
                        lines.append(f"    - {w}")
                
                identity_context_text = "\n".join(lines)

        user_prompt = VISUAL_BUILDER_GENERATION_PROMPT.format(
            goal=goal,
            analysis=json.dumps(analysis or {}, ensure_ascii=False, indent=2),
            tools_json=tools_json,
            platform_knowledge=(platform_knowledge or "(no KB matches)") + user_attrs_context + identity_context_text,
        )
        system_prompt = (
            "You are an expert workflow designer with deep knowledge of business processes "
            "across ALL industries (enterprise, government, healthcare, finance, education, IT, operations, etc.). "
            "You understand organizational structures, approval hierarchies, data flows, and compliance requirements.\n\n"
            "YOUR INTELLIGENCE DIRECTIVES:\n"
            "1. INFER from context: The user gives you a high-level goal. YOU must figure out:\n"
            "   - What input fields are needed (names, types, labels)\n"
            "   - Which fields should be dropdowns vs free text\n"
            "   - Which fields can be auto-filled from the user's profile\n"
            "   - What the logical data flow should be\n"
            "   - What approvals, notifications, and conditions make sense\n"
            "2. USE YOUR BUSINESS KNOWLEDGE: When the context clearly implies specific options "
            "(e.g., a procurement process implies priority levels, a support ticket implies severity levels), "
            "you MAY suggest appropriate dropdown options from your general knowledge. "
            "Only avoid inventing options when they are truly organization-specific (like department names or employee lists).\n"
            "3. MATCH TOOLS TO INTENT: When tools are available, match the user's intent to the right tool. "
            "If the user says 'send email notification', use the email tool. If they mention 'check inventory', "
            "use the relevant API tool. Understand tool descriptions and parameters.\n"
            "4. AUTO-PREFILL: Any field that matches a user profile attribute (name, email, department, "
            "job title, manager, employee ID, phone, etc.) MUST be auto-filled with readOnly:true. "
            "The user should NEVER have to type information the system already knows.\n"
            "5. SMART DATA FLOW: Variables from earlier steps should flow to later steps naturally. "
            "AI outputs should be stored in variables and referenced in notifications/conditions.\n"
            "6. RESPOND IN THE SAME LANGUAGE as the user's goal (labels, placeholders, names — everything user-facing).\n"
            "7. IDENTITY-AWARE CONFIGURATION (CRITICAL):\n"
            "   The platform has a built-in Identity Directory that automatically resolves user information at runtime.\n"
            "   When a process starts, the engine enriches the context with ALL user data from the configured identity source\n"
            "   (Built-in, LDAP, Active Directory, HR System). This data is available as trigger_input._user_context.\n"
            "   Available fields include: email, display_name, manager_id, manager_email, manager_name,\n"
            "   department_name, employee_id, job_title, role_names, group_names, and any custom attributes.\n\n"
            "   THEREFORE:\n"
            "   - NEVER add a 'Manager Email' or 'Manager Name' field to the form — the engine resolves it automatically.\n"
            "   - For approval routing, use assignee_source: 'user_directory' with directory_assignee_type: 'dynamic_manager'.\n"
            "   - For notifications to the employee/requester: set recipient to 'requester' (magic shortcut — engine resolves to email).\n"
            "   - For notifications to the manager: set recipient to 'manager' (magic shortcut — engine resolves to manager's email).\n"
            "   - In notification templates, reference user data via {{trigger_input._user_context.display_name}}, etc.\n"
            "   - NEVER try to manually resolve emails — the platform does this automatically.\n\n"
            "Return ONLY valid JSON that matches the schema exactly. No markdown, no explanation."
        )
        try:
            data = await self._chat_json(system_prompt, user_prompt, temperature=0.25, max_tokens=3500)
        except Exception as e:
            # Repair pass: ask again with stricter instruction (avoid falling back to templates)
            repair_prompt = (
                user_prompt
                + "\n\nYour previous output was invalid or could not be parsed as JSON. "
                + "Return ONLY valid JSON now (no markdown, no commentary)."
            )
            logger.warning("Visual builder JSON parse failed, running repair pass: %s", e)
            data = await self._chat_json(system_prompt, repair_prompt, temperature=0.1, max_tokens=3500)
        if not isinstance(data, dict):
            raise ValueError("Visual builder process definition must be a JSON object")
        return data

    def _validate_and_enhance_visual_builder(
        self,
        process_def: Dict[str, Any],
        analysis: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """Validate and enhance a visual-builder-compatible definition."""
        analysis = analysis or {}
        if not isinstance(process_def, dict):
            process_def = {}

        out: Dict[str, Any] = dict(process_def)
        if not out.get("name"):
            out["name"] = "Generated Workflow"
        if not out.get("description"):
            out["description"] = str(analysis.get("summary") or "").strip() or "AI-generated workflow"

        nodes = out.get("nodes") or []
        edges = out.get("edges") or out.get("connections") or []
        if not isinstance(nodes, list):
            nodes = []
        if not isinstance(edges, list):
            edges = []

        allowed_types = {"trigger", "condition", "loop", "ai", "tool", "approval", "notification", "delay", "end", "form", "action"}
        type_default_names = {
            "trigger": "Start",
            "form": "Form Input",
            "condition": "Condition",
            "loop": "For Each",
            "ai": "AI Task",
            "tool": "Use Tool",
            "approval": "Approval",
            "notification": "Send Notification",
            "delay": "Wait",
            "action": "Action",
            "end": "End",
        }

        def _humanize_label(s: str) -> str:
            s = (s or "").strip()
            if not s:
                return ""
            s = s.replace("_", " ")
            s = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", s)
            s = re.sub(r"\s+", " ", s).strip()
            return " ".join(w[:1].upper() + w[1:] for w in s.split(" ") if w)

        def _to_camel_key(s: str) -> str:
            s = (s or "").strip()
            if not s:
                return ""
            # Keep letters/numbers/spaces/underscores only
            s = re.sub(r"[^A-Za-z0-9 _]", " ", s)
            s = re.sub(r"\s+", " ", s).strip()
            if not s:
                return ""
            parts = re.split(r"[_\s]+", s)
            parts = [p for p in parts if p]
            if not parts:
                return ""
            first = parts[0].lower()
            rest = "".join(p[:1].upper() + p[1:].lower() for p in parts[1:])
            key = first + rest
            if not re.match(r"^[A-Za-z]", key):
                key = "field" + key
            return key

        def _replace_refs_in_str(s: Any, mapping: Dict[str, str]) -> Any:
            if not mapping or not isinstance(s, str):
                return s
            out_s = s
            for old, new in mapping.items():
                if not old or not new or old == new:
                    continue
                out_s = out_s.replace(f"{{{{{old}}}}}", f"{{{{{new}}}}}")
            return out_s

        def _rewrite_obj(obj: Any, mapping: Dict[str, str]) -> Any:
            """Recursively rewrite {{old}} -> {{new}} references in strings."""
            if isinstance(obj, str):
                return _replace_refs_in_str(obj, mapping)
            if isinstance(obj, list):
                return [_rewrite_obj(x, mapping) for x in obj]
            if isinstance(obj, dict):
                return {k: _rewrite_obj(v, mapping) for k, v in obj.items()}
            return obj

        def _rewrite_expr(expr: Any, mapping: Dict[str, str]) -> Any:
            if not mapping or not isinstance(expr, str):
                return expr
            out_expr = expr
            for old, new in mapping.items():
                if not old or not new or old == new:
                    continue
                out_expr = re.sub(rf"\b{re.escape(old)}\b", new, out_expr)
            return out_expr

        allowed_derived_functions = {"daysBetween", "concat", "sum", "round", "toNumber"}

        def _is_allowed_derived_expression(expr: str) -> bool:
            if not isinstance(expr, str):
                return False
            s = expr.strip()
            if not s:
                return False
            # Direct ref: numberOfDays
            if re.match(r"^[A-Za-z][A-Za-z0-9]*$", s):
                return True
            m = re.match(r"^([A-Za-z][A-Za-z0-9]*)\s*\(", s)
            return bool(m and m.group(1) in allowed_derived_functions)

        # Normalize nodes
        normalized_nodes: List[Dict[str, Any]] = []
        seen_ids = set()
        auto_id = 1
        for i, n in enumerate(nodes):
            if not isinstance(n, dict):
                continue
            nid = str(n.get("id") or "").strip()
            ntype = str(n.get("type") or "").strip().lower()
            if ntype not in allowed_types:
                # Fallback to AI step so it remains executable
                ntype = "ai"
            if not nid or nid in seen_ids:
                while True:
                    candidate = f"node_{auto_id}"
                    auto_id += 1
                    if candidate not in seen_ids:
                        nid = candidate
                        break
            seen_ids.add(nid)

            name = str(n.get("name") or "").strip() or type_default_names.get(ntype, "Step")
            cfg = n.get("config")
            if not isinstance(cfg, dict):
                cfg = {}

            x = n.get("x")
            y = n.get("y")
            node_out = {
                "id": nid,
                "type": ntype,
                "name": name,
                "x": x,
                "y": y,
                "config": cfg,
            }
            # Allow engine-friendly output capture (invisible to UI, but persisted)
            ov = n.get("output_variable") or n.get("outputVariable")
            if isinstance(ov, str) and ov.strip():
                node_out["output_variable"] = ov.strip()
            # Carry optional UI fields if present (label offsets, font size, etc.)
            for extra_key in ["labelOffset", "labelFontSize", "toolId"]:
                if extra_key in n:
                    node_out[extra_key] = n[extra_key]
            normalized_nodes.append(node_out)

        # Ensure exactly one trigger node
        trigger_nodes = [n for n in normalized_nodes if n.get("type") in ("trigger", "form")]
        if not trigger_nodes:
            # Build fields from analysis variables when available
            vars_in = analysis.get("variables") if isinstance(analysis, dict) else None
            fields = []
            if isinstance(vars_in, list):
                for v in vars_in[:10]:
                    if not isinstance(v, dict):
                        continue
                    vname = str(v.get("name") or "").strip()
                    if not vname:
                        continue
                    vtype = str(v.get("type") or "text").lower()
                    key_name = _to_camel_key(vname) or vname
                    label = _humanize_label(v.get("label") or vname) or vname
                    ui_type = "text"
                    if vtype in ("number", "int", "float"):
                        ui_type = "number"
                    elif vtype in ("date", "datetime"):
                        ui_type = "date"
                    elif vtype in ("email",):
                        ui_type = "email"
                    elif vtype in ("object", "array"):
                        ui_type = "textarea"
                    fields.append({
                        "name": key_name,
                        "label": label,
                        "type": ui_type,
                        "required": False,
                        "placeholder": f"Enter {label}",
                    })
            if not fields:
                fields = [{"name": "details", "label": "Details", "type": "text", "required": True, "placeholder": "Enter details..."}]
            normalized_nodes.insert(0, {
                "id": "node_start",
                "type": "trigger",
                "name": "Start",
                "x": 400,
                "y": 100,
                "config": {
                    "triggerType": "manual",
                    "formTitle": "Request details",
                    "submitText": "Submit",
                    "fields": fields,
                },
            })
        else:
            # Keep first trigger/form, convert others to AI steps (avoid multiple starts)
            first_id = trigger_nodes[0]["id"]
            for n in normalized_nodes:
                if n.get("type") in ("trigger", "form") and n.get("id") != first_id:
                    n["type"] = "ai"
                    n["name"] = n.get("name") or "AI Task"
                    n.setdefault("config", {})

            # Ensure trigger fields are present and non-empty for a usable run form
            start = next((n for n in normalized_nodes if n.get("type") in ("trigger", "form")), None)
            if start:
                cfg = start.get("config") if isinstance(start.get("config"), dict) else {}
                # triggerType: manual (default), schedule, webhook
                ttype = str(cfg.get("triggerType") or "manual").strip().lower()
                if ttype not in ("manual", "schedule", "webhook"):
                    ttype = "manual"
                cfg["triggerType"] = ttype

                fields = cfg.get("fields")
                if ttype == "manual":
                    if not isinstance(fields, list) or len(fields) == 0:
                        cfg["fields"] = [{"name": "details", "label": "Details", "type": "text", "required": True, "placeholder": "Enter details..."}]
                    else:
                        # Ensure business-friendly labels and sane defaults
                        for f in fields:
                            if not isinstance(f, dict):
                                continue
                            fname = str(f.get("name") or f.get("id") or "").strip()
                            if fname and not f.get("label"):
                                f["label"] = _humanize_label(fname) or fname
                            ftype = str(f.get("type") or "text").strip().lower()
                            if ftype == "select" and "options" not in f:
                                f["options"] = []
                            if not f.get("placeholder") and f.get("label"):
                                f["placeholder"] = f"Enter {f.get('label')}"
                else:
                    # For schedule/webhook, form fields are optional
                    if not isinstance(fields, list):
                        cfg["fields"] = []
                    if ttype == "schedule":
                        if not cfg.get("cron"):
                            cfg["cron"] = "0 9 * * *"
                        if not cfg.get("timezone"):
                            cfg["timezone"] = "UTC"
                    if ttype == "webhook":
                        if not cfg.get("method"):
                            cfg["method"] = "POST"
                        if not cfg.get("path"):
                            cfg["path"] = "/trigger"
                if not cfg.get("triggerType"):
                    cfg["triggerType"] = "manual"
                start["config"] = cfg

        # Identity-resolved fields that should NOT appear in forms
        # (the engine resolves these automatically from the configured identity directory)
        _identity_auto_fields = {"manageremail", "managername", "managerid",
                                 "manager_email", "manager_name", "manager_id",
                                 "supervisoremail", "supervisorname"}

        # Normalize trigger field keys to lowerCamelCase and rewrite {{refs}} across nodes
        start = next((n for n in normalized_nodes if n.get("type") in ("trigger", "form")), None)
        if start and isinstance(start.get("config"), dict):
            cfg = start["config"]
            fields = cfg.get("fields") if isinstance(cfg.get("fields"), list) else []
            used = set()
            mapping: Dict[str, str] = {}
            # DYNAMIC: Accept ANY prefill key — the frontend resolver handles
            # all standard keys + custom_attributes from HR/LDAP dynamically.
            # We only validate that the source is "currentUser", not the key itself,
            # because organizations can have unlimited custom attributes
            # (national_id, hire_date, office_location, cost_center, etc.)
            allowed_prefill_keys = None  # None = accept any key
            safe_taxonomies = load_safe_taxonomies()

            for f in fields:
                if not isinstance(f, dict):
                    continue
                old_name = str(f.get("name") or f.get("id") or "").strip()
                label = str(f.get("label") or "").strip()
                # Generate key from label if name missing
                desired = _to_camel_key(old_name) or _to_camel_key(label) or old_name or "field"
                # Ensure uniqueness
                key = desired
                if key in used:
                    i = 2
                    while f"{key}{i}" in used:
                        i += 1
                    key = f"{key}{i}"
                used.add(key)
                if old_name and old_name != key:
                    mapping[old_name] = key
                f["name"] = key
                if not label:
                    f["label"] = _humanize_label(key) or key

                ftype = str(f.get("type") or "text").strip().lower()

                # AUTO-DETECT: Convert text fields that should be dropdowns based on field name patterns
                _select_keywords = {"category", "type", "status", "priority", "level", "method",
                                    "currency", "rating", "frequency", "severity", "classification",
                                    "source", "reason", "department", "mode", "channel", "grade"}
                if ftype == "text":
                    fname_lower = (f.get("name") or "").lower()
                    flabel_lower = (f.get("label") or "").lower()
                    name_words = set(re.split(r'(?=[A-Z])|[_\s]+', fname_lower))
                    label_words = set(flabel_lower.split())
                    if name_words & _select_keywords or label_words & _select_keywords:
                        # This field should be a dropdown — but LLM used text
                        ftype = "select"
                        f["type"] = "select"
                        if not f.get("options"):
                            f["options"] = []  # Will stay empty — admin can fill in edit mode

                # Validate/normalize select options
                if ftype == "select":
                    opts = f.get("options")
                    opts_list = [str(o).strip() for o in (opts or [])] if isinstance(opts, list) else []
                    opts_list = [o for o in opts_list if o]
                    options_source = str(f.get("optionsSource") or "").strip()

                    if opts_list:
                        # LLM provided options — KEEP THEM as a dropdown.
                        # Optionally match to a taxonomy for validation.
                        if not options_source and safe_taxonomies:
                            for tax_id, allowed in safe_taxonomies.items():
                                if allowed and all(o in allowed for o in opts_list):
                                    options_source = f"taxonomy:{tax_id}"
                                    break
                        f["options"] = opts_list
                        if options_source:
                            f["optionsSource"] = options_source
                        else:
                            f.pop("optionsSource", None)
                    else:
                        # No options provided — downgrade to text (admin can convert in edit mode)
                        f["type"] = "text"
                        f.pop("options", None)
                        f.pop("optionsSource", None)

                # Validate derived fields
                derived = f.get("derived")
                if isinstance(derived, dict):
                    expr = derived.get("expression")
                    expr = _rewrite_expr(expr, mapping)
                    if isinstance(expr, str):
                        derived["expression"] = expr
                    if not isinstance(expr, str) or not _is_allowed_derived_expression(expr):
                        f.pop("derived", None)
                        f["readOnly"] = False
                elif f.get("readOnly") is True and "prefill" not in f:
                    # Read-only without derived/prefill is usually unintended
                    f["readOnly"] = False

                # Validate prefill
                prefill = f.get("prefill")
                if isinstance(prefill, dict):
                    src = str(prefill.get("source") or "").strip()
                    k = str(prefill.get("key") or "").strip()
                    if src != "currentUser" or not k:
                        f.pop("prefill", None)

                # Placeholder
                if not f.get("placeholder") and f.get("label"):
                    f["placeholder"] = f"Enter {f.get('label')}"

            # ENFORCE: Remove form fields that the identity directory resolves automatically.
            # The AI should NEVER ask the user to enter their manager's email/name/ID —
            # these are resolved by the engine from the configured identity source.
            _before_count = len(fields)
            fields = [
                f for f in fields
                if not isinstance(f, dict)
                or (f.get("name") or "").lower() not in _identity_auto_fields
            ]
            cfg["fields"] = fields
            _removed_count = _before_count - len(fields)
            if _removed_count:
                logger.info(f"Removed {_removed_count} manager/identity fields from form — engine resolves these automatically from the identity directory")

            # Rewrite references across all nodes
            if mapping:
                for n in normalized_nodes:
                    if not isinstance(n, dict):
                        continue
                    ncfg = n.get("config")
                    if isinstance(ncfg, dict):
                        n["config"] = _rewrite_obj(ncfg, mapping)
                    # Condition nodes may store raw field key outside {{ }}
                    if n.get("type") == "condition" and isinstance(n.get("config"), dict):
                        cf = n["config"].get("field")
                        if isinstance(cf, str) and cf in mapping:
                            n["config"]["field"] = mapping[cf]

        # Ensure at least one end node
        if not any(n.get("type") == "end" for n in normalized_nodes):
            normalized_nodes.append({
                "id": "node_end",
                "type": "end",
                "name": "End",
                "x": 400,
                "y": 100 + 140 * max(1, len(normalized_nodes)),
                "config": {"output": ""},
            })

        node_ids = {n["id"] for n in normalized_nodes if n.get("id")}

        # Normalize edges
        normalized_edges: List[Dict[str, Any]] = []
        for e in edges:
            if not isinstance(e, dict):
                continue
            frm = e.get("from") or e.get("source")
            to = e.get("to") or e.get("target")
            if not frm or not to:
                continue
            frm = str(frm)
            to = str(to)
            if frm not in node_ids or to not in node_ids:
                continue
            etype = e.get("type")
            edge_out: Dict[str, Any] = {"from": frm, "to": to}
            if etype in ("yes", "no", "default"):
                edge_out["type"] = etype
            normalized_edges.append(edge_out)

        # If edges are empty, create a simple linear chain
        if not normalized_edges and len(normalized_nodes) >= 2:
            for i in range(len(normalized_nodes) - 1):
                normalized_edges.append({"from": normalized_nodes[i]["id"], "to": normalized_nodes[i + 1]["id"]})

        # Ensure condition nodes have yes/no outgoing edges (best-effort)
        cond_ids = [n["id"] for n in normalized_nodes if n.get("type") == "condition"]
        for cid in cond_ids:
            outs = [e for e in normalized_edges if e.get("from") == cid]
            has_yes = any(e.get("type") == "yes" for e in outs)
            has_no = any(e.get("type") == "no" for e in outs)
            if not (has_yes and has_no):
                # Choose two targets from existing edges or fall back to next nodes in list
                ordered_ids = [n["id"] for n in normalized_nodes]
                try:
                    idx = ordered_ids.index(cid)
                except ValueError:
                    idx = -1
                yes_target = outs[0]["to"] if outs else (ordered_ids[idx + 1] if idx >= 0 and idx + 1 < len(ordered_ids) else ordered_ids[-1])
                no_target = (ordered_ids[idx + 2] if idx >= 0 and idx + 2 < len(ordered_ids) else ordered_ids[-1])
                # Remove previous outs without explicit type to avoid confusion
                normalized_edges = [e for e in normalized_edges if not (e.get("from") == cid and e.get("type") not in ("yes", "no"))]
                if not has_yes:
                    normalized_edges.append({"from": cid, "to": yes_target, "type": "yes"})
                if not has_no:
                    normalized_edges.append({"from": cid, "to": no_target, "type": "no"})

        # ENFORCE: Extract Document Text actions must have sourceField set.
        # Find file fields from the trigger node and auto-assign if missing.
        trigger_file_fields = []
        trigger_multi_file_fields = set()  # Track which file fields accept multiple files
        trigger_node = next((n for n in normalized_nodes if n.get("type") in ("trigger", "form")), None)
        if trigger_node:
            t_fields = (trigger_node.get("config") or {}).get("fields") or []
            for f in t_fields:
                if isinstance(f, dict) and str(f.get("type", "")).lower() == "file":
                    fname = f.get("name")
                    if fname:
                        trigger_file_fields.append(fname)
                        if f.get("multiple"):
                            trigger_multi_file_fields.add(fname)

        if not trigger_file_fields and any(
            str((n.get("config") or {}).get("actionType") or "").strip().lower().replace("_", "") in ("extractdocumenttext", "extracttext")
            for n in normalized_nodes if n.get("type") == "action"
        ):
            logger.warning("Extract Document Text action(s) present but trigger has no file fields; sourceField may be unset")

        # Map: extraction output_variable → whether it comes from a multi-file field
        extraction_multi_file_vars = {}

        for n in normalized_nodes:
            if n.get("type") != "action":
                continue
            cfg = n.get("config") if isinstance(n.get("config"), dict) else {}
            at = str(cfg.get("actionType") or "").strip().lower().replace("_", "")
            if at in ("extractdocumenttext", "extracttext"):
                sf = str(cfg.get("sourceField") or "").strip()
                # Verify sourceField matches an actual trigger file field
                if sf and trigger_file_fields and sf not in trigger_file_fields:
                    # LLM set a sourceField that doesn't match any trigger file field — fix it
                    sf = trigger_file_fields[0]
                    cfg["sourceField"] = sf
                elif not sf and trigger_file_fields:
                    # No sourceField set — pick the first file field
                    sf = trigger_file_fields[0]
                    cfg["sourceField"] = sf
                # ALWAYS set path from sourceField (even if output_variable already exists)
                if sf:
                    cfg["path"] = "{{" + sf + ".path}}"
                ov = n.get("output_variable") or n.get("outputVariable") or ""
                if not ov:
                    n["output_variable"] = sf + "Text" if sf else "extractedData"
                    ov = n["output_variable"]
                # Auto-generate a friendly dataLabel for non-technical users
                if not cfg.get("dataLabel"):
                    # Try to derive from source field's label or the node name
                    source_label = ""
                    if sf:
                        # Find the trigger field label
                        for tn in normalized_nodes:
                            if tn.get("type") in ("trigger", "form"):
                                for fld in (tn.get("config") or {}).get("fields") or []:
                                    if (fld.get("name") or fld.get("id") or "") == sf:
                                        source_label = fld.get("label", "")
                                        break
                        if not source_label:
                            # humanize the field name: camelCase/snake_case → Title Case
                            source_label = re.sub(r'([a-z0-9])([A-Z])', r'\1 \2', sf)
                            source_label = source_label.replace('_', ' ').strip().title()
                    node_name = n.get("name", "")
                    cfg["dataLabel"] = node_name if node_name and node_name.lower() != "action" else (
                        (source_label + " Text") if source_label else "Extracted Text"
                    )
                # Track if this extraction uses a multi-file field
                if sf and sf in trigger_multi_file_fields:
                    extraction_multi_file_vars[ov] = sf
                n["config"] = cfg

        # ENFORCE: AI nodes that parse multi-file extraction output must handle ALL files.
        # When the extraction comes from a multi-file field, the AI node's prompt must
        # instruct it to parse every file and structure the data for downstream use.
        if extraction_multi_file_vars:
            for n in normalized_nodes:
                if n.get("type") != "ai":
                    continue
                cfg = n.get("config") if isinstance(n.get("config"), dict) else {}
                prompt = str(cfg.get("prompt") or "").strip()
                # Check if this AI node references any multi-file extraction variable
                for ext_var, file_field in extraction_multi_file_vars.items():
                    if "{{" + ext_var + "}}" in prompt or ext_var in prompt:
                        # This AI node parses multi-file extraction — enhance prompt
                        if "ALL documents" not in prompt and "all documents" not in prompt and "each document" not in prompt and "every file" not in prompt:
                            multi_file_instruction = (
                                "\n\nIMPORTANT: The input text may contain data from MULTIPLE uploaded files/documents "
                                "(each separated by '--- File: <name> ---' headers). "
                                "You MUST parse and extract data from EVERY file, not just the first one. "
                                "Return a JSON object that includes: "
                                "(1) 'items' — an array where each element contains the extracted data from one file "
                                "(include 'fileName' and all relevant fields per file); "
                                "(2) 'itemCount' — the number of files processed; "
                                "(3) any additional computed or aggregated fields that downstream workflow steps "
                                "might need based on the business context (e.g., totals, summaries, flags). "
                                "Use your judgment to decide what aggregated fields are appropriate for this workflow."
                            )
                            cfg["prompt"] = prompt + multi_file_instruction
                            n["config"] = cfg
                            logger.info(f"Enhanced AI node '{n.get('name')}' prompt for multi-file processing (source: {file_field})")
                        break

        # ENFORCE: AI nodes whose output_variable is referenced by downstream steps
        # (conditions, notifications, approvals) using dot notation (e.g., parsedData.totalAmount)
        # MUST output JSON so the engine can resolve nested fields.
        # Collect ALL dot-notation references from every node type that uses them.
        referenced_fields = set()

        for n in normalized_nodes:
            cfg = n.get("config") or {}
            ntype = n.get("type") or ""

            # Conditions: field-based and expression-based
            if ntype == "condition":
                f = str(cfg.get("field") or "").strip()
                if "." in f:
                    referenced_fields.add(f)
                expr = str(cfg.get("expression") or "").strip()
                if expr and "{{" in expr and "}}" in expr:
                    for m in re.finditer(r"\{\{\s*([A-Za-z_]\w*)\.([A-Za-z_]\w*)\s*\}\}", expr):
                        referenced_fields.add(f"{m.group(1)}.{m.group(2)}")

            # Notifications: template, message, title may reference {{parsedData.X}}
            if ntype == "notification":
                for key in ("template", "message", "title"):
                    txt = str(cfg.get(key) or "").strip()
                    if txt and "{{" in txt:
                        for m in re.finditer(r"\{\{\s*([A-Za-z_]\w*)\.([A-Za-z_]\w*)\s*\}\}", txt):
                            referenced_fields.add(f"{m.group(1)}.{m.group(2)}")

            # Approvals: title, description, message may reference {{parsedData.X}}
            if ntype == "approval":
                for key in ("title", "description", "message", "instructions"):
                    txt = str(cfg.get(key) or "").strip()
                    if txt and "{{" in txt:
                        for m in re.finditer(r"\{\{\s*([A-Za-z_]\w*)\.([A-Za-z_]\w*)\s*\}\}", txt):
                            referenced_fields.add(f"{m.group(1)}.{m.group(2)}")

        if referenced_fields:
            # Build a set of base variable names (e.g., "parsedData" from "parsedData.totalAmount")
            referenced_base_vars = {f.split(".")[0] for f in referenced_fields}
            for n in normalized_nodes:
                if n.get("type") != "ai":
                    continue
                ov = n.get("output_variable") or n.get("outputVariable") or ""
                if ov and ov in referenced_base_vars:
                    cfg = n.get("config") if isinstance(n.get("config"), dict) else {}
                    # Force JSON output format and low temperature for accuracy
                    cfg["output_format"] = "json"
                    cfg["temperature"] = 0.1  # Low temp for data extraction — minimize hallucination
                    # Enhance the prompt to instruct JSON output with ALL expected field names
                    prompt = str(cfg.get("prompt") or "").strip()
                    # Collect all fields expected from this variable across all downstream steps
                    expected_fields = sorted(set(f.split(".", 1)[1] for f in referenced_fields if f.startswith(ov + ".")))
                    json_instruction = (
                        "\n\nIMPORTANT: You MUST respond with valid JSON only. Return a JSON object that includes AT LEAST these fields: "
                        + ", ".join(f'"{fld}"' for fld in expected_fields)
                        + ". Example: {"
                        + ", ".join(f'"{fld}": <value>' for fld in expected_fields)
                        + "}. Numbers must be numeric (not strings). "
                        + "For 'details' or 'summary' fields, provide a brief human-readable description of the ACTUAL extracted data — "
                        + "NEVER use generic placeholders like 'Extracted data from receipts' or 'Three transactions recorded'. "
                        + "Include real values from the source text."
                        + "\n\nANTI-HALLUCINATION RULES (CRITICAL):"
                        + "\n- ONLY use data that is EXPLICITLY present in the input text. NEVER invent, fabricate, or guess values."
                        + "\n- If the input contains numbers (amounts, totals, quantities), extract them EXACTLY as they appear."
                        + "\n- If multiple documents/files are provided, sum or aggregate values ONLY from the actual text — never estimate."
                        + "\n- If a value cannot be determined from the input, use null — NEVER make up a plausible-sounding value."
                        + "\n- For the 'details' or 'summary' field, describe SPECIFIC items from the actual data "
                        + "(e.g., 'Parking fee: 100 AED from City Parking, Flight ticket: 1500 AED from Emirates') "
                        + "not vague descriptions."
                        + "\nDo NOT include any text outside the JSON."
                    )
                    if "MUST respond with valid JSON" not in prompt:
                        cfg["prompt"] = prompt + json_instruction
                    n["config"] = cfg
                    logger.info(f"Enforced JSON output on AI node '{n.get('name')}' (output_variable={ov}) for fields: {expected_fields}")

        # ENFORCE: Notification nodes must have recipient and template populated.
        # The LLM may use engine format (recipients/message) instead of visual builder format (recipient/template),
        # or may leave them empty. Auto-fix both issues.
        # Collect trigger field names for building smart messages
        trigger_fields = []
        _tn = next((n for n in normalized_nodes if n.get("type") in ("trigger", "form")), None)
        if _tn:
            _tfields = (_tn.get("config") or {}).get("fields") or []
            trigger_fields = [f.get("name") for f in _tfields if isinstance(f, dict) and f.get("name")]

        for n in normalized_nodes:
            if n.get("type") != "notification":
                continue
            cfg = n.get("config") if isinstance(n.get("config"), dict) else {}
            # Normalize engine format → visual builder format
            if not cfg.get("recipient") and cfg.get("recipients"):
                rlist = cfg["recipients"]
                if isinstance(rlist, list) and rlist:
                    cfg["recipient"] = str(rlist[0])
                elif isinstance(rlist, str):
                    cfg["recipient"] = rlist
            if not cfg.get("template") and cfg.get("message"):
                cfg["template"] = str(cfg["message"])
            if not cfg.get("template") and cfg.get("title"):
                cfg["template"] = str(cfg["title"])

            # Normalize common recipient patterns to engine-supported shortcuts.
            # The AI may generate verbose template references instead of the simpler shortcuts.
            r = str(cfg.get("recipient") or "").strip()
            r_lower = r.lower()
            # Strip {{ }} wrappers for comparison
            r_stripped = re.sub(r"\{\{|\}\}", "", r_lower).strip()
            # Normalize verbose user_context email references to "requester" shortcut
            if "_user_context" in r and ("email" in r_lower and "manager" not in r_lower):
                cfg["recipient"] = "requester"
            # Normalize verbose manager_email references to "manager" shortcut
            elif "manager_email" in r_lower or "manager email" in r_lower:
                cfg["recipient"] = "manager"
            # Normalize form field references to manager email (e.g., {{manageremail}}) to shortcut
            elif r_stripped in _identity_auto_fields or r_stripped in ("manageremail", "manager_email"):
                cfg["recipient"] = "manager"
            # Normalize form field references to employee/user email to requester shortcut
            elif r_stripped in ("employeeemail", "employee_email", "useremail", "user_email"):
                cfg["recipient"] = "requester"

            # Auto-fill empty recipient based on node name/context
            if not cfg.get("recipient") or cfg.get("recipient") in ("", "-- Select Field --"):
                name_lower = (n.get("name") or "").lower()
                if "manager" in name_lower or "supervisor" in name_lower or "boss" in name_lower:
                    cfg["recipient"] = "manager"
                else:
                    # Default to requester (employee) for all other notifications
                    cfg["recipient"] = "requester"

            # Auto-fill empty template with a smart default message
            if not cfg.get("template") or not str(cfg.get("template", "")).strip():
                name = n.get("name") or "Notification"
                # Build a contextual message using available form fields
                field_refs = " | ".join([f"{{{{{f}}}}}" for f in trigger_fields[:6]]) if trigger_fields else ""
                field_summary = f"\n\nDetails: {field_refs}" if field_refs else ""
                name_lower = (n.get("name") or "").lower()

                if "auto" in name_lower and "approv" in name_lower:
                    cfg["template"] = f"Your request has been automatically approved as it meets the auto-approval criteria.{field_summary}"
                elif "approv" in name_lower and "manager" not in name_lower:
                    cfg["template"] = f"Your request has been approved.{field_summary}"
                elif "reject" in name_lower:
                    cfg["template"] = f"Your request has been reviewed and was not approved at this time. Please contact your manager for details.{field_summary}"
                elif "manager" in name_lower and "pending" in name_lower:
                    cfg["template"] = f"A new request requires your approval. Please review and take action.{field_summary}"
                elif "manager" in name_lower:
                    cfg["template"] = f"A request requires your attention.{field_summary}"
                else:
                    cfg["template"] = f"{name}{field_summary}"

            # Ensure channel is set
            if not cfg.get("channel"):
                cfg["channel"] = "email"
            n["config"] = cfg

        # ENFORCE: Exactly one end node. If multiple, merge into one. If none, create one.
        end_nodes = [n for n in normalized_nodes if n.get("type") == "end"]
        non_end_nodes = [n for n in normalized_nodes if n.get("type") != "end"]
        if not end_nodes:
            end_nodes = [{"id": "end_node", "type": "end", "name": "End", "config": {}}]
        elif len(end_nodes) > 1:
            # Keep first end node, redirect all edges pointing to other end nodes
            primary_end = end_nodes[0]
            extra_end_ids = {n["id"] for n in end_nodes[1:]}
            for e in normalized_edges:
                if e.get("to") in extra_end_ids:
                    e["to"] = primary_end["id"]
            # Remove edges FROM extra end nodes
            normalized_edges = [e for e in normalized_edges if e.get("from") not in extra_end_ids]
            end_nodes = [primary_end]

        # End node must be LAST in the array
        normalized_nodes = non_end_nodes + end_nodes
        end_id = end_nodes[0]["id"]

        # ENFORCE: All paths must reach the end node.
        # Any non-end node with no outgoing edge → connect to end.
        node_ids_with_outgoing = set(e.get("from") for e in normalized_edges)
        for n in normalized_nodes:
            if n.get("type") != "end" and n["id"] not in node_ids_with_outgoing:
                normalized_edges.append({"from": n["id"], "to": end_id})

        # ENFORCE: Nothing should come AFTER the end node.
        # Remove any edge where end node is the source (end should have no outgoing edges).
        normalized_edges = [e for e in normalized_edges if e.get("from") != end_id]

        # Assign positions if missing / invalid and snap to grid
        base_x = 400
        base_y = 100
        gap_y = 200
        for i, n in enumerate(normalized_nodes):
            x = n.get("x")
            y = n.get("y")
            if not isinstance(x, (int, float)):
                x = base_x
            if not isinstance(y, (int, float)):
                y = base_y + i * gap_y
            # Snap to 20px grid (same as UI)
            n["x"] = int(round(float(x) / 20) * 20)
            n["y"] = int(round(float(y) / 20) * 20)

        # ENFORCE: End node positioned below all other nodes
        if end_nodes:
            max_y = max((n.get("y", 0) for n in normalized_nodes if n.get("type") != "end"), default=100)
            for en in end_nodes:
                if en.get("y", 0) <= max_y:
                    en["y"] = int(round((max_y + gap_y) / 20) * 20)
                    en["x"] = base_x  # Center it

        out["nodes"] = normalized_nodes
        out["edges"] = normalized_edges
        out["generated_at"] = datetime.utcnow().isoformat()
        out["generated_by"] = "process_wizard"
        return out
    
    async def _analyze_goal(self, goal: str) -> Dict[str, Any]:
        """Analyze the user's goal to determine process pattern"""
        patterns_desc = "\n".join([
            f"- {name}: {pattern['description']}"
            for name, pattern in PROCESS_PATTERNS.items()
        ])
        
        user_prompt = GOAL_ANALYSIS_PROMPT.format(
            goal=goal,
            patterns_description=patterns_desc
        )

        system_prompt = (
            "You are an expert workflow designer. "
            "Return ONLY valid JSON. No markdown, no comments, no extra text."
        )

        try:
            data = await self._chat_json(system_prompt, user_prompt, temperature=0.2, max_tokens=1200)
            return data if isinstance(data, dict) else {
                "pattern": "approval_workflow",
                "pattern_match_confidence": 0.5,
                "summary": goal,
                "suggested_nodes": [],
                "considerations": [],
            }
        except Exception:
            return {
                "pattern": "approval_workflow",
                "pattern_match_confidence": 0.5,
                "summary": goal,
                "suggested_nodes": [],
                "considerations": [],
            }
    
    async def _generate_process(
        self, 
        goal: str, 
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate the complete process definition"""
        # Get node types for context
        node_types = self._get_node_types_description()
        
        # Build prompt
        user_prompt = PROCESS_GENERATION_PROMPT.format(
            goal=goal,
            analysis=json.dumps(analysis, indent=2),
            business_hours=f"{self.org_settings.get('business_hours', {}).get('start_hour', 9)}-{self.org_settings.get('business_hours', {}).get('end_hour', 17)}",
            timezone=self.org_settings.get('business_hours', {}).get('timezone', 'UTC'),
            approval_timeout=self.org_settings.get('approval_defaults', {}).get('timeout_hours', 24),
            node_types=node_types
        )

        system_prompt = (
            "You are an expert workflow designer. "
            "Return ONLY valid JSON matching the requested schema. "
            "No markdown, no explanation."
        )

        data = await self._chat_json(system_prompt, user_prompt, temperature=0.25, max_tokens=3000)
        if not isinstance(data, dict):
            raise ValueError("Process definition must be a JSON object")
        return data
    
    async def suggest_node_config(
        self,
        node_type: str,
        node_name: str,
        purpose: str,
        goal: str,
        existing_variables: List[str] = None
    ) -> Dict[str, Any]:
        """
        Suggest configuration for a specific node
        
        Used when user adds a node in the builder and needs config help.
        """
        if not self.llm:
            return self._get_default_node_config(node_type)
        
        prompt = NODE_CONFIG_PROMPT.format(
            node_type=node_type,
            purpose=purpose,
            name=node_name,
            goal=goal,
            variables=json.dumps(existing_variables or []),
            org_settings=json.dumps(self.org_settings)
        )

        system_prompt = (
            "You are an expert workflow designer. "
            "Return ONLY valid JSON for the node config. "
            "No markdown, no explanation."
        )

        try:
            data = await self._chat_json(system_prompt, prompt, temperature=0.25, max_tokens=1200)
            return data if isinstance(data, dict) else self._get_default_node_config(node_type)
        except Exception:
            return self._get_default_node_config(node_type)
    
    def _generate_from_template(self, goal: str) -> Dict[str, Any]:
        """Generate a basic process from templates (no LLM fallback)"""
        # Simple keyword matching
        goal_lower = goal.lower()
        
        if any(word in goal_lower for word in ['approval', 'approve', 'review']):
            pattern = "approval_workflow"
        elif any(word in goal_lower for word in ['sync', 'integrate', 'api']):
            pattern = "integration_sync"
        elif any(word in goal_lower for word in ['schedule', 'daily', 'weekly', 'cron']):
            pattern = "scheduled_job"
        elif any(word in goal_lower for word in ['ai', 'gpt', 'llm', 'analyze']):
            pattern = "ai_workflow"
        elif any(word in goal_lower for word in ['task', 'assign', 'work']):
            pattern = "human_task"
        else:
            pattern = "data_pipeline"
        
        template = PROCESS_PATTERNS[pattern]
        
        # Generate basic structure
        nodes = []
        edges = []
        x, y = 100, 100
        
        for i, node_type in enumerate(template['typical_nodes']):
            node_id = f"{node_type}_{i+1}"
            nodes.append({
                "id": node_id,
                "type": node_type,
                "name": node_type.replace('_', ' ').title(),
                "position": {"x": x, "y": y},
                "config": self._get_default_node_config(node_type),
                "next_nodes": []
            })
            
            if i > 0:
                edges.append({
                    "id": f"edge_{i}",
                    "source": f"{template['typical_nodes'][i-1]}_{i}",
                    "target": node_id
                })
                nodes[i-1]["next_nodes"] = [node_id]
            
            y += 120
        
        return {
            "name": goal[:50] if len(goal) > 50 else goal,
            "description": goal,
            "version": "1.0",
            "variables": [],
            "triggers": [{"type": template['triggers'][0], "config": {}}],
            "nodes": nodes,
            "edges": edges,
            "settings": {}
        }

    def _generate_visual_from_template(self, goal: str) -> Dict[str, Any]:
        """
        Generate a basic Visual Builder workflow (no LLM fallback).
        Uses the UI node/edge shape: nodes[{id,type,name,x,y,config}] and edges[{from,to,type?}].
        """
        goal_lower = (goal or "").lower()
        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []

        # Always start with a trigger (form)
        nodes.append({
            "id": "node_1",
            "type": "trigger",
            "name": "Start",
            "x": 400,
            "y": 100,
            "config": {
                "triggerType": "manual",
                "formTitle": "Request details",
                "submitText": "Submit",
                "fields": [{"name": "input", "type": "text", "required": True, "placeholder": "Enter details..."}],
            },
        })

        # Approval-oriented fallback
        _approval_keywords = ["approval", "approve", "review", "manager", "vacation", "leave",
                              "expense", "request", "إجازة", "مصروفات", "طلب"]
        _is_hr_process = any(w in goal_lower for w in [
            "vacation", "leave", "expense", "hr", "employee", "إجازة", "مصروفات", "موظف"
        ])
        # If HR process, replace the basic trigger with identity-prefilled fields
        if _is_hr_process and any(w in goal_lower for w in _approval_keywords):
            nodes[0]["config"]["fields"] = [
                {"name": "employeeName", "label": "Employee Name", "type": "text", "required": True, "readOnly": True, "prefill": {"source": "currentUser", "key": "name"}},
                {"name": "employeeEmail", "label": "Email", "type": "email", "required": True, "readOnly": True, "prefill": {"source": "currentUser", "key": "email"}},
                {"name": "department", "label": "Department", "type": "text", "required": False, "readOnly": True, "prefill": {"source": "currentUser", "key": "departmentName"}},
                {"name": "employeeId", "label": "Employee ID", "type": "text", "required": False, "readOnly": True, "prefill": {"source": "currentUser", "key": "employeeId"}},
                {"name": "details", "label": "Details", "type": "textarea", "required": True, "placeholder": "Enter request details..."},
            ]
        if any(w in goal_lower for w in _approval_keywords):
            # Use user_directory for manager-related goals; platform_user otherwise
            is_manager_approval = any(w in goal_lower for w in [
                "manager", "supervisor", "boss", "مدير", "موافقة المدير",
                "vacation", "leave", "expense", "إجازة", "مصروفات",
            ])
            approval_config = {
                "message": "Please review and approve this request.",
                "timeout_hours": 24,
            }
            if is_manager_approval:
                approval_config.update({
                    "assignee_source": "user_directory",
                    "directory_assignee_type": "dynamic_manager",
                    "assignee_type": "user",
                    "assignee_ids": [],
                })
            else:
                approval_config.update({
                    "assignee_source": "platform_user",
                    "assignee_type": "user",
                    "assignee_ids": [],
                })
            nodes.append({
                "id": "node_2",
                "type": "approval",
                "name": "Manager Approval" if is_manager_approval else "Approval",
                "x": 400,
                "y": 240,
                "config": approval_config,
            })
            edges.append({"from": "node_1", "to": "node_2"})
            nodes.append({
                "id": "node_3",
                "type": "notification",
                "name": "Notify Requester",
                "x": 400,
                "y": 380,
                "config": {"channel": "email", "recipient": "{{email}}", "template": "Your request was processed."},
            })
            edges.append({"from": "node_2", "to": "node_3"})
            nodes.append({
                "id": "node_4",
                "type": "end",
                "name": "End",
                "x": 400,
                "y": 520,
                "config": {"output": ""},
            })
            edges.append({"from": "node_3", "to": "node_4"})
        else:
            # Simple AI step fallback
            nodes.append({
                "id": "node_2",
                "type": "ai",
                "name": "Process Request",
                "x": 400,
                "y": 240,
                "output_variable": "result",
                "config": {"prompt": "Process this request and return a short result.\n\nInput: {{input}}", "model": "gpt-4o"},
            })
            edges.append({"from": "node_1", "to": "node_2"})
            nodes.append({
                "id": "node_3",
                "type": "end",
                "name": "End",
                "x": 400,
                "y": 380,
                "config": {"output": ""},
            })
            edges.append({"from": "node_2", "to": "node_3"})

        return {
            "name": goal[:60] if goal else "Workflow",
            "description": goal or "Workflow",
            "nodes": nodes,
            "edges": edges,
            "generated_at": datetime.utcnow().isoformat(),
            "generated_by": "process_wizard_template",
        }
    
    def _get_default_node_config(self, node_type: str) -> Dict[str, Any]:
        """Get default configuration for a node type"""
        defaults = {
            "start": {},
            "end": {},
            "ai_task": {
                "prompt": "{{input}}",
                "output_format": "text",
                "temperature": 0.7
            },
            "http_request": {
                "method": "GET",
                "url": "",
                "headers": {},
                "auth": {"type": "none"}
            },
            "database_query": {
                "operation": "query",
                "query": ""
            },
            "approval": {
                "title": "Approval Required",
                "assignee_type": "user",
                "min_approvals": 1,
                "timeout_hours": 24
            },
            "notification": {
                "channel": "email",
                "recipient": "requester",
                "template": ""
            },
            "condition": {
                "expression": "true"
            },
            "loop": {
                "items": "[]",
                "item_variable": "item",
                "index_variable": "index"
            },
            "transform": {
                "transform_type": "map",
                "mappings": {}
            },
            "delay": {
                "delay_type": "fixed",
                "duration_seconds": 60
            },
            "human_task": {
                "title": "Task",
                "description": "",
                "assignee_type": "user"
            },
            "tool_call": {
                "tool_id": "",
                "arguments": {}
            },
        }
        return defaults.get(node_type, {})
    
    def _get_node_types_description(self) -> str:
        """Get description of available node types"""
        descriptions = [
            "start: Entry point of the process",
            "end: Exit point of the process",
            "ai_task: LLM-powered task (config: prompt, output_format, temperature)",
            "http_request: REST API call (config: method, url, headers, body, auth)",
            "database_query: Database operation (config: operation, query)",
            "approval: Approval gate (config: title, assignee_type, min_approvals, timeout_hours)",
            "notification: Send notification (config: channel, recipients, title, message)",
            "condition: If/else branching (config: expression, true_branch, false_branch)",
            "loop: Iterate over items (config: items, item_variable, index_variable)",
            "parallel: Parallel execution (config: branches)",
            "transform: Data transformation (config: transform_type, mappings)",
            "validate: Data validation (config: rules)",
            "delay: Wait for duration (config: delay_type, duration_seconds)",
            "schedule: Wait until time (config: schedule_type, datetime)",
            "human_task: Assign task to user (config: title, description, assignee_type)",
            "tool_call: Execute platform tool (config: tool_id, arguments)",
        ]
        return "\n".join(f"- {d}" for d in descriptions)
    
    def _validate_and_enhance(self, process_def: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and enhance the generated process definition"""
        # Ensure required fields
        if "name" not in process_def:
            process_def["name"] = "Generated Process"
        
        if "version" not in process_def:
            process_def["version"] = "1.0"
        
        if "variables" not in process_def:
            process_def["variables"] = []
        
        if "triggers" not in process_def:
            process_def["triggers"] = [{"type": "manual", "config": {}}]
        
        if "nodes" not in process_def:
            process_def["nodes"] = []
        
        if "edges" not in process_def:
            process_def["edges"] = []
        
        if "settings" not in process_def:
            process_def["settings"] = {}
        
        # Validate nodes
        has_start = any(n.get("type") == "start" for n in process_def["nodes"])
        has_end = any(n.get("type") == "end" for n in process_def["nodes"])
        
        if not has_start:
            process_def["nodes"].insert(0, {
                "id": "start_1",
                "type": "start",
                "name": "Start",
                "position": {"x": 100, "y": 100},
                "config": {},
                "next_nodes": []
            })
        
        if not has_end:
            last_y = max((n.get("position", {}).get("y", 0) for n in process_def["nodes"]), default=100)
            process_def["nodes"].append({
                "id": "end_1",
                "type": "end",
                "name": "End",
                "position": {"x": 100, "y": last_y + 120},
                "config": {},
                "next_nodes": []
            })
        
        # Add generated timestamp
        process_def["generated_at"] = datetime.utcnow().isoformat()
        process_def["generated_by"] = "process_wizard"
        
        return process_def
