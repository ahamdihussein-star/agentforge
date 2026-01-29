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
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


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
    
    async def generate_from_goal(
        self,
        goal: str,
        additional_context: Dict[str, Any] = None
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
            return self._generate_from_template(goal)
        
        try:
            # Step 1: Analyze the goal
            analysis = await self._analyze_goal(goal)
            
            # Step 2: Generate process definition
            process_def = await self._generate_process(goal, analysis)
            
            # Step 3: Validate and enhance
            process_def = self._validate_and_enhance(process_def)
            
            return process_def
            
        except Exception as e:
            logger.error(f"Wizard generation failed: {e}")
            # Fall back to template
            return self._generate_from_template(goal)
    
    async def _analyze_goal(self, goal: str) -> Dict[str, Any]:
        """Analyze the user's goal to determine process pattern"""
        patterns_desc = "\n".join([
            f"- {name}: {pattern['description']}"
            for name, pattern in PROCESS_PATTERNS.items()
        ])
        
        prompt = GOAL_ANALYSIS_PROMPT.format(
            goal=goal,
            patterns_description=patterns_desc
        )
        
        response = await self.llm.generate(prompt, json_mode=True)
        
        try:
            return json.loads(response.content)
        except json.JSONDecodeError:
            return {
                "pattern": "approval_workflow",
                "pattern_match_confidence": 0.5,
                "summary": goal,
                "suggested_nodes": [],
                "considerations": []
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
        prompt = PROCESS_GENERATION_PROMPT.format(
            goal=goal,
            analysis=json.dumps(analysis, indent=2),
            business_hours=f"{self.org_settings.get('business_hours', {}).get('start_hour', 9)}-{self.org_settings.get('business_hours', {}).get('end_hour', 17)}",
            timezone=self.org_settings.get('business_hours', {}).get('timezone', 'UTC'),
            approval_timeout=self.org_settings.get('approval_defaults', {}).get('timeout_hours', 24),
            node_types=node_types
        )
        
        response = await self.llm.generate(prompt, json_mode=True)
        
        try:
            return json.loads(response.content)
        except json.JSONDecodeError:
            # Try to extract JSON from response
            import re
            json_match = re.search(r'\{[\s\S]*\}', response.content)
            if json_match:
                return json.loads(json_match.group())
            raise ValueError("Failed to parse process definition")
    
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
        
        response = await self.llm.generate(prompt, json_mode=True)
        
        try:
            return json.loads(response.content)
        except json.JSONDecodeError:
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
