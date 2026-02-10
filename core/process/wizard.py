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
        "description": "Simple approval workflow with notification",
        "triggers": ["manual", "http_webhook"],
        "typical_nodes": ["start", "notification", "approval", "condition", "end"],
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

Available platform tools (optional; if empty, avoid tool nodes):
{tools_json}

IMPORTANT:
- Output ONLY valid JSON. No markdown. No extra keys outside the schema.
- This workflow will be edited in a visual builder and executed by an engine.
- Use ONLY these node types (exact strings):
  - trigger, condition, ai, tool, approval, notification, delay, end
- Always include exactly ONE start node of type "trigger".
- Always include at least ONE "end" node.
- If you include a "condition" node, you MUST create exactly two outgoing edges from it:
  - one with type "yes"
  - one with type "no"
- In prompts/templates, reference form fields using double braces like {{{{amount}}}} or {{{{email}}}}.

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
          {{"name":"amount","type":"number","required":true,"placeholder":"Enter amount"}}
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
- trigger.config.fields is REQUIRED and must be a non-empty array. Use types: text, textarea, number, date, email, select.
- condition.config must be: {{ "field": "<field_name>", "operator": "equals|not_equals|greater_than|less_than|contains|is_empty", "value": "<string or number>" }}
- ai.config must be: {{ "prompt": "<what to do, with {{{{field}}}} refs>", "model": "gpt-4o" }}
- ai nodes SHOULD include: "output_variable": "<variable_name>" to store the AI output (e.g. "result" or "analysis")
- tool.config must be: {{ "toolId": "<id from tools_json>", "params": {{...}} }}. Only use if tools_json has items.
- tool nodes SHOULD include: "output_variable": "<variable_name>" to store tool output.
- approval.config must include: assignee_source, assignee_type, assignee_ids (can be empty), timeout_hours, message.
- notification.config must include: channel, recipient, template. Prefer recipient from form field like {{{{email}}}} if present.
- delay.config must include: duration (number) and unit ("seconds"|"minutes"|"hours"|"days").
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
                        })
        tools_json = json.dumps(tools[:30], ensure_ascii=False, indent=2) if tools else "[]"

        user_prompt = VISUAL_BUILDER_GENERATION_PROMPT.format(
            goal=goal,
            analysis=json.dumps(analysis or {}, ensure_ascii=False, indent=2),
            tools_json=tools_json,
        )
        system_prompt = (
            "You are a workflow designer. "
            "Return ONLY valid JSON that matches the schema exactly. "
            "No markdown, no explanation."
        )
        data = await self._chat_json(system_prompt, user_prompt, temperature=0.25, max_tokens=3500)
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

        allowed_types = {"trigger", "condition", "ai", "tool", "approval", "notification", "delay", "end", "form", "action"}
        type_default_names = {
            "trigger": "Start",
            "form": "Start Form",
            "condition": "Condition",
            "ai": "AI Task",
            "tool": "Use Tool",
            "approval": "Approval",
            "notification": "Send Notification",
            "delay": "Wait",
            "action": "Action",
            "end": "End",
        }

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
                        "name": vname,
                        "type": ui_type,
                        "required": False,
                        "placeholder": f"Enter {vname.replace('_', ' ')}",
                    })
            if not fields:
                fields = [{"name": "input", "type": "text", "required": True, "placeholder": "Enter details..."}]
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
                fields = cfg.get("fields")
                if not isinstance(fields, list) or len(fields) == 0:
                    cfg["fields"] = [{"name": "input", "type": "text", "required": True, "placeholder": "Enter details..."}]
                if not cfg.get("triggerType"):
                    cfg["triggerType"] = "manual"
                start["config"] = cfg

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

        # Assign positions if missing / invalid and snap to grid
        base_x = 400
        base_y = 100
        gap_y = 140
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
        if any(w in goal_lower for w in ["approval", "approve", "review", "manager"]):
            nodes.append({
                "id": "node_2",
                "type": "approval",
                "name": "Approval",
                "x": 400,
                "y": 240,
                "config": {
                    "message": "Please review and approve this request.",
                    "assignee_source": "platform_user",
                    "assignee_type": "user",
                    "assignee_ids": [],
                    "timeout_hours": 24,
                },
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
                "recipients": [],
                "title": "",
                "message": ""
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
