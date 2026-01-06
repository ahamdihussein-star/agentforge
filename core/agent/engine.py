"""
AgentForge - Agent Engine
The core engine that powers all agents.
"""

import json
import time
from typing import Dict, Any, List, Optional, AsyncIterator
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime

from ..llm.base import BaseLLM, Message, MessageRole, LLMResponse, ToolCall
from ..llm.factory import LLMFactory
from ..llm.router import LLMRouter, OptimizeFor
from ..llm.registry import LLMRegistry
from ..tools.base import BaseTool, ToolResult, ToolRegistry, ToolConfig


class AgentEvent(BaseModel):
    """Event emitted during agent execution"""
    type: str  # thinking, tool_call, tool_result, response, error
    data: Dict[str, Any] = {}
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AgentResponse(BaseModel):
    """Response from an agent"""
    content: str
    tool_calls_made: List[Dict[str, Any]] = []
    tokens_used: int = 0
    latency_ms: float = 0
    model_used: str = ""


class ModelSelectionMode(str, Enum):
    """How the agent selects which model to use"""
    FIXED = "fixed"           # Always use configured model
    AUTO = "auto"             # Router selects best model
    TASK_BASED = "task_based" # Different model per task
    HYBRID = "hybrid"         # Default + specializations


class AgentConfig(BaseModel):
    """Configuration for an agent"""
    
    # Identity
    id: str
    name: str
    version: str = "1.0.0"
    
    # Purpose
    objective: str
    
    # Personality
    personality: Dict[str, Any] = Field(default_factory=dict)
    
    # Model configuration (renamed from model_config to avoid Pydantic conflict)
    llm_settings: Dict[str, Any] = Field(default_factory=dict)
    
    # Tools
    tools: List[ToolConfig] = Field(default_factory=list)
    
    # Tasks
    tasks: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Guardrails
    guardrails: Dict[str, Any] = Field(default_factory=dict)
    
    # System prompt (auto-generated if not provided)
    system_prompt: Optional[str] = None


class Memory:
    """
    Agent memory for maintaining conversation state.
    """
    
    def __init__(self, max_messages: int = 50):
        self.max_messages = max_messages
        self.messages: List[Message] = []
        self.context: Dict[str, Any] = {}
    
    def add_message(self, message: Message):
        """Add a message to memory"""
        self.messages.append(message)
        
        # Trim if too long
        if len(self.messages) > self.max_messages:
            # Keep system message + recent messages
            system_msgs = [m for m in self.messages if m.role == MessageRole.SYSTEM]
            other_msgs = [m for m in self.messages if m.role != MessageRole.SYSTEM]
            self.messages = system_msgs + other_msgs[-self.max_messages:]
    
    def get_messages(self) -> List[Message]:
        """Get all messages"""
        return self.messages.copy()
    
    def set_context(self, key: str, value: Any):
        """Set a context value"""
        self.context[key] = value
    
    def get_context(self, key: str, default: Any = None) -> Any:
        """Get a context value"""
        return self.context.get(key, default)
    
    def clear(self):
        """Clear memory"""
        # Keep system messages
        self.messages = [m for m in self.messages if m.role == MessageRole.SYSTEM]
        self.context = {}


class AgentEngine:
    """
    The core agent execution engine.
    
    Handles:
    - Message processing
    - Tool execution
    - Model selection
    - Response generation
    """
    
    def __init__(
        self,
        config: AgentConfig,
        llm_registry: LLMRegistry,
        llm: Optional[BaseLLM] = None,
        tools: Optional[List[BaseTool]] = None
    ):
        """
        Initialize the agent engine.
        
        Args:
            config: Agent configuration
            llm_registry: Registry of available LLMs
            llm: Pre-configured LLM instance (optional)
            tools: Pre-configured tool instances (optional)
        """
        self.config = config
        self.llm_registry = llm_registry
        
        # Initialize LLM
        if llm:
            self.llm = llm
        else:
            self.llm = self._init_llm()
        
        # Initialize LLM router for auto mode
        self.router = LLMRouter(
            registry=llm_registry,
            default_model=config.llm_settings.get("fallback_model"),
            task_model_overrides=config.llm_settings.get("task_models", {})
        )
        
        # Initialize tools
        if tools:
            self.tools = {t.name: t for t in tools}
        else:
            self.tools = self._init_tools()
        
        # Initialize memory
        self.memory = Memory()
        
        # Build system prompt
        self.system_prompt = config.system_prompt or self._build_system_prompt()
        
        # Add system message to memory
        self.memory.add_message(Message(
            role=MessageRole.SYSTEM,
            content=self.system_prompt
        ))
        
        # Execution settings
        self.max_iterations = config.guardrails.get("max_iterations", 10)
    
    def _init_llm(self) -> BaseLLM:
        """Initialize LLM from config"""
        llm_settings = self.config.llm_settings
        mode = llm_settings.get("mode", "fixed")
        
        if mode == ModelSelectionMode.FIXED:
            model_id = llm_settings.get("model")
            if not model_id:
                raise ValueError("Fixed mode requires 'model' in llm_settings")
            
            llm_config = self.llm_registry.get(model_id)
            if not llm_config:
                raise ValueError(f"Model not found in registry: {model_id}")
            
            return LLMFactory.create(llm_config)
        
        # For auto/hybrid modes, we'll use the router at runtime
        # Initialize with a default model
        default_model = llm_settings.get("fallback_model") or llm_settings.get("model")
        if default_model:
            llm_config = self.llm_registry.get(default_model)
            if llm_config:
                return LLMFactory.create(llm_config)
        
        # Use first available model
        all_models = self.llm_registry.list_all()
        if all_models:
            return LLMFactory.create(all_models[0])
        
        raise ValueError("No LLM models available in registry")
    
    def _init_tools(self) -> Dict[str, BaseTool]:
        """Initialize tools from config"""
        tools = {}
        
        for tool_config in self.config.tools:
            try:
                tool = ToolRegistry.create(tool_config)
                tools[tool.name] = tool
            except Exception as e:
                print(f"Warning: Failed to initialize tool {tool_config.name}: {e}")
        
        return tools
    
    def _build_system_prompt(self) -> str:
        """Build system prompt from config"""
        personality = self.config.personality
        
        prompt_parts = []
        
        # Objective
        prompt_parts.append(f"You are {self.config.name}.")
        prompt_parts.append(f"\n## Objective\n{self.config.objective}")
        
        # Personality
        if personality:
            prompt_parts.append("\n## Personality")
            
            if personality.get("tone"):
                prompt_parts.append(f"- Tone: {personality['tone']}")
            
            if personality.get("traits"):
                traits = ", ".join(personality["traits"])
                prompt_parts.append(f"- Traits: {traits}")
            
            if personality.get("languages"):
                langs = ", ".join(personality["languages"])
                prompt_parts.append(f"- Languages: {langs}")
            
            if personality.get("constraints"):
                prompt_parts.append("\n## Constraints")
                for constraint in personality["constraints"]:
                    prompt_parts.append(f"- {constraint}")
        
        # Tasks
        if self.config.tasks:
            prompt_parts.append("\n## Tasks")
            for task in self.config.tasks:
                prompt_parts.append(f"\n### {task.get('name', 'Task')}")
                prompt_parts.append(f"Trigger: {task.get('trigger', 'N/A')}")
                if task.get('steps'):
                    prompt_parts.append("Steps:")
                    for i, step in enumerate(task['steps'], 1):
                        prompt_parts.append(f"  {i}. {step}")
        
        # Tools
        if self.tools:
            prompt_parts.append("\n## Available Tools")
            for tool in self.tools.values():
                definition = tool.get_definition()
                prompt_parts.append(f"- {definition.name}: {definition.description}")
        
        return "\n".join(prompt_parts)
    
    def _get_tool_definitions(self) -> List[Dict[str, Any]]:
        """Get tool definitions in OpenAI format"""
        return [tool.get_openai_tool() for tool in self.tools.values()]
    
    async def _select_llm(self, prompt: str, context: Dict[str, Any] = None) -> BaseLLM:
        """Select LLM based on configuration and prompt"""
        mode = self.config.llm_settings.get("mode", "fixed")
        
        if mode == ModelSelectionMode.FIXED:
            return self.llm
        
        elif mode == ModelSelectionMode.AUTO:
            available_models = self.config.llm_settings.get("available_models")
            optimize_for = OptimizeFor(
                self.config.llm_settings.get("optimize_for", "balanced")
            )
            
            decision = self.router.route(
                prompt=prompt,
                available_models=available_models,
                optimize_for=optimize_for,
                context={"has_tools": bool(self.tools), **(context or {})}
            )
            
            return LLMFactory.create(decision.model)
        
        # For other modes, use default
        return self.llm
    
    async def _execute_tool(self, tool_call: ToolCall) -> ToolResult:
        """Execute a tool call"""
        tool_name = tool_call.name
        
        # Find the tool (handle prefixes like "search_", "query_", "call_")
        tool = None
        for name, t in self.tools.items():
            definition = t.get_definition()
            if definition.name == tool_name:
                tool = t
                break
        
        if not tool:
            return ToolResult(
                success=False,
                error=f"Tool not found: {tool_name}"
            )
        
        # Check if approval is required
        if tool.config.requires_approval:
            # In a real implementation, this would pause and wait for approval
            pass
        
        # Execute the tool
        try:
            result = await tool.execute(**tool_call.arguments)
            return result
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e)
            )
    
    async def chat(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """
        Process a user message and generate a response.
        
        Args:
            message: User's message
            context: Additional context
            
        Returns:
            AgentResponse with the agent's reply
        """
        start_time = time.time()
        
        # Add user message to memory
        self.memory.add_message(Message(
            role=MessageRole.USER,
            content=message
        ))
        
        # Select LLM
        llm = await self._select_llm(message, context)
        
        # Get tool definitions
        tools = self._get_tool_definitions() if self.tools else None
        
        # Track tool calls
        tool_calls_made = []
        total_tokens = 0
        
        # Agentic loop
        for iteration in range(self.max_iterations):
            # Call LLM
            response = await llm.chat(
                messages=self.memory.get_messages(),
                tools=tools,
                temperature=0.7
            )
            
            total_tokens += response.total_tokens
            
            # Check for tool calls
            if response.tool_calls:
                # Add assistant message with tool calls
                self.memory.add_message(Message(
                    role=MessageRole.ASSISTANT,
                    content=response.content or "",
                    tool_calls=[{
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.name,
                            "arguments": json.dumps(tc.arguments)
                        }
                    } for tc in response.tool_calls]
                ))
                
                # Execute each tool
                for tool_call in response.tool_calls:
                    result = await self._execute_tool(tool_call)
                    
                    tool_calls_made.append({
                        "tool": tool_call.name,
                        "arguments": tool_call.arguments,
                        "result": result.data if result.success else result.error,
                        "success": result.success
                    })
                    
                    # Add tool result to memory
                    self.memory.add_message(Message(
                        role=MessageRole.TOOL,
                        content=result.to_llm_response(),
                        name=tool_call.name,
                        tool_call_id=tool_call.id
                    ))
            
            else:
                # No tool calls, we have the final response
                self.memory.add_message(Message(
                    role=MessageRole.ASSISTANT,
                    content=response.content or ""
                ))
                
                return AgentResponse(
                    content=response.content or "",
                    tool_calls_made=tool_calls_made,
                    tokens_used=total_tokens,
                    latency_ms=(time.time() - start_time) * 1000,
                    model_used=response.model
                )
        
        # Max iterations reached
        return AgentResponse(
            content="I apologize, but I couldn't complete the task within the allowed iterations.",
            tool_calls_made=tool_calls_made,
            tokens_used=total_tokens,
            latency_ms=(time.time() - start_time) * 1000,
            model_used=llm.config.model_id
        )
    
    async def stream(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AsyncIterator[AgentEvent]:
        """
        Process a message and stream events.
        
        Args:
            message: User's message
            context: Additional context
            
        Yields:
            AgentEvent for each step
        """
        start_time = time.time()
        
        # Add user message
        self.memory.add_message(Message(
            role=MessageRole.USER,
            content=message
        ))
        
        # Select LLM
        llm = await self._select_llm(message, context)
        
        yield AgentEvent(
            type="thinking",
            data={"message": "Processing your request..."}
        )
        
        tools = self._get_tool_definitions() if self.tools else None
        
        for iteration in range(self.max_iterations):
            # Call LLM
            response = await llm.chat(
                messages=self.memory.get_messages(),
                tools=tools
            )
            
            if response.tool_calls:
                # Add assistant message
                self.memory.add_message(Message(
                    role=MessageRole.ASSISTANT,
                    content=response.content or "",
                    tool_calls=[{
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.name,
                            "arguments": json.dumps(tc.arguments)
                        }
                    } for tc in response.tool_calls]
                ))
                
                # Execute tools
                for tool_call in response.tool_calls:
                    yield AgentEvent(
                        type="tool_call",
                        data={
                            "tool": tool_call.name,
                            "arguments": tool_call.arguments
                        }
                    )
                    
                    result = await self._execute_tool(tool_call)
                    
                    yield AgentEvent(
                        type="tool_result",
                        data={
                            "tool": tool_call.name,
                            "success": result.success,
                            "summary": result.summary or str(result.data)[:100]
                        }
                    )
                    
                    # Add to memory
                    self.memory.add_message(Message(
                        role=MessageRole.TOOL,
                        content=result.to_llm_response(),
                        name=tool_call.name,
                        tool_call_id=tool_call.id
                    ))
            
            else:
                # Final response
                self.memory.add_message(Message(
                    role=MessageRole.ASSISTANT,
                    content=response.content or ""
                ))
                
                yield AgentEvent(
                    type="response",
                    data={
                        "content": response.content,
                        "latency_ms": (time.time() - start_time) * 1000
                    }
                )
                return
        
        yield AgentEvent(
            type="error",
            data={"message": "Max iterations reached"}
        )
    
    def reset(self):
        """Reset the agent state"""
        self.memory.clear()
        
        # Re-add system message
        self.memory.add_message(Message(
            role=MessageRole.SYSTEM,
            content=self.system_prompt
        ))
