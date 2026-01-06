"""
AgentForge - Agent Generator
AI-powered agent creation from natural language objectives.
"""

import json
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from ..llm.base import BaseLLM, Message, MessageRole
from ..tools.base import ToolConfig


class GeneratedPersonality(BaseModel):
    """Generated personality configuration"""
    tone: str = "friendly"
    languages: List[str] = ["English"]
    traits: List[str] = []
    response_style: str = "balanced"


class GeneratedTask(BaseModel):
    """Generated task configuration"""
    name: str
    trigger: str
    description: str
    steps: List[str] = []
    requires_approval: bool = False
    approval_condition: Optional[str] = None


class SuggestedTool(BaseModel):
    """Suggested tool for the agent"""
    type: str  # rag, database, api, email, webhook, custom
    name: str
    purpose: str
    required: bool = True
    for_tasks: List[str] = []
    suggested_config: Dict[str, Any] = {}


class SampleResponse(BaseModel):
    """Sample conversation for the agent"""
    user_message: str
    agent_response: str


class GeneratedAgent(BaseModel):
    """Complete generated agent configuration"""
    
    # Identity
    name: str
    tagline: str
    icon: str
    
    # Personality
    personality: GeneratedPersonality
    
    # Tasks
    tasks: List[GeneratedTask]
    
    # Tools
    suggested_tools: List[SuggestedTool]
    
    # Instructions
    instructions: str
    
    # Samples
    sample_responses: List[SampleResponse] = []


GENERATOR_SYSTEM_PROMPT = """You are an expert AI Agent architect. Your job is to design complete, production-ready AI agents based on user objectives.

When given an objective, you must generate a comprehensive agent configuration including:

1. **Name & Identity**: A catchy, descriptive name (2-3 words) and tagline
2. **Personality**: Tone, traits, languages, and response style
3. **Tasks**: Specific tasks the agent should handle, with triggers and steps
4. **Tools**: What tools/integrations the agent needs
5. **Instructions**: Detailed system instructions
6. **Sample Responses**: Example conversations

Be practical and comprehensive. Think about:
- What information does the agent need access to?
- What actions should it be able to take?
- What are the edge cases?
- How should it handle errors or confusion?

Always respond with valid JSON matching the schema provided."""


GENERATOR_USER_PROMPT = """Design an AI agent based on this objective:

{objective}

Generate a complete agent configuration as JSON with this structure:

{{
  "name": "Agent Name (2-3 words)",
  "tagline": "Short description (under 10 words)",
  "icon": "Single emoji that represents the agent",
  "personality": {{
    "tone": "friendly/professional/casual/formal/empathetic",
    "languages": ["English", "Arabic", ...],
    "traits": ["helpful", "patient", "proactive", ...],
    "response_style": "concise/detailed/balanced"
  }},
  "tasks": [
    {{
      "name": "Task Name",
      "trigger": "When/what triggers this task",
      "description": "What the agent should do",
      "steps": ["Step 1", "Step 2", ...],
      "requires_approval": false,
      "approval_condition": null
    }}
  ],
  "suggested_tools": [
    {{
      "type": "rag/database/api/email/webhook/custom",
      "name": "Tool instance name",
      "purpose": "Why this tool is needed",
      "required": true,
      "for_tasks": ["Task Name 1", "Task Name 2"],
      "suggested_config": {{}}
    }}
  ],
  "instructions": "Detailed system instructions for the agent...",
  "sample_responses": [
    {{
      "user_message": "Example user message",
      "agent_response": "Example agent response"
    }}
  ]
}}

Generate 4-6 tasks and suggest all necessary tools. Be comprehensive but practical.
Respond ONLY with valid JSON, no additional text."""


class AgentGenerator:
    """
    AI-powered agent generator.
    
    Takes a natural language objective and generates a complete
    agent configuration including personality, tasks, and tools.
    """
    
    def __init__(self, llm: BaseLLM):
        """
        Initialize the generator.
        
        Args:
            llm: LLM to use for generation (should be a capable model like GPT-4)
        """
        self.llm = llm
    
    async def generate(self, objective: str) -> GeneratedAgent:
        """
        Generate a complete agent configuration from an objective.
        
        Args:
            objective: Natural language description of what the agent should do
            
        Returns:
            GeneratedAgent with complete configuration
        """
        # Build messages
        messages = [
            Message(role=MessageRole.SYSTEM, content=GENERATOR_SYSTEM_PROMPT),
            Message(role=MessageRole.USER, content=GENERATOR_USER_PROMPT.format(objective=objective))
        ]
        
        # Call LLM
        response = await self.llm.chat(
            messages=messages,
            temperature=0.7,
            max_tokens=4000
        )
        
        # Parse response
        try:
            # Clean up response (remove markdown code blocks if present)
            content = response.content.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            if content.endswith("```"):
                content = content[:-3]
            
            data = json.loads(content.strip())
            
            # Convert to GeneratedAgent
            return GeneratedAgent(
                name=data.get("name", "My Agent"),
                tagline=data.get("tagline", "An AI assistant"),
                icon=data.get("icon", "🤖"),
                personality=GeneratedPersonality(**data.get("personality", {})),
                tasks=[GeneratedTask(**t) for t in data.get("tasks", [])],
                suggested_tools=[SuggestedTool(**t) for t in data.get("suggested_tools", [])],
                instructions=data.get("instructions", ""),
                sample_responses=[SampleResponse(**s) for s in data.get("sample_responses", [])]
            )
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse generated agent: {e}\nResponse: {response.content[:500]}")
    
    async def refine(
        self,
        current_config: GeneratedAgent,
        feedback: str
    ) -> GeneratedAgent:
        """
        Refine an agent configuration based on feedback.
        
        Args:
            current_config: Current agent configuration
            feedback: User's feedback or requested changes
            
        Returns:
            Updated GeneratedAgent
        """
        refine_prompt = f"""Current agent configuration:

{current_config.json(indent=2)}

User's feedback/requested changes:
{feedback}

Update the configuration based on the feedback. Keep what works, modify what's requested.
Respond with the complete updated JSON configuration."""

        messages = [
            Message(role=MessageRole.SYSTEM, content=GENERATOR_SYSTEM_PROMPT),
            Message(role=MessageRole.USER, content=refine_prompt)
        ]
        
        response = await self.llm.chat(
            messages=messages,
            temperature=0.7,
            max_tokens=4000
        )
        
        # Parse and return
        content = response.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        if content.endswith("```"):
            content = content[:-3]
        
        data = json.loads(content.strip())
        
        return GeneratedAgent(
            name=data.get("name", current_config.name),
            tagline=data.get("tagline", current_config.tagline),
            icon=data.get("icon", current_config.icon),
            personality=GeneratedPersonality(**data.get("personality", {})),
            tasks=[GeneratedTask(**t) for t in data.get("tasks", [])],
            suggested_tools=[SuggestedTool(**t) for t in data.get("suggested_tools", [])],
            instructions=data.get("instructions", ""),
            sample_responses=[SampleResponse(**s) for s in data.get("sample_responses", [])]
        )
    
    async def suggest_improvements(
        self,
        config: GeneratedAgent
    ) -> List[str]:
        """
        Suggest improvements for an agent configuration.
        
        Args:
            config: Agent configuration to analyze
            
        Returns:
            List of improvement suggestions
        """
        suggest_prompt = f"""Analyze this agent configuration and suggest improvements:

{config.json(indent=2)}

Consider:
1. Missing edge cases or tasks
2. Additional tools that might be useful
3. Personality refinements
4. Better error handling
5. Security considerations

Respond with a JSON array of suggestion strings:
["suggestion 1", "suggestion 2", ...]"""

        messages = [
            Message(role=MessageRole.SYSTEM, content="You are an AI agent design expert. Analyze configurations and suggest improvements."),
            Message(role=MessageRole.USER, content=suggest_prompt)
        ]
        
        response = await self.llm.chat(
            messages=messages,
            temperature=0.5,
            max_tokens=1000
        )
        
        content = response.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        if content.endswith("```"):
            content = content[:-3]
        
        return json.loads(content.strip())
    
    def to_agent_config(
        self,
        generated: GeneratedAgent,
        model_config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Convert GeneratedAgent to AgentConfig format.
        
        Args:
            generated: Generated agent
            model_config: Model configuration to use
            
        Returns:
            Dictionary matching AgentConfig schema
        """
        return {
            "id": generated.name.lower().replace(" ", "_"),
            "name": generated.name,
            "version": "1.0.0",
            "objective": generated.instructions,
            "personality": {
                "tone": generated.personality.tone,
                "languages": generated.personality.languages,
                "traits": generated.personality.traits,
                "response_style": generated.personality.response_style
            },
            "model_config": model_config or {
                "mode": "auto",
                "optimize_for": "quality"
            },
            "tools": [
                {
                    "type": tool.type,
                    "name": tool.name,
                    "config": tool.suggested_config,
                    "enabled": True,
                    "requires_approval": False
                }
                for tool in generated.suggested_tools
            ],
            "tasks": [
                {
                    "name": task.name,
                    "trigger": task.trigger,
                    "description": task.description,
                    "steps": task.steps,
                    "requires_approval": task.requires_approval,
                    "approval_condition": task.approval_condition
                }
                for task in generated.tasks
            ],
            "guardrails": {
                "max_iterations": 10,
                "require_approval": []
            }
        }
